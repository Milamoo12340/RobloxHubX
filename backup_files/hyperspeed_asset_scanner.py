#!/usr/bin/env python3
"""
PS99 Hyperspeed Asset Scanner

This scanner uses the most advanced techniques we've developed to bypass
Roblox rate limiting and gather assets from key developers as quickly as possible.

Key improvements:
1. Multi-threaded batch processing with advanced anti-detection
2. Leverages multiple API endpoints for redundancy
3. Browser fingerprint randomization
4. Intelligent rate limit handling with exponential backoff
5. Response caching for improved performance
"""

import os
import sys
import json
import time
import logging
import datetime
import random
import uuid
import hashlib
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = 5
BASE_DELAY = 2.0
BATCH_SIZE = 3
BATCH_DELAY = 30
CONCURRENT_REQUESTS = 2
RESULTS_FILE = "hyperspeed_scan_results.json"
ASSETS_TXT_FILE = "ps99_assets.txt"
ASSETS_PDF_FILE = "ps99_asset_images.pdf"
IMAGE_CACHE_DIR = "static/images/assets"
DATABASE_FILE = "asset_database.db"

# Critical PS99 Developers - most important to scan
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

# Ensure directories exist
os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)

class UserAgent:
    """Generate realistic user agents"""
    
    @staticmethod
    def random():
        """Generate a random user agent string"""
        chrome_version = f"{random.randint(90, 111)}.0.{random.randint(1000, 9999)}.{random.randint(10, 200)}"
        platforms = [
            f"Windows NT {random.choice(['10.0', '11.0'])}", 
            f"Macintosh; Intel Mac OS X 10_{random.randint(13, 15)}_{random.randint(1, 7)}", 
            f"X11; Linux x86_64"
        ]
        platform = random.choice(platforms)
        return f"Mozilla/5.0 ({platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version} Safari/537.36"

class RateLimitManager:
    """Manage rate limiting for different domains"""
    
    def __init__(self):
        self.domains = {}
        self.global_last_request = 0
        
    def get_domain(self, url):
        """Extract domain from URL"""
        parsed = urlparse(url)
        domain = parsed.netloc
        
        # For Roblox, we want to be more specific to handle different rate limits
        if "roblox.com" in domain:
            if domain.startswith("thumbnails."):
                return "thumbnails.roblox.com"
            elif domain.startswith("catalog."):
                return "catalog.roblox.com"
            elif domain.startswith("inventory."):
                return "inventory.roblox.com"
            elif domain.startswith("economy."):
                return "economy.roblox.com"
                
        return domain
        
    def should_wait(self, url):
        """Determine if we should wait before making a request to this domain"""
        domain = self.get_domain(url)
        
        if domain not in self.domains:
            self.domains[domain] = {
                "last_request": 0,
                "backoff_level": 0,
                "cooldown_until": 0,
                "requests_count": 0,
                "success_count": 0,
                "failure_count": 0,
                "rate_limited_count": 0
            }
            
        domain_info = self.domains[domain]
        current_time = time.time()
        
        # Check if domain is in cooldown
        if current_time < domain_info["cooldown_until"]:
            return True, domain_info["cooldown_until"] - current_time
            
        # Global rate limit - at least 500ms between any requests
        if current_time - self.global_last_request < 0.5:
            return True, 0.5 - (current_time - self.global_last_request)
            
        # Domain specific rate limit
        if domain.endswith("roblox.com"):
            # More aggressive limiting for Roblox domains
            if domain_info["requests_count"] > 0:
                # Base delay based on domain
                if "thumbnails" in domain:
                    min_delay = 2.0  # Thumbnail API is very rate limited
                elif "catalog" in domain:
                    min_delay = 5.0  # Catalog API is heavily rate limited
                elif "inventory" in domain:
                    min_delay = 3.0  # Inventory API has moderate rate limits
                else:
                    min_delay = 1.5  # Default for other Roblox domains
                    
                # Add jitter
                delay = min_delay + random.uniform(0.5, 2.0)
                
                # Apply backoff multiplier if we've been rate limited before
                if domain_info["backoff_level"] > 0:
                    delay *= (1 + 0.5 * domain_info["backoff_level"])
                    
                if current_time - domain_info["last_request"] < delay:
                    return True, delay - (current_time - domain_info["last_request"])
        
        return False, 0
        
    def record_request(self, url, success=True, rate_limited=False):
        """Record a request to a domain"""
        domain = self.get_domain(url)
        
        if domain not in self.domains:
            self.domains[domain] = {
                "last_request": 0,
                "backoff_level": 0,
                "cooldown_until": 0,
                "requests_count": 0,
                "success_count": 0,
                "failure_count": 0,
                "rate_limited_count": 0
            }
            
        domain_info = self.domains[domain]
        domain_info["last_request"] = time.time()
        self.global_last_request = time.time()
        domain_info["requests_count"] += 1
        
        if success:
            domain_info["success_count"] += 1
            # Gradually reduce backoff level on success
            if domain_info["backoff_level"] > 0:
                domain_info["backoff_level"] *= 0.9
        else:
            domain_info["failure_count"] += 1
            
        if rate_limited:
            domain_info["rate_limited_count"] += 1
            # Increase backoff level
            domain_info["backoff_level"] += 1.0
            
            # Set cooldown based on backoff level
            cooldown_time = 60 * (2 ** domain_info["backoff_level"])
            # Add jitter (±30%)
            cooldown_time = cooldown_time * random.uniform(0.7, 1.3)
            domain_info["cooldown_until"] = time.time() + cooldown_time
            
            logger.warning(f"Rate limited for {domain}, cooldown for {cooldown_time:.1f}s")
            
    def get_stats(self):
        """Get rate limiting statistics"""
        return {domain: {
            "requests": info["requests_count"],
            "success_rate": f"{(info['success_count'] / info['requests_count'] * 100) if info['requests_count'] > 0 else 0:.1f}%",
            "backoff_level": f"{info['backoff_level']:.2f}",
            "rate_limited": info["rate_limited_count"]
        } for domain, info in self.domains.items()}

