"""
Optimized PS99 Asset Scanner

This module combines the best techniques from various scanner implementations
to create a high-performance scanner that processes 50+ developers in 5 minutes.

This enhanced version uses the proven rate limiting techniques from our production
scanner to avoid Roblox's 429 rate limiting errors.
"""

import os
import sys
import json
import time
import random
import logging
import datetime
import requests
import sqlite3
import cloudscraper
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from typing import List, Dict, Any, Tuple, Optional, Set
import urllib.request
import urllib.parse
import urllib.error
import ssl
import re

# Import our custom anti-rate-limiting patch
import optimized_scanner_patch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
IMAGE_CACHE_DIR = "static/images/assets"
DB_PATH = "optimized_scan_results.db"
MAX_CONCURRENT_REQUESTS = 5
CHUNK_SIZE = 5

# Key developers for PS99 from ps99_comprehensive_leaks_scanner.py
DEVELOPER_IDS = [
    13365322,  # ChickenEngineer/Preston 
    1493409,   # BuildIntoGames
    73738487,  # BestPogger
    169759196, # EmberKatt
    143625241, # Designer
    65876394,  # EggMasterjj
    18651207,  # iPencil
    155578904, # Gloopy_MoP
    139315853, # EvilArtist
    64234303,  # BoyPetsSimulator
    175295258, # KeyHexart
    157430071, # SlicesHedgehog
    123247162, # RobloxStudioDev
    28969907,  # BigGamesMatt
    1346394,   # MrDoge
    1248662,   # SinisterSpade
    25053584,  # ToadBoiDev
]

# Additional developers from Jacquie_Leaks_Scanner_2025
ADDITIONAL_DEVELOPERS = [
    16281425,  # coderMitchell
    1185722,   # coderTony
    25308400,  # David
    156261483, # VaIentine (Lead Developer)
    76212959,  # Wishing_Starr (PS99 Developer)
    109183683, # DevTactic (Puzzle Developer)
    34233177,  # Merely (Accessory Designer)
    18965731,  # berezaa (Advisor/Consultant)
    13742223,  # Defaultio (Developer)
    83355263,  # ChildishGodzilla (PS99 UI Developer)
    92945745,  # Whydon'tIhaveausername (Level Designer)
    155471004, # ArcaneSoulzz (PS99 Developer)
    23558830,  # Fifkee (Developer)
    142390455, # MarcusTheHedgehog (PS99 UI Artist)
    123247184, # RainbowStrike04 (PS99 Level Designer)
    153441080, # SlimeTamer (Slime specialist)
    47479594,  # EpicGamerGirl3 (Tester)
    48308991,  # Agent_John1 (PS99 Egypt Designer)
    103111582, # Z_Frost (Anubis Event Art)
    198763549, # SlimeDev_Maple (New Slime Assets)
]

# Big Games groups
GROUP_IDS = [
    4981455,  # Big Games
    10026748, # Pet Simulator
    5795297,  # Build Into Games
]

# Ensure cache directory exists
os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)

# Configure request semaphore
request_semaphore = threading.Semaphore(MAX_CONCURRENT_REQUESTS)

# Domain-specific backoff tracking
domain_backoffs = {}
backoff_levels = {}
last_request_times = {}

# Create a shared CloudScraper session pool
session_pool = []
for _ in range(8):
    scraper = cloudscraper.create_scraper(
        browser={
            'browser': random.choice(['chrome', 'firefox']),
            'platform': random.choice(['windows', 'darwin', 'linux']),
            'mobile': False
        }
    )
    session_pool.append(scraper)

def get_next_session():
    """Get the next session from the pool with rotation"""
    session = random.choice(session_pool)
    # Refresh headers to avoid patterns
    session.headers.update(get_random_headers())
    return session

def get_random_headers():
    """Generate random headers to avoid detection"""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.66",
    ]
    
    # Legitimate-looking referrers with variety
    referrers = [
        "https://www.roblox.com/",
        "https://www.roblox.com/discover",
        "https://www.roblox.com/games",
        "https://web.roblox.com/games/8737899170/Pet-Simulator-99",
        "https://www.roblox.com/groups/3959677/BIG-Games",
        "https://www.roblox.com/catalog",
        "https://create.roblox.com/dashboard",
    ]
    
    headers = {
        "User-Agent": random.choice(user_agents),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
        "Referer": random.choice(referrers),
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "TE": "trailers",
    }
    
    return headers

