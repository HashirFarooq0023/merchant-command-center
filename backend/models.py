from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Merchant(Base):
    __tablename__ = "merchants"

    merchant_id = Column(String(255), primary_key=True, index=True) # Clerk User ID
    email = Column(String(255), nullable=True)
    store_name = Column(String(255), nullable=True)
    tokens_used = Column(Integer, default=0)
    openai_api_key = Column(String(255), nullable=True)
    trial_start_time = Column(DateTime(timezone=True), nullable=True)
    whatsapp_phone_number_id = Column(String(255), nullable=True)
    whatsapp_business_account_id = Column(String(255), nullable=True)
    whatsapp_access_token = Column(String(1000), nullable=True)
    system_prompt = Column(String(5000), nullable=True)
    webhook_verify_token = Column(String(255), nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customers = relationship("Customer", back_populates="merchant")
    orders = relationship("Order", back_populates="merchant")
    products = relationship("Product", back_populates="merchant")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(String(255), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), unique=False, index=True, nullable=False) # Phone might not be globally unique now, unique per merchant perhaps, but unique=False is safer for multi-tenant if same customer buys from two stores.
    address = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    merchant = relationship("Merchant", back_populates="customers")
    orders = relationship("Order", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(String(255), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    merchant = relationship("Merchant", back_populates="orders")

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_sku = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(String(255), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    handle = Column(String(255), index=True, nullable=False)
    sku = Column(String(100), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(10000), nullable=True)
    price = Column(Float, nullable=False)
    image_url_1 = Column(String(1000), nullable=True)
    image_url_2 = Column(String(1000), nullable=True)
    image_url_3 = Column(String(1000), nullable=True)
    image_url_4 = Column(String(1000), nullable=True)
    image_url_5 = Column(String(1000), nullable=True)
    vendor = Column(String(255), nullable=True)
    instock = Column(Integer, default=0, nullable=True)
    inventory_policy = Column(String(50), nullable=True)

    merchant = relationship("Merchant", back_populates="products")

class ProductQuery(Base):
    __tablename__ = "product_queries"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(String(255), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    product_sku = Column(String(100), nullable=False)
    product_title = Column(String(255), nullable=False)
    query_count = Column(Integer, default=1)
    last_queried = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(String(255), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    action_text = Column(String(500), nullable=False)
    action_type = Column(String(50), default="info") # success, info, warning
    created_at = Column(DateTime(timezone=True), server_default=func.now())
