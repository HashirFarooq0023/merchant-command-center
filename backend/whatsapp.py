from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Depends
from fastapi.responses import PlainTextResponse
import requests
import json
import traceback
from typing import Dict, Any

from database import SessionLocal
import models
from brain import process_chat_message

router = APIRouter()

# The verify token is now mapped dynamically per-merchant via the DB.

def send_whatsapp_message(phone_number_id: str, access_token: str, recipient_phone: str, text: str):
    """
    Sends an outbound text message via Meta's Graph API.
    """
    url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "to": recipient_phone,
        "type": "text",
        "text": {
            "body": text
        }
    }
    
    print(f"Sending message to {recipient_phone} from {phone_number_id}")
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        print("Successfully sent WhatsApp message")
        return True
    except requests.exceptions.HTTPError as e:
        print(f"Failed to send message. HTTP Error: {e.response.text}")
        return False
    except Exception as e:
        print(f"Error sending WhatsApp message: {e}")
        return False

async def process_whatsapp_message_async(sender_phone: str, message_text: str, phone_number_id: str):
    """
    Background Task to communicate with the DB, process AI response, and send the message back.
    """
    db = SessionLocal()
    try:
        # Find which merchant owns this WhatsApp Business Phone Number ID
        merchant = db.query(models.Merchant).filter(
            models.Merchant.whatsapp_phone_number_id == phone_number_id
        ).first()

        if not merchant:
            print(f"Error: No merchant found linked to phone_number_id {phone_number_id}")
            return
            
        if not merchant.whatsapp_access_token:
            print(f"Error: Merchant {merchant.merchant_id} has no WhatsApp access token configured.")
            return

        # Let the AI brain process the message
        result = await process_chat_message(
            message=message_text,
            session_id=sender_phone, # Unique thread identifier per customer phone number
            merchant_id=merchant.merchant_id
        )
        
        ai_reply = result.get("response", "Sorry, I am currently down for maintenance.")
        
        # Dispatch the text back to WhatsApp
        send_whatsapp_message(
            phone_number_id=phone_number_id,
            access_token=merchant.whatsapp_access_token,
            recipient_phone=sender_phone,
            text=ai_reply
        )
        
    except Exception as e:
        print("Fatal error processing WhatsApp webhook in background:")
        traceback.print_exc()
    finally:
        db.close()


@router.get("/")
async def verify_webhook(request: Request):
    """
    Step 1: Meta Verification. 
    Meta sends a GET request here when you first connect your app.
    We check our DB to ensure the token exists for at least one merchant.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token:
        db = SessionLocal()
        try:
            # Check if ANY merchant has this verify token active
            merchant = db.query(models.Merchant).filter(
                models.Merchant.webhook_verify_token == token
            ).first()
            
            if merchant:
                print(f"Webhook verified successfully for Merchant: {merchant.store_name} ({merchant.merchant_id})!")
                return PlainTextResponse(content=challenge, status_code=200)
            else:
                print(f"Failed webhook verification: Unknown token '{token}'")
                raise HTTPException(status_code=403, detail="Verification failed: Unknown token")
        finally:
            db.close()
    
    raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/")
async def receive_whatsapp_message(request: Request, background_tasks: BackgroundTasks):
    """
    Step 2: Receiving Messages.
    WhatsApp sends the actual user messages here.
    """
    body = await request.json()

    try:
        # WhatsApp sends lots of updates (like "read" receipts). 
        # We only want to process actual text messages.
        entry = body.get("entry", [])[0]
        changes = entry.get("changes", [])[0]
        value = changes.get("value", {})
        
        if "messages" in value:
            phone_number_id = value.get("metadata", {}).get("phone_number_id")
            message = value["messages"][0]
            
            # We ONLY process text messages for now (ignoring images/audio/locations out of scope)
            if "text" in message:
                sender_phone = message["from"]
                message_text = message["text"]["body"]
                
                print(f"New text message from {sender_phone} to endpoint {phone_number_id}: {message_text}")
                
                # Hand it off to a BackgroundTask so we can instantly return 200 OK to Meta.
                # If we delay processing (LLMs are slow), Meta will retry and cause infinite loops.
                background_tasks.add_task(
                    process_whatsapp_message_async, 
                    sender_phone=sender_phone, 
                    message_text=message_text, 
                    phone_number_id=phone_number_id
                )

    except IndexError:
        pass
    except KeyError:
        pass
    except Exception as e:
        print(f"Error parsing webhook payload: {e}")

    # You MUST return a 200 OK fast, or Meta will think your server is down and retry.
    return {"status": "success"}