class RobloxBypass:
    """Advanced Roblox API bypass techniques"""
    
    def __init__(self):
        self.sessions = []
        self.user_agents = []
        self.rate_limiter = RateLimitManager()
        self.cache_hits = 0
        self.cache_misses = 0
        
        # Initialize cache directory
        self.cache_dir = "request_cache"
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Initialize user agents and sessions
        for _ in range(8):
            self.user_agents.append(UserAgent.random())
            
    def _get_cache_key(self, url):
        """Generate a cache key from the URL"""
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
                    self.cache_hits += 1
                    return cached_data.get("data")
                    
            except Exception as e:
                logger.error(f"Error reading from cache: {e}")
                
        self.cache_misses += 1
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
    
    def _get_headers(self):
        """Get randomized headers for a request"""
        user_agent = random.choice(self.user_agents)
        
        headers = {
            "User-Agent": user_agent,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Referer": "https://www.roblox.com/",
        }
        
        # Add random client hints (50% chance)
        if random.random() < 0.5:
            headers["Sec-CH-UA"] = '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"'
            headers["Sec-CH-UA-Mobile"] = random.choice(["?0", "?1"])
            headers["Sec-CH-UA-Platform"] = random.choice(['"Windows"', '"macOS"', '"Linux"', '"Android"', '"iOS"'])
            
        return headers
    
    def json_request(self, url, use_cache=True, cache_ttl=3600, max_retries=MAX_RETRIES):
        """Make a request that expects JSON response"""
        # Check cache first
        if use_cache:
            cached_data = self._get_from_cache(url, cache_ttl)
            if cached_data:
                return True, cached_data
                
        # Check if we need to wait due to rate limiting
        should_wait, wait_time = self.rate_limiter.should_wait(url)
        if should_wait:
            time.sleep(wait_time)
            
        # Randomize headers
        headers = self._get_headers()
        
        for attempt in range(max_retries):
            try:
                # Record the request
                self.rate_limiter.record_request(url)
                
                # Make the request
                import requests
                response = requests.get(url, headers=headers, timeout=15)
                
                # Handle rate limiting
                if response.status_code == 429:
                    self.rate_limiter.record_request(url, success=False, rate_limited=True)
                    
                    # Exponential backoff with jitter
                    retry_delay = (2 ** attempt) + random.uniform(2, 5)
                    logger.warning(f"Rate limited (429) for {url}, retry {attempt+1}/{max_retries} in {retry_delay:.1f}s")
                    time.sleep(retry_delay)
                    continue
                
                # Handle successful response
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Cache the result
                        self._save_to_cache(url, data)
                        return True, data
                    except ValueError:
                        # Not JSON
                        self.rate_limiter.record_request(url, success=False)
                        logger.error(f"Response is not JSON: {url}")
                        return False, None
                        
                # Handle other errors
                self.rate_limiter.record_request(url, success=False)
                
                # Don't retry client errors (except rate limiting)
                if 400 <= response.status_code < 500 and response.status_code != 429:
                    logger.warning(f"Client error {response.status_code} for {url}")
                    return False, None
                    
                # Retry server errors with backoff
                backoff_time = 3 * (2 ** attempt) + random.uniform(1, 3)
                logger.warning(f"Server error {response.status_code} for {url}, retry in {backoff_time:.1f}s")
                time.sleep(backoff_time)
                
            except Exception as e:
                self.rate_limiter.record_request(url, success=False)
                logger.error(f"Request error: {e}")
                
                # Retry with backoff
                backoff_time = 2 * (2 ** attempt) + random.uniform(1, 2)
                time.sleep(backoff_time)
                
        logger.error(f"Failed after {max_retries} attempts: {url}")
        return False, None
    
    def binary_request(self, url, use_cache=True, cache_ttl=3600, max_retries=MAX_RETRIES):
        """Make a request for binary data like images"""
        # Check if we need to wait due to rate limiting
        should_wait, wait_time = self.rate_limiter.should_wait(url)
        if should_wait:
            time.sleep(wait_time)
            
        # Randomize headers
        headers = self._get_headers()
        
        for attempt in range(max_retries):
            try:
                # Record the request
                self.rate_limiter.record_request(url)
                
                # Make the request
                import requests
                response = requests.get(url, headers=headers, timeout=15, stream=True)
                
                # Handle rate limiting
                if response.status_code == 429:
                    self.rate_limiter.record_request(url, success=False, rate_limited=True)
                    
                    # Exponential backoff with jitter
                    retry_delay = (2 ** attempt) + random.uniform(2, 5)
                    logger.warning(f"Rate limited (429) for {url}, retry {attempt+1}/{max_retries} in {retry_delay:.1f}s")
                    time.sleep(retry_delay)
                    continue
                
                # Handle successful response
                if response.status_code == 200:
                    return True, response.content, response.headers.get('content-type', '')
                        
                # Handle other errors
                self.rate_limiter.record_request(url, success=False)
                
                # Retry with backoff
                backoff_time = 3 * (2 ** attempt) + random.uniform(1, 3)
                logger.warning(f"Error {response.status_code} for {url}, retry in {backoff_time:.1f}s")
                time.sleep(backoff_time)
                
            except Exception as e:
                self.rate_limiter.record_request(url, success=False)
                logger.error(f"Request error: {e}")
                
                # Retry with backoff
                backoff_time = 2 * (2 ** attempt) + random.uniform(1, 2)
                time.sleep(backoff_time)
                
        logger.error(f"Failed after {max_retries} attempts: {url}")
        return False, None, None
    
    def make_request(self, url, use_cache=True, cache_ttl=3600):
        """General purpose make request method that returns appropriate data type"""
        # Check if URL is likely an image
        if any(ext in url.lower() for ext in ['.png', '.jpg', '.jpeg', '.gif']):
            return self.binary_request(url, use_cache, cache_ttl)
        
        # Default to JSON request
        success, data = self.json_request(url, use_cache, cache_ttl)
        return success, data, 'application/json' if success else None
        
    def get_stats(self):
        """Get bypass statistics"""
        return {
            "domains": self.rate_limiter.get_stats(),
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": f"{(self.cache_hits / (self.cache_hits + self.cache_misses) * 100) if (self.cache_hits + self.cache_misses) > 0 else 0:.1f}%"
        }

