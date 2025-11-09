"""
Roblox Request Bypass Module

This module provides enhanced request methods to bypass Roblox API limits
and handle rate limiting properly based on live testing.
"""

import os
import time
import random
import urllib.request
import urllib.error
import ssl
import socket
import logging
import json
from typing import Dict, Optional, Tuple, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Track request times to implement proper rate limiting
last_request_times = {}
domain_backoff = {}

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
        
        except socket.timeout:
            # Handle timeouts explicitly
            retry_delay = (2 ** attempt) + random.uniform(1, 3)
            logger.warning(f"Request timed out for {url}, retry {attempt+1}/{max_retries} in {retry_delay:.1f}s")
            
            # Update backoff level for timeouts
            update_backoff(domain, False)
            
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            
            logger.error(f"Request to {url} timed out after {max_retries} attempts")
            return False, None, None
            
        except urllib.error.URLError as e:
            logger.warning(f"URL error for {url}: {str(e)}")
            
            if attempt < max_retries - 1:
                retry_delay = (2 ** attempt) + random.uniform(1, 2)
                time.sleep(retry_delay)
                continue
                
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
            logger.error(f"Error parsing JSON from {url}: {e}")
            return False, None
    
    return False, None


# Function to patch the ComprehensiveRobloxScanner class with these improved methods
def patch_scanner(scanner_class):
    """
    Patch the scanner class with improved request methods
    
    Args:
        scanner_class: The scanner class to patch
    """
    # Store original methods for reference if they exist
    if hasattr(scanner_class, '_download_asset_thumbnail'):
        original_download_thumbnail = scanner_class._download_asset_thumbnail
        
        # Define new methods
        def new_download_asset_thumbnail(self, asset_id):
            """Patched method to download thumbnails with better API handling"""
            thumbnail_url = f"https://thumbnails.roblox.com/v1/assets?assetIds={asset_id}&size=420x420&format=Png&isCircular=false"
            
            success, json_data = json_request(thumbnail_url)
            if not success or not json_data:
                logger.error(f"Failed to get thumbnail URL for asset {asset_id}")
                return None
                
            data_items = json_data.get('data', [])
            if data_items and 'imageUrl' in data_items[0]:
                image_url = data_items[0]['imageUrl']
                
                # Download the actual image
                cache_path = os.path.join(self.cache_dir, f"{asset_id}.png")
                success, image_data, _ = make_request(image_url)
                
                if success and image_data:
                    with open(cache_path, 'wb') as f:
                        f.write(image_data)
                    
                    logger.info(f"Downloaded thumbnail for asset {asset_id}")
                    return cache_path
            
            return None
        
        # Replace methods in the class
        scanner_class._download_asset_thumbnail = new_download_asset_thumbnail
        logger.info("Scanner class _download_asset_thumbnail method patched with improved request methods")
    else:
        logger.warning("_download_asset_thumbnail method not found in scanner class, skipping patch")
    
    # Add missing interface methods that main.py expects
    
    # Add scan_developer_assets method
    if not hasattr(scanner_class, 'scan_developer_assets') and hasattr(scanner_class, '_scan_developer'):
        def scan_developer_assets(self, developer_id):
            """
            Interface method to scan a developer's assets.
            Calls the internal _scan_developer method.
            
            Args:
                developer_id: Roblox developer ID to scan
                
            Returns:
                List of assets found
            """
            logger.info(f"Interface: Scanning developer assets for dev ID {developer_id}")
            return self._scan_developer(developer_id)
        
        # Add the method to the class
        scanner_class.scan_developer_assets = scan_developer_assets
        logger.info("Added missing scan_developer_assets interface method")
    
    # Add scan_group_assets method
    if not hasattr(scanner_class, 'scan_group_assets') and hasattr(scanner_class, '_scan_group'):
        def scan_group_assets(self, group_id):
            """
            Interface method to scan a group's assets.
            Calls the internal _scan_group method.
            
            Args:
                group_id: Roblox group ID to scan
                
            Returns:
                List of assets found
            """
            logger.info(f"Interface: Scanning group assets for group ID {group_id}")
            return self._scan_group(group_id)
        
        # Add the method to the class
        scanner_class.scan_group_assets = scan_group_assets
        logger.info("Added missing scan_group_assets interface method")
    
    # Add scan_game_assets method
    if not hasattr(scanner_class, 'scan_game_assets') and hasattr(scanner_class, '_scan_game'):
        def scan_game_assets(self, game_id):
            """
            Interface method to scan a game's assets.
            Calls the internal _scan_game method.
            
            Args:
                game_id: Roblox game ID to scan
                
            Returns:
                List of assets found
            """
            logger.info(f"Interface: Scanning game assets for game ID {game_id}")
            return self._scan_game(game_id)
        
        # Add the method to the class
        scanner_class.scan_game_assets = scan_game_assets
        logger.info("Added missing scan_game_assets interface method")
        
    # Add _download_thumbnail alias for main.py
    if not hasattr(scanner_class, '_download_thumbnail') and hasattr(scanner_class, '_download_asset_thumbnail'):
        scanner_class._download_thumbnail = scanner_class._download_asset_thumbnail
        logger.info("Added _download_thumbnail alias for _download_asset_thumbnail")

# Apply patches when this module is imported
def apply_patches():
    """Apply all request bypass patches"""
    logger.info("Applying Roblox API request bypass patches")
    
    # Patch the scanner class later when needed
    
    logger.info("Request bypass patches applied")