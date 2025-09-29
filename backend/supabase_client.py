# Supabase Configuration and Client
import os
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from supabase.client import ClientOptions
from dotenv import load_dotenv
import logging

load_dotenv()

class SupabaseConfig:
    """Supabase configuration and client management"""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY") 
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not all([self.url, self.anon_key, self.service_key]):
            raise ValueError("Missing required Supabase environment variables")
    
    def get_client(self, use_service_key: bool = False) -> Client:
        """Get Supabase client with appropriate key"""
        key = self.service_key if use_service_key else self.anon_key
        options = ClientOptions(
            postgrest_client_timeout=10,
            storage_client_timeout=10,
            schema="public"
        )
        return create_client(self.url, key, options)

# Global Supabase client instances
supabase_config = SupabaseConfig()
supabase_client = supabase_config.get_client(use_service_key=False)  # Client with anon key
supabase_admin = supabase_config.get_client(use_service_key=True)    # Admin client with service key

class SupabaseService:
    """Service class for Supabase operations"""
    
    def __init__(self):
        self.client = supabase_client
        self.admin = supabase_admin
        self.logger = logging.getLogger(__name__)
    
    # ============================================================================
    # USER MANAGEMENT
    # ============================================================================
    
    def create_user_profile(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create user profile after authentication"""
        try:
            result = self.client.table("profiles").insert(user_data).execute()
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to create user profile: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by ID"""
        try:
            result = self.client.table("profiles").select("*").eq("id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Failed to get user profile: {e}")
            return None
    
    def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile"""
        try:
            result = self.client.table("profiles").update(updates).eq("id", user_id).execute()
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to update user profile: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_stats(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user statistics"""
        try:
            result = self.client.table("user_stats").select("*").eq("user_id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Failed to get user stats: {e}")
            return None
    
    # ============================================================================
    # GENERATION MANAGEMENT
    # ============================================================================
    
    def create_generation(self, generation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new generation record"""
        try:
            result = self.client.table("generations").insert(generation_data).execute()
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to create generation: {e}")
            return {"success": False, "error": str(e)}
    
    def update_generation(self, generation_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update generation record"""
        try:
            result = self.client.table("generations").update(updates).eq("id", generation_id).execute()
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to update generation: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_generations(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get user's generation history"""
        try:
            result = (self.client.table("generations")
                     .select("*")
                     .eq("user_id", user_id)
                     .order("created_at", desc=True)
                     .limit(limit)
                     .offset(offset)
                     .execute())
            return result.data
        except Exception as e:
            self.logger.error(f"Failed to get user generations: {e}")
            return []
    
    def get_public_generations(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get public generations for gallery"""
        try:
            result = (self.client.table("public_gallery")
                     .select("*")
                     .limit(limit)
                     .offset(offset)
                     .execute())
            return result.data
        except Exception as e:
            self.logger.error(f"Failed to get public generations: {e}")
            return []
    
    def get_generation_by_id(self, generation_id: str) -> Optional[Dict[str, Any]]:
        """Get generation by ID"""
        try:
            result = self.client.table("generations").select("*").eq("id", generation_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Failed to get generation: {e}")
            return None
    
    # ============================================================================
    # SOCIAL FEATURES
    # ============================================================================
    
    def add_like(self, user_id: str, generation_id: str) -> Dict[str, Any]:
        """Add like to generation"""
        try:
            result = self.client.table("likes").insert({
                "user_id": user_id,
                "generation_id": generation_id
            }).execute()
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to add like: {e}")
            return {"success": False, "error": str(e)}
    
    def remove_like(self, user_id: str, generation_id: str) -> Dict[str, Any]:
        """Remove like from generation"""
        try:
            result = (self.client.table("likes")
                     .delete()
                     .eq("user_id", user_id)
                     .eq("generation_id", generation_id)
                     .execute())
            return {"success": True, "data": result.data}
        except Exception as e:
            self.logger.error(f"Failed to remove like: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_likes(self, user_id: str, generation_id: str = None) -> List[Dict[str, Any]]:
        """Check if user has liked a generation or get all user likes"""
        try:
            query = self.client.table("likes").select("*").eq("user_id", user_id)
            if generation_id:
                query = query.eq("generation_id", generation_id)
            result = query.execute()
            return result.data
        except Exception as e:
            self.logger.error(f"Failed to get user likes: {e}")
            return []
    
    def add_comment(self, user_id: str, generation_id: str, content: str) -> Dict[str, Any]:
        """Add comment to generation"""
        try:
            result = self.client.table("comments").insert({
                "user_id": user_id,
                "generation_id": generation_id,
                "content": content
            }).execute()
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to add comment: {e}")
            return {"success": False, "error": str(e)}
    
    def get_generation_comments(self, generation_id: str) -> List[Dict[str, Any]]:
        """Get comments for a generation"""
        try:
            result = (self.client.table("comments")
                     .select("*, profiles(username, avatar_url)")
                     .eq("generation_id", generation_id)
                     .order("created_at", desc=False)
                     .execute())
            return result.data
        except Exception as e:
            self.logger.error(f"Failed to get comments: {e}")
            return []
    
    def follow_user(self, follower_id: str, following_id: str) -> Dict[str, Any]:
        """Follow a user"""
        try:
            result = self.client.table("follows").insert({
                "follower_id": follower_id,
                "following_id": following_id
            }).execute()
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to follow user: {e}")
            return {"success": False, "error": str(e)}
    
    def unfollow_user(self, follower_id: str, following_id: str) -> Dict[str, Any]:
        """Unfollow a user"""
        try:
            result = (self.client.table("follows")
                     .delete()
                     .eq("follower_id", follower_id)
                     .eq("following_id", following_id)
                     .execute())
            return {"success": True, "data": result.data}
        except Exception as e:
            self.logger.error(f"Failed to unfollow user: {e}")
            return {"success": False, "error": str(e)}
    
    # ============================================================================
    # COLLECTIONS
    # ============================================================================
    
    def create_collection(self, user_id: str, collection_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new collection"""
        try:
            collection_data["user_id"] = user_id
            result = self.client.table("collections").insert(collection_data).execute()
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to create collection: {e}")
            return {"success": False, "error": str(e)}
    
    def add_to_collection(self, collection_id: str, generation_id: str) -> Dict[str, Any]:
        """Add generation to collection"""
        try:
            result = self.client.table("collection_generations").insert({
                "collection_id": collection_id,
                "generation_id": generation_id
            }).execute()
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to add to collection: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_collections(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's collections"""
        try:
            result = (self.client.table("collections")
                     .select("*")
                     .eq("user_id", user_id)
                     .order("created_at", desc=True)
                     .execute())
            return result.data
        except Exception as e:
            self.logger.error(f"Failed to get user collections: {e}")
            return []
    
    # ============================================================================
    # STORAGE OPERATIONS
    # ============================================================================
    
    def upload_image(self, bucket: str, file_path: str, file_data: bytes, content_type: str = "image/jpeg") -> Dict[str, Any]:
        """Upload image to Supabase Storage"""
        try:
            result = self.client.storage.from_(bucket).upload(file_path, file_data, {
                "content-type": content_type
            })
            
            if result:
                # Get public URL
                public_url = self.client.storage.from_(bucket).get_public_url(file_path)
                return {"success": True, "path": file_path, "url": public_url}
            else:
                return {"success": False, "error": "Upload failed"}
        except Exception as e:
            self.logger.error(f"Failed to upload image: {e}")
            return {"success": False, "error": str(e)}
    
    def delete_image(self, bucket: str, file_path: str) -> Dict[str, Any]:
        """Delete image from Supabase Storage"""
        try:
            result = self.client.storage.from_(bucket).remove([file_path])
            return {"success": True, "data": result}
        except Exception as e:
            self.logger.error(f"Failed to delete image: {e}")
            return {"success": False, "error": str(e)}
    
    def get_image_url(self, bucket: str, file_path: str, transform: Dict[str, Any] = None) -> str:
        """Get public URL for image with optional transformations"""
        try:
            if transform:
                # Apply transformations (resize, format, quality)
                return self.client.storage.from_(bucket).get_public_url(file_path, transform)
            else:
                return self.client.storage.from_(bucket).get_public_url(file_path)
        except Exception as e:
            self.logger.error(f"Failed to get image URL: {e}")
            return ""
    
    # ============================================================================
    # SUBSCRIPTION MANAGEMENT
    # ============================================================================
    
    def get_user_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's current subscription"""
        try:
            result = (self.client.table("payment_subscriptions")
                     .select("*")
                     .eq("user_id", user_id)
                     .eq("status", "active")
                     .execute())
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Failed to get user subscription: {e}")
            return None
    
    def update_subscription_usage(self, user_id: str, increment: int = 1) -> Dict[str, Any]:
        """Update subscription generation usage"""
        try:
            # Get current subscription
            subscription = self.get_user_subscription(user_id)
            if not subscription:
                return {"success": False, "error": "No active subscription found"}
            
            # Update usage
            new_usage = subscription["generations_used"] + increment
            result = (self.client.table("payment_subscriptions")
                     .update({"generations_used": new_usage})
                     .eq("user_id", user_id)
                     .eq("status", "active")
                     .execute())
            
            return {"success": True, "data": result.data[0]}
        except Exception as e:
            self.logger.error(f"Failed to update subscription usage: {e}")
            return {"success": False, "error": str(e)}
    
    def check_generation_limit(self, user_id: str) -> Dict[str, Any]:
        """Check if user can generate more images"""
        try:
            subscription = self.get_user_subscription(user_id)
            if not subscription:
                return {"can_generate": False, "reason": "No active subscription"}
            
            remaining = subscription["generations_limit"] - subscription["generations_used"]
            return {
                "can_generate": remaining > 0,
                "remaining": remaining,
                "limit": subscription["generations_limit"],
                "used": subscription["generations_used"]
            }
        except Exception as e:
            self.logger.error(f"Failed to check generation limit: {e}")
            return {"can_generate": False, "reason": "Error checking limit"}

# Global service instance
supabase_service = SupabaseService()