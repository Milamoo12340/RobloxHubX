"""
Optimized Scanner Patch Module

This module applies the proven rate limiting and anti-detection techniques
from our production scanner to the optimized scanner in the test environment.
"""

import os
import sys
import logging
import time
import random
import urllib.request
import ssl
import json
from typing import Dict, Optional, Tuple, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Track request times and backoff levels
last_request_times = {}
domain_backoff = {}
cache = {}

def extract_domain(url: str) -> str:
    """Extract the domain from a URL for rate limiting purposes"""
    if "://" in url:
        url = url.split("://")[1]
    
    if "/" in url:
        url = url.split("/")[0]
    
    # Group Roblox subdomains
    if "roblox.com" in url:
        parts = url.split(".")
        if len(parts) > 2 and parts[0] != "www":
            return f"{parts[0]}.roblox.com"
    
    return url

def calculate_delay(domain: str) -> float:
    """Calculate appropriate delay for a domain based on history"""
    current_time = time.time()
    
    # For testing purposes, use minimal delays
    if True:  # TEST_MODE enabled
        # Initialize if needed
        if domain not in last_request_times:
            last_request_times[domain] = current_time - 10
            domain_backoff[domain] = 0
        
        # Calculate time since last request
        time_since_last = current_time - last_request_times[domain]
        
        # In test mode, use much smaller delays
        if "roblox" in domain:
            base_delay = 0.2 + (domain_backoff[domain] * 0.2)
        else:
            base_delay = 0.1 + (domain_backoff[domain] * 0.1)
        
        # Minimal additional delay for recent requests
        if time_since_last < 0.5:
            base_delay += (0.5 - time_since_last) * 0.5
        
        # Less jitter in test mode
        delay = base_delay + random.uniform(0, 0.1)
        
        # Smaller minimum delay for testing
        return max(delay, 0.1)
    else:
        # Standard production delays
        # Initialize if needed
        if domain not in last_request_times:
            last_request_times[domain] = current_time - 10
            domain_backoff[domain] = 0
        
        # Calculate time since last request
        time_since_last = current_time - last_request_times[domain]
        
        # Base delay depends on domain and backoff level
        if "roblox" in domain:
            # Roblox domains need longer delays
            base_delay = 2.0 + (domain_backoff[domain] * 1.0)
        else:
            base_delay = 1.0 + (domain_backoff[domain] * 0.5)
        
        # If we've recently made a request, add additional delay
        if time_since_last < 1.0:
            base_delay += (1.0 - time_since_last) * 2
        
        # Add some randomization (jitter)
        jitter = base_delay * 0.2
        delay = base_delay + random.uniform(-jitter, jitter)
        
        # Ensure minimum delay
        return max(delay, 0.5)

def update_backoff(domain: str, success: bool):
    """Update the backoff level for a domain based on request success"""
    if success:
        # Gradually reduce backoff on success (with 25% chance)
        if domain_backoff.get(domain, 0) > 0 and random.random() < 0.25:
            domain_backoff[domain] = max(0, domain_backoff[domain] - 0.5)
    else:
        # Increase backoff on failure
        domain_backoff[domain] = domain_backoff.get(domain, 0) + 1.0
        # Cap at level 10
        domain_backoff[domain] = min(10, domain_backoff[domain])

def get_headers(referer: Optional[str] = None) -> Dict[str, str]:
    """Get headers optimized for Roblox API requests"""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0"
    ]
    
    headers = {
        "User-Agent": random.choice(user_agents),
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
    }
    
    # Add referer if provided
    if referer:
        headers["Referer"] = referer
    else:
        headers["Referer"] = "https://www.roblox.com/"

    return headers

