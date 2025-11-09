"""
Testing Roblox API bypass methods to resolve HTTP 403/400 errors
"""

import urllib.request
import urllib.error
import ssl
import random
import time
import json

def test_basic_request():
    """Test a basic request to the Roblox API"""
    url = "https://catalog.roblox.com/v1/search/items?category=All&keyword=slime&limit=10"
    
    try:
        with urllib.request.urlopen(url) as response:
            data = response.read()
            print(f"Basic request succeeded! Status code: {response.getcode()}")
            return True
    except urllib.error.HTTPError as e:
        print(f"Basic request failed with error {e.code}: {e.reason}")
        return False

def test_with_user_agent():
    """Test a request with a User-Agent header"""
    url = "https://catalog.roblox.com/v1/search/items?category=All&keyword=slime&limit=10"
    
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0"
    ]
    
    headers = {
        "User-Agent": random.choice(user_agents)
    }
    
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = response.read()
            print(f"User-Agent request succeeded! Status code: {response.getcode()}")
            return True
    except urllib.error.HTTPError as e:
        print(f"User-Agent request failed with error {e.code}: {e.reason}")
        return False

def test_with_full_headers():
    """Test a request with full browser-like headers"""
    url = "https://catalog.roblox.com/v1/search/items?category=All&keyword=slime&limit=10"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0"
    }
    
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = response.read()
            print(f"Full headers request succeeded! Status code: {response.getcode()}")
            return True
    except urllib.error.HTTPError as e:
        print(f"Full headers request failed with error {e.code}: {e.reason}")
        return False

def test_with_referer():
    """Test a request with a Roblox Referer header"""
    url = "https://catalog.roblox.com/v1/search/items?category=All&keyword=slime&limit=10"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.roblox.com/catalog",
        "DNT": "1",
        "Connection": "keep-alive"
    }
    
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = response.read()
            print(f"Referer request succeeded! Status code: {response.getcode()}")
            return True
    except urllib.error.HTTPError as e:
        print(f"Referer request failed with error {e.code}: {e.reason}")
        return False

def test_with_ssl_context():
    """Test a request with a custom SSL context"""
    url = "https://catalog.roblox.com/v1/search/items?category=All&keyword=slime&limit=10"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    }
    
    req = urllib.request.Request(url, headers=headers)
    
    # Create custom SSL context
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=context) as response:
            data = response.read()
            print(f"SSL context request succeeded! Status code: {response.getcode()}")
            return True
    except urllib.error.HTTPError as e:
        print(f"SSL context request failed with error {e.code}: {e.reason}")
        return False

def test_with_roblox_headers():
    """Test a request with specific Roblox API headers"""
    url = "https://catalog.roblox.com/v1/search/items?category=All&keyword=slime&limit=10"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.roblox.com/catalog",
        "Origin": "https://www.roblox.com",
        "X-CSRF-TOKEN": "",  # Typically needed for POST requests
        "DNT": "1",
        "Connection": "keep-alive"
    }
    
    req = urllib.request.Request(url, headers=headers)
    
    # Create custom SSL context
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=context) as response:
            data = response.read()
            print(f"Roblox headers request succeeded! Status code: {response.getcode()}")
            try:
                json_data = json.loads(data)
                print(f"Found {len(json_data.get('data', []))} items")
            except:
                pass
            return True
    except urllib.error.HTTPError as e:
        print(f"Roblox headers request failed with error {e.code}: {e.reason}")
        return False

def test_with_cookie():
    """Test a request with a dummy Roblox cookie"""
    url = "https://catalog.roblox.com/v1/search/items?category=All&keyword=slime&limit=10"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.roblox.com/catalog",
        "Origin": "https://www.roblox.com",
        "Cookie": "RBXEventTrackerV2=CreateDate=4/12/2025; .ROBLOSECURITY=_|WARNING:-DO-NOT-SHARE-THIS",
        "DNT": "1",
        "Connection": "keep-alive"
    }
    
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = response.read()
            print(f"Cookie request succeeded! Status code: {response.getcode()}")
            return True
    except urllib.error.HTTPError as e:
        print(f"Cookie request failed with error {e.code}: {e.reason}")
        return False

def test_with_delay():
    """Test multiple requests with delays between them"""
    url = "https://catalog.roblox.com/v1/search/items?category=All&keyword=slime&limit=10"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.roblox.com/catalog"
    }
    
    success_count = 0
    
    for i in range(3):
        req = urllib.request.Request(url, headers=headers)
        
        try:
            with urllib.request.urlopen(req) as response:
                data = response.read()
                print(f"Delay request {i+1} succeeded! Status code: {response.getcode()}")
                success_count += 1
        except urllib.error.HTTPError as e:
            print(f"Delay request {i+1} failed with error {e.code}: {e.reason}")
        
        # Add delay between requests (2-4 seconds)
        delay = 2 + random.random() * 2
        print(f"Waiting {delay:.2f} seconds before next request...")
        time.sleep(delay)
    
    print(f"Delay test: {success_count}/3 requests successful")
    return success_count > 0

def run_all_tests():
    """Run all test methods and report results"""
    tests = [
        ("Basic request", test_basic_request),
        ("User-Agent request", test_with_user_agent),
        ("Full headers request", test_with_full_headers),
        ("Referer request", test_with_referer),
        ("SSL context request", test_with_ssl_context),
        ("Roblox headers request", test_with_roblox_headers),
        ("Cookie request", test_with_cookie),
        ("Delay test", test_with_delay)
    ]
    
    results = {}
    
    for name, test_func in tests:
        print(f"\n==== Testing: {name} ====")
        success = test_func()
        results[name] = "SUCCESS" if success else "FAILURE"
        
        # Add delay between tests
        time.sleep(2)
    
    print("\n==== Results Summary ====")
    for name, result in results.items():
        print(f"{name}: {result}")
    
    successful_tests = list(filter(lambda x: results[x] == "SUCCESS", results.keys()))
    print(f"\nSuccessful methods: {successful_tests}")
    
    return successful_tests

if __name__ == "__main__":
    print("Testing Roblox API bypass methods...")
    successful_methods = run_all_tests()