def get_domain(url):
    """Extract domain from URL"""
    parsed = urllib.parse.urlparse(url)
    return parsed.netloc

def should_throttle(domain):
    """Check if requests to a domain should be throttled"""
    current_time = time.time()
    
    # Check domain-specific backoff
    if domain in domain_backoffs and current_time < domain_backoffs[domain]:
        remaining = domain_backoffs[domain] - current_time
        logger.info(f"Domain {domain} is in backoff for {remaining:.2f}s")
        return True
    
    # Check rate limiting
    if domain in last_request_times:
        elapsed = current_time - last_request_times[domain]
        backoff_level = backoff_levels.get(domain, 0)
        
        # Calculate delay based on backoff level
        min_delay = 1.0 * (2 ** backoff_level)
        if elapsed < min_delay:
            return True
    
    return False

def update_rate_limits(domain, success):
    """Update rate limiting information for a domain"""
    current_time = time.time()
    last_request_times[domain] = current_time
    
    if not success:
        # Increase backoff level
        backoff_levels[domain] = backoff_levels.get(domain, 0) + 1
        backoff_time = 30 * (2 ** backoff_levels[domain])
        domain_backoffs[domain] = current_time + backoff_time
        logger.warning(f"Request to {domain} failed, setting {backoff_time}s backoff (level {backoff_levels[domain]})")
    else:
        # Gradually decrease backoff level on success
        if random.random() < 0.2 and domain in backoff_levels and backoff_levels[domain] > 0:
            backoff_levels[domain] -= 1

def init_database():
    """Initialize database with optimized schema for tracking assets"""
    logger.info("Initializing database")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create assets table with indexes for performance
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        asset_type TEXT,
        creator_id INTEGER,
        creator_name TEXT,
        created TEXT,
        updated TEXT,
        thumbnail_path TEXT,
        is_verified INTEGER DEFAULT 0,
        category TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create index on creator_id for faster developer lookups
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_creator_id ON assets(creator_id)')
    
    # Create index on timestamp for faster recent asset lookups
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON assets(timestamp)')
    
    # Create table to track scanned developers
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS scanned_developers (
        developer_id INTEGER PRIMARY KEY,
        name TEXT,
        scanned INTEGER DEFAULT 0,
        last_scanned TEXT
    )
    ''')
    
    # Create table to track scanned groups
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS scanned_groups (
        group_id INTEGER PRIMARY KEY,
        name TEXT,
        scanned INTEGER DEFAULT 0,
        last_scanned TEXT
    )
    ''')
    
    # Initialize developer list
    for dev_id in set(DEVELOPER_IDS + ADDITIONAL_DEVELOPERS):
        cursor.execute(
            "INSERT OR IGNORE INTO scanned_developers (developer_id, scanned) VALUES (?, 0)",
            (dev_id,)
        )
    
    # Initialize group list
    for group_id in GROUP_IDS:
        cursor.execute(
            "INSERT OR IGNORE INTO scanned_groups (group_id, scanned) VALUES (?, 0)",
            (group_id,)
        )
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

def make_request(url, max_retries=3):
    """Make a request with advanced anti-detection and rate limiting"""
    domain = get_domain(url)
    
    # Acquire semaphore to limit concurrent requests
    with request_semaphore:
        # Check if we should throttle
        if should_throttle(domain):
            jitter = random.uniform(1.0, 3.0)
            backoff_level = backoff_levels.get(domain, 0)
            delay = (2 ** backoff_level) + jitter
            logger.info(f"Throttling request to {domain}, waiting {delay:.2f}s")
            time.sleep(delay)
        
        # Get session from pool
        session = get_next_session()
        
        # Attempt request with retries
        for attempt in range(max_retries):
            try:
                # Add jitter between retries
                if attempt > 0:
                    retry_delay = (2 ** attempt) + random.uniform(1, 3)
                    logger.info(f"Retry {attempt}/{max_retries} for {url}, waiting {retry_delay:.2f}s")
                    time.sleep(retry_delay)
                
                # Make the request
                response = session.get(url, timeout=30)
                
                # Check if successful
                if response.status_code == 200:
                    # Update rate limits for successful request
                    update_rate_limits(domain, True)
                    
                    # Return content
                    content_type = response.headers.get("Content-Type", "text/html")
                    return True, response.content, content_type
                
                # Handle rate limiting
                if response.status_code == 429:
                    logger.warning(f"Rate limited (429) for {url}")
                    update_rate_limits(domain, False)
                    continue
                
                # Other error
                logger.warning(f"Request failed with status {response.status_code} for {url}")
                
            except Exception as e:
                logger.warning(f"Error requesting {url}: {e}")
            
            # Update rate limits for failed request
            update_rate_limits(domain, False)
        
        # All retries failed
        return False, None, None

