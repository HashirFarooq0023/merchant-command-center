import os
from pydantic import BaseModel, Field
from langchain.tools import tool
from langchain_core.runnables.config import RunnableConfig
import chromadb
from langchain_openai import OpenAIEmbeddings
from database import SessionLocal
import models
from sqlalchemy.orm import Session

# ==========================================
# GLOBAL INITIALIZATION (Speed Optimization)
# ==========================================
# Initialize these ONCE when the server boots, not on every tool call.
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="products")
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# ==========================================
# 1. Search Tool
# ==========================================
@tool
def search_products(query: str, config: RunnableConfig, limit: int = 5) -> str:
    """Use this tool to search the store's catalog for products based on the customer's query. Returns product names, variants, prices, and descriptions."""
    merchant_id = config["configurable"].get("merchant_id")
    if not merchant_id:
        return "Internal Error: Merchant context missing."

    try:
        query_embedding = embeddings.embed_query(query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where={"merchant_id": merchant_id},
            include=['metadatas', 'documents']
        )
        
        if not results['documents'] or not results['documents'][0]:
            return "No products found matching that description."
            
        formatted_results = "Here are the products I found:\n"
        
        # We need to query the database to get the live image URLs for these matched vectors
        db: Session = SessionLocal()
        try:
            for i, doc in enumerate(results['documents'][0]):
                meta = results['metadatas'][0][i]
                sku = meta.get("sku", "")
                
                image_url_text = ""
                if sku:
                    product = db.query(models.Product).filter(
                        models.Product.sku == sku,
                        models.Product.merchant_id == merchant_id
                    ).first()
                    if product and product.image_url:
                        image_url_text = f"\nImage URL: {product.image_url}"
                
                formatted_results += f"- {doc}{image_url_text}\n"
        finally:
            db.close()
            
        return formatted_results
    except Exception as e:
        return f"Database search error: {str(e)}"

# ==========================================
# 2. Order Placement Tool
# ==========================================
# Pydantic schema ensures the AI passes the exact correct data types
class PlaceOrderInput(BaseModel):
    customer_name: str = Field(..., description="Full name of the customer")
    phone_number: str = Field(..., description="Customer's active phone number")
    delivery_address: str = Field(..., description="Complete delivery address")
    product_sku: str = Field(..., description="The exact Variant SKU of the selected item")
    quantity: int = Field(..., description="Number of items ordered")
    total_amount: float = Field(..., description="Calculated total price provided by the AI")

@tool(args_schema=PlaceOrderInput)
def place_cod_order(
    customer_name: str, 
    phone_number: str, 
    delivery_address: str, 
    product_sku: str, 
    quantity: int, 
    total_amount: float, 
    config: RunnableConfig
) -> str:
    """Use this tool ONLY after the user has explicitly confirmed the order summary. This tool finalizes the order in the database."""
    merchant_id = config["configurable"].get("merchant_id")
    if not merchant_id:
        return "Internal Error: Merchant context missing."

    db: Session = SessionLocal()
    
    try:
        # A. Create or get Customer for this specific merchant
        customer = db.query(models.Customer).filter(
            models.Customer.phone == phone_number, 
            models.Customer.merchant_id == merchant_id
        ).first()
        
        if not customer:
            customer = models.Customer(
                merchant_id=merchant_id,
                name=customer_name,
                address=delivery_address,
                phone=phone_number
            )
            db.add(customer)
            db.flush() # Get the new ID
        else:
            # Update address and name in case they changed it
            customer.address = delivery_address
            customer.name = customer_name
            db.flush()
            
        # B. Verify product
        product = db.query(models.Product).filter(
            models.Product.sku == product_sku, 
            models.Product.merchant_id == merchant_id
        ).first()
        
        if not product:
            db.rollback()
            return f"Error: Product with SKU {product_sku} not found in our database."
            
        price = product.price
        actual_total = price * quantity
        
        order_item = models.OrderItem(product_sku=product_sku, quantity=quantity, price=price)
             
        # C. Create Order attached to merchant
        new_order = models.Order(
            merchant_id=merchant_id,
            customer_id=customer.id, 
            total_amount=actual_total
        )
        db.add(new_order)
        db.flush()
        
        # D. Add Item
        order_item.order_id = new_order.id
        db.add(order_item)
            
        db.commit()
        return f"Order placed successfully! Order ID is #{new_order.id}. Total amount to be paid on delivery: Rs. {actual_total:.2f}."
        
    except Exception as e:
        db.rollback()
        return f"An error occurred while placing the order: {str(e)}"
    finally:
        db.close()

# Add this schema near your other Pydantic models
class UpdateAddressInput(BaseModel):
    order_id: int = Field(..., description="The ID of the order being updated")
    new_address: str = Field(..., description="The new complete delivery address")

# ==========================================
# 3. Update Address Tool
# ==========================================
@tool(args_schema=UpdateAddressInput)
def update_delivery_address(order_id: int, new_address: str, config: RunnableConfig) -> str:
    """Use this tool when a customer asks to change their delivery address for an existing order."""
    merchant_id = config["configurable"].get("merchant_id")
    db: Session = SessionLocal()
    
    try:
        # Verify the order exists and belongs to this merchant
        order = db.query(models.Order).filter(
            models.Order.id == order_id,
            models.Order.merchant_id == merchant_id
        ).first()
        
        if not order:
            return f"Error: Order #{order_id} not found."
            
        # Update the customer's address
        customer = db.query(models.Customer).filter(models.Customer.id == order.customer_id).first()
        if customer:
            customer.address = new_address
            db.commit()
            return f"Successfully updated the delivery address for Order #{order_id} to: {new_address}."
        else:
            return "Error: Customer record not found for this order."
            
    except Exception as e:
        db.rollback()
        return f"Database error while updating address: {str(e)}"
    finally:
        db.close()

# Add this schema
class CancelOrderInput(BaseModel):
    order_id: int = Field(..., description="The ID of the order to be cancelled")

# ==========================================
# 4. Cancel Order Tool
# ==========================================
@tool(args_schema=CancelOrderInput)
def cancel_order(order_id: int, config: RunnableConfig) -> str:
    """Use this tool when a customer explicitly requests to cancel their order."""
    merchant_id = config["configurable"].get("merchant_id")
    db: Session = SessionLocal()
    
    try:
        order = db.query(models.Order).filter(
            models.Order.id == order_id,
            models.Order.merchant_id == merchant_id
        ).first()
        
        if not order:
            return f"Error: Order #{order_id} not found."
            
        if order.status == "Cancelled":
            return f"Order #{order_id} is already cancelled."
            
        order.status = "Cancelled"
        db.commit()
        return f"Successfully cancelled Order #{order_id}."
        
    except Exception as e:
        db.rollback()
        return f"Database error while cancelling order: {str(e)}"
    finally:
        db.close()
