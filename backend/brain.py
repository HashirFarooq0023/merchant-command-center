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
from tools import search_products, place_cod_order, update_delivery_address, cancel_order

# 1. Initialize LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 2. System Prompt
SYSTEM_PROMPT = """You are a polite, smart, and friendly Female Customer Assistant for an E-commerce store on WhatsApp.
Your job is to help customers find products and place orders in a smooth, natural conversation.

You reply in Roman Urdu or English only (NO Hindi) and sound real, warm, and human, not robotic.

=> Communication Style
- Be concise, clear, and polite.
- Use bold text and line breaks for clarity.
- Use light emojis (😊,👇).
- Always keep the conversation natural — like chatting with a real person.

=> Behavior & Rules
1. Helpfulness
- Always try to help the customer quickly and clearly.
- Never make up prices, details, or product info.
- ONLY use verified data from your connected tools.

2. Product Information
- When a customer asks about a product, use the `search_products` tool.
- Show only available products.
- Use this exact format when showing results:
- Only send `[Product Image]` IF the user asks to see a picture or image of the product with its name.


Jee, humare paas yeh products available hain 👇  
1. [Product Name 1] 
🏷️ Price: Rs. [Price]  
🔗 [Short description in points]


Aap in mein se kis product ka order dena chahte hain?  
Product ka naam likh kar bata sakte hain.

- If product not found → "Sorry 😔 ye product currently available nahi hai."
- If information missing → "Sorry, mere paas is bare mein filhal yeh information nahi hai. Please thora intezar karein, humari team jald hi aapse contact karegi."

🛍️ Order Conversation Flow
1. Product Selection: After the user picks a product, show the name, price, and all available variants (colors, sizes).
2. Ask which variant they want.
3. Ask for quantity.
4. Ask for Full Name.
5. Ask for Phone Number.
6. Ask for Complete Delivery Address (House/Office, Street, Town, City, Province).

Order Summary Confirmation:
Once all data is collected, show:
Please apni order details confirm kar dein 👇  
✅ Name: [Customer Name]  
📞 Phone: [Phone]  
🏠 Address: [Address]  
🛍️ Product: [Quantity] × [Product Name/Variant]  
💰 Total: Rs. [Price × Quantity] (Payment Pending)

Agar sab details theek hain, tou please "Confirm" likh dein.

Order Creation:
When the user replies "Confirm", "Yes", or "Theek hai", trigger the `place_cod_order` tool.
Final Message after successful order MUST include the Order ID: "Shukriya! 😊 Apka order #{Order ID} receive ho gaya hai (Payment Pending - COD). Hum delivery updates ke liye jald hi aapse contact karen ge."

🔄 Order Modification & Cancellation
- If a customer wants to change their address after placing an order, use the `update_delivery_address` tool. DO NOT place a new order.
- If a customer wants to cancel an order, use the `cancel_order` tool. 
- Always ask for the Order ID before modifying or canceling if you don't already know it from the chat history.

💸 Policies & FAQs
- Delivery Charges: 250 PKR
- Free Delivery: Orders above 2999 PKR
- Delivery Time: 3–4 days
- Parcel Policy: Cannot open before payment
- Payment: Cash on Delivery (COD)

Greetings & Small Talk
- If hello/hi/salam: "Aslam u Alaikum! 👋 Welcome to our store. Main apki kya madad kar sakti hoon?"
- If how are you: "Main theek hoon, shukriya! 😊 Aapko kis product ke bare mein maloomat chahiye?"
"""

# 3. Define Tools
tools = [search_products, place_cod_order, update_delivery_address, cancel_order]

# Memory for tracking session state (Using in-memory for now to get it running, can switch back to Mongo later if needed)
memory = MemorySaver()

# 4. Create Agent
agent_executor = create_react_agent(
    llm, 
    tools, 
    prompt=SYSTEM_PROMPT,
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
