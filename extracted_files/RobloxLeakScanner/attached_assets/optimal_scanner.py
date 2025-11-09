#!/usr/bin/env python3
"""
Optimal Roblox Scanner

This module integrates the best techniques from our existing codebase to provide
optimal Roblox API scanning with advanced rate limiting.

Features:
1. Advanced browser fingerprinting and session rotation
2. Intelligent domain-specific rate limiting
3. Response caching to avoid repeat requests
4. Distributed chunking of API requests
5. Exponential backoff with jitter for error handling
"""

import os
import sys
import time
import json
import logging
import random
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from urllib.parse import urlparse
import sqlite3

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import existing solutions
try:
    # Core request handling
    from roblox_request_bypass import make_request, json_request
    
    # Advanced rate limiting
    from improved_rate_limiting import ImprovedRateLimiter
    
    # Sophisticated browser fingerprinting
    sys.path.append(os.path.join(parent_dir, "Enhanced_Anti_Detection_Methods"))
    from advanced_bypass import RobloxBypass
except ImportError as e:
    logger.error(f"Error importing required modules: {e}")
    logger.error("Make sure all required modules are available.")
    sys.exit(1)

# Constants
CACHE_DIR = os.path.join("static", "images", "assets")
DB_PATH = os.path.join("scanner_optimization_tests", "optimal_scanner_cache.db")
MAX_CONCURRENT_REQUESTS = 5
CHUNK_SIZE = 5
CHUNK_DELAY = 30

# Ensure directories exist
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Semaphore to limit concurrent requests
request_semaphore = threading.Semaphore(MAX_CONCURRENT_REQUESTS)

