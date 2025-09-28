from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import asyncio
import os
import base64
from datetime import datetime
from dotenv import load_dotenv
import pymongo
from bson import ObjectId

# Import emergent integrations for NanoBanana
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

# Import Stripe integration
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Load environment variables
load_dotenv()

app = FastAPI(
    title="AI Image Generator",
    description="NanoBanana AI Image Generation API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = pymongo.MongoClient(MONGO_URL)
db = client.image_generator
images_collection = db.images
payment_transactions_collection = db.payment_transactions

# Payment packages configuration
PAYMENT_PACKAGES = {
    "pro_monthly": {
        "name": "Pro Monthly",
        "amount": 9.99,
        "currency": "usd",
        "description": "Monthly Pro subscription with unlimited generations"
    },
    "pro_yearly": {
        "name": "Pro Yearly", 
        "amount": 99.99,
        "currency": "usd",
        "description": "Yearly Pro subscription with unlimited generations (2 months free)"
    }
}

# Get Stripe API key
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")

# Predefined prompts as requested by user
CURATED_PROMPTS = [
    {
        "id": 1,
        "title": "Black & White Artistic Portrait",
        "description": "Sophisticated suit portrait with editorial tone",
        "prompt": "Black and white artistic portrait of a man, with a fashionable model dressed in a sophisticated suit, black socks and shoes. He is sitting with a slightly hunched posture, looking down as if lost in thought. His facial features are the same as the original photo, like her hairstyle. It features minimalist accessories that highlight the elegant and editorial tone. The studio's clean lighting enhances textures and depth, creating an elegant, couture feel. Use the uploaded picture as reference for the face. Aspect ration: 4:5 vertical.",
        "category": "Professional"
    },
    {
        "id": 2,
        "title": "Studio Portrait with Glass Panel",
        "description": "Reflective studio portrait with fashion depth",
        "prompt": "Stylized studio portrait of me (use the uploaded picture as reference for the face) leaning slightly on a large reflective glass panel. Outfit: tailored all black suit, black loafers. Pose: hand in pocket, soft confident smirk. Reflection captures double perspective. Warm rim lighting adds fashion depth. Aspect ration: 4:5 vertical.",
        "category": "Professional"
    },
    {
        "id": 3,
        "title": "Cinematic Editorial Portrait",
        "description": "Luxury armchair portrait with red wine mood",
        "prompt": "A cinematic fashion editorial portrait of a stylish man (use the uploaded picture as reference for the face) sitting confidently in a modern white leather armchair with wooden accents. He wears a sharp, tailored all-white suit with matching white shoes and a plain white shirt underneath, exuding sophistication. He wears round eyeglasses that enhance his intellectual and elegant look. One hand rests casually while the other holds a glass of red wine balanced gracefully between his fingers. The background is a warm gradient of reddish-orange tones with subtle mist or fog at floor level, creating a dramatic and moody atmosphere. Lighting is soft yet directional, highlighting his sharp features and the textures of the suit. Ultra-detailed, high-fashion, editorial photography style with a refined, luxurious mood. Aspect ration: 4:5 vertical.",
        "category": "Artistic"
    },
    {
        "id": 4,
        "title": "Vogue Fashion Cover",
        "description": "Clean white background fashion editorial",
        "prompt": "A white background Vogue fashion editorial cover of the portrait of a young man (use the uploaded picture as reference for the face). He wears a loose white shirt with rolled sleeves, arm partly covering his face, metallic wristwatch visible. Aspect ratio: 4:5 vertical.",
        "category": "Professional"
    },
    {
        "id": 5,
        "title": "Modern Advertisement Blue Chair",
        "description": "Vibrant modern advertisement with geometric patterns",
        "prompt": "A striking, modern advertisement featuring a handsome stylish man (use the uploaded picture as reference for the face) with glasses sits confidently on a bold, modern royal blue armchair. He wears a bright cobalt blue outfit with orange geometric patterns, paired with chunky white sneakers and white socks. The background is a lue gradient with a large graph se your initial) shape. Minimalist, playiu, and modern aesthetic. Ultra-clean, vibrant, editorial look. Aspect ratio: 4:5 vertical.",
        "category": "Artistic"
    },
    {
        "id": 6,
        "title": "Mysterious Black & White",
        "description": "Hyper-realistic minimalist portrait with dramatic shadows",
        "prompt": "A hyper-realistic and minimalist black-and-white portrait of a man (based on the uploaded reference), partially covering his face with his hand. The expression is intense and mysterious. Dramatic lighting creates strong shadows with Photorealistic cinematic vertical portrait (9:16).",
        "category": "Artistic"
    },
    {
        "id": 7,
        "title": "Hands in Pockets - Studio",
        "description": "Cinematic editorial with smoke and dramatic lighting",
        "prompt": "Hands in Pockets - relaxed authority. A hyper-realistic cinematic editorial portrait of the uploaded person (preserve face 100%). He stands tall in a dark moody studio, facing the camera, surrounded by soft drifting smoke under a dramatic spotlight. Outfit: slate-blue luxury suit, paired with a slightly unbuttoned white silk shirt. Both hands tucked casually in pockets, shoulders relaxed, confident expression, head tilted slightly upward.",
        "category": "Professional"
    },
    {
        "id": 8,
        "title": "Lamborghini Lifestyle",
        "description": "High-end lifestyle portrait with luxury car",
        "prompt": "Make my photo overhead high angle 3:4 full-body shot of a man (preserve face 100%) standing relaxed on the hood of a white Lamborghini Urus in a dim basement garage. Wearing a crisp white open collar shirt, brown trousers, polished shoes, and a leather strap watch. Soft sunbeam lighting with natural reflections on car, cinematic warm color grading, shallow depth of field, creamy bokeh, hyper-realistic 8K detail, billionaire vibe.",
        "category": "Lifestyle"
    },
    {
        "id": 9,
        "title": "European Street Portrait",
        "description": "Cinematic street photography in European city",
        "prompt": "Ultra-realistic cinematic street portrait in a narrow European city street, tall stone buildings, blurred storefronts, pedestrians as soft silhouettes. Subject standing in middle of street, slightly angled, confident gaze. Wearing black overcoat + black scarf, minimal stylish vibe. Lighting: overcast daylight, smooth shadows, balanced contrast. Color grading: cinematic teal-orange, soft desaturated background, natural skin tones. Camera: DSLR 85mm lens, f/1.8, medium waist-up shot, vertical 4:5. Style: cinematic editorial, modern, confident, timeless magazine look.",
        "category": "Lifestyle"
    },
    {
        "id": 10,
        "title": "Relaxed Authority - Wide Suit",
        "description": "Editorial portrait with oversized luxury suit",
        "prompt": "Prompt: Hands in Pockets - Relaxed Authority A hyper-realistic cinematic editorial portrait of the uploaded person (preserve face 100%). He stands tall in a dark moody studio,surrounded by soft drifting smoke under a dramatic spotlight.Outfit:Oversized slate-blue luxurysuit with wide-leg trousers, paired with a slightly unbuttoned white silk shirt. Both hands tucked casually in pockets, shoulders relaxed, confident expression, head tilted slightly upward.",
        "category": "Professional"
    },
    {
        "id": 11,
        "title": "High-End Fashion LV",
        "description": "Luxury fashion portrait with orange background",
        "prompt": "A hyper realistic Portrait of uploaded person( preserve face 100%) wearing high-end fashion LV OUTFIT, the background is orange, the clothing is minimal, hyper realistic scene, the guy is just slightly visible due to dark shadows, and he is wearing modern fashion frames.",
        "category": "Artistic"
    },
    {
        "id": 12,
        "title": "Modern Charcoal Suit",
        "description": "Minimalist studio portrait with crossed arms",
        "prompt": "A hyper-realistic portrait of a uploaded man face 100 percent reserved sitting on a tall black stool in a minimalist studio. He wears a modern charcoal-gray tailored suit with cropped trousers and a structured blazer with a high collar, paired with white sneakers. He sits with arms crossed, leaning slightly forward, looking off-camera with a serious, confident expression. Neutral-toned background enhances focus on the subject. Ultra-detailed fabric textures, realistic lighting, fashion editorial quality.",
        "category": "Professional"
    }
]

# Models
class ImageGenerationRequest(BaseModel):
    prompt: str
    image_data: Optional[str] = None  # base64 encoded reference image
    prompt_category: Optional[str] = None
    style: Optional[str] = "photorealistic"

class PromptSelectionRequest(BaseModel):
    prompt_id: int
    image_data: str  # base64 encoded reference image (required for curated prompts)

# Payment Models
class PaymentRequest(BaseModel):
    package_id: str  # "pro_monthly" or "pro_yearly"
    origin_url: str  # Frontend origin URL for dynamic success/cancel URLs

class PaymentSessionResponse(BaseModel):
    url: str
    session_id: str
    package_name: str
    amount: float

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "ai-image-generator", "version": "1.0.0"}

