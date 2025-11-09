"""
Advanced Anti-Rate Limiting Module for Roblox API

This module implements sophisticated rate limiting avoidance strategies
to ensure reliable scanning of Roblox assets without triggering 429 errors.
"""

import time
import random
import logging
import requests
import json
import os
from collections import deque
from datetime import datetime, timedelta
from threading import Lock

# Configure logging
logger = logging.getLogger(__name__)

class RequestQueue:
    """Request queue with controlled processing timing"""
    
    def __init__(self, max_requests_per_minute=40):
        self.queue = deque()
        self.max_requests_per_minute = max_requests_per_minute
        self.request_timestamps = deque(maxlen=max_requests_per_minute)
        self.lock = Lock()
        
    def add_request(self, url, callback=None):
        """Add a request to the queue"""
        with self.lock:
            self.queue.append((url, callback))
            
    def process_next(self):
        """Process the next request in the queue with rate limiting"""
        with self.lock:
            if not self.queue:
                return None
                
            # Check if we're sending requests too quickly
            now = datetime.now()
            
            # If we have max_requests_per_minute requests in the last minute, wait
            if len(self.request_timestamps) >= self.max_requests_per_minute:
                oldest = self.request_timestamps[0]
                if now - oldest < timedelta(minutes=1):
                    # Wait until we can send another request
                    sleep_time = (oldest + timedelta(minutes=1) - now).total_seconds()
                    time.sleep(max(sleep_time, 0.1))
            
            # Add current timestamp to our history
            self.request_timestamps.append(datetime.now())
            
            # Get the next request
            url, callback = self.queue.popleft()
            return url, callback
            
    def get_queue_size(self):
        """Get current queue size"""
        with self.lock:
            return len(self.queue)

