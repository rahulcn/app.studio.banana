#!/usr/bin/env python3
"""
Backend API Testing Suite for AI Image Generation App
Tests all core backend functionality including NanoBanana API integration
"""

import requests
import json
import base64
import time
import sys
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from frontend environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://piccraft-11.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"🔗 Testing backend at: {API_BASE}")

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(test_name, status, details=""):
    """Log test result"""
    test_results["tests"].append({
        "name": test_name,
        "status": status,
        "details": details,
        "timestamp": datetime.now().isoformat()
    })
    
    if status == "PASS":
        test_results["passed"] += 1
        print(f"✅ {test_name}: PASSED")
    else:
        test_results["failed"] += 1
        print(f"❌ {test_name}: FAILED - {details}")
    
    if details:
        print(f"   Details: {details}")

def create_sample_image_base64():
    """Create a small sample image in base64 format for testing"""
    # Create a minimal 1x1 pixel PNG in base64
    # This is a valid PNG image data
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

def test_api_endpoint(method: str, endpoint: str, expected_status: int = 200, data: dict = None, timeout: int = 30):
    """Test an API endpoint and return results"""
    url = f"{API_BASE}{endpoint}"
    
    try:
        print(f"\n🔍 Testing {method} {endpoint}")
        print(f"   URL: {url}")
        
        if method.upper() == "GET":
            response = requests.get(url, timeout=timeout)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, timeout=timeout)
        else:
            return {"success": False, "error": f"Unsupported method: {method}"}
        
        print(f"   Status: {response.status_code}")
        
        # Check status code
        if response.status_code != expected_status:
            return {
                "success": False,
                "status_code": response.status_code,
                "expected_status": expected_status,
                "error": f"Expected status {expected_status}, got {response.status_code}",
                "response_text": response.text[:500]
            }
        
        # Parse JSON response
        try:
            response_data = response.json()
            return {
                "success": True,
                "status_code": response.status_code,
                "data": response_data
            }
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Invalid JSON response",
                "response_text": response.text[:500]
            }
            
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Request failed: {str(e)}"
        }
def test_health_endpoint():
    """Test 1: Health Check Endpoint"""
    print("\n📋 TEST 1: Health Check Endpoint")
    result = test_api_endpoint("GET", "/health")
    
    if result["success"]:
        data = result["data"]
        if data.get("status") == "healthy":
            log_test("Health Check", "PASS", f"Service: {data.get('service')}, Version: {data.get('version')}")
            return True
        else:
            log_test("Health Check", "FAIL", f"Unexpected response: {data}")
            return False
    else:
        log_test("Health Check", "FAIL", result.get("error", "Unknown error"))
        return False

def test_curated_prompts_endpoint():
    """Test 2: Curated Prompts System - Main endpoint"""
    print("\n📋 TEST 2: Curated Prompts Main Endpoint")
    result = test_api_endpoint("GET", "/prompts")
    
    if result["success"]:
        data = result["data"]
        prompts = data.get("prompts", [])
        categories = data.get("categories", [])
        total_count = data.get("total_count", 0)
        
        if len(prompts) == 12 and total_count == 12:
            if "All" in categories and len(categories) == 4:
                log_test("Curated Prompts Main", "PASS", f"Found {len(prompts)} prompts with categories: {categories}")
                return True
            else:
                log_test("Curated Prompts Main", "FAIL", f"Categories issue: {categories}")
                return False
        else:
            log_test("Curated Prompts Main", "FAIL", f"Expected 12 prompts, got {len(prompts)}")
            return False
    else:
        log_test("Curated Prompts Main", "FAIL", result.get("error", "Unknown error"))
        return False

def test_all_category_endpoint():
    """Test 3: Curated Prompts System - All category filtering"""
    print("\n📋 TEST 3: All Category Filtering")
    result = test_api_endpoint("GET", "/prompts/categories/All")
    
    if result["success"]:
        data = result["data"]
        prompts = data.get("prompts", [])
        category = data.get("category", "")
        count = data.get("count", 0)
        
        if len(prompts) == 12 and count == 12 and category == "All":
            log_test("All Category Filtering", "PASS", f"All category returns {count} prompts correctly")
            return True
        else:
            log_test("All Category Filtering", "FAIL", f"Expected 12 prompts in 'All', got {count}")
            return False
    else:
        log_test("All Category Filtering", "FAIL", result.get("error", "Unknown error"))
        return False

def test_specific_category_endpoints():
    """Test 4: Specific category filtering"""
    print("\n📋 TEST 4: Specific Category Filtering")
    categories_expected = {
        "Professional": 6,
        "Artistic": 4, 
        "Lifestyle": 2
    }
    
    all_passed = True
    
    for category, expected_count in categories_expected.items():
        result = test_api_endpoint("GET", f"/prompts/categories/{category}")
        
        if result["success"]:
            data = result["data"]
            prompts = data.get("prompts", [])
            count = data.get("count", 0)
            
            if len(prompts) == expected_count and count == expected_count:
                log_test(f"Category {category}", "PASS", f"Found {count} prompts")
            else:
                log_test(f"Category {category}", "FAIL", f"Expected {expected_count}, got {count}")
                all_passed = False
        else:
            log_test(f"Category {category}", "FAIL", result.get("error", "Unknown error"))
            all_passed = False
    
    return all_passed

