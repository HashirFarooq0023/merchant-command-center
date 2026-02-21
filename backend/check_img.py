from database import SessionLocal
import models

def check():
    db = SessionLocal()
    products = db.query(models.Product).filter(models.Product.sku == "SHRT-M").all()
    for p in products:
        print(f"Product: {p.title}")
        print(f"SKU: {p.sku}")
        print(f"Image URL: {p.image_url}")
        print("---")
    db.close()

if __name__ == "__main__":
    check()
