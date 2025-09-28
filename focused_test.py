#!/usr/bin/env python3
"""
Focused NanoBanana API Integration Test
Tests the specific functionality requested in the review.
"""

import requests
import json
import base64
from datetime import datetime

# Backend URL from frontend env
BACKEND_URL = "https://aicanvas-39.preview.emergentagent.com/api"

def test_1_health_endpoint():
    """Test 1: Health endpoint to confirm backend is running"""
    print("🔍 Test 1: Testing health endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            if data.get("status") == "healthy":
                print("   ✅ PASS: Backend is running and healthy")
                return True
            else:
                print("   ❌ FAIL: Unexpected health response")
                return False
        else:
            print(f"   ❌ FAIL: Health check returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ FAIL: Health check failed with error: {str(e)}")
        return False

def test_2_generate_image():
    """Test 2: Generate image endpoint with simple text prompt"""
    print("\n🎨 Test 2: Testing generate-image endpoint...")
    try:
        test_prompt = "A beautiful sunset over mountains with vibrant colors"
        payload = {
            "prompt": test_prompt,
            "style": "photorealistic"
        }
        
        print(f"   Sending request with prompt: '{test_prompt}'")
        print("   ⏳ Generating image... (this may take 10-30 seconds)")
        
        response = requests.post(
            f"{BACKEND_URL}/generate-image", 
            json=payload, 
            timeout=60
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response keys: {list(data.keys())}")
            
            # Check required fields
            required_fields = ["id", "prompt", "generated_image", "created_at", "success"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"   ❌ FAIL: Missing required fields: {missing_fields}")
                return False, None
            
            # Validate image data
            if data.get("generated_image"):
                image_data = data["generated_image"]
                print(f"   Generated image size: {len(image_data)} characters")
                
                # Basic base64 validation
                try:
                    base64.b64decode(image_data)
                    print("   ✅ PASS: NanoBanana API generated valid base64 image")
                    return True, data["id"]
                except:
                    print("   ❌ FAIL: Generated image is not valid base64")
                    return False, None
            else:
                print("   ❌ FAIL: No generated image data in response")
                return False, None
        else:
            print(f"   ❌ FAIL: Image generation failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error details: {error_data}")
            except:
                print(f"   Error response: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"   ❌ FAIL: Image generation failed with error: {str(e)}")
        return False, None

def test_3_mongodb_storage(image_id):
    """Test 3: Verify generated images are stored in MongoDB properly"""
    print(f"\n💾 Test 3: Testing MongoDB storage...")
    
    if not image_id:
        print("   ❌ FAIL: No image ID provided for MongoDB test")
        return False
    
    try:
        print(f"   Retrieving image with ID: {image_id}")
        response = requests.get(f"{BACKEND_URL}/images/{image_id}", timeout=10)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Retrieved image keys: {list(data.keys())}")
            
            # Check required MongoDB fields
            required_fields = ["id", "prompt", "generated_image", "created_at"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"   ❌ FAIL: Missing required fields in stored image: {missing_fields}")
                return False
            
            # Validate stored data
            if data.get("generated_image"):
                stored_image_size = len(data['generated_image'])
                print(f"   Stored image size: {stored_image_size} characters")
                
                # Verify it's valid base64
                try:
                    base64.b64decode(data['generated_image'])
                    print("   ✅ PASS: Image properly stored in MongoDB with valid base64 format")
                except:
                    print("   ❌ FAIL: Stored image is not valid base64")
                    return False
            else:
                print("   ❌ FAIL: No image data in stored record")
                return False
            
            # Check metadata
            if data.get("created_at"):
                print(f"   Created at: {data['created_at']}")
                print("   ✅ PASS: Metadata properly stored")
            
            return True
        else:
            print(f"   ❌ FAIL: Failed to retrieve image from MongoDB - status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ FAIL: MongoDB storage test failed with error: {str(e)}")
        return False

def test_4_image_retrieval():
    """Test 4: Test image retrieval from database"""
    print("\n📋 Test 4: Testing image retrieval from database...")
    try:
        response = requests.get(f"{BACKEND_URL}/images?limit=5", timeout=10)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response keys: {list(data.keys())}")
            
            if "images" in data:
                images = data["images"]
                print(f"   Retrieved {len(images)} images from database")
                
                if len(images) > 0:
                    # Check first image structure
                    first_image = images[0]
                    print(f"   First image keys: {list(first_image.keys())}")
                    
                    required_fields = ["id", "prompt", "generated_image", "created_at"]
                    missing_fields = [field for field in required_fields if field not in first_image]
                    
                    if missing_fields:
                        print(f"   ❌ FAIL: Missing required fields in retrieved image: {missing_fields}")
                        return False
                    
                    print("   ✅ PASS: Image retrieval working properly")
                    return True
                else:
                    print("   ⚠️  No images found in database (this might be expected for a fresh install)")
                    print("   ✅ PASS: Endpoint working, no data yet")
                    return True
            else:
                print("   ❌ FAIL: No 'images' key in response")
                return False
        else:
            print(f"   ❌ FAIL: Image retrieval failed - status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ FAIL: Image retrieval test failed with error: {str(e)}")
        return False

def main():
    """Run the focused tests as requested in the review"""
    print("🚀 NanoBanana API Integration Test")
    print("Testing core functionality as requested in review")
    print("=" * 60)
    
    test_results = {}
    
    # Test 1: Health Check
    test_results["health"] = test_1_health_endpoint()
    
    # Test 2: Image Generation (only if health check passes)
    if test_results["health"]:
        success, image_id = test_2_generate_image()
        test_results["generation"] = success
        
        # Test 3: MongoDB Storage (only if generation succeeded)
        if success and image_id:
            test_results["mongodb"] = test_3_mongodb_storage(image_id)
        else:
            test_results["mongodb"] = False
            print("\n💾 Skipping MongoDB test - no image generated")
    else:
        test_results["generation"] = False
        test_results["mongodb"] = False
        print("\n🎨 Skipping image generation test - backend not healthy")
        print("\n💾 Skipping MongoDB test - backend not healthy")
    
    # Test 4: Image Retrieval (only if health check passes)
    if test_results["health"]:
        test_results["retrieval"] = test_4_image_retrieval()
    else:
        test_results["retrieval"] = False
        print("\n📋 Skipping image retrieval test - backend not healthy")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 FOCUSED TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results.values() if result)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.upper()}: {status}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed ({(passed_tests/total_tests)*100:.1f}%)")
    
    if passed_tests == total_tests:
        print("\n🎉 SUCCESS: All core NanoBanana API integration tests passed!")
        print("✅ Backend is running properly")
        print("✅ NanoBanana API is working and generating images")
        print("✅ MongoDB storage is working with base64 format")
        print("✅ Image retrieval from database is functional")
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed. Check details above.")
    
    return test_results

if __name__ == "__main__":
    main()