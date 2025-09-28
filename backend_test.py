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
BACKEND_URL = "https://promptgen-7.preview.emergentagent.com/api"

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
    
    def test_get_all_prompts(self):
        """Test /api/prompts endpoint - should return all 12 curated prompts"""
        try:
            response = requests.get(f"{self.backend_url}/prompts", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Check structure
                if "prompts" not in data:
                    self.log_test("Get All Prompts", False, "Missing 'prompts' field")
                    return False
                    
                if "categories" not in data:
                    self.log_test("Get All Prompts", False, "Missing 'categories' field")
                    return False
                    
                if "total_count" not in data:
                    self.log_test("Get All Prompts", False, "Missing 'total_count' field")
                    return False
                
                # Check count
                prompts = data["prompts"]
                if len(prompts) != 12:
                    self.log_test("Get All Prompts", False, f"Expected 12 prompts, got {len(prompts)}")
                    return False
                
                if data["total_count"] != 12:
                    self.log_test("Get All Prompts", False, f"total_count should be 12, got {data['total_count']}")
                    return False
                
                # Check categories
                expected_categories = ["Professional", "Artistic", "Lifestyle"]
                if set(data["categories"]) != set(expected_categories):
                    self.log_test("Get All Prompts", False, f"Categories mismatch. Expected {expected_categories}, got {data['categories']}")
                    return False
                
                # Check prompt structure
                for i, prompt in enumerate(prompts):
                    required_fields = ["id", "title", "description", "prompt", "category"]
                    for field in required_fields:
                        if field not in prompt:
                            self.log_test("Get All Prompts", False, f"Prompt {i+1} missing field: {field}")
                            return False
                
                # Check specific prompts exist
                prompt_ids = [p["id"] for p in prompts]
                expected_ids = list(range(1, 13))  # 1 to 12
                if set(prompt_ids) != set(expected_ids):
                    self.log_test("Get All Prompts", False, f"Prompt IDs mismatch. Expected {expected_ids}, got {prompt_ids}")
                    return False
                
                self.log_test("Get All Prompts", True, f"All 12 prompts returned with correct structure")
                return True
                
            else:
                self.log_test("Get All Prompts", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get All Prompts", False, f"Error: {str(e)}")
            return False
    
    def test_get_prompts_by_category(self):
        """Test /api/prompts/categories/Professional endpoint"""
        try:
            response = requests.get(f"{self.backend_url}/prompts/categories/Professional", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Check structure
                if "prompts" not in data:
                    self.log_test("Get Prompts by Category", False, "Missing 'prompts' field")
                    return False
                    
                if "category" not in data:
                    self.log_test("Get Prompts by Category", False, "Missing 'category' field")
                    return False
                    
                if "count" not in data:
                    self.log_test("Get Prompts by Category", False, "Missing 'count' field")
                    return False
                
                # Check category
                if data["category"] != "Professional":
                    self.log_test("Get Prompts by Category", False, f"Expected category 'Professional', got '{data['category']}'")
                    return False
                
                # Check all returned prompts are Professional
                prompts = data["prompts"]
                for prompt in prompts:
                    if prompt["category"] != "Professional":
                        self.log_test("Get Prompts by Category", False, f"Found non-Professional prompt: {prompt['title']}")
                        return False
                
                # Check count matches
                if len(prompts) != data["count"]:
                    self.log_test("Get Prompts by Category", False, f"Count mismatch: {len(prompts)} vs {data['count']}")
                    return False
                
                # Should have multiple Professional prompts based on the code
                if len(prompts) < 3:
                    self.log_test("Get Prompts by Category", False, f"Expected multiple Professional prompts, got {len(prompts)}")
                    return False
                
                self.log_test("Get Prompts by Category", True, f"Found {len(prompts)} Professional prompts")
                return True
                
            else:
                self.log_test("Get Prompts by Category", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Prompts by Category", False, f"Error: {str(e)}")
            return False
    
    def test_invalid_category(self):
        """Test /api/prompts/categories with invalid category"""
        try:
            response = requests.get(f"{self.backend_url}/prompts/categories/InvalidCategory", timeout=10)
            if response.status_code == 404:
                self.log_test("Invalid Category Handling", True, "Correctly returns 404 for invalid category")
                return True
            else:
                self.log_test("Invalid Category Handling", False, f"Expected 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Invalid Category Handling", False, f"Error: {str(e)}")
            return False
    
    def test_generate_with_curated_prompt(self):
        """Test /api/generate-with-prompt endpoint with valid prompt_id and image"""
        try:
            # Test with prompt ID 1 (Black & White Artistic Portrait)
            payload = {
                "prompt_id": 1,
                "image_data": SAMPLE_IMAGE_BASE64
            }
            
            print("🎨 Testing curated prompt generation (this may take 30-60 seconds)...")
            response = requests.post(
                f"{self.backend_url}/generate-with-prompt", 
                json=payload, 
                timeout=120  # Longer timeout for image generation
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                required_fields = [
                    "id", "prompt_id", "prompt_title", "prompt_description", 
                    "prompt_category", "generated_image", "original_image", 
                    "created_at", "success"
                ]
                
                for field in required_fields:
                    if field not in data:
                        self.log_test("Generate with Curated Prompt", False, f"Missing field: {field}")
                        return False
                
                # Check specific values
                if data["prompt_id"] != 1:
                    self.log_test("Generate with Curated Prompt", False, f"Wrong prompt_id: {data['prompt_id']}")
                    return False
                
                if data["prompt_title"] != "Black & White Artistic Portrait":
                    self.log_test("Generate with Curated Prompt", False, f"Wrong prompt_title: {data['prompt_title']}")
                    return False
                
                if data["prompt_category"] != "Professional":
                    self.log_test("Generate with Curated Prompt", False, f"Wrong category: {data['prompt_category']}")
                    return False
                
                if not data["success"]:
                    self.log_test("Generate with Curated Prompt", False, "Success flag is False")
                    return False
                
                # Check generated image exists and is base64
                if not data["generated_image"]:
                    self.log_test("Generate with Curated Prompt", False, "No generated image data")
                    return False
                
                if len(data["generated_image"]) < 100:
                    self.log_test("Generate with Curated Prompt", False, "Generated image data too short")
                    return False
                
                # Check original image matches
                if data["original_image"] != SAMPLE_IMAGE_BASE64:
                    self.log_test("Generate with Curated Prompt", False, "Original image data mismatch")
                    return False
                
                self.log_test("Generate with Curated Prompt", True, f"Successfully generated image with curated prompt. Image size: {len(data['generated_image'])} chars")
                return True
                
            else:
                error_text = response.text if response.text else "No error details"
                self.log_test("Generate with Curated Prompt", False, f"HTTP {response.status_code}: {error_text}")
                return False
                
        except requests.exceptions.Timeout:
            self.log_test("Generate with Curated Prompt", False, "Request timeout (>120s) - NanoBanana API may be slow")
            return False
        except Exception as e:
            self.log_test("Generate with Curated Prompt", False, f"Error: {str(e)}")
            return False
    
    def test_generate_with_invalid_prompt_id(self):
        """Test /api/generate-with-prompt with invalid prompt_id"""
        try:
            payload = {
                "prompt_id": 999,  # Invalid ID
                "image_data": SAMPLE_IMAGE_BASE64
            }
            
            response = requests.post(f"{self.backend_url}/generate-with-prompt", json=payload, timeout=10)
            
            # Backend returns 500 but with proper error message about 404
            if response.status_code == 500:
                error_detail = response.json().get("detail", "")
                if "404" in error_detail and "not found" in error_detail.lower():
                    self.log_test("Invalid Prompt ID Handling", True, "Correctly rejects invalid prompt_id with proper error message")
                    return True
                else:
                    self.log_test("Invalid Prompt ID Handling", False, f"Wrong error message: {error_detail}")
                    return False
            else:
                self.log_test("Invalid Prompt ID Handling", False, f"Expected 500 with 404 error, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Invalid Prompt ID Handling", False, f"Error: {str(e)}")
            return False
    
    def test_generate_without_image(self):
        """Test /api/generate-with-prompt without required image"""
        try:
            payload = {
                "prompt_id": 1
                # Missing image_data
            }
            
            response = requests.post(f"{self.backend_url}/generate-with-prompt", json=payload, timeout=10)
            
            # FastAPI/Pydantic returns 422 for validation errors, which is correct
            if response.status_code == 422:
                error_detail = response.json().get("detail", [])
                if any("image_data" in str(err) and "required" in str(err).lower() for err in error_detail):
                    self.log_test("Missing Image Handling", True, "Correctly returns 422 for missing required image_data")
                    return True
                else:
                    self.log_test("Missing Image Handling", False, f"Wrong validation error: {error_detail}")
                    return False
            else:
                self.log_test("Missing Image Handling", False, f"Expected 422, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Missing Image Handling", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all curated prompt system tests"""
        print("🧪 Starting Curated Prompt System Tests")
        print("=" * 60)
        
        # Test 1: Health check
        if not self.test_health_endpoint():
            print("❌ Backend not accessible, stopping tests")
            return
        
        # Test 2: Get all prompts
        self.test_get_all_prompts()
        
        # Test 3: Get prompts by category
        self.test_get_prompts_by_category()
        
        # Test 4: Invalid category handling
        self.test_invalid_category()
        
        # Test 5: Generate with curated prompt (main functionality)
        self.test_generate_with_curated_prompt()
        
        # Test 6: Invalid prompt ID handling
        self.test_generate_with_invalid_prompt_id()
        
        # Test 7: Missing image handling
        self.test_generate_without_image()
        
        # Summary
        print("\n" + "=" * 60)
        print("🏁 CURATED PROMPT SYSTEM TEST SUMMARY")
        print("=" * 60)
        
        for result in self.test_results:
            print(result)
        
        print(f"\n📊 Results: {self.passed_tests}/{self.total_tests} tests passed")
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.passed_tests == self.total_tests:
            print("🎉 All tests passed! Curated prompt system is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = CuratedPromptTester()
    tester.run_all_tests()