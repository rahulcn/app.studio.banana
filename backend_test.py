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
def test_all_category_fix():
    """Test the All category filtering fix"""
    print("=" * 80)
    print("🧪 TESTING ALL CATEGORY FILTERING FIX")
    print("=" * 80)
    
    test_results = []
    
    # Test 1: GET /api/prompts - should include "All" as first category
    print("\n📋 TEST 1: Main prompts endpoint should include 'All' category")
    result = test_api_endpoint("GET", "/prompts")
    
    if result["success"]:
        data = result["data"]
        categories = data.get("categories", [])
        total_count = data.get("total_count", 0)
        
        # Check if "All" is the first category
        if categories and categories[0] == "All":
            print("   ✅ 'All' is correctly the first category")
            test_results.append({"test": "Main prompts endpoint - All category first", "status": "PASS"})
        else:
            print(f"   ❌ 'All' is not the first category. Categories: {categories}")
            test_results.append({"test": "Main prompts endpoint - All category first", "status": "FAIL", "error": f"Categories: {categories}"})
        
        # Check expected categories
        expected_categories = ["All", "Professional", "Artistic", "Lifestyle"]
        if categories == expected_categories:
            print("   ✅ Categories match expected list")
            test_results.append({"test": "Main prompts endpoint - correct categories", "status": "PASS"})
        else:
            print(f"   ❌ Categories don't match. Expected: {expected_categories}, Got: {categories}")
            test_results.append({"test": "Main prompts endpoint - correct categories", "status": "FAIL", "error": f"Got: {categories}"})
        
        # Check total count is 12
        if total_count == 12:
            print("   ✅ Total count is 12 prompts")
            test_results.append({"test": "Main prompts endpoint - total count", "status": "PASS"})
        else:
            print(f"   ❌ Total count is {total_count}, expected 12")
            test_results.append({"test": "Main prompts endpoint - total count", "status": "FAIL", "error": f"Got: {total_count}"})
    else:
        print(f"   ❌ Request failed: {result.get('error', 'Unknown error')}")
        test_results.append({"test": "Main prompts endpoint", "status": "FAIL", "error": result.get('error', 'Unknown error')})
    
    # Test 2: GET /api/prompts/categories/All - should return all 12 prompts
    print("\n📋 TEST 2: All category should return all 12 prompts")
    result = test_api_endpoint("GET", "/prompts/categories/All")
    
    if result["success"]:
        data = result["data"]
        prompts = data.get("prompts", [])
        category = data.get("category", "")
        count = data.get("count", 0)
        
        if count == 12:
            print("   ✅ All category returns 12 prompts")
            test_results.append({"test": "All category - count", "status": "PASS"})
        else:
            print(f"   ❌ All category returns {count} prompts, expected 12")
            test_results.append({"test": "All category - count", "status": "FAIL", "error": f"Got: {count}"})
        
        if category == "All":
            print("   ✅ Category field is 'All'")
            test_results.append({"test": "All category - category field", "status": "PASS"})
        else:
            print(f"   ❌ Category field is '{category}', expected 'All'")
            test_results.append({"test": "All category - category field", "status": "FAIL", "error": f"Got: {category}"})
        
        # Check that all categories are represented
        categories_found = set()
        for prompt in prompts:
            categories_found.add(prompt.get("category", ""))
        
        expected_categories = {"Professional", "Artistic", "Lifestyle"}
        if categories_found == expected_categories:
            print("   ✅ All categories represented in results")
            test_results.append({"test": "All category - all categories represented", "status": "PASS"})
        else:
            print(f"   ❌ Categories found: {categories_found}, expected: {expected_categories}")
            test_results.append({"test": "All category - all categories represented", "status": "FAIL", "error": f"Found: {categories_found}"})
    else:
        print(f"   ❌ Request failed: {result.get('error', 'Unknown error')}")
        test_results.append({"test": "All category endpoint", "status": "FAIL", "error": result.get('error', 'Unknown error')})
    
    # Test 3: GET /api/prompts/categories/Professional - should return 6 prompts
    print("\n📋 TEST 3: Professional category should return 6 prompts")
    result = test_api_endpoint("GET", "/prompts/categories/Professional")
    
    if result["success"]:
        data = result["data"]
        count = data.get("count", 0)
        category = data.get("category", "")
        
        if count == 6:
            print("   ✅ Professional category returns 6 prompts")
            test_results.append({"test": "Professional category - count", "status": "PASS"})
        else:
            print(f"   ❌ Professional category returns {count} prompts, expected 6")
            test_results.append({"test": "Professional category - count", "status": "FAIL", "error": f"Got: {count}"})
        
        if category == "Professional":
            print("   ✅ Category field is 'Professional'")
            test_results.append({"test": "Professional category - category field", "status": "PASS"})
        else:
            print(f"   ❌ Category field is '{category}', expected 'Professional'")
            test_results.append({"test": "Professional category - category field", "status": "FAIL", "error": f"Got: {category}"})
    else:
        print(f"   ❌ Request failed: {result.get('error', 'Unknown error')}")
        test_results.append({"test": "Professional category endpoint", "status": "FAIL", "error": result.get('error', 'Unknown error')})
    
    # Test 4: GET /api/prompts/categories/Artistic - should return 4 prompts
    print("\n📋 TEST 4: Artistic category should return 4 prompts")
    result = test_api_endpoint("GET", "/prompts/categories/Artistic")
    
    if result["success"]:
        data = result["data"]
        count = data.get("count", 0)
        category = data.get("category", "")
        
        if count == 4:
            print("   ✅ Artistic category returns 4 prompts")
            test_results.append({"test": "Artistic category - count", "status": "PASS"})
        else:
            print(f"   ❌ Artistic category returns {count} prompts, expected 4")
            test_results.append({"test": "Artistic category - count", "status": "FAIL", "error": f"Got: {count}"})
        
        if category == "Artistic":
            print("   ✅ Category field is 'Artistic'")
            test_results.append({"test": "Artistic category - category field", "status": "PASS"})
        else:
            print(f"   ❌ Category field is '{category}', expected 'Artistic'")
            test_results.append({"test": "Artistic category - category field", "status": "FAIL", "error": f"Got: {category}"})
    else:
        print(f"   ❌ Request failed: {result.get('error', 'Unknown error')}")
        test_results.append({"test": "Artistic category endpoint", "status": "FAIL", "error": result.get('error', 'Unknown error')})
    
    # Test 5: GET /api/prompts/categories/Lifestyle - should return 2 prompts
    print("\n📋 TEST 5: Lifestyle category should return 2 prompts")
    result = test_api_endpoint("GET", "/prompts/categories/Lifestyle")
    
    if result["success"]:
        data = result["data"]
        count = data.get("count", 0)
        category = data.get("category", "")
        
        if count == 2:
            print("   ✅ Lifestyle category returns 2 prompts")
            test_results.append({"test": "Lifestyle category - count", "status": "PASS"})
        else:
            print(f"   ❌ Lifestyle category returns {count} prompts, expected 2")
            test_results.append({"test": "Lifestyle category - count", "status": "FAIL", "error": f"Got: {count}"})
        
        if category == "Lifestyle":
            print("   ✅ Category field is 'Lifestyle'")
            test_results.append({"test": "Lifestyle category - category field", "status": "PASS"})
        else:
            print(f"   ❌ Category field is '{category}', expected 'Lifestyle'")
            test_results.append({"test": "Lifestyle category - category field", "status": "FAIL", "error": f"Got: {category}"})
    else:
        print(f"   ❌ Request failed: {result.get('error', 'Unknown error')}")
        test_results.append({"test": "Lifestyle category endpoint", "status": "FAIL", "error": result.get('error', 'Unknown error')})
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    passed_tests = [t for t in test_results if t["status"] == "PASS"]
    failed_tests = [t for t in test_results if t["status"] == "FAIL"]
    
    print(f"✅ PASSED: {len(passed_tests)}")
    print(f"❌ FAILED: {len(failed_tests)}")
    print(f"📈 SUCCESS RATE: {len(passed_tests)}/{len(test_results)} ({len(passed_tests)/len(test_results)*100:.1f}%)")
    
    if failed_tests:
        print("\n❌ FAILED TESTS:")
        for test in failed_tests:
            print(f"   • {test['test']}: {test.get('error', 'Unknown error')}")
    
    return len(failed_tests) == 0

if __name__ == "__main__":
    print("🚀 Starting All Category Filtering Fix Tests...")
    success = test_all_category_fix()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! The All category filtering fix is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 SOME TESTS FAILED! Please check the issues above.")
        sys.exit(1)