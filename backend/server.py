from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import os
import base64
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Load environment variables
load_dotenv()

app = FastAPI(
    title="AI Image Generator SaaS",
    description="Hybrid Supabase + Stripe SaaS for AI image generation",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_service_key)

# Initialize Stripe
stripe_api_key = os.getenv("STRIPE_API_KEY")

# Payment packages (server-side only - security)
PAYMENT_PACKAGES = {
    "pro_monthly": {
        "name": "Pro Monthly",
        "price": 9.99,
        "currency": "usd",
        "credits": -1,  # unlimited
        "description": "Unlimited image generations per month"
    },
    "pay_per_use_10": {
        "name": "10 Credits",
        "price": 5.00,
        "currency": "usd", 
        "credits": 10,
        "description": "10 additional image generations"
    },
    "pay_per_use_25": {
        "name": "25 Credits",
        "price": 10.00,
        "currency": "usd",
        "credits": 25,
        "description": "25 additional image generations"
    },
    "pay_per_use_50": {
        "name": "50 Credits",
        "price": 18.00,
        "currency": "usd",
        "credits": 50,
        "description": "50 additional image generations"
    }
}

# Models
class PaymentRequest(BaseModel):
    package_id: str
    origin_url: str

class ImageGenerationRequest(BaseModel):
    prompt: str
    style: Optional[str] = "photorealistic"

class AuthenticatedUser(BaseModel):
    id: str
    email: str

