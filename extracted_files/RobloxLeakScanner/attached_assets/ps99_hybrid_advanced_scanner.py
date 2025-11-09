"""
PS99 Hybrid Advanced Scanner

This script combines multiple advanced techniques including CloudScraper, Selenium,
and domain-specific rate limiting to bypass Roblox API restrictions and gather
the latest leaks from PS99 developers.

This is a parallel scanning tool that operates independent of the main scanner.
"""

import os
import sys
import json
import time
import random
import logging
import sqlite3
import datetime
import requests
import cloudscraper
from concurrent.futures import ThreadPoolExecutor, as_completed
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.firefox import GeckoDriverManager

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PS99HybridScanner")

# Set up image cache
IMAGE_CACHE_DIR = "hybrid_scanner_cache"
os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)

# Set up database path
DB_PATH = "ps99_hybrid_leaks.db"

# Initialize CloudScraper
scraper = cloudscraper.create_scraper(
    browser={
        'browser': 'chrome',
        'platform': 'windows',
        'desktop': True
    }
)

# Domain-specific tracking for rate limiting
last_request_times = {}
domain_backoff = {}

# ====================== DATABASE FUNCTIONS ======================

def init_database():
    """Initialize the database with necessary tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create assets table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS leaked_assets (
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
        detection_method TEXT,
        timestamp TEXT
    )
    ''')
    
    # Create scan_progress table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS scan_progress (
        id TEXT PRIMARY KEY,
        type TEXT,
        last_scanned TEXT,
        success_count INTEGER DEFAULT 0
    )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized")

def save_asset(asset):
    """Save an asset to the database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if the asset already exists
    cursor.execute("SELECT id FROM leaked_assets WHERE id = ?", (asset.get("id"),))
    exists = cursor.fetchone()
    
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if not exists:
        # Insert new asset
        cursor.execute('''
        INSERT INTO leaked_assets (
            id, name, description, type, created, updated, 
            creator, creator_id, source, category, detection_method, timestamp, verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            asset.get("detection_method", "HYBRID"),
            now,
            asset.get("verified", 0)
        ))
        logger.info(f"New asset saved: {asset.get('name')} (ID: {asset.get('id')})")
    else:
        # Update existing asset
        cursor.execute('''
        UPDATE leaked_assets SET
            name = ?,
            description = ?,
            type = ?,
            created = ?,
            updated = ?,
            creator = ?,
            creator_id = ?,
            source = ?,
            category = ?,
            detection_method = ?,
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
            asset.get("detection_method", "HYBRID"),
            now,
            asset.get("verified", 0),
            asset.get("id")
        ))
        logger.info(f"Updated asset: {asset.get('name')} (ID: {asset.get('id')})")
    
    conn.commit()
    conn.close()

def get_all_assets():
    """Get all assets from the database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM leaked_assets ORDER BY timestamp DESC")
    assets = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return assets

def get_assets_by_category(category):
    """Get assets by category from the database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM leaked_assets WHERE category = ? ORDER BY timestamp DESC", (category,))
    assets = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return assets