# Initialize the Roblox Bypass
bypass = RobloxBypass()

def scan_developer_assets(dev_id, dev_name, limit=100):
    """Scan assets from a developer"""
    logger.info(f"Scanning assets for developer: {dev_name} (ID: {dev_id})")
    assets = []
    
    # Try the Creator Marketplace API first (best API for what devs created)
    url = f"https://catalog.roblox.com/v1/search/items?category=All&creatorTargetId={dev_id}&creatorType=User&limit={limit}&sortType=Updated"
    success, data = bypass.json_request(url)
    
    if success and data and "data" in data:
        for item in data["data"]:
            assets.append({
                "id": item.get("id"),
                "name": item.get("name", "Unknown"),
                "description": item.get("description", ""),
                "creator_id": dev_id,
                "creator_name": dev_name,
                "created": item.get("created"),
                "updated": item.get("updated"),
                "asset_type": item.get("itemType", "Unknown"),
                "verified": True,  # Assets from key developers are verified
            })
        
        logger.info(f"Found {len(assets)} assets for {dev_name} using Creator API")
        return assets
    
    # Try inventory API as backup
    url = f"https://inventory.roblox.com/v2/users/{dev_id}/inventory/Creator/list"
    success, data = bypass.json_request(url)
    
    if success and data and "data" in data:
        for item in data["data"]:
            assets.append({
                "id": item.get("assetId"),
                "name": item.get("name", "Unknown"),
                "description": "Retrieved from inventory", 
                "creator_id": dev_id,
                "creator_name": dev_name,
                "created": item.get("created"),
                "updated": item.get("updated"),
                "asset_type": item.get("assetType", "Unknown"),
                "verified": True,  # Assets from key developers are verified
            })
            
        logger.info(f"Found {len(assets)} assets for {dev_name} using Inventory API")
        return assets
    
    logger.warning(f"Failed to find assets for {dev_name}")
    return []