class OptimalScanner:
    """
    Optimal Roblox scanner that integrates the best techniques from our codebase
    """
    
    def __init__(self, cache_dir=CACHE_DIR):
        """
        Initialize the optimal scanner
        
        Args:
            cache_dir: Directory to cache thumbnails and other assets
        """
        self.cache_dir = cache_dir
        
        # Initialize components from existing solutions
        self.rate_limiter = ImprovedRateLimiter()
        self.bypass = RobloxBypass()
        
        # Initialize cache DB
        self.init_cache_db()
        
        # Track domain-specific request timing
        self.domain_last_request = {}
        self.domain_backoff = {}
        
        logger.info(f"Initialized OptimalScanner with cache_dir={cache_dir}")
    
    def init_cache_db(self):
        """Initialize the cache database"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create cache table for URL responses
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS request_cache (
            url_hash TEXT PRIMARY KEY,
            url TEXT,
            response BLOB,
            content_type TEXT,
            timestamp REAL
        )
        ''')
        
        # Create assets table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            asset_id TEXT PRIMARY KEY,
            data TEXT,
            source TEXT,
            source_id TEXT,
            discovered_at REAL
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def extract_domain(self, url):
        """
        Extract domain from URL for rate limiting purposes
        
        Args:
            url: URL to extract domain from
            
        Returns:
            Domain string
        """
        parsed = urlparse(url)
        domain = parsed.netloc
        
        # For Roblox subdomains, be more specific
        if "roblox.com" in domain:
            parts = domain.split(".")
            if len(parts) >= 3 and parts[0] != "www":
                return f"{parts[0]}.roblox.com"
        
        return domain
    
    def calculate_delay(self, url):
        """
        Calculate appropriate delay for a domain based on history
        
        Args:
            url: URL being requested
            
        Returns:
            Delay in seconds
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
    
    def update_domain_timing(self, url, success=True):
        """
        Update domain timing information after a request
        
        Args:
            url: URL that was requested
            success: Whether the request succeeded
        """
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
    
    def get_cached_response(self, url, max_age=3600):
        """
        Get cached response for a URL
        
        Args:
            url: URL to check in cache
            max_age: Maximum age in seconds
            
        Returns:
            Cached response or None
        """
        url_hash = self.hash_url(url)
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
            SELECT response, content_type, timestamp FROM request_cache
            WHERE url_hash = ?
            ''', (url_hash,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                response_data, content_type, timestamp = result
                
                # Check if cache is fresh
                if time.time() - timestamp <= max_age:
                    return response_data, content_type
        except Exception as e:
            logger.error(f"Error accessing cache: {e}")
        
        return None
    
    def cache_response(self, url, response_data, content_type):
        """
        Cache a response for future use
        
        Args:
            url: URL that was requested
            response_data: Response data to cache
            content_type: Content type of response
        """
        url_hash = self.hash_url(url)
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
            INSERT OR REPLACE INTO request_cache
            (url_hash, url, response, content_type, timestamp)
            VALUES (?, ?, ?, ?, ?)
            ''', (url_hash, url, response_data, content_type, time.time()))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error caching response: {e}")
    
    def hash_url(self, url):
        """Generate a hash for a URL"""
        import hashlib
        return hashlib.md5(url.encode()).hexdigest()
    
    def optimal_request(self, url, max_retries=3):
        """
        Make an optimal request with advanced rate limiting
        
        Args:
            url: URL to request
            max_retries: Maximum number of retries
            
        Returns:
            (success, data, content_type)
        """
        # Check cache first
        cached = self.get_cached_response(url)
        if cached:
            logger.info(f"Cache hit for {url}")
            return True, cached[0], cached[1]
        
        # Calculate and apply delay
        with request_semaphore:
            delay = self.calculate_delay(url)
            if delay > 0:
                logger.debug(f"Sleeping for {delay:.2f}s before requesting {url}")
                time.sleep(delay)
            
            # Update timing
            self.update_domain_timing(url)
            
            # Try different request methods based on URL pattern
            if "thumbnails.roblox.com" in url:
                # For thumbnails, use make_request from roblox_request_bypass
                logger.debug(f"Using make_request for thumbnail: {url}")
                success, data, content_type = make_request(url, max_retries)
            elif "users.roblox.com" in url or "groups.roblox.com" in url:
                # For user/group info, use RobloxBypass
                logger.debug(f"Using RobloxBypass for user/group data: {url}")
                response_data = self.bypass.get(url, max_retries=max_retries)
                
                if response_data:
                    # Handle different return types
                    if isinstance(response_data, dict):
                        data = json.dumps(response_data).encode('utf-8')
                    elif isinstance(response_data, str):
                        data = response_data.encode('utf-8')
                    else:
                        data = response_data
                    
                    content_type = "application/json"
                    success = True
                else:
                    success, data, content_type = False, None, None
            else:
                # For other requests, use ImprovedRateLimiter
                logger.debug(f"Using ImprovedRateLimiter for: {url}")
                success, data, content_type = self.rate_limiter.make_request(url, max_retries)
            
            # Update domain backoff based on success
            self.update_domain_timing(url, success)
            
            # Cache successful responses
            if success and data:
                self.cache_response(url, data, content_type)
            
            return success, data, content_type
    
    def optimal_json_request(self, url, max_retries=3):
        """
        Make an optimal JSON request
        
        Args:
            url: URL to request
            max_retries: Maximum number of retries
            
        Returns:
            (success, json_data)
        """
        success, data, content_type = self.optimal_request(url, max_retries)
        
        if success and data:
            try:
                if isinstance(data, dict):
                    return True, data
                
                json_data = json.loads(data.decode('utf-8'))
                return True, json_data
            except Exception as e:
                logger.error(f"Error parsing JSON from {url}: {e}")
        
        return False, None
    
    def get_developer_info(self, developer_id):
        """
        Get information about a developer
        
        Args:
            developer_id: Developer ID to get info for
            
        Returns:
            Developer info dict or None
        """
        url = f"https://users.roblox.com/v1/users/{developer_id}"
        success, data = self.optimal_json_request(url)
        
        if success:
            return data
        
        return None
    
    def get_group_info(self, group_id):
        """
        Get information about a group
        
        Args:
            group_id: Group ID to get info for
            
        Returns:
            Group info dict or None
        """
        url = f"https://groups.roblox.com/v1/groups/{group_id}"
        success, data = self.optimal_json_request(url)
        
        if success:
            return data
        
        return None
    
    def scan_developer_assets(self, developer_id):
        """
        Scan a developer's assets using optimal request methods
        
        Args:
            developer_id: Developer ID to scan
            
        Returns:
            List of assets
        """
        logger.info(f"Scanning developer ID {developer_id}")
        assets = []
        
        # Get developer info
        dev_info = self.get_developer_info(developer_id)
        developer_name = dev_info.get("name", "Unknown") if dev_info else "Unknown"
        
        # Get inventory
        inventory_url = f"https://inventory.roblox.com/v1/users/{developer_id}/assets/collectibles?limit=100&sortOrder=Asc"
        success, inventory_data = self.optimal_json_request(inventory_url)
        
        if success and "data" in inventory_data:
            for asset in inventory_data["data"]:
                # Add source info
                asset["developer_id"] = developer_id
                asset["developer_name"] = developer_name
                asset["source"] = "developer"
                asset["source_id"] = str(developer_id)
                
                # Get additional details
                asset_id = asset.get("assetId")
                if asset_id:
                    # Get details
                    self.get_asset_details(asset)
                    
                    # Get thumbnail
                    self.get_asset_thumbnail(asset)
                    
                    # Save asset to cache
                    self.save_asset(asset)
                    
                    assets.append(asset)
        
        logger.info(f"Found {len(assets)} assets for developer {developer_name}")
        return assets
    
    def scan_group_assets(self, group_id):
        """
        Scan a group's assets using optimal request methods
        
        Args:
            group_id: Group ID to scan
            
        Returns:
            List of assets
        """
        logger.info(f"Scanning group ID {group_id}")
        assets = []
        
        # Get group info
        group_info = self.get_group_info(group_id)
        group_name = group_info.get("name", "Unknown") if group_info else "Unknown"
        
        # Get inventory
        inventory_url = f"https://inventory.roblox.com/v1/groups/{group_id}/assets?limit=100&sortOrder=Asc"
        success, inventory_data = self.optimal_json_request(inventory_url)
        
        if success and "data" in inventory_data:
            for asset in inventory_data["data"]:
                # Add source info
                asset["group_id"] = group_id
                asset["group_name"] = group_name
                asset["source"] = "group"
                asset["source_id"] = str(group_id)
                
                # Get additional details
                asset_id = asset.get("assetId")
                if asset_id:
                    # Get details
                    self.get_asset_details(asset)
                    
                    # Get thumbnail
                    self.get_asset_thumbnail(asset)
                    
                    # Save asset to cache
                    self.save_asset(asset)
                    
                    assets.append(asset)
        
        logger.info(f"Found {len(assets)} assets for group {group_name}")
        return assets
    
    def get_asset_details(self, asset):
        """
        Get additional details for an asset
        
        Args:
            asset: Asset to add details to
        """
        asset_id = asset.get("assetId")
        if not asset_id:
            return
        
        # Get details
        details_url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
        success, details = self.optimal_json_request(details_url)
        
        if success and details:
            # Add details to asset
            for key, value in details.items():
                if key not in asset:
                    asset[key] = value
    
    def get_asset_thumbnail(self, asset):
        """
        Get thumbnail for an asset
        
        Args:
            asset: Asset to add thumbnail to
        """
        asset_id = asset.get("assetId")
        if not asset_id:
            return
        
        # Build thumbnail path
        thumbnail_path = os.path.join(self.cache_dir, f"{asset_id}.png")
        
        # Check if thumbnail already exists
        if os.path.exists(thumbnail_path):
            asset["thumbnail_path"] = thumbnail_path
            return
        
        # Get thumbnail URL
        thumbnail_url = f"https://thumbnails.roblox.com/v1/assets?assetIds={asset_id}&size=420x420&format=Png&isCircular=false"
        success, thumbnail_data = self.optimal_json_request(thumbnail_url)
        
        if success and "data" in thumbnail_data:
            data_items = thumbnail_data["data"]
            if data_items and "imageUrl" in data_items[0]:
                image_url = data_items[0]["imageUrl"]
                
                # Download image
                success, image_data, _ = self.optimal_request(image_url)
                
                if success and image_data:
                    # Save image
                    with open(thumbnail_path, "wb") as f:
                        f.write(image_data)
                    
                    asset["thumbnail_path"] = thumbnail_path
    
    def save_asset(self, asset):
        """
        Save asset to cache
        
        Args:
            asset: Asset to save
        """
        asset_id = asset.get("assetId")
        if not asset_id:
            return
        
        try:
            # Serialize asset data
            asset_data = json.dumps(asset)
            
            # Save to DB
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
            INSERT OR REPLACE INTO assets
            (asset_id, data, source, source_id, discovered_at)
            VALUES (?, ?, ?, ?, ?)
            ''', (
                str(asset_id),
                asset_data,
                asset.get("source", "unknown"),
                asset.get("source_id", "unknown"),
                time.time()
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving asset {asset_id}: {e}")
    
    def scan_sources(self, developers, groups):
        """
        Scan multiple developers and groups in chunks
        
        Args:
            developers: List of developer dicts with id and name
            groups: List of group dicts with id and name
            
        Returns:
            List of assets found
        """
        all_assets = []
        
        # Process developers in chunks
        logger.info(f"Processing {len(developers)} developers in chunks of {CHUNK_SIZE}")
        for i in range(0, len(developers), CHUNK_SIZE):
            chunk = developers[i:i+CHUNK_SIZE]
            chunk_num = i // CHUNK_SIZE + 1
            total_chunks = (len(developers) + CHUNK_SIZE - 1) // CHUNK_SIZE
            
            logger.info(f"Processing developer chunk {chunk_num}/{total_chunks}")
            
            # Process developers in this chunk
            with ThreadPoolExecutor(max_workers=min(len(chunk), MAX_CONCURRENT_REQUESTS)) as executor:
                future_to_dev = {executor.submit(self.scan_developer_assets, dev["id"]): dev for dev in chunk}
                
                for future in as_completed(future_to_dev):
                    dev = future_to_dev[future]
                    try:
                        assets = future.result()
                        all_assets.extend(assets)
                        logger.info(f"Completed scanning developer {dev['name']}")
                    except Exception as e:
                        logger.error(f"Error scanning developer {dev['name']}: {e}")
            
            # Add delay between chunks
            if i + CHUNK_SIZE < len(developers):
                delay = CHUNK_DELAY + random.uniform(5, 15)
                logger.info(f"Waiting {delay:.2f} seconds before next developer chunk...")
                time.sleep(delay)
        
        # Process groups in chunks
        logger.info(f"Processing {len(groups)} groups in chunks of {CHUNK_SIZE}")
        for i in range(0, len(groups), CHUNK_SIZE):
            chunk = groups[i:i+CHUNK_SIZE]
            chunk_num = i // CHUNK_SIZE + 1
            total_chunks = (len(groups) + CHUNK_SIZE - 1) // CHUNK_SIZE
            
            logger.info(f"Processing group chunk {chunk_num}/{total_chunks}")
            
            # Process groups in this chunk
            with ThreadPoolExecutor(max_workers=min(len(chunk), MAX_CONCURRENT_REQUESTS)) as executor:
                future_to_group = {executor.submit(self.scan_group_assets, group["id"]): group for group in chunk}
                
                for future in as_completed(future_to_group):
                    group = future_to_group[future]
                    try:
                        assets = future.result()
                        all_assets.extend(assets)
                        logger.info(f"Completed scanning group {group['name']}")
                    except Exception as e:
                        logger.error(f"Error scanning group {group['name']}: {e}")
            
            # Add delay between chunks
            if i + CHUNK_SIZE < len(groups):
                delay = CHUNK_DELAY + random.uniform(5, 15)
                logger.info(f"Waiting {delay:.2f} seconds before next group chunk...")
                time.sleep(delay)
        
        # Remove duplicates
        unique_assets = []
        seen_ids = set()
        
        for asset in all_assets:
            asset_id = asset.get("assetId")
            if asset_id and asset_id not in seen_ids:
                seen_ids.add(asset_id)
                unique_assets.append(asset)
        
        return unique_assets

# Default PS99 developers and groups to scan
PS99_DEVELOPERS = [
    {"id": 13365322, "name": "ChickenEngineer"},     # Preston (BIG Games founder)
    {"id": 1493409, "name": "BuildIntoGames"},       # BIG Games official account
]

PS99_GROUPS = [
    {"id": 1818, "name": "BIG Games"},               # Main BIG Games group
]

def main():
    """Main function to demonstrate the optimal scanner"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Optimal Roblox Asset Scanner")
    parser.add_argument("--cache-dir", default=CACHE_DIR, help="Directory to cache images")
    parser.add_argument("--output", default="optimal_scan_results.json", help="Output file for results")
    args = parser.parse_args()
    
    print("=" * 60)
    print("OPTIMAL ROBLOX ASSET SCANNER")
    print("=" * 60)
    print(f"Cache directory: {args.cache_dir}")
    print(f"Output file: {args.output}")
    print("=" * 60)
    
    # Create scanner
    scanner = OptimalScanner(cache_dir=args.cache_dir)
    
    # Start timing
    start_time = time.time()
    
    print("Starting scan of PS99 sources...")
    print("=" * 60)
    
    try:
        # Scan sources
        assets = scanner.scan_sources(PS99_DEVELOPERS, PS99_GROUPS)
        
        # Calculate elapsed time
        elapsed_time = time.time() - start_time
        
        # Prepare results
        results = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "elapsed_seconds": elapsed_time,
            "total_assets_found": len(assets),
            "assets": assets
        }
        
        # Save results
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        
        print("=" * 60)
        print(f"Scan completed in {elapsed_time:.2f} seconds")
        print(f"Found {len(assets)} unique assets")
        print(f"Results saved to {args.output}")
        print("=" * 60)
        
        # Show recent assets
        if assets:
            # Sort by creation date
            assets.sort(key=lambda x: x.get("created", ""), reverse=True)
            
            print("\nRecent assets:")
            for idx, asset in enumerate(assets[:5]):
                print(f"{idx+1}. {asset.get('name', 'Unknown')} (ID: {asset.get('assetId', 'Unknown')})")
                print(f"   Created: {asset.get('created', 'Unknown')}")
                if 'thumbnail_path' in asset:
                    print(f"   Thumbnail: {asset['thumbnail_path']}")
                print()
    
    except Exception as e:
        print(f"Error during scan: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()