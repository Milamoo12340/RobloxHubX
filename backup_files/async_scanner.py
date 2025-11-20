#!/usr/bin/env python3
"""
Asynchronous Roblox API Scanner

This implementation uses asyncio and aiohttp to make concurrent API requests
while handling rate limits intelligently. The goal is to achieve maximum
throughput without triggering 429 Too Many Requests errors.

Key features:
- Uses Python's asyncio for non-blocking concurrent requests
- Implements per-domain rate limiting with adaptive backoff
- Rotates browser fingerprints and headers
- Handles request throttling with semaphores
- Includes retry mechanisms with jitter
"""

import os
import sys
import json
import time
import asyncio
import aiohttp
import random
import logging
from urllib.parse import urlparse
from aiohttp import ClientSession, ClientTimeout
from datetime import datetime, timedelta
import ssl
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
MAX_CONCURRENT_REQUESTS = 5  # Maximum number of concurrent requests
MAX_RETRIES = 3  # Maximum number of retries for failed requests
BASE_DELAY = 2.0  # Base delay between requests in seconds
REQUEST_TIMEOUT = 15  # Request timeout in seconds
IMAGE_CACHE_DIR = "static/images/assets"  # Directory to cache downloaded images

# Ensure the cache directory exists
os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)

# Key PS99 BIG Games developers
KEY_DEVELOPERS = [
    {"id": 13365322, "name": "ChickenEngineer"},     # Preston (BIG Games founder)
    {"id": 1493409, "name": "BuildIntoGames"},       # BIG Games official account
    {"id": 31299194, "name": "Uplift_Games"},        # Former Adopt Me team, now partners with BIG Games
    {"id": 99806690, "name": "PS99DevAccount"},      # PS99 Development Account
]

# Key BIG Games groups
BIG_GAMES_GROUPS = [
    {"id": 1818, "name": "BIG Games"},               # Main BIG Games group
    {"id": 5871790, "name": "BIG Games Studio"}      # BIG Games development studio group
]