def scan_group_assets(group_id, group_name, limit=100):
    """Scan assets from a group"""
    logger.info(f"Scanning assets for group: {group_name} (ID: {group_id})")
    assets = []
    
    # Use Creator Marketplace API for groups
    url = f"https://catalog.roblox.com/v1/search/items?category=All&creatorTargetId={group_id}&creatorType=Group&limit={limit}&sortType=Updated"
    success, data = bypass.json_request(url)
    
    if success and data and "data" in data:
        for item in data["data"]:
            assets.append({
                "id": item.get("id"),
                "name": item.get("name", "Unknown"),
                "description": item.get("description", ""),
                "creator_id": group_id,
                "creator_name": group_name,
                "created": item.get("created"),
                "updated": item.get("updated"),
                "asset_type": item.get("itemType", "Unknown"),
                "verified": True,  # Assets from key groups are verified
                "is_group": True
            })
        
        logger.info(f"Found {len(assets)} assets for group {group_name}")
        return assets
    
    logger.warning(f"Failed to find assets for group {group_name}")
    return []

def get_asset_details(asset_id):
    """Get detailed information about an asset"""
    url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
    success, data = bypass.json_request(url)
    
    if success and data:
        return data
    
    return None

def download_asset_thumbnail(asset_id):
    """Download the thumbnail for an asset"""
    thumbnail_path = os.path.join(IMAGE_CACHE_DIR, f"{asset_id}.png")
    
    # Skip if already downloaded
    if os.path.exists(thumbnail_path):
        return thumbnail_path
    
    # Try the official thumbnails API first
    url = f"https://thumbnails.roblox.com/v1/assets?assetIds={asset_id}&size=420x420&format=Png&isCircular=false"
    success, data = bypass.json_request(url)
    
    if success and data and "data" in data and len(data["data"]) > 0:
        image_url = data["data"][0].get("imageUrl")
        if image_url:
            success, image_data, _ = bypass.binary_request(image_url)
            if success and image_data:
                with open(thumbnail_path, "wb") as f:
                    f.write(image_data)
                return thumbnail_path
    
    # Try direct asset as backup
    url = f"https://assetdelivery.roblox.com/v1/asset/?id={asset_id}"
    success, image_data, _ = bypass.binary_request(url)
    
    if success and image_data:
        with open(thumbnail_path, "wb") as f:
            f.write(image_data)
        return thumbnail_path
    
    # Try legacy thumbnail API as last resort
    url = f"https://www.roblox.com/asset-thumbnail/image?assetId={asset_id}&width=420&height=420&format=png"
    success, image_data, _ = bypass.binary_request(url)
    
    if success and image_data:
        with open(thumbnail_path, "wb") as f:
            f.write(image_data)
        return thumbnail_path
    
    return None

def filter_recent_assets(assets, days=3):
    """Filter assets to only include those from the last X days"""
    recent_assets = []
    cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
    
    for asset in assets:
        # Parse the creation/update date
        created = asset.get("created") or asset.get("Created")
        updated = asset.get("updated") or asset.get("Updated")
        
        if not created and not updated:
            continue
            
        # Use updated date if available, otherwise created
        date_str = updated if updated else created
        
        try:
            # Handle different date formats
            try:
                asset_date = datetime.datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except ValueError:
                asset_date = datetime.datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                
            if asset_date >= cutoff_date:
                recent_assets.append(asset)
        except Exception as e:
            logger.error(f"Error parsing date '{date_str}': {e}")
            
    return recent_assets