def update_scan_progress(id_value, id_type, success=True):
    """Update scan progress for an ID"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Check if record exists
    cursor.execute("SELECT success_count FROM scan_progress WHERE id = ? AND type = ?", 
                 (str(id_value), id_type))
    result = cursor.fetchone()
    
    if result:
        success_count = result[0] + (1 if success else 0)
        cursor.execute('''
        UPDATE scan_progress SET 
            last_scanned = ?, 
            success_count = ?
        WHERE id = ? AND type = ?
        ''', (now, success_count, str(id_value), id_type))
    else:
        success_count = 1 if success else 0
        cursor.execute('''
        INSERT INTO scan_progress (id, type, last_scanned, success_count)
        VALUES (?, ?, ?, ?)
        ''', (str(id_value), id_type, now, success_count))
    
    conn.commit()
    conn.close()

# ====================== REQUEST HANDLING FUNCTIONS ======================

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

# ====================== SELENIUM FUNCTIONS ======================

def setup_selenium_driver():
    """Set up a headless Selenium driver with anti-detection measures"""
    firefox_options = Options()
    firefox_options.add_argument("--headless")
    firefox_options.set_preference("dom.webdriver.enabled", False)
    firefox_options.set_preference("useAutomationExtension", False)
    
    # Add browser fingerprinting evasion
    firefox_options.set_preference("general.useragent.override", 
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0")
    
    try:
        service = Service(GeckoDriverManager().install())
        driver = webdriver.Firefox(service=service, options=firefox_options)
        
        # Execute JavaScript to make browser look like a normal browser
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        logger.info("Selenium WebDriver initialized successfully")
        return driver
    except Exception as e:
        logger.error(f"Failed to initialize Selenium: {e}")
        return None

def selenium_get_url(driver, url, wait_time=10):
    """Get a URL using Selenium with proper error handling"""
    try:
        driver.get(url)
        time.sleep(wait_time)  # Allow time for any initial scripts to run
        
        # Check if we hit a security checkpoint
        if "Security Checkpoint" in driver.title:
            logger.warning("Detected security checkpoint in Selenium")
            return False, "Security checkpoint detected"
        
        return True, driver.page_source
    except Exception as e:
        logger.error(f"Selenium error accessing {url}: {e}")
        return False, str(e)

def try_get_asset_with_selenium(asset_id):
    """Try to get asset details using Selenium as a fallback"""
    driver = setup_selenium_driver()
    if not driver:
        return None
    
    try:
        # Try to access the asset directly
        url = f"https://www.roblox.com/library/{asset_id}"
        success, page = selenium_get_url(driver, url)
        
        if not success:
            return None
        
        # Parse the page to extract asset details
        try:
            name_element = driver.find_element(By.CSS_SELECTOR, "h1.item-name")
            name = name_element.text if name_element else "Unknown"
            
            # Try to get description
            description_element = driver.find_element(By.CSS_SELECTOR, "div.item-description")
            description = description_element.text if description_element else ""
            
            # Try to get creator
            creator_element = driver.find_element(By.CSS_SELECTOR, "a.creator-name")
            creator = creator_element.text if creator_element else "Unknown"
            
            # Try to get type
            type_element = driver.find_element(By.CSS_SELECTOR, "span.type-content")
            asset_type = type_element.text if type_element else "Unknown"
            
            # Get the updated date
            updated_element = driver.find_element(By.CSS_SELECTOR, "div.created-date")
            updated = updated_element.text.replace("Updated: ", "") if updated_element else ""
            
            # Build asset object
            asset = {
                "id": asset_id,
                "name": name,
                "description": description,
                "creator": creator,
                "type": asset_type,
                "updated": updated,
                "detection_method": "SELENIUM",
                "source": f"Direct Selenium scrape from Roblox library page"
            }
            
            return asset
        except Exception as e:
            logger.error(f"Error extracting asset data with Selenium: {e}")
            return None
    finally:
        try:
            driver.quit()
        except:
            pass

# ====================== ASSET SCANNING FUNCTIONS ======================

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
    
    # If API fails, try with Selenium as backup
    logger.info(f"API failed for asset {asset_id}, trying Selenium fallback")
    return try_get_asset_with_selenium(asset_id)

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

def is_ps99_related(asset):
    """Check if an asset is PS99-related based on keywords"""
    name = asset.get('name', '').lower()
    description = asset.get('description', '').lower()
    
    # PS99 keywords
    keywords = [
        'pet simulator', 'ps99', 'pet sim', 'big games', 'pets', 'simulator', 
        'pet simulator 99', 'petsim', 'pet sim 99'
    ]
    
    # Check keywords
    for keyword in keywords:
        if keyword in name or keyword in description:
            return True
    
    return False

def categorize_asset(asset):
    """Categorize an asset based on keywords"""
    name = asset.get('name', '').lower()
    description = asset.get('description', '').lower()
    
    # Categories with keywords
    categories = {
        'EASTER': ['easter', 'bunny', 'egg', 'spring', 'basket', 'rabbit', 'chick', 'chocolate'],
        'PATCHWORK': ['patchwork', 'patch', 'sewn', 'stitch', 'fabric', 'plush', 'stuffed', 'doll', 
                      'thread', 'needle', 'button', 'cotton', 'quilt', 'blanket', 'textile', 'cloth'],
        'EGYPT': ['egypt', 'anubis', 'pharaoh', 'pyramid', 'sphinx', 'mummy', 'desert', 'sarcophagus',
                 'tomb', 'hieroglyph', 'nile', 'cairo', 'oasis'],
        'SUMMER': ['summer', 'beach', 'sun', 'swim', 'vacation', 'tropical', 'island', 'ocean', 
                  'sea', 'palm', 'coconut', 'wave', 'surf', 'sand', 'sunglasses'],
        'SLIME': ['slime', 'goo', 'sticky', 'tycoon', 'slimetycoon', 'goop', 'ooze', 'slimy']
    }
    
    # Check each category
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in name or keyword in description:
                return category
    
    # Default category if PS99 related
    if is_ps99_related(asset):
        return 'PS99_GENERAL'
    
    return 'UNKNOWN'

def scan_developer_assets(dev_id, limit=100):
    """Scan assets created by a developer"""
    assets = []
    
    # Get the developer's basic info
    dev_info = get_user_info(dev_id)
    creator_name = dev_info.get("name", "Unknown") if dev_info else f"Developer {dev_id}"
    
    # Get the developer's catalog items
    cursor = None
    total_items = 0
    success = False
    
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
                        "source": f"Developer scan: {creator_name} ({dev_id})",
                        "detection_method": "HYBRID"
                    }
                    
                    # Categorize asset
                    category = categorize_asset(asset)
                    asset["category"] = category
                    
                    # Mark as verified if it has a specific category
                    if category not in ['UNKNOWN', 'PS99_GENERAL']:
                        asset["verified"] = 1
                    else:
                        asset["verified"] = 0
                    
                    # Download thumbnail
                    download_asset_thumbnail(asset_id)
                    
                    # Save to database
                    save_asset(asset)
                    
                    assets.append(asset)
                    total_items += 1
                    success = True
                    
                    logger.info(f"Found asset: {asset['name']} (ID: {asset['id']})")
        
        if not cursor:
            break
    
    # Update scan progress
    update_scan_progress(dev_id, "developer", success)
    
    return assets

def scan_group_assets(group_id, limit=100):
    """Scan assets created by a group"""
    assets = []
    
    # Get the group's basic info
    group_info = get_group_info(group_id)
    group_name = group_info.get("name", f"Group {group_id}") if group_info else f"Group {group_id}"
    
    # Get the group's catalog items
    cursor = None
    total_items = 0
    success = False
    
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
                        "source": f"Group scan: {group_name} ({group_id})",
                        "detection_method": "HYBRID"
                    }
                    
                    # Categorize asset
                    category = categorize_asset(asset)
                    asset["category"] = category
                    
                    # Mark as verified if it has a specific category
                    if category not in ['UNKNOWN', 'PS99_GENERAL']:
                        asset["verified"] = 1
                    else:
                        asset["verified"] = 0
                    
                    # Download thumbnail
                    download_asset_thumbnail(asset_id)
                    
                    # Save to database
                    save_asset(asset)
                    
                    assets.append(asset)
                    total_items += 1
                    success = True
                    
                    logger.info(f"Found asset: {asset['name']} (ID: {asset['id']})")
        
        if not cursor:
            break
    
    # Update scan progress
    update_scan_progress(group_id, "group", success)
    
    return assets

# ====================== MAIN FUNCTIONS ======================

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

def scan_developer_worker(dev_id):
    """Worker function for scanning a developer in parallel"""
    try:
        return scan_developer_assets(dev_id)
    except Exception as e:
        logger.error(f"Error in developer worker for {dev_id}: {e}")
        return []

def scan_group_worker(group_id):
    """Worker function for scanning a group in parallel"""
    try:
        return scan_group_assets(group_id)
    except Exception as e:
        logger.error(f"Error in group worker for {group_id}: {e}")
        return []

def run_parallel_scan(max_workers=3, max_devs=None, max_groups=None):
    """Run a parallel scan with multiple workers"""
    logger.info("Starting parallel hybrid scan...")
    
    # Initialize database
    init_database()
    
    # Limit the number of developers to scan if specified
    devs_to_scan = DEVELOPER_IDS
    if max_devs is not None:
        devs_to_scan = DEVELOPER_IDS[:max_devs]
    
    # Limit the number of groups to scan if specified
    groups_to_scan = GROUP_IDS
    if max_groups is not None:
        groups_to_scan = GROUP_IDS[:max_groups]
    
    # Track assets found by category
    all_assets = []
    category_assets = {}
    
    # Scan developers in parallel
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit developer scan tasks
        dev_futures = {executor.submit(scan_developer_worker, dev_id): dev_id for dev_id in devs_to_scan}
        
        # Process developer results as they complete
        for future in as_completed(dev_futures):
            dev_id = dev_futures[future]
            try:
                dev_assets = future.result()
                all_assets.extend(dev_assets)
                
                # Categorize assets
                for asset in dev_assets:
                    category = asset.get("category", "UNKNOWN")
                    if category not in category_assets:
                        category_assets[category] = []
                    category_assets[category].append(asset)
                
                logger.info(f"Completed scan for developer {dev_id}, found {len(dev_assets)} assets")
            except Exception as e:
                logger.error(f"Developer scan for {dev_id} generated an exception: {e}")
        
        # Submit group scan tasks
        group_futures = {executor.submit(scan_group_worker, group_id): group_id for group_id in groups_to_scan}
        
        # Process group results as they complete
        for future in as_completed(group_futures):
            group_id = group_futures[future]
            try:
                group_assets = future.result()
                all_assets.extend(group_assets)
                
                # Categorize assets
                for asset in group_assets:
                    category = asset.get("category", "UNKNOWN")
                    if category not in category_assets:
                        category_assets[category] = []
                    category_assets[category].append(asset)
                
                logger.info(f"Completed scan for group {group_id}, found {len(group_assets)} assets")
            except Exception as e:
                logger.error(f"Group scan for {group_id} generated an exception: {e}")
    
    # Create report
    now = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    report_filename = f"PS99_Hybrid_Scan_Report_{now}.txt"
    
    with open(report_filename, "w") as f:
        f.write(f"=== PS99 HYBRID SCANNER LEAK REPORT ===\n")
        f.write(f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total Assets Found: {len(all_assets)}\n\n")
        
        # List assets by category
        for category, assets in category_assets.items():
            if category not in ['UNKNOWN', 'PS99_GENERAL'] and assets:
                f.write(f"=== {category} ASSETS ({len(assets)}) ===\n\n")
                for asset in assets:
                    f.write(f"- {asset.get('name', 'Unknown')} (ID: {asset.get('id', 'Unknown')})\n")
                    f.write(f"  Creator: {asset.get('creator', 'Unknown')}\n")
                    f.write(f"  Type: {asset.get('type', 'Unknown')}\n")
                    
                    if asset.get('description'):
                        desc = asset.get('description')
                        if len(desc) > 100:
                            desc = desc[:100] + "..."
                        f.write(f"  Description: {desc}\n")
                    
                    f.write(f"  Created: {asset.get('created', 'Unknown')}\n")
                    f.write(f"  Detection: {asset.get('detection_method', 'HYBRID')}\n")
                    f.write(f"  Link: https://www.roblox.com/library/{asset.get('id')}\n\n")
    
    logger.info(f"Report generated: {report_filename}")
    
    # Log category counts
    for category, assets in category_assets.items():
        if category not in ['UNKNOWN', 'PS99_GENERAL']:
            logger.info(f"Found {len(assets)} {category} assets")
    
    return all_assets, category_assets

if __name__ == "__main__":
    # Run a focused parallel scan with 3 workers
    run_parallel_scan(max_workers=3)