@app.get("/api/prompts")
async def get_curated_prompts():
    """Get all curated prompts for user selection"""
    return {
        "prompts": CURATED_PROMPTS,
        "categories": ["All", "Professional", "Artistic", "Lifestyle"],
        "total_count": len(CURATED_PROMPTS)
    }

@app.get("/api/prompts/categories/{category}")
async def get_prompts_by_category(category: str):
    """Get prompts filtered by category"""
    # Handle "All" category - return all prompts
    if category.lower() == "all":
        return {
            "prompts": CURATED_PROMPTS, 
            "category": "All", 
            "count": len(CURATED_PROMPTS)
        }
    
    # Filter by specific category
    filtered_prompts = [p for p in CURATED_PROMPTS if p["category"].lower() == category.lower()]
    if not filtered_prompts:
        raise HTTPException(status_code=404, detail=f"No prompts found for category: {category}")
    return {"prompts": filtered_prompts, "category": category, "count": len(filtered_prompts)}

@app.post("/api/generate-with-prompt")
async def generate_with_curated_prompt(request: PromptSelectionRequest):
    """Generate image using a curated prompt with reference image"""
    try:
        print(f"📝 Generating with curated prompt ID: {request.prompt_id}")
        
        # Find the selected prompt
        selected_prompt = next((p for p in CURATED_PROMPTS if p["id"] == request.prompt_id), None)
        if not selected_prompt:
            raise HTTPException(status_code=404, detail=f"Prompt with ID {request.prompt_id} not found")
        
        print(f"🎨 Using prompt: {selected_prompt['title']}")
        
        if not request.image_data:
            raise HTTPException(status_code=400, detail="Reference image is required for curated prompts")
        
        # Get Emergent LLM key
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not found in environment")
        
        print(f"🔑 Using Emergent LLM key: {api_key[:20]}...")
        
        # Create unique session ID
        session_id = f"curated_gen_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        # Initialize LLM chat with Gemini image model
        chat = LlmChat(
            api_key=api_key, 
            session_id=session_id, 
            system_message="You are an expert AI image generator specializing in professional portrait photography and fashion editorial work. Create hyper-realistic, high-quality images that preserve facial features while transforming style and composition."
        )
        
        print("🤖 Initializing Gemini 2.5 Flash Image model...")
        
        # Configure for image editing with NanoBanana
        chat.with_model("gemini", "gemini-2.5-flash-image-preview").with_params(
            modalities=["image", "text"],
            temperature=0.7,  # Slightly lower for more consistent results with curated prompts
            max_tokens=1024
        )
        
        # Use the curated prompt with reference image
        print("🖼️  Processing with reference image and curated prompt...")
        msg = UserMessage(
            text=selected_prompt["prompt"],
            file_contents=[ImageContent(request.image_data)]
        )
        
        print(f"🎨 Sending curated prompt request to NanoBanana API...")
        
        # Generate image using NanoBanana
        text_response, images = await chat.send_message_multimodal_response(msg)
        
        print(f"📨 Received response from API. Images count: {len(images) if images else 0}")
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="No image generated by NanoBanana API. The model may be unavailable.")
        
        # Get the first generated image
        generated_image = images[0]
        image_base64 = generated_image.get('data', '')
        
        if not image_base64:
            raise HTTPException(status_code=500, detail="Generated image data is empty")
        
        print(f"✅ Image generated successfully! Size: {len(image_base64)} chars")
        
        # Save to MongoDB with curated prompt metadata
        image_doc = {
            "prompt": selected_prompt["prompt"],
            "prompt_title": selected_prompt["title"],
            "prompt_description": selected_prompt["description"],
            "prompt_id": request.prompt_id,
            "prompt_category": selected_prompt["category"],
            "generated_image": image_base64,
            "original_image": request.image_data,
            "created_at": datetime.now().isoformat(),
            "ai_response": text_response[:500] if text_response else "",
            "model": "gemini-2.5-flash-image-preview",
            "session_id": session_id,
            "generation_type": "curated_prompt"
        }
        
        result = images_collection.insert_one(image_doc)
        image_id = str(result.inserted_id)
        
        print(f"💾 Saved to database with ID: {image_id}")
        
        return {
            "id": image_id,
            "prompt_id": request.prompt_id,
            "prompt_title": selected_prompt["title"],
            "prompt_description": selected_prompt["description"],
            "prompt_category": selected_prompt["category"],
            "generated_image": image_base64,
            "original_image": request.image_data,
            "created_at": image_doc["created_at"],
            "success": True
        }
        
    except Exception as e:
        error_msg = f"Curated image generation failed: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/api/generate-image")