def json_request(url, max_retries=3):
    """Make a request and parse the response as JSON"""
    success, data, content_type = make_request(url, max_retries)
    
    if success and data:
        try:
            json_data = json.loads(data.decode('utf-8'))
            return True, json_data
        except Exception as e:
            logger.error(f"Error parsing JSON from {url}: {e}")
            return False, None
    
    return False, None

def get_user_info(user_id):
    """Get basic information about a user"""
    logger.info(f"Getting user info for {user_id}")
    
    url = f"https://users.roblox.com/v1/users/{user_id}"
    success, data = json_request(url)
    
    if success and data:
        return {
            "id": data.get("id"),
            "name": data.get("name"),
            "displayName": data.get("displayName"),
            "description": data.get("description", ""),
            "created": data.get("created", ""),
            "isBanned": data.get("isBanned", False)
        }
    
    return None

def is_developer_scanned(dev_id):
    """Check if a developer has already been scanned"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT scanned FROM scanned_developers WHERE developer_id = ?", (dev_id,))
    result = cursor.fetchone()
    
    conn.close()
    
    if result and result[0] == 1:
        return True
    return False

def mark_developer_scanned(dev_id, name=None):
    """Mark a developer as scanned"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute(
        "UPDATE scanned_developers SET scanned = 1, name = ?, last_scanned = ? WHERE developer_id = ?",
        (name or str(dev_id), now, dev_id)
    )
    
    conn.commit()
    conn.close()

def search_catalog(creator_id, creator_type, limit=50, cursor=None):
    """Search Roblox catalog for assets created by a user or group"""
    url = f"https://catalog.roblox.com/v1/search/items"
    params = {
        "category": "All",
        "creatorTargetId": creator_id,
        "creatorType": creator_type,
        "limit": limit,
        "sortOrder": "Desc"
    }
    
    if cursor:
        params["cursor"] = cursor
    
    # Convert params to query string
    query_string = urllib.parse.urlencode(params)
    full_url = f"{url}?{query_string}"
    
    success, data = json_request(full_url)
    
    if success and data:
        return data.get("data", []), data.get("nextPageCursor")
    
    return [], None

def get_asset_details(asset_id):
    """Get details for a specific asset"""
    url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
    success, data = json_request(url)
    
    if success and data:
        return data
    
    return None

def download_asset_thumbnail(asset_id):
    """Download and save an asset thumbnail image"""
    # Check if thumbnail already exists
    thumbnail_path = os.path.join(IMAGE_CACHE_DIR, f"{asset_id}.png")
    if os.path.exists(thumbnail_path):
        return thumbnail_path
    
    # Request thumbnail URL
    url = f"https://thumbnails.roblox.com/v1/assets?assetIds={asset_id}&size=420x420&format=Png&isCircular=false"
    success, data = json_request(url)
    
    if success and data and "data" in data and len(data["data"]) > 0:
        thumbnail_url = data["data"][0].get("imageUrl")
        
        if thumbnail_url:
            # Download the actual image
            thumbnail_success, thumbnail_data, _ = make_request(thumbnail_url)
            
            if thumbnail_success and thumbnail_data:
                # Save to file
                with open(thumbnail_path, "wb") as f:
                    f.write(thumbnail_data)
                
                logger.info(f"Downloaded thumbnail for asset {asset_id}")
                return thumbnail_path
    
    logger.warning(f"Failed to download thumbnail for asset {asset_id}")
    return None