class AsyncRobloxScanner:
    """
    Asynchronous scanner for Roblox API that maximizes throughput
    while avoiding rate limiting
    """
    
    def __init__(self):
        # Track request times by domain
        self.domain_last_request = {}
        # Track domain backoff levels
        self.domain_backoff = {}
        # Cache for responses
        self.cache = {}
        # Assets found
        self.assets = []
        # Semaphore to limit concurrent requests
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        # Create SSL context that ignores certificate errors
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE
    
    async def get_headers(self):
        """Generate random headers to avoid detection"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36"
        ]
        
        accept_headers = [
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "application/json,text/plain,*/*",
            "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        ]
        
        headers = {
            "User-Agent": random.choice(user_agents),
            "Accept": random.choice(accept_headers),
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
            "Referer": "https://www.roblox.com/",
            "DNT": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Pragma": "no-cache",
        }
        
        # Add random chance of additional headers
        if random.random() < 0.3:
            headers["Origin"] = "https://www.roblox.com"
        
        if random.random() < 0.5:
            headers["Sec-CH-UA"] = '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"'
            headers["Sec-CH-UA-Mobile"] = random.choice(["?0", "?1"])
            headers["Sec-CH-UA-Platform"] = random.choice(['"Windows"', '"macOS"', '"Linux"', '"Android"'])
        
        return headers
    
    def extract_domain(self, url):
        """Extract domain from URL for rate limiting purposes"""
        parsed = urlparse(url)
        domain = parsed.netloc
        
        # For Roblox subdomains, be more specific
        if "roblox.com" in domain:
            parts = domain.split(".")
            if len(parts) >= 3 and parts[0] != "www":
                return f"{parts[0]}.roblox.com"
        
        return domain
    
    async def get_delay(self, url):
        """
        Calculate appropriate delay for a domain based on history
        and backoff level
        """
        domain = self.extract_domain(url)
        current_time = time.time()
        
        # Initialize if needed
        if domain not in self.domain_last_request:
            self.domain_last_request[domain] = current_time - 10
            self.domain_backoff[domain] = 0
        
        # Calculate time since last request
        time_since_last = current_time - self.domain_last_request[domain]
        
        # Base delay depends on domain and backoff level
        if "roblox" in domain:
            # Different subdomains have different rate limits
            if "thumbnails" in domain:
                base_delay = 2.0  # More strict for image API
            elif "economy" in domain or "catalog" in domain:
                base_delay = 1.5  # Strict for catalog APIs
            else:
                base_delay = 1.0  # Default for other Roblox domains
        else:
            base_delay = 0.5  # Other domains
        
        # Apply backoff multiplier
        base_delay *= (1.0 + self.domain_backoff[domain] * 0.5)
        
        # Calculate remaining delay needed
        if time_since_last < base_delay:
            delay = base_delay - time_since_last
            # Add jitter (±20%)
            jitter = delay * 0.2
            delay += random.uniform(-jitter, jitter)
            return max(0, delay)
        
        return 0
    
    async def update_domain_timing(self, url, success=True):
        """Update domain timing information after a request"""
        domain = self.extract_domain(url)
        self.domain_last_request[domain] = time.time()
        
        if success:
            # On success, gradually reduce backoff level (with 25% chance)
            if self.domain_backoff.get(domain, 0) > 0 and random.random() < 0.25:
                self.domain_backoff[domain] = max(0, self.domain_backoff[domain] - 0.5)
        else:
            # On failure, increase backoff level
            self.domain_backoff[domain] = self.domain_backoff.get(domain, 0) + 1.0
            # Cap at level 10
            self.domain_backoff[domain] = min(10, self.domain_backoff[domain])
    
    def get_cache_key(self, url):
        """Generate a cache key from a URL"""
        import hashlib
        return hashlib.md5(url.encode()).hexdigest()
    
    def get_from_cache(self, url, max_age=3600):
        """Get response from cache if available and fresh"""
        cache_key = self.get_cache_key(url)
        if cache_key in self.cache:
            cached_time, cached_data = self.cache[cache_key]
            if time.time() - cached_time <= max_age:
                return cached_data
        return None
    
    def save_to_cache(self, url, data):
        """Save response to cache"""
        cache_key = self.get_cache_key(url)
        self.cache[cache_key] = (time.time(), data)
    
    async def fetch_with_retry(self, session, url, max_retries=MAX_RETRIES):
        """Fetch a URL with retry logic and rate limiting"""
        # Check cache first
        cached_data = self.get_from_cache(url)
        if cached_data:
            logger.debug(f"Cache hit for {url}")
            return True, cached_data
        
        # Calculate and apply delay
        delay = await self.get_delay(url)
        if delay > 0:
            await asyncio.sleep(delay)
        
        # Update domain timing
        await self.update_domain_timing(url)
        
        # Get appropriate headers
        headers = await self.get_headers()
        
        for attempt in range(max_retries):
            try:
                async with self.semaphore:
                    async with session.get(
                        url, 
                        headers=headers, 
                        timeout=ClientTimeout(total=REQUEST_TIMEOUT),
                        ssl=self.ssl_context
                    ) as response:
                        # Handle rate limiting
                        if response.status == 429:
                            logger.warning(f"Rate limited on {url}, attempt {attempt + 1}/{max_retries}")
                            
                            # Update as failure
                            await self.update_domain_timing(url, success=False)
                            
                            # Exponential backoff with jitter
                            backoff_delay = BASE_DELAY * (2 ** attempt) + random.uniform(0, 2)
                            await asyncio.sleep(backoff_delay)
                            continue
                        
                        # Handle success
                        if response.status == 200:
                            content_type = response.headers.get("Content-Type", "")
                            
                            if "application/json" in content_type:
                                data = await response.json()
                            else:
                                data = await response.read()
                            
                            # Cache the successful response
                            self.save_to_cache(url, data)
                            
                            return True, data
                        
                        # Handle other status codes
                        logger.warning(f"HTTP error {response.status} on {url}")
                        
                        # Don't retry certain client errors
                        if response.status in [400, 403, 404]:
                            return False, None
                        
                        # For server errors, retry with backoff
                        backoff_delay = BASE_DELAY * (2 ** attempt) + random.uniform(0, 1)
                        await asyncio.sleep(backoff_delay)
            
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                logger.error(f"Request error on {url}: {e}")
                
                # Exponential backoff with jitter
                backoff_delay = BASE_DELAY * (2 ** attempt) + random.uniform(0, 1)
                await asyncio.sleep(backoff_delay)
        
        logger.error(f"Failed after {max_retries} attempts: {url}")
        return False, None
    
    async def fetch_developer_assets(self, session, dev_id):
        """Fetch assets for a specific developer"""
        assets_url = f"https://inventory.roblox.com/v1/users/{dev_id}/assets/collectibles?limit=100&sortOrder=Asc"
        
        logger.info(f"Fetching assets for developer ID {dev_id}")
        success, data = await self.fetch_with_retry(session, assets_url)
        
        if success and data:
            assets_data = data.get("data", [])
            logger.info(f"Found {len(assets_data)} assets for developer {dev_id}")
            
            for asset in assets_data:
                # Add source information
                asset["source"] = "developer"
                asset["sourceId"] = dev_id
                
                # Get additional details
                await self.fetch_asset_details(session, asset)
            
            return assets_data
        
        return []
    
    async def fetch_group_assets(self, session, group_id):
        """Fetch assets for a specific group"""
        assets_url = f"https://inventory.roblox.com/v1/groups/{group_id}/assets?limit=100&sortOrder=Asc"
        
        logger.info(f"Fetching assets for group ID {group_id}")
        success, data = await self.fetch_with_retry(session, assets_url)
        
        if success and data:
            assets_data = data.get("data", [])
            logger.info(f"Found {len(assets_data)} assets for group {group_id}")
            
            for asset in assets_data:
                # Add source information
                asset["source"] = "group"
                asset["sourceId"] = group_id
                
                # Get additional details
                await self.fetch_asset_details(session, asset)
            
            return assets_data
        
        return []
    
    async def fetch_asset_details(self, session, asset):
        """Fetch additional details for an asset"""
        asset_id = asset.get("assetId")
        if not asset_id:
            return
        
        details_url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
        
        success, details = await self.fetch_with_retry(session, details_url)
        
        if success and details:
            # Merge details into asset
            for key, value in details.items():
                if key not in asset:
                    asset[key] = value
            
            # Download thumbnail
            await self.fetch_asset_thumbnail(session, asset)
    
    async def fetch_asset_thumbnail(self, session, asset):
        """Fetch and save thumbnail for an asset"""
        asset_id = asset.get("assetId")
        if not asset_id:
            return
        
        thumbnail_url = f"https://thumbnails.roblox.com/v1/assets?assetIds={asset_id}&size=420x420&format=Png&isCircular=false"
        
        success, data = await self.fetch_with_retry(session, thumbnail_url)
        
        if success and data:
            thumbnail_data = data.get("data", [])
            if thumbnail_data and "imageUrl" in thumbnail_data[0]:
                image_url = thumbnail_data[0]["imageUrl"]
                
                # Download the actual image
                success, image_data = await self.fetch_with_retry(session, image_url)
                
                if success and image_data:
                    # Save to file
                    cache_path = os.path.join(IMAGE_CACHE_DIR, f"{asset_id}.png")
                    with open(cache_path, "wb") as f:
                        if isinstance(image_data, dict):
                            # Something went wrong, got JSON instead of binary
                            logger.warning(f"Got JSON instead of image for {asset_id}")
                        else:
                            f.write(image_data)
                            asset["thumbnail_path"] = cache_path
    
    async def scan_all_sources(self):
        """Scan all developers and groups concurrently"""
        # Create a timeout instance for limiting how long each request can take
        timeout = ClientTimeout(total=60)
        
        async with ClientSession(timeout=timeout) as session:
            developer_tasks = []
            group_tasks = []
            
            # Create tasks for all developers
            for dev in KEY_DEVELOPERS:
                developer_tasks.append(self.fetch_developer_assets(session, dev["id"]))
            
            # Create tasks for all groups
            for group in BIG_GAMES_GROUPS:
                group_tasks.append(self.fetch_group_assets(session, group["id"]))
            
            # Run developer tasks concurrently
            logger.info(f"Running {len(developer_tasks)} developer scan tasks concurrently")
            developer_results = await asyncio.gather(*developer_tasks, return_exceptions=True)
            
            # Run group tasks concurrently
            logger.info(f"Running {len(group_tasks)} group scan tasks concurrently")
            group_results = await asyncio.gather(*group_tasks, return_exceptions=True)
            
            # Process developer results
            for result in developer_results:
                if isinstance(result, Exception):
                    logger.error(f"Developer scan error: {result}")
                elif isinstance(result, list):
                    self.assets.extend(result)
            
            # Process group results
            for result in group_results:
                if isinstance(result, Exception):
                    logger.error(f"Group scan error: {result}")
                elif isinstance(result, list):
                    self.assets.extend(result)
            
            # Remove duplicates
            unique_assets = []
            seen_ids = set()
            for asset in self.assets:
                asset_id = asset.get("assetId")
                if asset_id and asset_id not in seen_ids:
                    seen_ids.add(asset_id)
                    unique_assets.append(asset)
            
            # Sort by creation date (newest first)
            unique_assets.sort(key=lambda x: x.get("created", ""), reverse=True)
            
            return unique_assets

async def main():
    """Run the async scanner and print results"""
    print("="*60)
    print("ASYNC ROBLOX ASSET SCANNER")
    print("="*60)
    print(f"Scanning {len(KEY_DEVELOPERS)} developers and {len(BIG_GAMES_GROUPS)} groups")
    print(f"Max concurrent requests: {MAX_CONCURRENT_REQUESTS}")
    print(f"Max retries: {MAX_RETRIES}")
    print(f"Base delay: {BASE_DELAY} seconds")
    print("="*60)
    
    start_time = time.time()
    
    scanner = AsyncRobloxScanner()
    assets = await scanner.scan_all_sources()
    
    elapsed_time = time.time() - start_time
    
    print("="*60)
    print(f"Scan completed in {elapsed_time:.2f} seconds")
    print(f"Found {len(assets)} unique assets")
    print("="*60)
    
    # Save results to file
    output_file = "async_scan_results.json"
    with open(output_file, "w") as f:
        json.dump(assets, f, indent=2)
    
    print(f"Results saved to {output_file}")
    print("="*60)
    
    return assets

if __name__ == "__main__":
    # Run the async main function
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nScan interrupted by user")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()