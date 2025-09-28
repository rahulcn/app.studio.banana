from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import os
import base64
from datetime import datetime
from dotenv import load_dotenv
import pymongo
from bson import ObjectId
import json

# Load environment variables
load_dotenv()

# Import emergent integrations
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

app = FastAPI()

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
prompts_collection = db.prompts

# Initialize predefined prompts
PREDEFINED_PROMPTS = [
    {
        "id": "artistic",
        "name": "Artistic Style",
        "description": "Transform into beautiful artwork",
        "prompts": [
            "Convert this image into a beautiful watercolor painting with soft brushstrokes",
            "Transform this into a stunning oil painting with rich textures",
            "Create an impressionist version with vibrant colors and visible brushstrokes",
            "Make this look like a digital art masterpiece with glowing effects"
        ]
    },
    {
        "id": "fantasy",
        "name": "Fantasy World",
        "description": "Add magical and fantasy elements",
        "prompts": [
            "Transport this scene to a magical fantasy world with dragons in the sky",
            "Add mystical elements like floating crystals and magical aura",
            "Transform this into an enchanted forest scene with fairy lights",
            "Create a space fantasy version with alien worlds in the background"
        ]
    },
    {
        "id": "vintage",
        "name": "Vintage Effects",
        "description": "Classic and retro styles",
        "prompts": [
            "Apply a vintage 1950s aesthetic with warm sepia tones",
            "Transform into a classic black and white photograph",
            "Add retro 80s neon cyberpunk style",
            "Create a film noir atmosphere with dramatic shadows"
        ]
    },
    {
        "id": "creative",
        "name": "Creative Transform",
        "description": "Unique creative interpretations",
        "prompts": [
            "Reimagine this in a completely different art style",
            "Transform the subject into a geometric abstract composition",
            "Create a surreal version with dreamlike elements",
            "Make this look like it's made of different materials (metal, glass, wood)"
        ]
    }
]

class ImageGenerationRequest(BaseModel):
    prompt: str
    image_data: Optional[str] = None  # base64 encoded image
    prompt_category: Optional[str] = None

class ImageResponse(BaseModel):
    id: str
    prompt: str
    generated_image: str  # base64 encoded
    original_image: Optional[str] = None
    created_at: str
    prompt_category: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    """Initialize predefined prompts in database"""
    try:
        # Clear existing prompts and add predefined ones
        prompts_collection.delete_many({})
        prompts_collection.insert_many(PREDEFINED_PROMPTS)
        print("✅ Predefined prompts initialized")
    except Exception as e:
        print(f"❌ Error initializing prompts: {e}")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "image-generator"}

@app.get("/api/prompts")
async def get_prompts():
    """Get all predefined prompt categories"""
    try:
        prompts = list(prompts_collection.find({}, {"_id": 0}))
        return {"prompts": prompts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching prompts: {str(e)}")

@app.post("/api/generate-image")
async def generate_image(request: ImageGenerationRequest):
    """Generate or edit image using Gemini 2.5 Flash Image"""
    try:
        # Get Emergent LLM key
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not found in environment")
        
        # Create unique session ID
        session_id = f"img_gen_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Initialize LLM chat with Gemini image model
        chat = LlmChat(
            api_key=api_key, 
            session_id=session_id, 
            system_message="You are an expert AI image generator and editor. Create high-quality, detailed images based on user prompts."
        )
        
        # Configure for image generation/editing
        chat.with_model("gemini", "gemini-2.5-flash-image-preview").with_params(modalities=["image", "text"])
        
        # Prepare message
        if request.image_data:
            # Image editing mode
            msg = UserMessage(
                text=f"{request.prompt}",
                file_contents=[ImageContent(request.image_data)]
            )
        else:
            # Image generation mode
            msg = UserMessage(
                text=f"Create a high-quality, detailed image: {request.prompt}"
            )
        
        # Generate/edit image
        text_response, images = await chat.send_message_multimodal_response(msg)
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="No image generated by AI model")
        
        # Get the first generated image
        generated_image = images[0]
        image_base64 = generated_image['data']
        
        # Save to database
        image_doc = {
            "prompt": request.prompt,
            "generated_image": image_base64,
            "original_image": request.image_data if request.image_data else None,
            "created_at": datetime.now().isoformat(),
            "prompt_category": request.prompt_category,
            "ai_response": text_response
        }
        
        result = images_collection.insert_one(image_doc)
        image_id = str(result.inserted_id)
        
        return ImageResponse(
            id=image_id,
            prompt=request.prompt,
            generated_image=image_base64,
            original_image=request.image_data,
            created_at=image_doc["created_at"],
            prompt_category=request.prompt_category
        )
        
    except Exception as e:
        print(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@app.get("/api/images")
async def get_images(limit: int = 20, skip: int = 0):
    """Get user's generated images history"""
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

@app.delete("/api/images/{image_id}")
async def delete_image(image_id: str):
    """Delete specific image"""
    try:
        if not ObjectId.is_valid(image_id):
            raise HTTPException(status_code=400, detail="Invalid image ID")
        
        result = images_collection.delete_one({"_id": ObjectId(image_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Image not found")
        
        return {"message": "Image deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting image: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)