def make_request(url: str, max_retries: int = 3) -> Tuple[bool, Optional[Any], Optional[str]]:
    """
    Make a request to a URL with optimized headers and rate limiting
    
    Args:
        url: The URL to request
        max_retries: Maximum number of retry attempts
        
    Returns:
        Tuple of (success, data, content_type)
    """
    domain = extract_domain(url)
    
    # Check if we have a cached response
    if url in cache:
        logger.info(f"Using cached response for {url}")
        return True, cache[url]['data'], cache[url]['content_type']
    
    # Apply appropriate delay based on domain
    delay = calculate_delay(domain)
    time.sleep(delay)
    
    # Update last request time
    last_request_times[domain] = time.time()
    
    # Determine appropriate referer based on URL
    if "catalog.roblox.com" in url:
        referer = "https://www.roblox.com/catalog"
    elif "economy.roblox.com" in url:
        referer = "https://www.roblox.com/catalog"
    elif "thumbnails.roblox.com" in url:
        referer = "https://www.roblox.com/games"
    elif "games.roblox.com" in url:
        referer = "https://www.roblox.com/games"
    elif "users.roblox.com" in url:
        referer = "https://www.roblox.com/users"
    elif "groups.roblox.com" in url:
        referer = "https://www.roblox.com/groups"
    else:
        referer = "https://www.roblox.com/"
    
    # Get headers
    headers = get_headers(referer)
    
    # Create request
    req = urllib.request.Request(url, headers=headers)
    
    # Create SSL context
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, context=context, timeout=30) as response:
                data = response.read()
                content_type = response.getheader("Content-Type", "text/html")
                
                # Success! Update backoff levels
                update_backoff(domain, True)
                
                # Cache the response
                cache[url] = {
                    'data': data,
                    'content_type': content_type,
                    'timestamp': time.time()
                }
                
                return True, data, content_type
                
        except urllib.error.HTTPError as e:
            if e.code == 429:  # Too Many Requests
                # Exponential backoff
                retry_delay = (2 ** attempt) + random.uniform(1, 3)
                logger.warning(f"Rate limited (429) for {url}, retry {attempt+1}/{max_retries} in {retry_delay:.1f}s")
                
                # Update backoff level
                update_backoff(domain, False)
                
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
            
            logger.error(f"HTTP Error {e.code} for {url}: {e.reason}")
            return False, None, None
        
        except Exception as e:
            logger.error(f"Error requesting {url}: {e}")
            
            if attempt < max_retries - 1:
                retry_delay = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(retry_delay)
                continue
            
            return False, None, None
    
    return False, None, None

def json_request(url: str, max_retries: int = 3) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Make a request and parse the response as JSON
    
    Args:
        url: The URL to request
        max_retries: Maximum number of retry attempts
        
    Returns:
        Tuple of (success, json_data)
    """
    success, data, content_type = make_request(url, max_retries)
    
    if success and data:
        try:
            json_data = json.loads(data.decode('utf-8'))
            return True, json_data
        except Exception as e:
            logger.error(f"Error parsing JSON response from {url}: {e}")
    
    return False, None

# Original function references
original_urlopen = urllib.request.urlopen

def patched_urlopen(url, *args, **kwargs):
    """
    Patched version of urllib.request.urlopen that uses our improved rate limiter.
    This function maintains compatibility with the original but uses rate limiting.
    """
    # Check if we're calling for a Roblox domain
    if isinstance(url, str) and ("roblox.com" in url):
        logger.info(f"Using enhanced bypass for request to: {url}")
        success, response_data, content_type = make_request(url)
        
        if success:
            # Create a response-like object that matches what urlopen returns
            class FakeResponse:
                def __init__(self, data, content_type):
                    self.data = data
                    self.content_type = content_type
                
                def read(self):
                    return self.data
                
                def getheader(self, name, default=None):
                    if name.lower() == "content-type":
                        return self.content_type
                    return default
                
                def getcode(self):
                    return 200
                
                def __enter__(self):
                    return self
                
                def __exit__(self, exc_type, exc_val, exc_tb):
                    pass
            
            return FakeResponse(response_data, content_type)
        else:
            # Fall back to original urlopen if rate limiter fails
            logger.warning(f"Bypass failed for {url}, falling back to original urlopen")
            return original_urlopen(url, *args, **kwargs)
    
    # Extract URL from Request object if needed
    elif hasattr(url, 'full_url') and "roblox.com" in url.full_url:
        req_url = url.full_url
        logger.info(f"Using enhanced bypass for Request object to: {req_url}")
        
        # Get headers from request object
        headers = {}
        if hasattr(url, 'headers'):
            headers = dict(url.headers)
        
        # Make request with our enhanced system
        success, response_data, content_type = make_request(req_url)
        
        if success:
            # Create a response-like object that matches what urlopen returns
            class FakeResponse:
                def __init__(self, data, content_type):
                    self.data = data
                    self.content_type = content_type
                
                def read(self):
                    return self.data
                
                def getheader(self, name, default=None):
                    if name.lower() == "content-type":
                        return self.content_type
                    return default
                
                def getcode(self):
                    return 200
                
                def __enter__(self):
                    return self
                
                def __exit__(self, exc_type, exc_val, exc_tb):
                    pass
            
            return FakeResponse(response_data, content_type)
        else:
            # Fall back to original urlopen if our method fails
            logger.warning(f"Bypass failed for Request {req_url}, falling back to original urlopen")
            return original_urlopen(url, *args, **kwargs)
    
    # Not a Roblox domain, use original implementation
    return original_urlopen(url, *args, **kwargs)

def apply_patches():
    """Apply the monkey patch to the urllib.request.urlopen function"""
    logger.info("Applying enhanced Roblox API bypass patches to optimized scanner...")
    
    # Replace the urllib.request.urlopen function with our patched version
    urllib.request.urlopen = patched_urlopen
    
    logger.info("Patches applied successfully!")

# Apply the patches when this module is imported
apply_patches()