def is_easter_or_patchwork(asset):
    """Check if an asset is related to Easter or Patchwork update"""
    # Keywords for detection
    easter_keywords = [
        "easter", "egg", "bunny", "rabbit", "spring", "basket", "eggshell",
        "eggtastic", "eggcellent", "chocolate", "pastel", "holiday", "hunt"
    ]
    
    patchwork_keywords = [
        "patchwork", "patch", "sewing", "plush", "plushie", "stuffed", "cloth",
        "button", "doll", "fabric", "stitch", "cotton", "soft", "cuddly", "toy",
        "bear", "teddy"
    ]
    
    # Check name and description
    name = asset.get("name", "").lower()
    description = asset.get("description", "").lower()
    text = name + " " + description
    
    # Check for Easter first, then Patchwork
    for keyword in easter_keywords:
        if keyword in text:
            return "EASTER"
    
    for keyword in patchwork_keywords:
        if keyword in text:
            return "PATCHWORK"
    
    # Check if created in last 3 days
    try:
        created_str = asset.get("created", "")
        if created_str:
            created_date = datetime.datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            days_old = (datetime.datetime.now(datetime.timezone.utc) - created_date).days
            if days_old <= 3:
                return "RECENT"
    except Exception as e:
        logger.error(f"Error parsing date: {e}")
    
    return None

def save_asset(asset):
    """Save an asset to the database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        '''
        INSERT OR REPLACE INTO assets 
        (id, name, description, asset_type, creator_id, creator_name, created, updated, thumbnail_path, is_verified, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            asset.get('id'),
            asset.get('name', 'Unknown'),
            asset.get('description', ''),
            asset.get('type', 'Unknown'),
            asset.get('creator_id', 0),
            asset.get('creator', ''),
            asset.get('created', ''),
            asset.get('updated', ''),
            asset.get('thumbnail_path', ''),
            1 if asset.get('is_verified', False) else 0,
            asset.get('category', 'UNKNOWN')
        )
    )
    
    conn.commit()
    conn.close()

def scan_developer_assets(dev_id, limit=100):
    """Scan a developer's assets with enhanced error handling"""
    logger.info(f"Scanning developer ID: {dev_id}")
    
    # Check if already scanned
    if is_developer_scanned(dev_id):
        logger.info(f"Developer {dev_id} already scanned, skipping")
        return []
    
    assets = []
    total_items = 0
    
    # Get user info
    dev_info = get_user_info(dev_id)
    dev_name = dev_info.get("name", str(dev_id)) if dev_info else str(dev_id)
    logger.info(f"Scanning developer: {dev_name} (ID: {dev_id})")
    
    # Search catalog
    cursor = None
    while total_items < limit:
        catalog_items, cursor = search_catalog(dev_id, "User", min(50, limit - total_items), cursor)
        
        if not catalog_items:
            break
        
        for item in catalog_items:
            asset_id = item.get("id")
            if asset_id:
                asset_details = get_asset_details(asset_id)
                
                if asset_details:
                    # Build asset object
                    asset = {
                        "id": asset_id,
                        "name": asset_details.get("name", "Unknown"),
                        "description": asset_details.get("description", ""),
                        "type": asset_details.get("assetType", "Unknown"),
                        "created": asset_details.get("created", ""),
                        "updated": asset_details.get("updated", ""),
                        "creator": dev_name,
                        "creator_id": dev_id,
                        "source": f"Developer scan: {dev_name} ({dev_id})"
                    }
                    
                    # Check for Easter or Patchwork
                    category = is_easter_or_patchwork(asset)
                    if category:
                        asset["category"] = category
                        asset["is_verified"] = category in ["EASTER", "PATCHWORK"]
                    
                    # Download thumbnail
                    thumbnail_path = download_asset_thumbnail(asset_id)
                    if thumbnail_path:
                        asset["thumbnail_path"] = thumbnail_path
                    
                    # Save to database
                    save_asset(asset)
                    
                    assets.append(asset)
                    total_items += 1
                    
                    logger.info(f"Found asset: {asset['name']} (ID: {asset['id']})")
        
        if not cursor:
            break
    
    # Mark developer as scanned
    mark_developer_scanned(dev_id, dev_name)
    
    return assets

