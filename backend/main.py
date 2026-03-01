from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
import os
import uuid
import random
import string
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from brain import process_chat_message
from auth import get_current_merchant
from ingest_products import process_shopify_csv
from database import get_db
from whatsapp import router as whatsapp_router
from sqlalchemy.orm import Session
from models import Product, Order, Customer, OrderItem

from typing import Optional

app = FastAPI(title="Merchant Command Center AI Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(whatsapp_router, prefix="/webhook/whatsapp")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

class ChatRequest(BaseModel):
    message: str
    session_id: str

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

class SettingsUpdate(BaseModel):
    store_name: Optional[str] = ""
    openai_api_key: Optional[str] = ""
    whatsapp_phone_number_id: Optional[str] = ""
    whatsapp_business_account_id: Optional[str] = ""
    whatsapp_access_token: Optional[str] = ""
    system_prompt: Optional[str] = ""
    webhook_verify_token: Optional[str] = ""

@app.get("/settings")
def get_settings(merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        from models import Merchant
        merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant not found")
            
        if not merchant.webhook_verify_token:
            import secrets
            merchant.webhook_verify_token = secrets.token_hex(16)
            db.commit()

        return {
            "store_name": merchant.store_name or "",
            "openai_api_key": merchant.openai_api_key or "",
            "whatsapp_phone_number_id": merchant.whatsapp_phone_number_id or "",
            "whatsapp_business_account_id": merchant.whatsapp_business_account_id or "",
            "whatsapp_access_token": merchant.whatsapp_access_token or "",
            "system_prompt": merchant.system_prompt or "",
            "webhook_verify_token": merchant.webhook_verify_token or ""
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/settings")
def update_settings(payload: SettingsUpdate, merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        from models import Merchant
        merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
        if not merchant:
            # Auto-create if not exists
            merchant = Merchant(merchant_id=merchant_id)
            db.add(merchant)
            
        merchant.store_name = payload.store_name
        merchant.openai_api_key = payload.openai_api_key
        merchant.whatsapp_phone_number_id = payload.whatsapp_phone_number_id
        merchant.whatsapp_business_account_id = payload.whatsapp_business_account_id
        merchant.whatsapp_access_token = payload.whatsapp_access_token
        merchant.system_prompt = payload.system_prompt
        merchant.webhook_verify_token = payload.webhook_verify_token
        
        db.commit()
        return {"status": "success", "message": "Settings updated"}
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat_endpoint(request: ChatRequest, merchant_id: str = Depends(get_current_merchant)):
    try:
        response_data = await process_chat_message(request.message, request.session_id, merchant_id)
        return response_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/settings/webhook-url")
def get_webhook_url(merchant_id: str = Depends(get_current_merchant)):
    import requests
    try:
        response = requests.get("http://localhost:4040/api/tunnels", timeout=2)
        if response.status_code == 200:
            data = response.json()
            tunnels = data.get("tunnels", [])
            if tunnels:
                return {"url": f"{tunnels[0]['public_url']}/webhook/whatsapp"}
        return {"url": "Ngrok tunnel not detected"}
    except Exception:
        return {"url": "Ngrok tunnel not detected"}

@app.get("/products")
def get_products(merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        products = db.query(Product).filter(Product.merchant_id == merchant_id).all()
        return [{"id": p.id, "sku": p.sku, "title": p.title, "price": f"Rs. {p.price}", "description": str(p.description if hasattr(p, 'description') and p.description else p.handle), "stock": p.instock > 0 if hasattr(p, 'instock') else True, "instock": p.instock if hasattr(p, 'instock') else 0, "inventory_policy": p.inventory_policy} for p in products]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products/{product_id}")
def get_single_product(product_id: int, merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        product = db.query(Product).filter(Product.id == product_id, Product.merchant_id == merchant_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        return {
            "id": product.id,
            "sku": product.sku,
            "handle": product.handle,
            "title": product.title,
            "description": product.description,
            "price": product.price,
            "image_url_1": product.image_url_1,
            "image_url_2": product.image_url_2,
            "image_url_3": product.image_url_3,
            "image_url_4": product.image_url_4,
            "image_url_5": product.image_url_5,
            "vendor": product.vendor,
            "instock": product.instock,
            "inventory_policy": product.inventory_policy
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class EditProductInput(BaseModel):
    title: str
    description: Optional[str] = ""
    handle: str
    price: float
    vendor: Optional[str] = ""
    instock: int
    inventory_policy: Optional[str] = "deny"
    image_url_1: Optional[str] = ""
    image_url_2: Optional[str] = ""
    image_url_3: Optional[str] = ""
    image_url_4: Optional[str] = ""
    image_url_5: Optional[str] = ""

@app.put("/products/{product_id}")
def update_product(
    product_id: int, 
    payload: EditProductInput, 
    merchant_id: str = Depends(get_current_merchant), 
    db: Session = Depends(get_db)
):
    try:
        product = db.query(Product).filter(Product.id == product_id, Product.merchant_id == merchant_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        product.title = payload.title
        product.description = payload.description
        product.handle = payload.handle
        product.price = payload.price
        product.vendor = payload.vendor
        product.instock = payload.instock
        product.inventory_policy = payload.inventory_policy
        product.image_url_1 = payload.image_url_1
        product.image_url_2 = payload.image_url_2
        product.image_url_3 = payload.image_url_3
        product.image_url_4 = payload.image_url_4
        product.image_url_5 = payload.image_url_5
        
        db.commit()
        
        # Insert/Update to ChromaDB (naive approach: just add/update by ID)
        try:
            from ingest_products import vectorstore
            doc_text = f"Product: {payload.title} ({product.sku}). Category: {payload.handle}. Description: {payload.description}. Price: {payload.price}. In Stock: {payload.instock}. Inventory Policy: {payload.inventory_policy}."
            vectorstore.add_texts(
                texts=[doc_text],
                metadatas=[{
                    "merchant_id": merchant_id,
                    "sku": product.sku,
                    "handle": payload.handle,
                    "price": payload.price,
                    "inventory_policy": payload.inventory_policy
                }],
                ids=[f"{merchant_id}_{product.sku}"]
            )
        except Exception as e:
            print(f"Warning: Failed to update product in ChromaDB: {e}")
            
        return {"status": "success", "message": "Product updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
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
                img_url = product.image_url_1 if product else None
                
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

@app.get("/dashboard/stats")
def get_dashboard_stats(merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        from models import Merchant, ProductQuery, ActivityLog
        from datetime import datetime, timedelta
        
        total_orders = db.query(Order).filter(Order.merchant_id == merchant_id).count()
        total_products = db.query(Product).filter(Product.merchant_id == merchant_id).count()
        
        merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
        tokens = merchant.tokens_used if merchant else 0
        
        # gpt-4o-mini blended estimate: ~$0.0000004 USD per token
        # Conversion to PKR: ~278 PKR per USD -> 0.0001112 PKR
        est_cost_pkr = tokens * 0.0001112
        
        # --- Chart Data (Last 7 Days) ---
        today = datetime.now()
        chart_data = []
        for i in range(6, -1, -1):
            target_date = today - timedelta(days=i)
            day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            day_orders = db.query(Order).filter(
                Order.merchant_id == merchant_id,
                Order.created_at >= day_start,
                Order.created_at <= day_end
            ).count()
            
            chart_data.append({
                "day": target_date.strftime("%a"),
                "orders": day_orders,
                "messages": 0 # Placeholder for now unless we log per-day messages
            })
            
        # --- Top Products ---
        top_queries = db.query(ProductQuery).filter(
            ProductQuery.merchant_id == merchant_id
        ).order_by(ProductQuery.query_count.desc()).limit(5).all()
        
        top_products = [{"name": q.product_title, "queries": q.query_count} for q in top_queries]
        
        # --- Recent Activity ---
        activities = db.query(ActivityLog).filter(
            ActivityLog.merchant_id == merchant_id
        ).order_by(ActivityLog.created_at.desc()).limit(6).all()
        
        from datetime import timezone
        def format_time_ago(dt):
            if not dt: return "Just now"
            # Ensure we are comparing UTC with UTC
            now = datetime.now(timezone.utc)
            if not dt.tzinfo:
                dt = dt.replace(tzinfo=timezone.utc)
            diff = now - dt
            minutes = diff.total_seconds() / 60
            if minutes < 1:
                return "Just now"
            if minutes < 60:
                return f"{int(minutes)} min ago"
            hours = minutes / 60
            if hours < 24:
                return f"{int(hours)} hr ago"
            return f"{int(hours / 24)} days ago"
            
        recent_activity = [{
            "text": a.action_text,
            "type": a.action_type,
            "time": format_time_ago(a.created_at)
        } for a in activities]
        
        return {
            "total_orders": total_orders,
            "total_products": total_products,
            "tokens_used": tokens,
            "est_cost": f"Rs. {est_cost_pkr:.1f}",
            "chart_data": chart_data,
            "top_products": top_products,
            "recent_activity": recent_activity
        }
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
    merchant_id: str = Depends(get_current_merchant),
    db: Session = Depends(get_db)
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
        
        from models import ActivityLog
        log = ActivityLog(
            merchant_id=merchant_id,
            action_text=f"New product catalog synced ({total_processed} items)",
            action_type="info"
        )
        db.add(log)
        db.commit()
        
        return {"status": "success", "processed_variants": total_processed}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Strict Cleanup
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

@app.get("/download-sample-csv")
def download_sample_csv():
    # Serve the generated sample_products_100.csv directly
    csv_path = os.path.join(os.getcwd(), "sample_products_100.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Sample CSV not generated yet.")
    return FileResponse(path=csv_path, filename="sample_products_100.csv", media_type="text/csv")

@app.get("/download-csv-template")
def download_csv_template():
    # Serve the empty template CSV
    csv_path = os.path.join(os.getcwd(), "sample_template.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Empty Template CSV not generated yet.")
    return FileResponse(path=csv_path, filename="sample_template.csv", media_type="text/csv")

@app.delete("/products")
def delete_all_products(merchant_id: str = Depends(get_current_merchant), db: Session = Depends(get_db)):
    try:
        # Delete from MySQL
        products_deleted = db.query(Product).filter(Product.merchant_id == merchant_id).delete()
        
        from models import ActivityLog
        log = ActivityLog(
            merchant_id=merchant_id,
            action_text=f"Deleted entire product catalog ({products_deleted} items)",
            action_type="warning"
        )
        db.add(log)
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

class SingleProductInput(BaseModel):
    title: str
    description: Optional[str] = ""
    handle: str
    price: float
    vendor: Optional[str] = ""
    sku_prefix: str
    instock: int
    inventory_policy: Optional[str] = "deny"
    image_url_1: Optional[str] = ""
    image_url_2: Optional[str] = ""
    image_url_3: Optional[str] = ""
    image_url_4: Optional[str] = ""
    image_url_5: Optional[str] = ""

@app.post("/products/single")
async def add_single_product(
    payload: SingleProductInput,
    merchant_id: str = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    try:
        random_suffix = ''.join(random.choices(string.digits, k=4))
        full_sku = f"{payload.sku_prefix}-{random_suffix}"
        
        # Insert to MySQL
        new_product = Product(
            merchant_id=merchant_id,
            handle=payload.handle,
            sku=full_sku,
            title=payload.title,
            description=payload.description,
            price=payload.price,
            image_url_1=payload.image_url_1,
            image_url_2=payload.image_url_2,
            image_url_3=payload.image_url_3,
            image_url_4=payload.image_url_4,
            image_url_5=payload.image_url_5,
            vendor=payload.vendor,
            instock=payload.instock,
            inventory_policy=payload.inventory_policy
        )
        db.add(new_product)
        
        # Activity log
        from models import ActivityLog
        log = ActivityLog(
            merchant_id=merchant_id,
            action_text=f"Added new product: {payload.title} ({full_sku})",
            action_type="success"
        )
        db.add(log)
        db.commit()
        
        # Insert to ChromaDB
        try:
            from ingest_products import vectorstore
            doc_text = f"Product: {payload.title} ({full_sku}). Category: {payload.handle}. Description: {payload.description}. Price: {payload.price}. In Stock: {payload.instock}. Inventory Policy: {payload.inventory_policy}."
            
            vectorstore.add_texts(
                texts=[doc_text],
                metadatas=[{
                    "merchant_id": merchant_id,
                    "sku": full_sku,
                    "handle": payload.handle,
                    "price": payload.price,
                    "inventory_policy": payload.inventory_policy
                }],
                ids=[f"{merchant_id}_{full_sku}"]
            )
        except Exception as e:
            print(f"Warning: Failed to add single product to ChromaDB: {e}")
            
        return {"status": "success", "message": "Product added", "sku": full_sku}
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/products/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    merchant_id: str = Depends(get_current_merchant)
):
    try:
        # Generate random unique filename
        ext = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join("uploads", unique_filename)
        
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
            
        # Return public URL path
        # Assuming backend is on port 8000
        url = f"http://localhost:8000/uploads/{unique_filename}"
        return {"url": url}
    except Exception:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to upload image")

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
        
        from models import ActivityLog
        log = ActivityLog(
            merchant_id=merchant_id,
            action_text=f"Deleted product: {product.title} ({sku})",
            action_type="info"
        )
        db.add(log)
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