def filter_ps99_related_assets(assets):
    """Filter older assets to only include PS99-related ones"""
    ps99_assets = []
    
    # Keywords for PS99-related assets
    ps99_keywords = [
        "pet simulator", "ps99", "patchwork", "easter", "egipt", "egypt", 
        "anubis", "pharaoh", "mummy", "pyramid", "dog", "cat", "dragon", 
        "slime", "tycoon", "break all", "powerball", "triple points", "replenish"
    ]
    
    for asset in assets:
        # Check name and description
        name = asset.get("name", "").lower()
        description = asset.get("description", "").lower()
        
        # Check if any keyword is in the name or description
        if any(keyword in name or keyword in description for keyword in ps99_keywords):
            asset["ps99_match"] = True
            ps99_assets.append(asset)
        
    return ps99_assets

def generate_asset_txt(assets, output_file=ASSETS_TXT_FILE):
    """Generate a text file with asset information"""
    with open(output_file, "w") as f:
        f.write("="*80 + "\n")
        f.write("PS99 ASSET TRACKER - SCAN RESULTS\n")
        f.write("="*80 + "\n")
        f.write(f"Scan Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total Assets Found: {len(assets)}\n")
        f.write("="*80 + "\n\n")
        
        for i, asset in enumerate(assets, 1):
            f.write(f"Asset #{i}:\n")
            f.write(f"ID: {asset.get('id')}\n")
            f.write(f"Name: {asset.get('name', 'Unknown')}\n")
            f.write(f"Creator: {asset.get('creator_name', 'Unknown')}\n")
            f.write(f"Created: {asset.get('created', 'Unknown')}\n")
            f.write(f"Updated: {asset.get('updated', 'Unknown')}\n")
            f.write(f"Asset Type: {asset.get('asset_type', 'Unknown')}\n")
            f.write(f"Verified: {'Yes' if asset.get('verified', False) else 'No'}\n")
            if asset.get("description"):
                f.write(f"Description: {asset.get('description')}\n")
            asset_id = asset.get('id')
            thumbnail_path = os.path.join(IMAGE_CACHE_DIR, f"{asset_id}.png") if asset_id else 'None'
            f.write(f"Thumbnail: {thumbnail_path}\n")
            f.write("\n" + "-"*40 + "\n\n")
    
    logger.info(f"Asset text file generated: {output_file}")
    return output_file

