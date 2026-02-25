import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(override=True)

# MySQL Setup
MYSQL_URI = os.getenv("MYSQL_URI")
engine = create_engine(
    MYSQL_URI,
    pool_pre_ping=True,  # Test connections before handing them out
    pool_recycle=3600,   # Recycle connections every hour to prevent timeouts
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# MongoDB Setup
MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client['commerce_db']

async def get_mongo_db():
    return db
