import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_community.callbacks.manager import get_openai_callback
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from database import SessionLocal
import models
from dotenv import load_dotenv

load_dotenv()

# We will implement tools in a separate file to keep this clean
from tools import search_products, place_cod_order

# 1. Initialize LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 2. System Prompt
SYSTEM_PROMPT = """You are a helpful and polite e-commerce AI assistant for Merchant Command Center.
Your goal is to help customers find products and place Cash on Delivery (COD) orders.

Guidelines:
1. Product Display: Always use the `search_products` tool to find items in our catalog. ONLY recommend products that are actually found in the search results. DO NOT make up products or prices.
2. Order Placement: When a customer is ready to buy, use the `place_cod_order` tool. You MUST gather the following information before placing the order:
   - Full Name
   - Shipping Address
   - Phone Number
   - The specific SKU(s) and Quantity of the items they want.
3. Fallbacks: If you don't know the answer or can't find a product, politely apologize and offer to connect them with human support.
4. Tone: Be concise, friendly, and helpful. Use emojis where appropriate.
"""

# 3. Define Tools
tools = [search_products, place_cod_order]

# Memory for tracking session state (Using in-memory for now to get it running, can switch back to Mongo later if needed)
memory = MemorySaver()

# 4. Create Agent
agent_executor = create_react_agent(
    llm, 
    tools, 
    messages_modifier=SYSTEM_PROMPT,
    checkpointer=memory
)

# Main entry point for the API
async def process_chat_message(message: str, session_id: str, merchant_id: str):
    config = {
        "configurable": {
            "thread_id": f"{merchant_id}:{session_id}",
            "merchant_id": merchant_id
        }
    }
    
    with get_openai_callback() as cb:
        # Run the agent
        response = agent_executor.invoke(
            {"messages": [HumanMessage(content=message)]},
            config
        )
        
        # Extract the last AI message
        ai_message = response["messages"][-1].content
        
        # Track Tokens
        if cb.total_tokens > 0:
            db = SessionLocal()
            try:
                merchant = db.query(models.Merchant).filter(models.Merchant.merchant_id == merchant_id).first()
                if not merchant:
                    merchant = models.Merchant(merchant_id=merchant_id)
                    db.add(merchant)
                
                merchant.tokens_used += cb.total_tokens
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Failed to track tokens: {e}")
            finally:
                db.close()
                
    return ai_message
