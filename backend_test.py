#!/usr/bin/env python3
"""
PDFLux Backend API Testing Suite
Tests all backend endpoints for the PDFLux application
"""

import requests
import sys
import json
import time
from datetime import datetime
from pathlib import Path

class PDFLuxAPITester:
    def __init__(self, base_url="https://pdflux.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", response_data=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def test_health_endpoint(self):
        """Test the health check endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                expected_keys = ["status", "timestamp", "ai_providers", "version"]
                
                if all(key in data for key in expected_keys):
                    if data["status"] == "healthy":
                        self.log_test("Health Check", True, response_data=data)
                        return True
                    else:
                        self.log_test("Health Check", False, f"Status not healthy: {data['status']}")
                else:
                    self.log_test("Health Check", False, f"Missing keys in response: {list(data.keys())}")
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
        
        return False

    def test_ai_providers_endpoint(self):
        """Test the AI providers endpoint"""
        try:
            response = requests.get(f"{self.api_url}/ai/providers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list) and len(data) > 0:
                    # Check if each provider has required fields
                    valid_providers = True
                    expected_providers = ["openai", "anthropic", "gemini"]
                    
                    for provider in data:
                        if not all(key in provider for key in ["name", "available_models", "status"]):
                            valid_providers = False
                            break
                    
                    provider_names = [p["name"] for p in data]
                    has_expected_providers = all(name in provider_names for name in expected_providers)
                    
                    if valid_providers and has_expected_providers:
                        self.log_test("AI Providers", True, f"Found {len(data)} providers", response_data=data)
                        return data
                    else:
                        self.log_test("AI Providers", False, f"Invalid provider structure or missing providers")
                else:
                    self.log_test("AI Providers", False, "Empty or invalid response format")
            else:
                self.log_test("AI Providers", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("AI Providers", False, f"Exception: {str(e)}")
        
        return None

    def test_documents_list_endpoint(self):
        """Test the documents listing endpoint"""
        try:
            response = requests.get(f"{self.api_url}/documents", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_test("Documents List", True, f"Retrieved {len(data)} documents", response_data=data)
                    return data
                else:
                    self.log_test("Documents List", False, "Response is not a list")
            else:
                self.log_test("Documents List", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Documents List", False, f"Exception: {str(e)}")
        
        return None

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "PDFLux" in data["message"]:
                    self.log_test("Root Endpoint", True, response_data=data)
                    return True
                else:
                    self.log_test("Root Endpoint", False, f"Unexpected response: {data}")
            else:
                self.log_test("Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
        
        return False

    def test_ai_chat_endpoint_basic(self):
        """Test AI chat endpoint with basic request"""
        try:
            chat_request = {
                "messages": [
                    {
                        "role": "user",
                        "content": "Hello, can you help me with PDF management?",
                        "timestamp": datetime.now().isoformat()
                    }
                ],
                "model_provider": "openai",
                "model_name": "gpt-4o-mini",
                "temperature": 0.7
            }
            
            response = requests.post(
                f"{self.api_url}/ai/chat", 
                json=chat_request,
                timeout=30  # AI requests take longer
            )
            
            if response.status_code == 200:
                data = response.json()
                expected_keys = ["message", "model_used", "processing_time"]
                
                if all(key in data for key in expected_keys):
                    if data["message"]["role"] == "assistant" and len(data["message"]["content"]) > 0:
                        self.log_test("AI Chat Basic", True, f"Response length: {len(data['message']['content'])}")
                        return True
                    else:
                        self.log_test("AI Chat Basic", False, "Invalid message structure")
                else:
                    self.log_test("AI Chat Basic", False, f"Missing keys: {expected_keys}")
            else:
                self.log_test("AI Chat Basic", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("AI Chat Basic", False, f"Exception: {str(e)}")
        
        return False

    def test_cors_headers(self):
        """Test CORS headers are present"""
        try:
            response = requests.options(f"{self.api_url}/health", timeout=10)
            
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            has_cors = any(header in response.headers for header in cors_headers)
            
            if has_cors:
                self.log_test("CORS Headers", True, "CORS headers present")
                return True
            else:
                # Try a GET request to check CORS on actual response
                response = requests.get(f"{self.api_url}/health", timeout=10)
                has_cors = any(header in response.headers for header in cors_headers)
                
                if has_cors:
                    self.log_test("CORS Headers", True, "CORS headers present on GET")
                    return True
                else:
                    self.log_test("CORS Headers", False, "No CORS headers found")
                
        except Exception as e:
            self.log_test("CORS Headers", False, f"Exception: {str(e)}")
        
        return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting PDFLux Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity and core endpoints
        print("\n📋 Core API Tests:")
        self.test_root_endpoint()
        self.test_health_endpoint()
        self.test_cors_headers()
        
        print("\n🤖 AI Integration Tests:")
        providers = self.test_ai_providers_endpoint()
        
        # Only test AI chat if providers are available
        if providers:
            print("⏳ Testing AI chat (this may take 10-30 seconds)...")
            self.test_ai_chat_endpoint_basic()
        else:
            print("⚠️  Skipping AI chat test - providers not available")
        
        print("\n📄 Document Management Tests:")
        self.test_documents_list_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests details
        failed_tests = [test for test in self.test_results if not test["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS DETAILS:")
            for test in failed_tests:
                print(f"  • {test['name']}: {test['details']}")
        
        print("\n🎯 RECOMMENDATIONS:")
        if self.tests_passed == self.tests_run:
            print("  • All backend tests passed! ✨")
            print("  • Backend is ready for frontend integration testing")
        else:
            print("  • Fix failed backend endpoints before frontend testing")
            print("  • Check server logs for detailed error information")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = PDFLuxAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())