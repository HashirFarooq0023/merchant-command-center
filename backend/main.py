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
        response_text = await process_chat_message(request.message, request.session_id, merchant_id)
        return {"response": response_text}
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
            
            # Format items as a readable string
            items_str = ", ".join([f"{item.product_sku} × {item.quantity}" for item in items]) if items else "Unknown"
            
            result.append({
                "id": f"ORD-{o.id}",
                "original_id": o.id, # Keep real ID for updates
                "customer": customer.name if customer else "Unknown",
                "phone": customer.phone if customer else "Unknown",
                "address": customer.address if customer else "Unknown",
                "items": items_str,
                "total": f"Rs. {o.total_amount:,.0f}",
                "status": o.status
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



if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