def test_nanobanana_integration():
    """Test 5: NanoBanana API Integration - Generate with curated prompt"""
    print("\n📋 TEST 5: NanoBanana API Integration (Critical Test)")
    print("🎨 This test may take 30-60 seconds for AI image generation...")
    
    # Use a sample image for testing
    sample_image = create_sample_image_base64()
    
    # Test with prompt ID 1 (Black & White Artistic Portrait)
    payload = {
        "prompt_id": 1,
        "image_data": sample_image
    }
    
    result = test_api_endpoint("POST", "/generate-with-prompt", data=payload, timeout=120)
    
    if result["success"]:
        data = result["data"]
        
        # Check required fields
        required_fields = ["id", "prompt_id", "prompt_title", "generated_image", "success"]
        missing_fields = [field for field in required_fields if field not in data]
        
        if not missing_fields and data.get("success") == True:
            generated_image = data.get("generated_image", "")
            if generated_image and len(generated_image) > 100:  # Valid base64 image should be substantial
                log_test("NanoBanana Integration", "PASS", 
                       f"Generated image for prompt '{data.get('prompt_title')}', size: {len(generated_image)} chars")
                return True, data.get("id")
            else:
                log_test("NanoBanana Integration", "FAIL", "Generated image data is empty or too small")
                return False, None
        else:
            log_test("NanoBanana Integration", "FAIL", f"Missing fields: {missing_fields} or success=False")
            return False, None
    else:
        log_test("NanoBanana Integration", "FAIL", result.get("error", "Unknown error"))
        return False, None

def test_image_storage(image_id=None):
    """Test 6: Image Storage - Gallery retrieval"""
    print("\n📋 TEST 6: Image Storage System")
    result = test_api_endpoint("GET", "/images")
    
    if result["success"]:
        data = result["data"]
        images = data.get("images", [])
        
        if isinstance(images, list):
            log_test("Image Storage Gallery", "PASS", f"Retrieved {len(images)} images from gallery")
            
            # If we have an image_id from generation test, try to retrieve specific image
            if image_id and len(images) > 0:
                return test_specific_image_retrieval(image_id)
            return True
        else:
            log_test("Image Storage Gallery", "FAIL", "Images field is not a list")
            return False
    else:
        log_test("Image Storage Gallery", "FAIL", result.get("error", "Unknown error"))
        return False

def test_specific_image_retrieval(image_id):
    """Test 6b: Specific image retrieval"""
    print("\n📋 TEST 6b: Specific Image Retrieval")
    result = test_api_endpoint("GET", f"/images/{image_id}")
    
    if result["success"]:
        data = result["data"]
        if data.get("id") == image_id and "generated_image" in data:
            log_test("Specific Image Retrieval", "PASS", f"Retrieved image {image_id}")
            return True
        else:
            log_test("Specific Image Retrieval", "FAIL", "Image data incomplete")
            return False
    else:
        log_test("Specific Image Retrieval", "FAIL", result.get("error", "Unknown error"))
        return False

def test_stripe_payment_integration():
    """Test 7: Stripe Payment Integration"""
    print("\n📋 TEST 7: Stripe Payment Integration")
    result = test_api_endpoint("GET", "/payment/packages")
    
    if result["success"]:
        data = result["data"]
        packages = data.get("packages", {})
        
        # Check for expected packages
        expected_packages = ["pro_monthly", "pro_yearly"]
        found_packages = list(packages.keys())
        
        if all(pkg in found_packages for pkg in expected_packages):
            # Verify package structure
            pro_monthly = packages.get("pro_monthly", {})
            pro_yearly = packages.get("pro_yearly", {})
            
            if (pro_monthly.get("amount") == 9.99 and 
                pro_yearly.get("amount") == 99.99 and
                data.get("success") == True):
                log_test("Stripe Payment Packages", "PASS", 
                       f"Found packages: {found_packages} with correct pricing")
                return True
            else:
                log_test("Stripe Payment Packages", "FAIL", "Package pricing or structure incorrect")
                return False
        else:
            log_test("Stripe Payment Packages", "FAIL", f"Missing packages. Found: {found_packages}")
            return False
    else:
        log_test("Stripe Payment Packages", "FAIL", result.get("error", "Unknown error"))
        return False

def test_error_handling():
    """Test 8: Error handling for invalid requests"""
    print("\n📋 TEST 8: Error Handling")
    # Test invalid prompt ID
    payload = {
        "prompt_id": 999,  # Invalid ID
        "image_data": create_sample_image_base64()
    }
    
    result = test_api_endpoint("POST", "/generate-with-prompt", expected_status=404, data=payload)
    
    if result["success"]:
        log_test("Error Handling", "PASS", "Correctly handles invalid prompt ID with 404")
        return True
    else:
        log_test("Error Handling", "FAIL", f"Expected 404 for invalid prompt ID, got different response")
        return False

if __name__ == "__main__":
    print("🚀 Starting All Category Filtering Fix Tests...")
    success = test_all_category_fix()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! The All category filtering fix is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 SOME TESTS FAILED! Please check the issues above.")
        sys.exit(1)