from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
import os
import uuid
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from brain import process_chat_message
from auth import get_current_merchant
from ingest_products import process_shopify_csv
from database import get_db
from sqlalchemy.orm import Session
from models import Product, Order, Customer, OrderItem
from pydantic import BaseModel

app = FastAPI(title="Merchant Command Center AI Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, merchant_id: str = Depends(get_current_merchant)):
    try:
        response_data = await process_chat_message(request.message, request.session_id, merchant_id)
        return response_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products")
def get_products(merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        products = db.query(Product).filter(Product.merchant_id == merchant_id).all()
        return [{"id": p.id, "title": p.title, "price": f"Rs. {p.price}", "description": str(p.seo_desc if hasattr(p, 'seo_desc') else p.handle), "stock": True} for p in products]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class OrderStatusUpdate(BaseModel):
    status: str

@app.get("/orders")
def get_orders(merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        orders = db.query(Order).filter(Order.merchant_id == merchant_id).order_by(Order.created_at.desc()).all()
        result = []
        for o in orders:
            customer = db.query(Customer).filter(Customer.id == o.customer_id).first()
            items = db.query(OrderItem).filter(OrderItem.order_id == o.id).all()
            
            # Format items as detailed objects instead of a single string
            detailed_items = []
            for item in items:
                # Get Product to find the title
                product = db.query(Product).filter(
                    Product.sku == item.product_sku, 
                    Product.merchant_id == merchant_id
                ).first()
                product_title = product.title if product else item.product_sku
                img_url = product.image_url if product else None
                
                detailed_items.append({
                    "sku": item.product_sku,
                    "title": product_title,
                    "quantity": item.quantity,
                    "price": f"Rs. {item.price:,.0f}",
                    "image_url": img_url
                })
            
            # Summarize items string for the main table view
            items_str = ", ".join([f"{item['title']} × {item['quantity']}" for item in detailed_items]) if detailed_items else "Unknown"
            
            result.append({
                "id": f"ORD-{o.id:04d}",
                "original_id": o.id, # Keep real ID for updates
                "customer": customer.name if customer else "Unknown",
                "phone": customer.phone if customer else "Unknown",
                "address": customer.address if customer else "Unknown",
                "items": items_str,
                "detailed_items": detailed_items,
                "total": f"Rs. {o.total_amount:,.0f}",
                "status": o.status,
                "created_at": o.created_at.isoformat() if o.created_at else None
            })
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/orders/{order_id}/status")
def update_order_status(order_id: int, payload: OrderStatusUpdate, merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        order = db.query(Order).filter(Order.id == order_id, Order.merchant_id == merchant_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
            
        order.status = payload.status
        db.commit()
        return {"status": "success", "new_status": order.status}
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-catalog")
async def upload_catalog(
    file: UploadFile = File(...), 
    merchant_id: str = Depends(get_current_merchant)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    # Save the file temporarily
    temp_filename = f"temp_{uuid.uuid4()}_{file.filename}"
    temp_filepath = os.path.join(os.getcwd(), temp_filename)
    
    try:
        with open(temp_filepath, "wb") as f:
            content = await file.read()
            f.write(content)
            
        # Call ingestion script
        total_processed = process_shopify_csv(temp_filepath, merchant_id)
        
        return {"status": "success", "processed_variants": total_processed}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Strict Cleanup
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

@app.delete("/products")
def delete_all_products(merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        # Delete from MySQL
        products_deleted = db.query(Product).filter(Product.merchant_id == merchant_id).delete()
        db.commit()
        
        # Delete from ChromaDB
        try:
            from ingest_products import vectorstore
            # ChromaDB delete by metadata
            # Note: ChromaDB doesn't natively support delete by where clause yet in all versions
            # We must get the IDs first
            result = vectorstore._collection.get(where={"merchant_id": merchant_id})
            if result and result["ids"]:
                vectorstore.delete(ids=result["ids"])
        except Exception as e:
            print(f"Warning: Failed to delete from ChromaDB: {e}")
            
        return {"status": "success", "message": f"Deleted {products_deleted} products from catalog"}
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/products/{product_id}")
def delete_product(product_id: int, merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        # Find product first to get SKU for Chroma deletion
        product = db.query(Product).filter(Product.id == product_id, Product.merchant_id == merchant_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        sku = product.sku
        
        # Delete from MySQL
        db.delete(product)
        db.commit()
        
        # Delete from ChromaDB
        try:
            from ingest_products import vectorstore
            # ChromaDB items are IDs formatted as {merchant_id}_{sku}
            vectorstore.delete(ids=[f"{merchant_id}_{sku}"])
        except Exception as e:
            print(f"Warning: Failed to delete from ChromaDB: {e}")
            
        return {"status": "success", "message": f"Deleted product {sku}"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
