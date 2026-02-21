import os
import pandas as pd
from typing import List
from database import SessionLocal
from models import Product, Merchant
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from sqlalchemy.orm import Session

# Allowable columns per specification
ALLOWED_COLUMNS = [
    "Handle", "Title", "Vendor", "Custom Product Type", "Tags", "Published", 
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", 
    "Option3 Name", "Option3 Value", "Variant SKU", "Variant Grams", 
    "Variant Inventory Tracker", "Variant Inventory Policy", "Variant Price", 
    "Image Src", "Image Position", "Image Alt Text", "SEO Title", 
    "SEO Description", "Variant Image", "Variant Weight Unit", "Cost per item", 
    "Price / International", "Status"
]

# Columns that Shopify leaves blank for variants that we should forward-fill
FFILL_COLUMNS = ["Title", "Vendor", "Custom Product Type", "Tags", "SEO Description", "Image Src", "Status", "Published"]

embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma(
    collection_name="products",
    embedding_function=embedding_model,
    persist_directory="./chroma_db"
)

def process_shopify_csv(file_path: str, merchant_id: str) -> int:
    """
    Parses a Shopify CSV, cleans it, and inserts valid variants into MySQL and ChromaDB.
    Returns the number of variants processed.
    """
    try:
        # 1. Read the CSV
        df = pd.read_csv(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read CSV: {str(e)}")

    # Keep only allowed columns if they exist in the file
    available_columns = [col for col in ALLOWED_COLUMNS if col in df.columns]
    df = df[available_columns]

    # 2. Handle Parent/Child Variants (Forward Fill)
    # Group by Handle and ffill the top-level parent data down to the variants
    if "Handle" in df.columns:
        for col in FFILL_COLUMNS:
            if col in df.columns:
                df[col] = df.groupby("Handle")[col].ffill()

    # 3. Data Sanitization
    df = df.fillna("")
    
    # Filter to only active and published 
    if "Status" in df.columns:
        df = df[df["Status"].str.lower() == "active"]
    if "Published" in df.columns:
        df = df[df["Published"].astype(str).str.upper() == "TRUE"]
        
    # We strictly need a Variant SKU and Variant Price to represent a sellable item
    if "Variant SKU" not in df.columns or "Variant Price" not in df.columns:
        raise ValueError("CSV is missing required 'Variant SKU' or 'Variant Price' columns.")

    df = df[df["Variant SKU"] != ""]
    
    # Ensure price is float
    df["Variant Price"] = pd.to_numeric(df["Variant Price"], errors="coerce").fillna(0.0)

    db = None
    try:
        from sqlalchemy import text
        _tmp_db = SessionLocal()
        _tmp_db.execute(text("SELECT 1"))
        db = _tmp_db
    except Exception as e:
        print(f"Warning: MySQL connection failed, proceeding with ChromaDB only. Error: {e}")
    processed_count = 0
    
    docs_to_embed = []
    metadatas = []
    ids = []

    try:
        # --- Ensure Merchant Exists ---
        if db:
            existing_merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
            if not existing_merchant:
                # Provide a generic store name or scrape from Shopify vendor if needed
                fallback_store_name = df["Vendor"].iloc[0] if "Vendor" in df.columns and len(df) > 0 else "My Store"
                new_merchant = Merchant(
                    merchant_id=merchant_id,
                    store_name=fallback_store_name
                )
                db.add(new_merchant)
                db.flush() # Commit this early so products don't fail

        for _, row in df.iterrows():
            handle = str(row.get("Handle", ""))
            sku = str(row.get("Variant SKU", ""))
            title = str(row.get("Title", ""))
            price = float(row.get("Variant Price", 0.0))
            vendor = str(row.get("Vendor", ""))
            img_src = str(row.get("Variant Image", "")) or str(row.get("Image Src", ""))
            inv_tracker = str(row.get("Variant Inventory Tracker", ""))
            inv_policy = str(row.get("Variant Inventory Policy", ""))
            cat = str(row.get("Custom Product Type", ""))
            tags = str(row.get("Tags", ""))
            seo_desc = str(row.get("SEO Description", ""))
            
            # Options
            opt1n, opt1v = str(row.get("Option1 Name", "")), str(row.get("Option1 Value", ""))
            opt2n, opt2v = str(row.get("Option2 Name", "")), str(row.get("Option2 Value", ""))
            opt3n, opt3v = str(row.get("Option3 Name", "")), str(row.get("Option3 Value", ""))

            # --- MySQL Storage (Upsert) ---
            if db:
                existing_product = db.query(Product).filter(
                    Product.merchant_id == merchant_id, 
                    Product.sku == sku
                ).first()

                if existing_product:
                    existing_product.handle = handle
                    existing_product.title = title
                    existing_product.price = price
                    existing_product.image_url = img_src
                    existing_product.vendor = vendor
                    existing_product.inventory_tracker = inv_tracker
                    existing_product.inventory_policy = inv_policy
                else:
                    new_product = Product(
                        merchant_id=merchant_id,
                        handle=handle,
                        sku=sku,
                        title=title,
                        price=price,
                        image_url=img_src,
                        vendor=vendor,
                        inventory_tracker=inv_tracker,
                        inventory_policy=inv_policy
                    )
                    db.add(new_product)

            # --- ChromaDB Storage ---
            opts = []
            if opt1n and opt1v: opts.append(f"{opt1n}: {opt1v}")
            if opt2n and opt2v: opts.append(f"{opt2n}: {opt2v}")
            if opt3n and opt3v: opts.append(f"{opt3n}: {opt3v}")
            options_text = ", ".join(opts)

            doc_text = f"Product: {title} ({sku}). Category: {cat}. Tags: {tags}. Description: {seo_desc}. Options: {options_text}. Price: {price}. Inventory Policy: {inv_policy}."
            
            docs_to_embed.append(doc_text)
            metadatas.append({
                "merchant_id": merchant_id, # Strict clerk isolation
                "sku": sku,
                "handle": handle,
                "price": price,
                "inventory_policy": inv_policy
            })
            ids.append(f"{merchant_id}_{sku}")
            
            processed_count += 1

        if db:
            db.commit()
        
        # Batch upsert to Chroma to prevent rate limiting
        if docs_to_embed:
            # Add to ChromaDB
            vectorstore.add_texts(
                texts=docs_to_embed,
                metadatas=metadatas,
                ids=ids
            )
            
    except Exception as e:
        if db:
            db.rollback()
        raise e
    finally:
        if db:
            db.close()

    return processed_count
