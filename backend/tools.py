from langchain.tools import tool
from langchain_core.runnables.config import RunnableConfig
import chromadb
from langchain_openai import OpenAIEmbeddings
from database import SessionLocal
import models
from sqlalchemy.orm import Session

# 1. Search Tool
@tool
def search_products(query: str, config: RunnableConfig, limit: int = 3) -> str:
    """Searches the product catalog for items matching the user's query. Returns product details including SKU, title, and price."""
    merchant_id = config["configurable"].get("merchant_id")
    if not merchant_id:
        return "Internal Error: Merchant context missing."

    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    collection = chroma_client.get_or_create_collection(name="products")
    embeddings = OpenAIEmbeddings()
    
    query_embedding = embeddings.embed_query(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=limit,
        where={"merchant_id": merchant_id},
        include=['metadatas', 'documents']
    )
    
    if not results['metadatas'][0]:
        return "No products found matching that description."
        
    formatted_results = "Here are the products I found:\n"
    for item in results['metadatas'][0]:
        formatted_results += f"- {item['title']} (SKU: {item['sku']}) - ${item['price']}\n"
    
    return formatted_results

# 2. Order Placement Tool
@tool
def place_cod_order(name: str, address: str, phone: str, skus: list[str], quantities: list[int], config: RunnableConfig) -> str:
    """Places a Cash on Delivery (COD) order for the customer. Required inputs: customer name, shipping address, phone number, a list of product SKUs, and a corresponding list of quantities."""
    merchant_id = config["configurable"].get("merchant_id")
    if not merchant_id:
        return "Internal Error: Merchant context missing."

    if len(skus) != len(quantities):
        return "Error: The number of SKUs provided does not match the number of quantities."

    db: Session = SessionLocal()
    
    try:
        # A. Create or get Customer for this specific merchant
        customer = db.query(models.Customer).filter(
            models.Customer.phone == phone, 
            models.Customer.merchant_id == merchant_id
        ).first()
        
        if not customer:
            customer = models.Customer(
                merchant_id=merchant_id,
                name=name,
                address=address,
                phone=phone
            )
            db.add(customer)
            db.flush() # Get the new ID
            
        # B. Calculate totals and verify products
        total_amount = 0.0
        order_items_to_add = []
        
        for sku, quantity in zip(skus, quantities):
             product = db.query(models.Product).filter(
                 models.Product.sku == sku, 
                 models.Product.merchant_id == merchant_id
             ).first()
             if not product:
                 db.rollback()
                 return f"Error: Product with SKU {sku} not found in our database."
             
             price = product.price
             total_amount += (price * quantity)
             order_items_to_add.append(
                 models.OrderItem(product_sku=sku, quantity=quantity, price=price)
             )
             
        # C. Create Order attached to merchant
        new_order = models.Order(
            merchant_id=merchant_id,
            customer_id=customer.id, 
            total_amount=total_amount
        )
        db.add(new_order)
        db.flush()
        
        # D. Add Items
        for item in order_items_to_add:
            item.order_id = new_order.id
            db.add(item)
            
        db.commit()
        return f"Order placed successfully! Order ID is #{new_order.id}. Total amount to be paid on delivery: ${total_amount:.2f}."
        
    except Exception as e:
        db.rollback()
        return f"An error occurred while placing the order: {str(e)}"
    finally:
        db.close()
