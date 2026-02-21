import os
from sqlalchemy import create_engine
from database import Base, engine, MYSQL_URI
from models import *

def setup_cloud_db():
    print(f"Connecting to MySQL/TiDB at: {MYSQL_URI.split('@')[1] if '@' in MYSQL_URI else '...'}...")
    try:
        # Create all tables defined in models.py
        Base.metadata.create_all(bind=engine)
        print("\n✅ Successfully connected and created all necessary tables in MySQL!")
    except Exception as e:
        print(f"\n❌ Error setting up MySQL Database: {e}")
        
if __name__ == "__main__":
    setup_cloud_db()
