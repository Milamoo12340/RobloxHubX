"""
PS99 Comprehensive Leaks Scanner

This script combines multiple scanning methods from various files to gather
the latest leaks from PS99 developers and groups. It uses rate limiting, 
proxies, and optimized requests to avoid API restrictions.
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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up image cache
IMAGE_CACHE_DIR = "static/images/assets"
os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)

# Set up database path
DB_PATH = "ps99_leaks.db"

# Initialize database connection
def init_database():
    """Initialize the database with necessary tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create assets table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        type TEXT,
        created TEXT,
        updated TEXT,
        creator TEXT,
        creator_id INTEGER,
        verified INTEGER DEFAULT 0,
        source TEXT,
        category TEXT,
        timestamp TEXT
    )
    ''')
    
    # Check if verified column exists
    cursor.execute("PRAGMA table_info(assets)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    # Add verified column if it doesn't exist
    if "verified" not in column_names:
        cursor.execute("ALTER TABLE assets ADD COLUMN verified INTEGER DEFAULT 0")
        logger.info("Added verified column to assets table")
    
    # Create scan_progress table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS scan_progress (
        id TEXT PRIMARY KEY,
        type TEXT,
        last_scanned TEXT,
        complete INTEGER DEFAULT 0
    )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized")

# Database functions
def is_developer_scanned(dev_id):
    """Check if a developer has been scanned recently"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT last_scanned FROM scan_progress WHERE id = ? AND type = 'developer'", (dev_id,))
    result = cursor.fetchone()
    
    conn.close()
    
    if result:
        last_scanned = datetime.datetime.strptime(result[0], "%Y-%m-%d %H:%M:%S")
        now = datetime.datetime.now()
        
        # Check if it's been less than 24 hours
        if (now - last_scanned).total_seconds() < 86400:
            return True
    
    return False

def is_group_scanned(group_id):
    """Check if a group has been scanned recently"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT last_scanned FROM scan_progress WHERE id = ? AND type = 'group'", (group_id,))
    result = cursor.fetchone()
    
    conn.close()
    
    if result:
        last_scanned = datetime.datetime.strptime(result[0], "%Y-%m-%d %H:%M:%S")
        now = datetime.datetime.now()
        
        # Check if it's been less than 24 hours
        if (now - last_scanned).total_seconds() < 86400:
            return True
    
    return False

def mark_developer_scanned(dev_id):
    """Mark a developer as scanned"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute(
        "INSERT OR REPLACE INTO scan_progress (id, type, last_scanned, complete) VALUES (?, 'developer', ?, 1)",
        (dev_id, now)
    )
    
    conn.commit()
    conn.close()

def mark_group_scanned(group_id):
    """Mark a group as scanned"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute(
        "INSERT OR REPLACE INTO scan_progress (id, type, last_scanned, complete) VALUES (?, 'group', ?, 1)",
        (group_id, now)
    )
    
    conn.commit()
    conn.close()

def save_asset(asset):
    """Save an asset to the database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if the asset already exists
    cursor.execute("SELECT id FROM assets WHERE id = ?", (asset.get("id"),))
    exists = cursor.fetchone()
    
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if not exists:
        # Insert new asset
        cursor.execute('''
        INSERT INTO assets (
            id, name, description, type, created, updated, 
            creator, creator_id, source, category, timestamp, verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            asset.get("id"),
            asset.get("name"),
            asset.get("description"),
            asset.get("type"),
            asset.get("created"),
            asset.get("updated"),
            asset.get("creator"),
            asset.get("creator_id"),
            asset.get("source"),
            asset.get("category", "UNKNOWN"),
            now,
            asset.get("verified", 0)
        ))
    else:
        # Update existing asset
        cursor.execute('''
        UPDATE assets SET
            name = ?,
            description = ?,
            type = ?,
            created = ?,
            updated = ?,
            creator = ?,
            creator_id = ?,
            source = ?,
            category = ?,
            timestamp = ?,
            verified = ?
        WHERE id = ?
        ''', (
            asset.get("name"),
            asset.get("description"),
            asset.get("type"),
            asset.get("created"),
            asset.get("updated"),
            asset.get("creator"),
            asset.get("creator_id"),
            asset.get("source"),
            asset.get("category", "UNKNOWN"),
            now,
            asset.get("verified", 0),
            asset.get("id")
        ))
    
    conn.commit()
    conn.close()