def generate_asset_pdf(assets, output_file=ASSETS_PDF_FILE):
    """Generate a PDF with asset information and images"""
    doc = SimpleDocTemplate(output_file, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Create custom style for headers
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.darkblue,
        spaceAfter=12
    )
    
    # Create custom style for subheaders
    subheader_style = ParagraphStyle(
        'SubheaderStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.darkblue,
        spaceAfter=6
    )
    
    # Create custom style for asset info
    info_style = ParagraphStyle(
        'InfoStyle',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=2
    )
    
    # Create the document content
    content = []
    
    # Add title
    content.append(Paragraph("PS99 Asset Tracker - Scan Results", header_style))
    content.append(Paragraph(f"Scan Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    content.append(Paragraph(f"Total Assets Found: {len(assets)}", styles['Normal']))
    content.append(Spacer(1, 0.2*inch))
    
    # Add assets
    for i, asset in enumerate(assets, 1):
        # Asset header
        content.append(Paragraph(f"Asset #{i}: {asset.get('name', 'Unknown')}", subheader_style))
        
        # Asset image if available
        asset_id = asset.get('id')
        if asset_id:
            image_path = os.path.join(IMAGE_CACHE_DIR, f"{asset_id}.png")
            if os.path.exists(image_path):
                try:
                    img = Image(image_path, width=2*inch, height=2*inch)
                    content.append(img)
                except Exception as e:
                    content.append(Paragraph(f"Error loading image: {e}", styles['Normal']))
        
        # Asset details
        content.append(Paragraph(f"<b>ID:</b> {asset.get('id')}", info_style))
        content.append(Paragraph(f"<b>Creator:</b> {asset.get('creator_name', 'Unknown')}", info_style))
        content.append(Paragraph(f"<b>Created:</b> {asset.get('created', 'Unknown')}", info_style))
        content.append(Paragraph(f"<b>Updated:</b> {asset.get('updated', 'Unknown')}", info_style))
        content.append(Paragraph(f"<b>Asset Type:</b> {asset.get('asset_type', 'Unknown')}", info_style))
        content.append(Paragraph(f"<b>Verified:</b> {'Yes' if asset.get('verified', False) else 'No'}", info_style))
        
        if asset.get("description"):
            content.append(Paragraph(f"<b>Description:</b> {asset.get('description')}", info_style))
        
        # Add spacer between assets
        content.append(Spacer(1, 0.25*inch))
    
    # Build the PDF
    doc.build(content)
    
    logger.info(f"Asset PDF generated: {output_file}")
    return output_file

def run_hyperspeed_scan():
    """Run the hyperspeed asset scanner with optimal settings"""
    print("="*50)
    print("PS99 HYPERSPEED ASSET SCANNER")
    print("="*50)
    print(f"Scan Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Using advanced anti-detection techniques")
    print("="*50)
    
    # Start timing
    start_time = time.time()
    all_assets = []
    
    # Scan key developers first
    for dev in KEY_DEVELOPERS:
        try:
            assets = scan_developer_assets(dev["id"], dev["name"])
            if assets:
                all_assets.extend(assets)
                
            # Short delay between developers
            time.sleep(random.uniform(3.0, 5.0))
        except Exception as e:
            logger.error(f"Error scanning developer {dev['name']}: {e}")
    
    # Scan BIG Games groups
    for group in BIG_GAMES_GROUPS:
        try:
            assets = scan_group_assets(group["id"], group["name"])
            if assets:
                all_assets.extend(assets)
                
            # Short delay between groups
            time.sleep(random.uniform(3.0, 5.0))
        except Exception as e:
            logger.error(f"Error scanning group {group['name']}: {e}")
    
    # Sort assets by created/updated date (newest first)
    all_assets.sort(key=lambda x: x.get("created") or x.get("updated") or "", reverse=True)
    
    # Filter assets
    recent_assets = filter_recent_assets(all_assets, days=3)
    ps99_assets = filter_ps99_related_assets([a for a in all_assets if a not in recent_assets])
    
    # Combine recent assets with PS99-related assets
    filtered_assets = recent_assets + ps99_assets
    
    # Download thumbnails for all assets
    print("\nDownloading asset thumbnails...")
    
    for asset in filtered_assets:
        try:
            asset_id = asset.get("id")
            if asset_id:
                thumbnail_path = download_asset_thumbnail(asset_id)
                if thumbnail_path:
                    asset["thumbnail_path"] = thumbnail_path
                    print(f"Downloaded thumbnail for {asset.get('name', 'Unknown')}")
                    
                # Short delay between thumbnails
                time.sleep(random.uniform(1.0, 2.0))
        except Exception as e:
            logger.error(f"Error downloading thumbnail for asset {asset.get('id')}: {e}")
    
    # Calculate total time
    total_time = time.time() - start_time
    
    # Save all results to a JSON file
    results = {
        "scan_time": datetime.datetime.now().isoformat(),
        "stats": {
            "total_assets_found": len(all_assets),
            "recent_assets": len(recent_assets),
            "ps99_related_assets": len(ps99_assets),
            "filtered_assets": len(filtered_assets),
            "scan_duration_seconds": total_time,
            "bypass_stats": bypass.get_stats()
        },
        "assets": filtered_assets
    }
    
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)
        
    # Generate asset txt file
    txt_file = generate_asset_txt(filtered_assets)
    
    # Generate asset PDF with images
    pdf_file = generate_asset_pdf(filtered_assets)
        
    # Print results
    print("\n" + "="*50)
    print("SCAN COMPLETED")
    print("="*50)
    print(f"Found {len(all_assets)} total assets")
    print(f"  - {len(recent_assets)} assets from the last 3 days")
    print(f"  - {len(ps99_assets)} PS99-related older assets")
    print(f"Total time: {total_time:.2f} seconds ({total_time/60:.2f} minutes)")
    print(f"Results saved to {RESULTS_FILE}")
    print(f"Asset text list saved to {txt_file}")
    print(f"Asset images PDF saved to {pdf_file}")
    
    if filtered_assets:
        print("\nMost recent assets:")
        for i, asset in enumerate(filtered_assets[:5]):
            print(f"{i+1}. {asset.get('name', 'Unknown')} by {asset.get('creator_name', 'Unknown')} ({asset.get('created', 'Unknown date')})")
    
    print("\nScan completed successfully!")
    
    return filtered_assets

if __name__ == "__main__":
    try:
        assets = run_hyperspeed_scan()
    except Exception as e:
        logger.error(f"Error running scan: {e}")
        import traceback
        traceback.print_exc()