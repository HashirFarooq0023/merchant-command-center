import pandas as pd
import chromadb
from langchain_openai import OpenAIEmbeddings
from database import SessionLocal, engine
import models
from dotenv import load_dotenv
import os

load_dotenv()

# Ensure tables are created
models.Base.metadata.create_all(bind=engine)

def ingest_shopify_csv(csv_path: str, merchant_id: str):
    print(f"Starting ingestion from {csv_path} for merchant {merchant_id}...")
    
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_path}")
        return

    # Filter for active products using relevant columns
    # Adjust column names based on the actual Shopify CSV structure
    # Expected columns: Handle, Title, Body (HTML), Vendor, Type, Tags, Published, Option1 Name, Option1 Value, Variant SKU, Variant Price
    if 'Published' in df.columns:
         df = df[df['Published'] == True]

    # Initialize ChromaDB
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    collection = chroma_client.get_or_create_collection(name="products")
    
    embeddings = OpenAIEmbeddings()

    db = SessionLocal()

    products_added_mysql = 0
    products_added_chroma = 0

    for index, row in df.iterrows():
        # Extact key fields (handling potential NA values)
        handle = str(row.get('Handle', ''))
        title = str(row.get('Title', ''))
        description = str(row.get('Body (HTML)', ''))
        vendor = str(row.get('Vendor', ''))
        sku = str(row.get('Variant SKU', ''))
        price = float(row.get('Variant Price', 0.0))

        # We often only want the main rows, not every variant empty row in Shopify CSVs
        if not title or str(title) == 'nan':
             continue

        product_id = f"{handle}-{sku}" if sku and str(sku) != 'nan' else handle

        # 1. Save to MySQL (Structured Data)
        existing_product = db.query(models.Product).filter(
            models.Product.product_id == product_id,
            models.Product.merchant_id == merchant_id
        ).first()
        if not existing_product:
            new_product = models.Product(
                merchant_id=merchant_id,
                product_id=product_id,
                sku=sku if str(sku) != 'nan' else "",
                price=price,
                title=title,
                vendor=vendor
            )
            db.add(new_product)
            products_added_mysql += 1
        
        # 2. Save to ChromaDB (Unstructured/Vector Data)
        # Create a rich text representation for the AI to search against
        page_content = f"Product: {title}\nVendor: {vendor}\nPrice: {price}\nDescription: {description}"
        
        # Check if it already exists in ChromaDB to avoid duplicates (naive approach)
        vector_id = f"{merchant_id}_{product_id}"
        existing_docs = collection.get(ids=[vector_id])
        
        if not existing_docs or not existing_docs['ids']:
             # Generate embedding and add to vector store
             # In a real app, use recursive character text splitter for long descriptions
             embedding = embeddings.embed_query(page_content)
             
             collection.add(
                 documents=[page_content],
                 metadatas=[{"merchant_id": merchant_id, "product_id": product_id, "title": title, "sku": sku, "price": price}],
                 ids=[vector_id],
                 embeddings=[embedding]
             )
             products_added_chroma += 1

    db.commit()
    db.close()
    print(f"Ingestion complete!")
    print(f"Added {products_added_mysql} products to MySQL.")
    print(f"Added {products_added_chroma} products to ChromaDB.")

if __name__ == "__main__":
    import sys
    # Allow passing custom CSV path or default to products.csv
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "products.csv"
    merchant_id = sys.argv[2] if len(sys.argv) > 2 else "default_merchant"
    ingest_shopify_csv(csv_file, merchant_id)