class RobloxAPIClient:
    """
    Enhanced Roblox API client with advanced anti-rate limiting
    """
    
    def __init__(self):
        # Request configuration
        self.timeout = 15
        self.max_retries = 5
        
        # Rate limiting configuration
        self.request_queue = RequestQueue(max_requests_per_minute=40)
        self.recent_429s = 0  # Counter for recent rate limit hits
        self.cooldown_until = None  # Timestamp until cooldown ends
        
        # User agent rotation
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
        ]
        
        # Tracking successful requests
        self.successful_requests = 0
        
        # Proxy rotation support
        self.proxies = []  # List of proxy servers to rotate through
        self.proxy_index = 0
        
        # Cache responses to avoid redundant requests
        self.cache_dir = "cache"
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Initialize success rate tracking
        self.request_attempts = 0
        self.request_successes = 0
        
    def _get_cache_path(self, url):
        """Get cache file path for a URL"""
        url_hash = hash(url) % 10000000  # Simple hash to avoid file name issues
        return os.path.join(self.cache_dir, f"response_{url_hash}.json")
        
    def _load_from_cache(self, url, max_age_hours=24):
        """Try to load response from cache"""
        cache_path = self._get_cache_path(url)
        
        try:
            if os.path.exists(cache_path):
                with open(cache_path, "r") as f:
                    cache_data = json.load(f)
                    
                # Check if cache is still fresh
                cached_time = datetime.fromisoformat(cache_data["timestamp"])
                if datetime.now() - cached_time < timedelta(hours=max_age_hours):
                    return cache_data["data"]
        except Exception as e:
            logger.debug(f"Cache load error: {e}")
            
        return None
        
    def _save_to_cache(self, url, data):
        """Save response to cache"""
        try:
            cache_path = self._get_cache_path(url)
            with open(cache_path, "w") as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "data": data
                }, f)
        except Exception as e:
            logger.debug(f"Cache save error: {e}")
            
    def _get_next_proxy(self):
        """Get next proxy in rotation"""
        if not self.proxies:
            return None
            
        proxy = self.proxies[self.proxy_index]
        self.proxy_index = (self.proxy_index + 1) % len(self.proxies)
        return proxy
        
    def _should_cool_down(self):
        """Check if we should be in cooldown mode"""
        if self.cooldown_until and datetime.now() < self.cooldown_until:
            return True
            
        # Apply cooldown if we've hit rate limits too often
        if self.recent_429s >= 5:
            self.cooldown_until = datetime.now() + timedelta(minutes=5)
            self.recent_429s = 0
            logger.warning("Entering 5-minute cooldown due to excessive rate limiting")
            return True
            
        return False
        
    def get(self, url, max_retries=None, force_refresh=False):
        """Make a GET request with anti-rate limiting measures"""
        if max_retries is None:
            max_retries = self.max_retries
            
        # Try cache first unless force refresh
        if not force_refresh:
            cached_data = self._load_from_cache(url)
            if cached_data:
                return cached_data
                
        # Check cooldown status
        if self._should_cool_down():
            cooldown_time = (self.cooldown_until - datetime.now()).total_seconds()
            logger.info(f"In cooldown mode. Waiting {cooldown_time:.1f} seconds...")
            time.sleep(cooldown_time)
            
        # Add request to queue
        self.request_queue.add_request(url)
        
        # Process through the queue
        url, _ = self.request_queue.process_next()
        
        # Track attempt
        self.request_attempts += 1
        
        for attempt in range(max_retries):
            try:
                # Add jitter to delay between retries
                if attempt > 0:
                    delay = (2 ** attempt) + random.uniform(0.5, 1.5)
                    logger.debug(f"Retry {attempt}/{max_retries}. Waiting {delay:.2f} seconds...")
                    time.sleep(delay)
                    
                # Prepare request with anti-detection measures
                headers = {
                    "User-Agent": random.choice(self.user_agents),
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.roblox.com/",
                    "Origin": "https://www.roblox.com",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
                
                # Get proxy if available
                proxy = self._get_next_proxy()
                proxies = {"http": proxy, "https": proxy} if proxy else None
                
                # Make request
                response = requests.get(
                    url, 
                    headers=headers,
                    proxies=proxies,
                    timeout=self.timeout
                )
                
                # Handle rate limiting
                if response.status_code == 429:
                    self.recent_429s += 1
                    delay = (2 ** attempt) * 2 + random.uniform(1, 3)
                    logger.warning(f"Rate limited. Waiting {delay:.2f} seconds... (Recent 429s: {self.recent_429s})")
                    time.sleep(delay)
                    continue
                    
                # Other non-success status codes
                if response.status_code != 200:
                    logger.error(f"Request failed with status {response.status_code}: {url}")
                    if response.status_code == 403:
                        # Forbidden - might be IP blocked, wait longer
                        time.sleep(30 + random.uniform(0, 10))
                    continue
                
                # Successful request
                self.successful_requests += 1
                self.request_successes += 1
                self.recent_429s = max(0, self.recent_429s - 1)  # Reduce 429 counter on success
                
                # Parse JSON and cache
                data = response.json()
                self._save_to_cache(url, data)
                return data
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error: {e}")
                continue
            except ValueError as e:
                logger.error(f"JSON parsing error: {e}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                continue
                
        # All retries failed
        logger.error(f"Failed to get {url} after {max_retries} attempts")
        return None
        
    def get_success_rate(self):
        """Calculate success rate of requests"""
        if self.request_attempts == 0:
            return 0
        return (self.request_successes / self.request_attempts) * 100
        
    def get_stats(self):
        """Get client statistics"""
        return {
            "successful_requests": self.successful_requests,
            "queue_size": self.request_queue.get_queue_size(),
            "recent_429s": self.recent_429s,
            "in_cooldown": bool(self._should_cool_down()),
            "success_rate": f"{self.get_success_rate():.1f}%",
        }

# Example usage
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    client = RobloxAPIClient()
    
    # Example usage
    test_urls = [
        "https://users.roblox.com/v1/users/1547685",  # Preston
        "https://catalog.roblox.com/v1/search/items?category=All&creatorTargetId=1547685&creatorType=User&limit=10&sortType=3",
    ]
    
    for url in test_urls:
        logger.info(f"Testing URL: {url}")
        result = client.get(url)
        if result:
            logger.info(f"Success! Received {len(str(result))} bytes")
        else:
            logger.error("Request failed")
            
    logger.info(f"Client stats: {client.get_stats()}")