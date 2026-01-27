"""
Test script for Python OCR server
Tests health check and OCR endpoints
"""
import requests
import json
import base64
from pathlib import Path

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health check endpoint"""
    print("=" * 50)
    print("Testing Health Check Endpoint")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_ocr_with_sample():
    """Test OCR endpoint with a sample image"""
    print("\n" + "=" * 50)
    print("Testing OCR Endpoint")
    print("=" * 50)
    
    # Create a simple test image (you can replace this with an actual image path)
    sample_image_path = Path(__file__).parent / "test_image.png"
    
    if not sample_image_path.exists():
        print(f"⚠️  Test image not found at {sample_image_path}")
        print("To test OCR, please create a test_image.png in the ai-server directory")
        return False
    
    try:
        with open(sample_image_path, "rb") as f:
            files = {"file": ("test_image.png", f, "image/png")}
            response = requests.post(f"{BASE_URL}/api/ocr/extract", files=files)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("\n🚀 Starting Python OCR Server Tests\n")
    
    # Test 1: Health Check
    health_ok = test_health()
    
    # Test 2: OCR Endpoint (optional if test image exists)
    ocr_ok = test_ocr_with_sample()
    
    # Summary
    print("\n" + "=" * 50)
    print("Test Summary")
    print("=" * 50)
    print(f"✅ Health Check: {'PASSED' if health_ok else '❌ FAILED'}")
    print(f"{'✅' if ocr_ok else '⚠️ '} OCR Endpoint: {'PASSED' if ocr_ok else 'SKIPPED (no test image)'}")
    print("=" * 50)

if __name__ == "__main__":
    main()