def get_all_assets():
    """Get all assets from the database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM assets ORDER BY timestamp DESC")
    assets = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return assets

def get_assets_by_category(category):
    """Get assets by category from the database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM assets WHERE category = ? ORDER BY timestamp DESC", (category,))
    assets = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return assets

def print_progress():
    """Print the current scan progress"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Count completed developers
    cursor.execute("SELECT COUNT(*) FROM scan_progress WHERE type = 'developer' AND complete = 1")
    dev_completed = cursor.fetchone()[0]
    
    # Count completed groups
    cursor.execute("SELECT COUNT(*) FROM scan_progress WHERE type = 'group' AND complete = 1")
    group_completed = cursor.fetchone()[0]
    
    # Count total assets
    cursor.execute("SELECT COUNT(*) FROM assets")
    total_assets = cursor.fetchone()[0]
    
    # Check if verified column exists
    cursor.execute("PRAGMA table_info(assets)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    verified_assets = 0
    if "verified" in column_names:
        # Count verified assets
        cursor.execute("SELECT COUNT(*) FROM assets WHERE verified = 1")
        verified_assets = cursor.fetchone()[0]
    
    conn.close()
    
    print(f"Scan Progress: {dev_completed} developers and {group_completed} groups scanned")
    print(f"Total Assets: {total_assets} ({verified_assets} verified)")

# ==== ROBLOX API FUNCTIONS WITH ENHANCED RATE LIMITING ====

# Domain-specific tracking for rate limiting
last_request_times = {}
domain_backoff = {}

# Create a CloudScraper instance
scraper = cloudscraper.create_scraper(
    browser={
        'browser': 'chrome',
        'platform': 'windows',
        'desktop': True
    }
)

def extract_domain(url):
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

def calculate_delay(domain):
    """Calculate appropriate delay for a domain based on history"""
    current_time = time.time()
    
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

def update_backoff(domain, success):
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

def get_headers(referer=None):
    """Get headers optimized for Roblox API requests"""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0"
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

def make_request(url, max_retries=3):
    """
    Make a request to a URL with optimized headers and rate limiting
    
    Args:
        url: The URL to request
        max_retries: Maximum number of retry attempts
        
    Returns:
        Tuple of (success, data, content_type)
    """
    domain = extract_domain(url)
    
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
    
    # Try with cloudscraper first
    for attempt in range(max_retries):
        try:
            # Use CloudScraper
            response = scraper.get(url, headers=get_headers(referer), timeout=30)
            
            # Check if successful
            if response.status_code == 200:
                content_type = response.headers.get("Content-Type", "text/html")
                
                # Success! Update backoff levels
                update_backoff(domain, True)
                
                return True, response.content, content_type
                
        except Exception as e:
            logger.warning(f"CloudScraper error for {url}: {e}")
            if attempt < max_retries - 1:
                retry_delay = (2 ** attempt) + random.uniform(1, 3)
                time.sleep(retry_delay)
            continue
    
    # Fallback to regular requests if CloudScraper fails
    try:
        session = requests.Session()
        session.headers.update(get_headers(referer))
        response = session.get(url, timeout=30)
        
        if response.status_code == 200:
            content_type = response.headers.get("Content-Type", "text/html")
            return True, response.content, content_type
        
        if response.status_code == 429:  # Too Many Requests
            # Update backoff level
            update_backoff(domain, False)
            logger.warning(f"Rate limited (429) for {url}")
    except Exception as e:
        logger.error(f"Error requesting {url}: {e}")
    
    return False, None, None

def json_request(url, max_retries=3):
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
            logger.error(f"Error parsing JSON from {url}: {e}")
            return False, None
    
    return False, None

# ==== SCANNING FUNCTIONS ====

def get_user_info(user_id):
    """Get basic information about a user"""
    logger.info(f"Getting user info for {user_id}")
    
    url = f"https://users.roblox.com/v1/users/{user_id}"
    success, json_data = json_request(url)
    
    if success and json_data:
        return json_data
    
    return None

def get_group_info(group_id):
    """Get basic information about a group"""
    logger.info(f"Getting group info for {group_id}")
    
    url = f"https://groups.roblox.com/v1/groups/{group_id}"
    success, json_data = json_request(url)
    
    if success and json_data:
        return json_data
    
    return None

def search_catalog(creator_id, creator_type="User", limit=100, cursor=None):
    """Search the catalog for assets by a specific creator"""
    logger.info(f"Searching catalog for {creator_type} {creator_id}")
    
    params = {
        "category": "All",
        "limit": limit,
        "sortOrder": "Desc",
        "creatorTargetId": creator_id,
        "creatorType": creator_type
    }
    
    if cursor:
        params["cursor"] = cursor
    
    url = "https://catalog.roblox.com/v1/search/items?" + "&".join([f"{k}={v}" for k, v in params.items()])
    success, json_data = json_request(url)
    
    if success and json_data:
        return json_data.get("data", []), json_data.get("nextPageCursor")
    
    return [], None

def get_asset_details(asset_id):
    """Get detailed information about an asset"""
    logger.info(f"Getting asset details for {asset_id}")
    
    url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
    success, json_data = json_request(url)
    
    if success and json_data:
        return json_data
    
    return None

def download_asset_thumbnail(asset_id):
    """Download a thumbnail for a specific asset"""
    logger.info(f"Downloading thumbnail for asset {asset_id}")
    
    # Build the cache path
    cache_path = os.path.join(IMAGE_CACHE_DIR, f"{asset_id}.png")
    
    # Skip if thumbnail already exists
    if os.path.exists(cache_path):
        return cache_path
    
    # Get the thumbnail URL
    thumbnail_url = f"https://thumbnails.roblox.com/v1/assets?assetIds={asset_id}&size=420x420&format=Png&isCircular=false"
    
    success, json_data = json_request(thumbnail_url)
    if not success or not json_data:
        logger.error(f"Failed to get thumbnail URL for asset {asset_id}")
        return None
    
    # Extract the image URL
    data_items = json_data.get('data', [])
    if data_items and 'imageUrl' in data_items[0]:
        image_url = data_items[0]['imageUrl']
        
        # Download the actual image
        success, image_data, _ = make_request(image_url)
        
        if success and image_data:
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            with open(cache_path, 'wb') as f:
                f.write(image_data)
            
            logger.info(f"Downloaded thumbnail for asset {asset_id}")
            return cache_path
    
    return None

def is_easter_or_patchwork(asset):
    """Check if an asset is related to Easter or Patchwork based on name/description"""
    name = asset.get('name', '').lower()
    description = asset.get('description', '').lower()
    
    # Easter keywords
    easter_keywords = ['easter', 'bunny', 'egg', 'spring', 'basket', 'rabbit', 'chick', 'chocolate']
    
    # Patchwork keywords
    patchwork_keywords = ['patchwork', 'patch', 'sewn', 'stitch', 'fabric', 'plush', 'stuffed', 'doll', 
                         'thread', 'needle', 'button', 'cotton', 'quilt', 'blanket', 'textile', 'cloth']
    
    # Check if any Easter keyword is in name or description
    for keyword in easter_keywords:
        if keyword in name or keyword in description:
            return 'EASTER'
    
    # Check if any Patchwork keyword is in name or description
    for keyword in patchwork_keywords:
        if keyword in name or keyword in description:
            return 'PATCHWORK'
    
    # Not related to Easter or Patchwork
    return None

def scan_developer_assets(dev_id, limit=100):
    """Scan assets created by a developer"""
    assets = []
    
    # Skip if already scanned recently
    if is_developer_scanned(dev_id):
        logger.info(f"Developer {dev_id} already scanned recently, skipping")
        return assets
    
    # Get the developer's basic info
    dev_info = get_user_info(dev_id)
    creator_name = dev_info.get("name", "Unknown") if dev_info else "Unknown"
    
    # Get the developer's catalog items
    cursor = None
    total_items = 0
    
    while total_items < limit:
        catalog_items, cursor = search_catalog(dev_id, "User", min(50, limit - total_items), cursor)
        
        if not catalog_items:
            break
        
        for item in catalog_items:
            asset_id = item.get("id")
            if asset_id:
                asset_details = get_asset_details(asset_id)
                
                if asset_details:
                    asset = {
                        "id": asset_id,
                        "name": asset_details.get("name", "Unknown"),
                        "description": asset_details.get("description", ""),
                        "type": asset_details.get("assetType", "Unknown"),
                        "created": asset_details.get("created", ""),
                        "updated": asset_details.get("updated", ""),
                        "creator": creator_name,
                        "creator_id": dev_id,
                        "source": f"Developer scan: {creator_name} ({dev_id})"
                    }
                    
                    # Check for Easter or Patchwork
                    category = is_easter_or_patchwork(asset)
                    if category:
                        asset["category"] = category
                        asset["verified"] = 1  # Mark as verified since it matches keywords
                    
                    # Download thumbnail
                    download_asset_thumbnail(asset_id)
                    
                    # Save to database
                    save_asset(asset)
                    
                    assets.append(asset)
                    total_items += 1
                    
                    logger.info(f"Found asset: {asset['name']} (ID: {asset['id']})")
        
        if not cursor:
            break
    
    # Mark developer as scanned
    mark_developer_scanned(dev_id)
    
    return assets

def scan_group_assets(group_id, limit=100):
    """Scan assets created by a group"""
    assets = []
    
    # Skip if already scanned recently
    if is_group_scanned(group_id):
        logger.info(f"Group {group_id} already scanned recently, skipping")
        return assets
    
    # Get the group's basic info
    group_info = get_group_info(group_id)
    group_name = group_info.get("name", "Unknown Group") if group_info else f"Group {group_id}"
    
    # Get the group's catalog items
    cursor = None
    total_items = 0
    
    while total_items < limit:
        catalog_items, cursor = search_catalog(group_id, "Group", min(50, limit - total_items), cursor)
        
        if not catalog_items:
            break
        
        for item in catalog_items:
            asset_id = item.get("id")
            if asset_id:
                asset_details = get_asset_details(asset_id)
                
                if asset_details:
                    asset = {
                        "id": asset_id,
                        "name": asset_details.get("name", "Unknown"),
                        "description": asset_details.get("description", ""),
                        "type": asset_details.get("assetType", "Unknown"),
                        "created": asset_details.get("created", ""),
                        "updated": asset_details.get("updated", ""),
                        "creator": group_name,
                        "creator_id": group_id,
                        "source": f"Group scan: {group_name} ({group_id})"
                    }
                    
                    # Check for Easter or Patchwork
                    category = is_easter_or_patchwork(asset)
                    if category:
                        asset["category"] = category
                        asset["verified"] = 1  # Mark as verified since it matches keywords
                    
                    # Download thumbnail
                    download_asset_thumbnail(asset_id)
                    
                    # Save to database
                    save_asset(asset)
                    
                    assets.append(asset)
                    total_items += 1
                    
                    logger.info(f"Found asset: {asset['name']} (ID: {asset['id']})")
        
        if not cursor:
            break
    
    # Mark group as scanned
    mark_group_scanned(group_id)
    
    return assets

# ==== MAIN SCANNING FUNCTION ====

# Key developers for PS99
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

# Big Games groups
GROUP_IDS = [
    4981455,  # Big Games
    10026748, # Pet Simulator
    5795297,  # Build Into Games
]

def run_comprehensive_scan(max_devs=None, max_groups=None):
    """Run a comprehensive scan for PS99 leaks"""
    logger.info("Starting comprehensive scan for PS99 leaks...")
    
    # Initialize database
    init_database()
    
    # Print current progress
    print_progress()
    
    # Track assets found
    all_assets = []
    easter_assets = []
    patchwork_assets = []
    
    # Limit the number of developers to scan if specified
    devs_to_scan = DEVELOPER_IDS
    if max_devs is not None:
        devs_to_scan = DEVELOPER_IDS[:max_devs]
    
    # Scan developers
    for dev_id in devs_to_scan:
        try:
            logger.info(f"Scanning developer ID: {dev_id}")
            dev_assets = scan_developer_assets(dev_id)
            all_assets.extend(dev_assets)
            
            # Add to appropriate category
            for asset in dev_assets:
                if asset.get("category") == "EASTER":
                    easter_assets.append(asset)
                elif asset.get("category") == "PATCHWORK":
                    patchwork_assets.append(asset)
        except Exception as e:
            logger.error(f"Error scanning developer {dev_id}: {e}")
    
    # Limit the number of groups to scan if specified
    groups_to_scan = GROUP_IDS
    if max_groups is not None:
        groups_to_scan = GROUP_IDS[:max_groups]
    
    # Scan groups
    for group_id in groups_to_scan:
        try:
            logger.info(f"Scanning group ID: {group_id}")
            group_assets = scan_group_assets(group_id)
            all_assets.extend(group_assets)
            
            # Add to appropriate category
            for asset in group_assets:
                if asset.get("category") == "EASTER":
                    easter_assets.append(asset)
                elif asset.get("category") == "PATCHWORK":
                    patchwork_assets.append(asset)
        except Exception as e:
            logger.error(f"Error scanning group {group_id}: {e}")
    
    # Print final progress
    print_progress()
    
    # Create report
    now = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    report_filename = f"PS99_Leaks_Report_{now}.txt"
    
    with open(report_filename, "w") as f:
        f.write(f"=== PS99 COMPREHENSIVE LEAK REPORT ===\n")
        f.write(f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total Assets Found: {len(all_assets)}\n")
        f.write(f"Easter Assets: {len(easter_assets)}\n")
        f.write(f"Patchwork Assets: {len(patchwork_assets)}\n\n")
        
        # Easter assets
        f.write("=== EASTER ASSETS ===\n\n")
        for asset in easter_assets:
            f.write(f"- {asset.get('name', 'Unknown')} (ID: {asset.get('id', 'Unknown')})\n")
            f.write(f"  Creator: {asset.get('creator', 'Unknown')}\n")
            f.write(f"  Type: {asset.get('type', 'Unknown')}\n")
            
            if asset.get('description'):
                desc = asset.get('description')
                if len(desc) > 100:
                    desc = desc[:100] + "..."
                f.write(f"  Description: {desc}\n")
            
            f.write(f"  Created: {asset.get('created', 'Unknown')}\n")
            f.write(f"  Link: https://www.roblox.com/library/{asset.get('id')}\n\n")
        
        # Patchwork assets
        f.write("=== PATCHWORK ASSETS ===\n\n")
        for asset in patchwork_assets:
            f.write(f"- {asset.get('name', 'Unknown')} (ID: {asset.get('id', 'Unknown')})\n")
            f.write(f"  Creator: {asset.get('creator', 'Unknown')}\n")
            f.write(f"  Type: {asset.get('type', 'Unknown')}\n")
            
            if asset.get('description'):
                desc = asset.get('description')
                if len(desc) > 100:
                    desc = desc[:100] + "..."
                f.write(f"  Description: {desc}\n")
            
            f.write(f"  Created: {asset.get('created', 'Unknown')}\n")
            f.write(f"  Link: https://www.roblox.com/library/{asset.get('id')}\n\n")
    
    logger.info(f"Report generated: {report_filename}")
    logger.info(f"Found {len(easter_assets)} Easter assets and {len(patchwork_assets)} Patchwork assets")
    
    return all_assets, easter_assets, patchwork_assets

if __name__ == "__main__":
    # Run a focused scan with limited scope for testing
    # Limit to just the first 2 developers and first 1 group to avoid rate limits
    run_comprehensive_scan(max_devs=2, max_groups=1)