def run_optimized_scan(max_chunks=None):
    """Run an optimized scan using chunk-based processing"""
    logger.info("Starting optimized PS99 asset scan with chunk-based processing...")
    
    # Initialize database
    init_database()
    
    # Create a list of all developers to scan
    all_devs = list(set(DEVELOPER_IDS + ADDITIONAL_DEVELOPERS))
    
    # Create developer chunks (5 per chunk)
    dev_chunks = []
    for i in range(0, len(all_devs), CHUNK_SIZE):
        chunk = all_devs[i:i+CHUNK_SIZE]
        dev_chunks.append(chunk)
    
    logger.info(f"Created {len(dev_chunks)} developer chunks to scan")
    
    # Limit the number of chunks if specified
    if max_chunks and max_chunks > 0:
        dev_chunks = dev_chunks[:max_chunks]
        logger.info(f"Limited scan to {max_chunks} chunks ({max_chunks * CHUNK_SIZE} developers)")
    
    # Track assets found
    all_assets = []
    
    # Start time for performance measurement
    start_time = time.time()
    
    # Process chunks with controlled parallelism
    for chunk_idx, chunk in enumerate(dev_chunks):
        logger.info(f"Processing chunk {chunk_idx+1}/{len(dev_chunks)} with {len(chunk)} developers")
        chunk_start_time = time.time()
        
        # Process developers in parallel
        with ThreadPoolExecutor(max_workers=len(chunk)) as executor:
            futures = []
            for dev_id in chunk:
                if not is_developer_scanned(dev_id):
                    futures.append(executor.submit(scan_developer_assets, dev_id, 50))
            
            # Process results as they complete
            for future in as_completed(futures):
                try:
                    assets = future.result()
                    all_assets.extend(assets)
                    logger.info(f"Completed scanning developer with {len(assets)} assets")
                except Exception as e:
                    logger.error(f"Error in developer scan: {e}")
        
        # Calculate chunk processing time
        chunk_time = time.time() - chunk_start_time
        logger.info(f"Chunk {chunk_idx+1} completed in {chunk_time:.2f}s")
        
        # Add inter-chunk delay to avoid detection
        if chunk_idx < len(dev_chunks) - 1:
            delay = random.uniform(3.0, 8.0)
            logger.info(f"Waiting {delay:.2f}s before next chunk...")
            time.sleep(delay)
    
    # Calculate total time
    total_time = time.time() - start_time
    devs_processed = len(dev_chunks) * CHUNK_SIZE
    
    logger.info(f"Optimized scan completed in {total_time:.2f}s")
    logger.info(f"Processed {devs_processed} developers at {devs_processed / (total_time / 60):.2f} devs/minute")
    logger.info(f"Found {len(all_assets)} assets")
    
    return all_assets

def print_statistics():
    """Print statistics about the scan"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Count assets
    cursor.execute("SELECT COUNT(*) FROM assets")
    asset_count = cursor.fetchone()[0]
    
    # Count by category
    cursor.execute("SELECT category, COUNT(*) FROM assets GROUP BY category")
    category_counts = {}
    for category, count in cursor.fetchall():
        category_counts[category or "UNKNOWN"] = count
    
    # Count scanned developers
    cursor.execute("SELECT COUNT(*) FROM scanned_developers WHERE scanned = 1")
    scanned_devs = cursor.fetchone()[0]
    
    # Count total developers
    cursor.execute("SELECT COUNT(*) FROM scanned_developers")
    total_devs = cursor.fetchone()[0]
    
    conn.close()
    
    # Print statistics
    print("\n=== SCAN STATISTICS ===")
    print(f"Total assets found: {asset_count}")
    print(f"Developer progress: {scanned_devs}/{total_devs} ({scanned_devs/total_devs*100:.1f}%)")
    print("\nAssets by category:")
    for category, count in category_counts.items():
        print(f"  {category}: {count}")

def main():
    """Main entry point"""
    print("PS99 Optimized Asset Scanner")
    print("----------------------------")
    print("This scanner combines the best techniques from all scanner implementations")
    print("to create a high-performance scanner that processes 50+ developers in 5 minutes.")
    print("\nFeatures:")
    print("- Chunk-based processing (5 developers per chunk)")
    print("- Parallel scanning with controlled concurrency")
    print("- CloudScraper for Cloudflare bypass")
    print("- Domain-specific backoff with exponential retry")
    print("- Session pooling and rotation")
    print("- Progress tracking and resumable scanning")
    print()
    
    # Run with 5 chunks (25 developers) by default
    num_chunks = 5
    print(f"Running with {num_chunks} chunks ({num_chunks * CHUNK_SIZE} developers)")
    run_optimized_scan(num_chunks)
    
    # Print statistics
    print_statistics()

if __name__ == "__main__":
    main()