# Auth dependency
async def get_authenticated_user(request: Request) -> AuthenticatedUser:
    """Extract user from Supabase JWT token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    
    try:
        # Verify token with Supabase
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return AuthenticatedUser(
            id=response.user.id,
            email=response.user.email
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token verification failed")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "ai-image-generator-saas", "version": "2.0.0"}

@app.get("/api/packages")
async def get_payment_packages():
    """Get available payment packages"""
    return {"packages": PAYMENT_PACKAGES}

@app.get("/api/user/profile")
async def get_user_profile(user: AuthenticatedUser = Depends(get_authenticated_user)):
    """Get user profile with usage stats"""
    try:
        # Get or create user profile
        response = supabase.table("user_profiles").select("*").eq("user_id", user.id).execute()
        
        if not response.data:
            # Create new profile for first-time user
            profile_data = {
                "user_id": user.id,
                "email": user.email,
                "subscription_tier": "free",
                "usage_quota": 5,  # Free tier: 5 generations
                "usage_count": 0,
                "credits_balance": 0,
                "created_at": datetime.now().isoformat()
            }
            
            create_response = supabase.table("user_profiles").insert(profile_data).execute()
            profile = create_response.data[0]
        else:
            profile = response.data[0]
        
        # Get recent images count
        images_response = supabase.table("images").select("id").eq("user_id", user.id).execute()
        total_images = len(images_response.data) if images_response.data else 0
        
        return {
            "profile": profile,
            "stats": {
                "total_images": total_images,
                "remaining_free": max(0, profile["usage_quota"] - profile["usage_count"]) if profile["subscription_tier"] == "free" else "unlimited",
                "credits_available": profile.get("credits_balance", 0)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")

@app.post("/api/payments/checkout")
async def create_checkout_session(
    request: PaymentRequest,
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    """Create Stripe checkout session for payment"""
    try:
        # Validate package
        if request.package_id not in PAYMENT_PACKAGES:
            raise HTTPException(status_code=400, detail="Invalid package ID")
        
        package = PAYMENT_PACKAGES[request.package_id]
        
        # Initialize Stripe checkout
        webhook_url = f"{request.origin_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Create success/cancel URLs
        success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/payment-cancel"
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=package["price"],
            currency=package["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user.id,
                "user_email": user.email,
                "package_id": request.package_id,
                "credits": str(package["credits"]),
                "source": "mobile_app"
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction_data = {
            "session_id": session.session_id,
            "user_id": user.id,
            "user_email": user.email,
            "package_id": request.package_id,
            "amount": package["price"],
            "currency": package["currency"],
            "credits": package["credits"],
            "payment_status": "pending",
            "status": "initiated",
            "metadata": checkout_request.metadata,
            "created_at": datetime.now().isoformat()
        }
        
        supabase.table("payment_transactions").insert(transaction_data).execute()
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "package": package
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@app.get("/api/payments/status/{session_id}")
async def get_payment_status(
    session_id: str,
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    """Get payment status and update user credits if completed"""
    try:
        # Get transaction record
        transaction_response = supabase.table("payment_transactions").select("*").eq("session_id", session_id).eq("user_id", user.id).execute()
        
        if not transaction_response.data:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        transaction = transaction_response.data[0]
        
        # If already processed, return current status
        if transaction["payment_status"] in ["paid", "failed", "expired"]:
            return {
                "status": transaction["status"],
                "payment_status": transaction["payment_status"],
                "processed": True,
                "transaction": transaction
            }
        
        # Check with Stripe
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        status_response: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction status
        update_data = {
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "updated_at": datetime.now().isoformat()
        }
        
        # If payment successful, add credits to user
        if status_response.payment_status == "paid" and transaction["payment_status"] != "paid":
            package_id = transaction["package_id"]
            package = PAYMENT_PACKAGES[package_id]
            
            # Get user profile
            profile_response = supabase.table("user_profiles").select("*").eq("user_id", user.id).execute()
            profile = profile_response.data[0]
            
            # Update user profile based on package type
            if package["credits"] == -1:  # Pro monthly subscription
                profile_updates = {
                    "subscription_tier": "pro",
                    "usage_quota": -1,  # unlimited
                    "updated_at": datetime.now().isoformat()
                }
            else:  # Pay-per-use credits
                current_balance = profile.get("credits_balance", 0)
                profile_updates = {
                    "credits_balance": current_balance + package["credits"],
                    "updated_at": datetime.now().isoformat()
                }
            
            # Update profile
            supabase.table("user_profiles").update(profile_updates).eq("user_id", user.id).execute()
            
            # Log activity
            activity_data = {
                "user_id": user.id,
                "activity_type": "payment_completed",
                "metadata": {
                    "package_id": package_id,
                    "amount": package["price"],
                    "credits_added": package["credits"],
                    "session_id": session_id
                },
                "created_at": datetime.now().isoformat()
            }
            supabase.table("user_activities").insert(activity_data).execute()
        
        # Update transaction
        supabase.table("payment_transactions").update(update_data).eq("session_id", session_id).execute()
        
        return {
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency,
            "processed": status_response.payment_status == "paid",
            "transaction": {**transaction, **update_data}
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        stripe_signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        # Log webhook event
        webhook_data = {
            "event_type": webhook_response.event_type,
            "event_id": webhook_response.event_id,
            "session_id": webhook_response.session_id,
            "payment_status": webhook_response.payment_status,
            "metadata": webhook_response.metadata,
            "created_at": datetime.now().isoformat()
        }
        
        supabase.table("webhook_events").insert(webhook_data).execute()
        
        return {"received": True}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook processing failed")

@app.post("/api/generate-image")
async def generate_image(
    request: ImageGenerationRequest,
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    """Generate image with usage tracking"""
    try:
        # Get user profile
        profile_response = supabase.table("user_profiles").select("*").eq("user_id", user.id).execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        profile = profile_response.data[0]
        
        # Check if user can generate images
        can_generate = False
        usage_source = ""
        
        # Pro subscription (unlimited)
        if profile["subscription_tier"] == "pro":
            can_generate = True
            usage_source = "pro_subscription"
        
        # Free tier quota
        elif profile["usage_count"] < profile["usage_quota"]:
            can_generate = True
            usage_source = "free_quota"
        
        # Paid credits
        elif profile.get("credits_balance", 0) > 0:
            can_generate = True
            usage_source = "paid_credits"
        
        if not can_generate:
            raise HTTPException(
                status_code=402, 
                detail="No generation credits available. Please upgrade your plan or purchase credits."
            )
        
        # Call the NanoBanana Edge Function (simulated here)
        try:
            # In real implementation, this would call Supabase Edge Function
            # For now, we'll simulate the process
            await asyncio.sleep(2)  # Simulate generation time
            
            # Mock generated image data
            generated_image_url = f"https://example.com/generated/{user.id}/{datetime.now().timestamp()}.png"
            
            # Save image metadata
            image_data = {
                "user_id": user.id,
                "original_filename": f"generated_{datetime.now().timestamp()}.png",
                "storage_path": f"generated/{user.id}/image.png",
                "generation_prompt": request.prompt,
                "generation_model": "nano-banana",
                "generation_style": request.style,
                "usage_source": usage_source,
                "created_at": datetime.now().isoformat()
            }
            
            image_response = supabase.table("images").insert(image_data).execute()
            
            # Update user usage
            if usage_source == "free_quota":
                supabase.table("user_profiles").update({
                    "usage_count": profile["usage_count"] + 1,
                    "updated_at": datetime.now().isoformat()
                }).eq("user_id", user.id).execute()
            elif usage_source == "paid_credits":
                supabase.table("user_profiles").update({
                    "credits_balance": profile["credits_balance"] - 1,
                    "updated_at": datetime.now().isoformat()
                }).eq("user_id", user.id).execute()
            
            # Log activity
            activity_data = {
                "user_id": user.id,
                "activity_type": "image_generation",
                "metadata": {
                    "prompt": request.prompt,
                    "style": request.style,
                    "usage_source": usage_source,
                    "model": "nano-banana"
                },
                "resource_usage": 1,
                "created_at": datetime.now().isoformat()
            }
            supabase.table("user_activities").insert(activity_data).execute()
            
            return {
                "success": True,
                "image_url": generated_image_url,
                "image_id": image_response.data[0]["id"],
                "usage_source": usage_source,
                "remaining_credits": {
                    "free_quota": max(0, profile["usage_quota"] - (profile["usage_count"] + 1)) if usage_source == "free_quota" else max(0, profile["usage_quota"] - profile["usage_count"]),
                    "paid_credits": (profile["credits_balance"] - 1) if usage_source == "paid_credits" else profile.get("credits_balance", 0)
                }
            }
            
        except Exception as gen_error:
            raise HTTPException(status_code=500, detail=f"Image generation failed: {str(gen_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation request failed: {str(e)}")

@app.get("/api/images")
async def get_user_images(
    user: AuthenticatedUser = Depends(get_authenticated_user),
    limit: int = 20,
    offset: int = 0
):
    """Get user's generated images"""
    try:
        response = supabase.table("images").select("*").eq("user_id", user.id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        return {
            "images": response.data,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "count": len(response.data)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get images: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)