async def generate_image(request: ImageGenerationRequest):
    """Generate or edit image using NanoBanana/Gemini 2.5 Flash Image"""
    try:
        print(f"📝 Received generation request: {request.prompt[:50]}...")
        
        # Get Emergent LLM key
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not found in environment")
        
        print(f"🔑 Using Emergent LLM key: {api_key[:20]}...")
        
        # Create unique session ID
        session_id = f"img_gen_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        # Initialize LLM chat with Gemini image model
        chat = LlmChat(
            api_key=api_key, 
            session_id=session_id, 
            system_message="You are an expert AI image generator. Create high-quality, detailed, visually stunning images based on user prompts. Focus on artistic composition, vivid colors, and creative interpretation."
        )
        
        print("🤖 Initializing Gemini 2.5 Flash Image model...")
        
        # Configure for image generation/editing with NanoBanana
        chat.with_model("gemini", "gemini-2.5-flash-image-preview").with_params(
            modalities=["image", "text"],
            temperature=0.8,
            max_tokens=1024
        )
        
        # Prepare message based on whether we have a reference image
        if request.image_data:
            print("🖼️  Processing with reference image...")
            # Image editing/transformation mode
            enhanced_prompt = f"Transform this image: {request.prompt}. Style: {request.style or 'photorealistic'}. Make it visually stunning and high-quality."
            msg = UserMessage(
                text=enhanced_prompt,
                file_contents=[ImageContent(request.image_data)]
            )
        else:
            print("✨ Generating new image from text...")
            # Pure text-to-image generation
            enhanced_prompt = f"Create a beautiful, high-quality, detailed image: {request.prompt}. Style: {request.style or 'photorealistic'}. Focus on artistic composition and vivid details."
            msg = UserMessage(text=enhanced_prompt)
        
        print(f"🎨 Sending request to NanoBanana API...")
        
        # Generate/edit image using NanoBanana
        text_response, images = await chat.send_message_multimodal_response(msg)
        
        print(f"📨 Received response from API. Images count: {len(images) if images else 0}")
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="No image generated by NanoBanana API. The model may be unavailable.")
        
        # Get the first generated image
        generated_image = images[0]
        image_base64 = generated_image.get('data', '')
        
        if not image_base64:
            raise HTTPException(status_code=500, detail="Generated image data is empty")
        
        print(f"✅ Image generated successfully! Size: {len(image_base64)} chars")
        
        # Save to MongoDB
        image_doc = {
            "prompt": request.prompt,
            "generated_image": image_base64,
            "original_image": request.image_data if request.image_data else None,
            "created_at": datetime.now().isoformat(),
            "prompt_category": request.style,
            "ai_response": text_response[:500] if text_response else "",  # Truncate for storage
            "model": "gemini-2.5-flash-image-preview",
            "session_id": session_id
        }
        
        result = images_collection.insert_one(image_doc)
        image_id = str(result.inserted_id)
        
        print(f"💾 Saved to database with ID: {image_id}")
        
        return {
            "id": image_id,
            "prompt": request.prompt,
            "generated_image": image_base64,
            "original_image": request.image_data,
            "created_at": image_doc["created_at"],
            "prompt_category": request.style,
            "success": True
        }
        
    except Exception as e:
        error_msg = f"Image generation failed: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/images")
