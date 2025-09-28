#!/usr/bin/env python3
"""
Backend Testing Suite for Curated Prompt System
Tests the new curated prompt selection system with NanoBanana API integration
"""

import requests
import json
import base64
import time
from typing import Dict, Any
import os

# Backend URL from environment
BACKEND_URL = "https://aicanvas-39.preview.emergentagent.com/api"

# Sample base64 image for testing (small test image)
SAMPLE_IMAGE_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="

class CuratedPromptTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
            
        result = f"{status} - {test_name}"
        if details:
            result += f": {details}"
            
        self.test_results.append(result)
        print(result)

    def test_health_endpoint(self):
        """Test basic health endpoint"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True, "Backend is running")
                    return True
                else:
                    self.log_test("Health Check", False, f"Unexpected status: {data}")
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False

def test_get_prompts():
    """Test fetching predefined prompt categories"""
    try:
        response = requests.get(f"{BACKEND_URL}/prompts", timeout=10)
        if response.status_code == 200:
            data = response.json()
            prompts = data.get("prompts", [])
            
            if len(prompts) > 0:
                # Check if expected categories exist
                expected_categories = ["artistic", "fantasy", "vintage", "creative"]
                found_categories = [p.get("id") for p in prompts]
                
                missing_categories = [cat for cat in expected_categories if cat not in found_categories]
                
                if not missing_categories:
                    log_test("Get Prompts", "PASS", f"Found {len(prompts)} categories: {found_categories}")
                    return prompts
                else:
                    log_test("Get Prompts", "FAIL", f"Missing categories: {missing_categories}")
                    return None
            else:
                log_test("Get Prompts", "FAIL", "No prompts returned")
                return None
        else:
            log_test("Get Prompts", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Get Prompts", "FAIL", f"Exception: {str(e)}")
        return None

def test_image_generation():
    """Test text-to-image generation without uploaded image"""
    try:
        payload = {
            "prompt": "A beautiful sunset over mountains with vibrant colors",
            "prompt_category": "artistic"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/generate-image", 
            json=payload, 
            timeout=60  # Longer timeout for AI generation
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            required_fields = ["id", "prompt", "generated_image", "created_at"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                # Verify base64 image data
                if data["generated_image"] and len(data["generated_image"]) > 100:
                    log_test("Image Generation", "PASS", f"Generated image ID: {data['id']}")
                    return data
                else:
                    log_test("Image Generation", "FAIL", "Generated image data is invalid or empty")
                    return None
            else:
                log_test("Image Generation", "FAIL", f"Missing fields: {missing_fields}")
                return None
        else:
            log_test("Image Generation", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Image Generation", "FAIL", f"Exception: {str(e)}")
        return None

def test_image_editing():
    """Test image transformation with uploaded base64 image + prompt"""
    try:
        # Create test image
        test_image_b64 = create_test_image_base64()
        if not test_image_b64:
            log_test("Image Editing", "FAIL", "Could not create test image")
            return None
        
        payload = {
            "prompt": "Transform this into a beautiful watercolor painting with soft brushstrokes",
            "image_data": test_image_b64,
            "prompt_category": "artistic"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/generate-image", 
            json=payload, 
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            required_fields = ["id", "prompt", "generated_image", "original_image", "created_at"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                # Verify both original and generated images
                if (data["generated_image"] and len(data["generated_image"]) > 100 and
                    data["original_image"] and len(data["original_image"]) > 100):
                    log_test("Image Editing", "PASS", f"Edited image ID: {data['id']}")
                    return data
                else:
                    log_test("Image Editing", "FAIL", "Image data is invalid or empty")
                    return None
            else:
                log_test("Image Editing", "FAIL", f"Missing fields: {missing_fields}")
                return None
        else:
            log_test("Image Editing", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Image Editing", "FAIL", f"Exception: {str(e)}")
        return None

def test_get_images():
    """Test fetching user's image gallery"""
    try:
        response = requests.get(f"{BACKEND_URL}/images", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            images = data.get("images", [])
            
            log_test("Get Images Gallery", "PASS", f"Retrieved {len(images)} images")
            return images
        else:
            log_test("Get Images Gallery", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Get Images Gallery", "FAIL", f"Exception: {str(e)}")
        return None

def test_get_specific_image(image_id):
    """Test fetching specific image by ID"""
    try:
        response = requests.get(f"{BACKEND_URL}/images/{image_id}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            required_fields = ["id", "prompt", "generated_image", "created_at"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                log_test("Get Specific Image", "PASS", f"Retrieved image: {image_id}")
                return data
            else:
                log_test("Get Specific Image", "FAIL", f"Missing fields: {missing_fields}")
                return None
        elif response.status_code == 404:
            log_test("Get Specific Image", "FAIL", f"Image not found: {image_id}")
            return None
        else:
            log_test("Get Specific Image", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Get Specific Image", "FAIL", f"Exception: {str(e)}")
        return None

def test_delete_image(image_id):
    """Test deleting specific image"""
    try:
        response = requests.delete(f"{BACKEND_URL}/images/{image_id}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "deleted" in data["message"].lower():
                log_test("Delete Image", "PASS", f"Deleted image: {image_id}")
                return True
            else:
                log_test("Delete Image", "FAIL", f"Unexpected response: {data}")
                return False
        elif response.status_code == 404:
            log_test("Delete Image", "FAIL", f"Image not found: {image_id}")
            return False
        else:
            log_test("Delete Image", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Delete Image", "FAIL", f"Exception: {str(e)}")
        return False

def test_error_handling():
    """Test error handling for invalid requests"""
    print("\n🧪 Testing Error Handling...")
    
    # Test invalid image generation request
    try:
        payload = {}  # Empty payload
        response = requests.post(f"{BACKEND_URL}/generate-image", json=payload, timeout=10)
        if response.status_code == 422:  # Validation error
            log_test("Error Handling - Empty Payload", "PASS", "Correctly rejected empty payload")
        else:
            log_test("Error Handling - Empty Payload", "FAIL", f"Unexpected status: {response.status_code}")
    except Exception as e:
        log_test("Error Handling - Empty Payload", "FAIL", f"Exception: {str(e)}")
    
    # Test invalid image ID
    try:
        response = requests.get(f"{BACKEND_URL}/images/invalid_id", timeout=10)
        if response.status_code == 400:  # Bad request
            log_test("Error Handling - Invalid ID", "PASS", "Correctly rejected invalid image ID")
        else:
            log_test("Error Handling - Invalid ID", "FAIL", f"Unexpected status: {response.status_code}")
    except Exception as e:
        log_test("Error Handling - Invalid ID", "FAIL", f"Exception: {str(e)}")

def run_comprehensive_tests():
    """Run all backend API tests"""
    print("🚀 Starting Comprehensive Backend API Testing...")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    # Test 1: Health Check
    print("\n🏥 Testing Health Check...")
    health_ok = test_health_check()
    
    if not health_ok:
        print("❌ Health check failed. Stopping tests.")
        return
    
    # Test 2: Get Prompts
    print("\n📝 Testing Prompt Categories...")
    prompts = test_get_prompts()
    
    # Test 3: Image Generation (text-to-image)
    print("\n🎨 Testing Image Generation...")
    generated_image = test_image_generation()
    
    # Test 4: Image Editing (with uploaded image)
    print("\n✏️ Testing Image Editing...")
    edited_image = test_image_editing()
    
    # Test 5: Get Images Gallery
    print("\n🖼️ Testing Image Gallery...")
    images = test_get_images()
    
    # Test 6: Get Specific Image (if we have images)
    if images and len(images) > 0:
        print("\n🔍 Testing Get Specific Image...")
        test_image_id = images[0].get("id")
        if test_image_id:
            test_get_specific_image(test_image_id)
    
    # Test 7: Delete Image (if we generated one)
    test_image_to_delete = None
    if generated_image:
        test_image_to_delete = generated_image.get("id")
    elif edited_image:
        test_image_to_delete = edited_image.get("id")
    
    if test_image_to_delete:
        print("\n🗑️ Testing Image Deletion...")
        test_delete_image(test_image_to_delete)
    
    # Test 8: Error Handling
    test_error_handling()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = len([r for r in TEST_RESULTS if r["status"] == "PASS"])
    failed = len([r for r in TEST_RESULTS if r["status"] == "FAIL"])
    
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
    
    if failed > 0:
        print("\n❌ FAILED TESTS:")
        for result in TEST_RESULTS:
            if result["status"] == "FAIL":
                print(f"   • {result['test']}: {result['details']}")
    
    return TEST_RESULTS

if __name__ == "__main__":
    results = run_comprehensive_tests()