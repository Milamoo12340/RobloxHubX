"""
Enhanced Anti-Detection Methods for PS99 Asset Scanner

This module provides advanced techniques to bypass Roblox API rate limiting and detection.
"""

import random
import time
import math
import logging
import requests
import uuid
import re
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Constants
MAX_RETRIES = 5
BASE_DELAY = 2.0
BATCH_SIZE = 3
BATCH_DELAY = 30
CONCURRENT_REQUESTS = 2

class RobloxBypass:
    """Advanced Roblox API bypass techniques"""
    
    def __init__(self):
        self.sessions = self._create_sessions(8)  # Create 8 different sessions
        self.current_session = 0
        self.last_request_time = 0
        self.request_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.rate_limited_count = 0
        
        # Initialize proxies if available
        self.proxies = self._load_proxies()
        self.proxy_index = 0
        
        # Create cache directory
        self.cache_dir = "request_cache"
        os.makedirs(self.cache_dir, exist_ok=True)
        
    def _load_proxies(self):
        """Load proxies from file or return empty list"""
        try:
            if os.path.exists("proxies.txt"):
                with open("proxies.txt", "r") as f:
                    return [line.strip() for line in f if line.strip()]
        except Exception as e:
            logger.error(f"Error loading proxies: {e}")
        return []
        
    def _create_sessions(self, count):
        """Create multiple browser sessions with different identities"""
        sessions = []
        for _ in range(count):
            session = requests.Session()
            session.headers.update(self._generate_browser_fingerprint())
            # Add random cookies
            session.cookies.update(self._generate_random_cookies())
            sessions.append(session)
        return sessions
        
    def _generate_browser_fingerprint(self):
        """Generate a randomized browser fingerprint"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.66",
            "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36",
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
            "Mozilla/5.0 (X11; CrOS x86_64 8172.45.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.64 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9",
            "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 6P Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.83 Mobile Safari/537.36",
        ]
        
        accept_headers = [
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        ]
        
        accept_languages = [
            "en-US,en;q=0.9",
            "en-US,en;q=0.8",
            "en-GB,en;q=0.9",
            "en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7",
            "en-AU,en;q=0.9",
            "en-NZ,en;q=0.9",
            "en,de;q=0.9,it;q=0.8",
        ]
        
        headers = {
            "User-Agent": random.choice(user_agents),
            "Accept": random.choice(accept_headers),
            "Accept-Language": random.choice(accept_languages),
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "DNT": "1",  # Do Not Track
            "Pragma": "no-cache",
        }
        
        # Add random client hints (50% chance)
        if random.random() < 0.5:
            headers["Sec-CH-UA"] = '"Google Chrome";v="95", "Chromium";v="95", ";Not A Brand";v="99"'
            headers["Sec-CH-UA-Mobile"] = random.choice(["?0", "?1"])
            headers["Sec-CH-UA-Platform"] = random.choice(['"Windows"', '"macOS"', '"Linux"', '"Android"', '"iOS"'])
        
        return headers
        
    def _generate_random_cookies(self):
        """Generate random cookies to appear as legitimate user"""
        cookies = {
            f"_rdt_uuid": f"{uuid.uuid4()}",
            f"rbx_ip_{random.randint(100000, 999999)}": f"192.168.{random.randint(1, 254)}.{random.randint(1, 254)}",
            f"RBXSource": f"rbx_acquisition_time:{int(time.time() - random.randint(86400, 604800))},rbx_acquisition_referrer:https://www.google.com/,rbx_medium:Direct,rbx_source:Direct",
            f"RBXEventTrackerV2": f"createDate:{int(time.time() - random.randint(86400, 604800))}&rbxid=&browserid={uuid.uuid4()}",
        }
        
        # Add some standard cookies (30% chance)
        if random.random() < 0.3:
            cookies.update({
                "RBXSessionTracker": f"{uuid.uuid4()}",
                "RBXImageCache": f"{random.randint(1000000, 9999999)}",
                "RBXLocale": "en_us",
                "RBXMarketing": f"{int(time.time())}",
            })
        
        return cookies
        
    def _get_proxy(self):
        """Get next proxy if available"""
        if not self.proxies:
            return None
            
        proxy = self.proxies[self.proxy_index]
        self.proxy_index = (self.proxy_index + 1) % len(self.proxies)
        return proxy
        
    def _rotate_session(self):
        """Rotate to the next session and refresh its fingerprint"""
        self.current_session = (self.current_session + 1) % len(self.sessions)
        
        # Refresh the fingerprint while rotating
        self.sessions[self.current_session].headers.update(self._generate_browser_fingerprint())
        
        # Refresh cookies occasionally (20% chance)
        if random.random() < 0.2:
            self.sessions[self.current_session].cookies.update(self._generate_random_cookies())
        
        return self.sessions[self.current_session]
        
    def _get_cache_key(self, url):
        """Generate a cache key from the URL"""
        import hashlib
        return hashlib.md5(url.encode('utf-8')).hexdigest()
        
    def _get_from_cache(self, url, max_age=3600):
        """Try to get a response from cache"""
        cache_key = self._get_cache_key(url)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r") as f:
                    cached_data = json.load(f)
                    
                # Check if cache is expired
                cached_time = cached_data.get("timestamp", 0)
                if time.time() - cached_time <= max_age:
                    logger.debug(f"Cache hit for {url}")
                    return cached_data.get("data")
                    
            except Exception as e:
                logger.error(f"Error reading from cache: {e}")
                
        return None
        
    def _save_to_cache(self, url, data):
        """Save a response to cache"""
        cache_key = self._get_cache_key(url)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        try:
            with open(cache_file, "w") as f:
                json.dump({
                    "timestamp": time.time(),
                    "data": data
                }, f)
        except Exception as e:
            logger.error(f"Error saving to cache: {e}")
    
    def _randomize_timing(self):
        """Add human-like randomized timing between requests"""
        # Basic pause
        time.sleep(random.uniform(1.0, 2.5))
        
        # Occasionally add a longer pause (15% chance)
        if random.random() < 0.15:
            time.sleep(random.uniform(3.0, 7.0))
            
        # Very rarely add a very long pause (2% chance)
        if random.random() < 0.02:
            time.sleep(random.uniform(15.0, 30.0))
    
    def get(self, url, use_cache=True, cache_ttl=3600, max_retries=MAX_RETRIES):
        """Make a GET request with advanced anti-detection measures"""
        # Check cache first if enabled
        if use_cache:
            cached_data = self._get_from_cache(url, cache_ttl)
            if cached_data:
                return cached_data
        
        # Add human-like timing
        self._randomize_timing()
        
        # Get session and proxy
        session = self._rotate_session()
        proxy = self._get_proxy()
        proxies = {"http": proxy, "https": proxy} if proxy else None
        
        # Update counters
        self.request_count += 1
        self.last_request_time = time.time()
        
        # Make request with retries and backoff
        for attempt in range(max_retries):
            try:
                # Apply additional jitter between retries
                if attempt > 0:
                    jitter = random.uniform(0.5, 2.0)
                    time.sleep(jitter)
                
                # Make request
                response = session.get(url, proxies=proxies, timeout=15)
                
                # Handle rate limiting
                if response.status_code == 429:
                    self.rate_limited_count += 1
                    
                    # Calculate backoff with jitter
                    backoff_time = BASE_DELAY * (2 ** attempt) + random.uniform(2, 5)
                    logger.warning(f"Rate limited. Retrying in {backoff_time:.2f} seconds...")
                    time.sleep(backoff_time)
                    
                    # Rotate session and proxy
                    session = self._rotate_session()
                    proxy = self._get_proxy()
                    proxies = {"http": proxy, "https": proxy} if proxy else None
                    continue
                
                # Success
                if response.status_code == 200:
                    self.success_count += 1
                    
                    # Parse JSON if possible
                    try:
                        data = response.json()
                        
                        # Cache the successful response
                        self._save_to_cache(url, data)
                        
                        return data
                    except ValueError:
                        # Return text if not JSON
                        return response.text
                        
                # Handle other errors
                self.failure_count += 1
                logger.warning(f"Request failed with status {response.status_code}: {url}")
                
                # Don't retry certain client errors
                if response.status_code in [400, 403, 404]:
                    break
                    
                # Backoff for server errors
                if response.status_code >= 500:
                    backoff_time = 5 * (2 ** attempt) + random.uniform(0, 5)
                    time.sleep(backoff_time)
                    continue
                    
            except requests.exceptions.RequestException as e:
                self.failure_count += 1
                logger.error(f"Request error: {e}")
                
                # Calculate delay
                backoff_time = 2 * (2 ** attempt) + random.uniform(0, 2)
                logger.warning(f"Retrying in {backoff_time:.2f} seconds...")
                time.sleep(backoff_time)
                
                # Rotate session and proxy
                session = self._rotate_session()
                proxy = self._get_proxy()
                proxies = {"http": proxy, "https": proxy} if proxy else None
                
        logger.error(f"Failed after {max_retries} attempts: {url}")
        return None

    def batch_get(self, urls, batch_size=BATCH_SIZE, batch_delay=BATCH_DELAY, max_concurrent=CONCURRENT_REQUESTS):
        """Process multiple URLs in batches with anti-detection measures"""
        results = []
        
        # Process URLs in batches
        for i in range(0, len(urls), batch_size):
            batch_urls = urls[i:i+batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}/{math.ceil(len(urls)/batch_size)}")
            
            with ThreadPoolExecutor(max_workers=max_concurrent) as executor:
                future_to_url = {executor.submit(self.get, url): url for url in batch_urls}
                
                for future in as_completed(future_to_url):
                    url = future_to_url[future]
                    try:
                        data = future.result()
                        if data:
                            results.append((url, data))
                    except Exception as e:
                        logger.error(f"Error processing {url}: {e}")
            
            # Add significant delay between batches with jitter
            if i + batch_size < len(urls):
                delay = batch_delay + random.uniform(5, 15)
                logger.info(f"Waiting {delay:.2f} seconds before next batch...")
                time.sleep(delay)
        
        return results

    def get_stats(self):
        """Get request statistics"""
        return {
            "total_requests": self.request_count,
            "successful_requests": self.success_count,
            "failed_requests": self.failure_count,
            "rate_limited_requests": self.rate_limited_count,
            "success_rate": f"{(self.success_count / self.request_count * 100) if self.request_count > 0 else 0:.2f}%",
            "active_sessions": len(self.sessions),
            "proxies_available": len(self.proxies),
        }