async def get_images(limit: int = 20, skip: int = 0):
    """Get generated images history"""
    try:
        images = list(images_collection.find({})
                     .sort("created_at", -1)
                     .limit(limit)
                     .skip(skip))
        
        # Convert ObjectId to string
        for image in images:
            image["id"] = str(image["_id"])
            del image["_id"]
        
        return {"images": images}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching images: {str(e)}")

@app.get("/api/images/{image_id}")
async def get_image(image_id: str):
    """Get specific image by ID"""
    try:
        if not ObjectId.is_valid(image_id):
            raise HTTPException(status_code=400, detail="Invalid image ID")
        
        image = images_collection.find_one({"_id": ObjectId(image_id)})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        
        image["id"] = str(image["_id"])
        del image["_id"]
        
        return image
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching image: {str(e)}")

# Payment Endpoints
@app.get("/api/payment/packages")
async def get_payment_packages():
    """Get available payment packages"""
    return {
        "packages": PAYMENT_PACKAGES,
        "success": True
    }

@app.post("/api/payment/checkout-session")
async def create_checkout_session(request: PaymentRequest, http_request: Request):
    """Create Stripe checkout session for Pro upgrade"""
    try:
        # Validate package
        if request.package_id not in PAYMENT_PACKAGES:
            raise HTTPException(status_code=400, detail="Invalid package ID")
        
        package = PAYMENT_PACKAGES[request.package_id]
        
        # Get host URL from the request
        host_url = str(http_request.base_url).rstrip('/')
        
        # Create webhook URL
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Build success and cancel URLs using frontend origin
        success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/"
        
        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            amount=package["amount"],
            currency=package["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "package_id": request.package_id,
                "package_name": package["name"],
                "source": "mobile_app_pro_upgrade"
            }
        )
        
        print(f"💳 Creating checkout session for {package['name']} - ${package['amount']}")
        
        # Create checkout session with Stripe
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store transaction in database
        transaction_doc = {
            "session_id": session.session_id,
            "package_id": request.package_id,
            "package_name": package["name"],
            "amount": package["amount"],
            "currency": package["currency"],
            "payment_status": "initiated",
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "metadata": {
                "package_id": request.package_id,
                "package_name": package["name"],
                "source": "mobile_app_pro_upgrade"
            }
        }
        
        payment_transactions_collection.insert_one(transaction_doc)
        
        print(f"💾 Transaction record created for session: {session.session_id}")
        
        return PaymentSessionResponse(
            url=session.url,
            session_id=session.session_id,
            package_name=package["name"],
            amount=package["amount"]
        )
        
    except Exception as e:
        error_msg = f"Failed to create checkout session: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/payment/status/{session_id}")
async def get_payment_status(session_id: str):
    """Get payment status for a checkout session"""
    try:
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Get payment status from Stripe
        status_response: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        print(f"📊 Payment status check for {session_id}: {status_response.payment_status}")
        
        # Update transaction in database
        update_data = {
            "payment_status": status_response.payment_status,
            "status": status_response.status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency,
            "updated_at": datetime.now().isoformat()
        }
        
        # Only process successful payments once
        if status_response.payment_status == "paid":
            existing_transaction = payment_transactions_collection.find_one({
                "session_id": session_id,
                "payment_status": "paid"
            })
            
            if not existing_transaction:
                # First time processing this successful payment
                update_data["processed_at"] = datetime.now().isoformat()
                print(f"✅ Processing successful payment for session: {session_id}")
                
                # TODO: Here you would upgrade the user to Pro
                # For now, we just log the successful payment
                print(f"🎉 User upgraded to Pro via session: {session_id}")
        
        # Update transaction record
        payment_transactions_collection.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        
        return {
            "session_id": session_id,
            "payment_status": status_response.payment_status,
            "status": status_response.status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency,
            "metadata": status_response.metadata,
            "success": True
        }
        
    except Exception as e:
        error_msg = f"Failed to get payment status: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        # Get request body and signature
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        print(f"🔔 Received webhook: {webhook_response.event_type} for session: {webhook_response.session_id}")
        
        # Update transaction based on webhook
        if webhook_response.session_id:
            update_data = {
                "payment_status": webhook_response.payment_status,
                "webhook_received_at": datetime.now().isoformat(),
                "event_type": webhook_response.event_type,
                "event_id": webhook_response.event_id
            }
            
            payment_transactions_collection.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": update_data}
            )
            
            print(f"💾 Updated transaction record via webhook")
        
        return {"received": True}
        
    except Exception as e:
        error_msg = f"Webhook processing failed: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)