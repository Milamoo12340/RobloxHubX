"""
Enhanced Roblox API Bypass

This module implements advanced techniques to bypass Roblox API rate limiting
and obtain high-quality asset thumbnails even under heavy throttling.
"""

import os
import time
import random
import logging
import requests
import json
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a session with retry capability
def create_robust_session():
    """Create a requests session with retry capabilities and rotating proxies"""
    session = requests.Session()
    
    # Configure retry strategy
    retry_strategy = Retry(
        total=5,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"]
    )
    
    # Mount adapter with retry strategy
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    
    return session

# Rotating user agents to avoid fingerprinting
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edg/116.0.1938.69",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 OPR/103.0.0.0"
]

# Enhanced request headers
def get_enhanced_headers(referer=None):
    """Get enhanced headers with antibot protections"""
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "application/json, text/html, application/xhtml+xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Sec-Ch-Ua": '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Cache-Control": "max-age=0",
        "Connection": "keep-alive"
    }
    
    if referer:
        headers["Referer"] = referer
    
    return headers

# Domain-based rate limiting
domain_last_request = {}
domain_backoff = {}

def rate_limit_request(domain):
    """Apply rate limiting based on domain with exponential backoff"""
    current_time = time.time()
    
    # Initialize if needed
    if domain not in domain_last_request:
        domain_last_request[domain] = current_time - 10
        domain_backoff[domain] = 0
    
    # Calculate time since last request
    time_since_last = current_time - domain_last_request[domain]
    
    # Roblox domains need special handling
    base_delay = 2.0 if "roblox.com" in domain else 1.0
    
    # Apply backoff factor
    delay = base_delay * (1 + domain_backoff[domain])
    
    # If we need to wait
    if time_since_last < delay:
        wait_time = delay - time_since_last
        logger.debug(f"Rate limiting {domain}: waiting {wait_time:.2f}s")
        time.sleep(wait_time)
    
    # Update last request time
    domain_last_request[domain] = time.time()

def extract_domain(url):
    """Extract the domain from a URL"""
    if "://" in url:
        url = url.split("://")[1]
    
    if "/" in url:
        url = url.split("/")[0]
    
    return url

def handle_request_result(domain, success):
    """Handle request result for backoff calculations"""
    if success:
        # Gradually reduce backoff on success
        if domain_backoff.get(domain, 0) > 0:
            domain_backoff[domain] = max(0, domain_backoff[domain] - 0.25)
    else:
        # Increase backoff on failure
        domain_backoff[domain] = domain_backoff.get(domain, 0) + 1.0
        logger.warning(f"Increased backoff for {domain} to {domain_backoff[domain]}")

def download_asset_thumbnail(asset_id, size="420x420"):
    """
    Download a Roblox asset thumbnail with enhanced anti-rate-limit logic
    Returns the image bytes or None if failed
    """
    logger.info(f"Downloading asset thumbnail for {asset_id} with size {size}")
    
    # First try alternate API (thumbnails.roblox.com)
    session = create_robust_session()
    
    # Get via the thumbnail API
    thumbnail_domain = "thumbnails.roblox.com"
    rate_limit_request(thumbnail_domain)
    
    try:
        thumbnail_url = f"https://{thumbnail_domain}/v1/assets?assetIds={asset_id}&size={size}&format=Png&isCircular=false"
        response = session.get(
            thumbnail_url,
            headers=get_enhanced_headers(referer="https://www.roblox.com/")
        )
        
        if response.status_code == 200:
            data = response.json()
            if "data" in data and len(data["data"]) > 0:
                image_url = data["data"][0].get("imageUrl")
                if image_url:
                    # Now get the actual image
                    image_domain = extract_domain(image_url)
                    rate_limit_request(image_domain)
                    
                    img_response = session.get(
                        image_url,
                        headers=get_enhanced_headers(referer=thumbnail_url)
                    )
                    
                    if img_response.status_code == 200:
                        handle_request_result(thumbnail_domain, True)
                        handle_request_result(image_domain, True)
                        return img_response.content
    
        # If we failed, try catalog API
        handle_request_result(thumbnail_domain, False)
        
        # Try alternate method: catalog API
        catalog_domain = "www.roblox.com"
        rate_limit_request(catalog_domain)
        
        catalog_url = f"https://{catalog_domain}/library/{asset_id}/"
        response = session.get(
            catalog_url,
            headers=get_enhanced_headers()
        )
        
        if response.status_code == 200:
            # Extract image URL from HTML
            html = response.text
            img_url_start = html.find('data-mediathumb-url="')
            if img_url_start != -1:
                img_url_start += len('data-mediathumb-url="')
                img_url_end = html.find('"', img_url_start)
                if img_url_end != -1:
                    image_url = html[img_url_start:img_url_end]
                    
                    # Get the image
                    image_domain = extract_domain(image_url)
                    rate_limit_request(image_domain)
                    
                    img_response = session.get(
                        image_url,
                        headers=get_enhanced_headers(referer=catalog_url)
                    )
                    
                    if img_response.status_code == 200:
                        handle_request_result(catalog_domain, True)
                        handle_request_result(image_domain, True)
                        return img_response.content
        
        handle_request_result(catalog_domain, False)
                    
    except Exception as e:
        logger.error(f"Error downloading asset thumbnail: {e}")
    
    # If all methods failed, return none
    return None

def create_placeholder_image(asset_id):
    """Create a basic placeholder image for assets that can't be downloaded"""
    logger.warning(f"Creating placeholder for asset {asset_id}")
    img = Image.new('RGB', (420, 420), color=(45, 45, 50))
    draw = ImageDraw.Draw(img)
    
    # Add text
    text = f"Asset ID: {asset_id}"
    draw.text((120, 200), text, fill=(200, 200, 200))
    
    # Convert to bytes
    img_byte_array = BytesIO()
    img.save(img_byte_array, format='PNG')
    return img_byte_array.getvalue()

def get_developer_details(developer_id):
    """Get details about a Roblox developer with ID"""
    session = create_robust_session()
    domain = "users.roblox.com"
    rate_limit_request(domain)
    
    try:
        url = f"https://{domain}/v1/users/{developer_id}"
        response = session.get(
            url,
            headers=get_enhanced_headers()
        )
        
        if response.status_code == 200:
            handle_request_result(domain, True)
            return response.json()
    
    except Exception as e:
        logger.error(f"Error getting developer details: {e}")
        handle_request_result(domain, False)
    
    return None

def search_for_developers(keyword, limit=10):
    """Search for developers by keyword"""
    session = create_robust_session()
    domain = "users.roblox.com"
    rate_limit_request(domain)
    
    try:
        url = f"https://{domain}/v1/users/search?keyword={keyword}&limit={limit}"
        response = session.get(
            url,
            headers=get_enhanced_headers()
        )
        
        if response.status_code == 200:
            handle_request_result(domain, True)
            return response.json().get("data", [])
    
    except Exception as e:
        logger.error(f"Error searching for developers: {e}")
        handle_request_result(domain, False)
    
    return []

def get_developer_groups(developer_id):
    """Get groups a developer belongs to"""
    session = create_robust_session()
    domain = "groups.roblox.com"
    rate_limit_request(domain)
    
    try:
        url = f"https://{domain}/v2/users/{developer_id}/groups/roles"
        response = session.get(
            url,
            headers=get_enhanced_headers()
        )
        
        if response.status_code == 200:
            handle_request_result(domain, True)
            return response.json().get("data", [])
    
    except Exception as e:
        logger.error(f"Error getting developer groups: {e}")
        handle_request_result(domain, False)
    
    return []

def find_related_developers(developer_id, max_depth=2, current_depth=0, found_developers=None):
    """
    Find developers related to a given developer through shared groups
    Uses a breadth-first search approach with depth limiting
    """
    if found_developers is None:
        found_developers = set()
    
    if current_depth >= max_depth:
        return found_developers
    
    # Get groups this developer belongs to
    groups = get_developer_groups(developer_id)
    for group_data in groups:
        group = group_data.get("group", {})
        group_id = group.get("id")
        
        if not group_id:
            continue
        
        # Get members of this group with significant roles
        significant_members = get_significant_group_members(group_id)
        
        for member_id in significant_members:
            if member_id not in found_developers and member_id != developer_id:
                found_developers.add(member_id)
                
                # Recursively search if we haven't reached max depth
                if current_depth + 1 < max_depth:
                    find_related_developers(
                        member_id, 
                        max_depth, 
                        current_depth + 1,
                        found_developers
                    )
    
    return found_developers

def get_significant_group_members(group_id):
    """Get members of a group with significant roles (admins, etc.)"""
    session = create_robust_session()
    domain = "groups.roblox.com"
    rate_limit_request(domain)
    
    try:
        url = f"https://{domain}/v1/groups/{group_id}/roles"
        response = session.get(
            url,
            headers=get_enhanced_headers()
        )
        
        if response.status_code == 200:
            handle_request_result(domain, True)
            
            # Get roles with significant rank (admins, etc.)
            roles = response.json().get("roles", [])
            significant_roles = [role for role in roles if role.get("rank", 0) >= 100]
            
            # Get members for these roles
            members = []
            for role in significant_roles:
                role_id = role.get("id")
                if role_id:
                    members.extend(get_role_members(group_id, role_id))
            
            return members
    
    except Exception as e:
        logger.error(f"Error getting significant group members: {e}")
        handle_request_result(domain, False)
    
    return []

def get_role_members(group_id, role_id, limit=100):
    """Get members with a specific role in a group"""
    session = create_robust_session()
    domain = "groups.roblox.com"
    rate_limit_request(domain)
    
    try:
        url = f"https://{domain}/v1/groups/{group_id}/roles/{role_id}/users?limit={limit}"
        response = session.get(
            url,
            headers=get_enhanced_headers()
        )
        
        if response.status_code == 200:
            handle_request_result(domain, True)
            return [user.get("userId") for user in response.json().get("data", [])]
    
    except Exception as e:
        logger.error(f"Error getting role members: {e}")
        handle_request_result(domain, False)
    
    return []

def get_group_details(group_id):
    """Get details about a Roblox group"""
    session = create_robust_session()
    domain = "groups.roblox.com"
    rate_limit_request(domain)
    
    try:
        url = f"https://{domain}/v1/groups/{group_id}"
        response = session.get(
            url,
            headers=get_enhanced_headers()
        )
        
        if response.status_code == 200:
            handle_request_result(domain, True)
            return response.json()
    
    except Exception as e:
        logger.error(f"Error getting group details: {e}")
        handle_request_result(domain, False)
    
    return None

def search_for_groups(keyword, limit=10):
    """Search for groups by keyword"""
    session = create_robust_session()
    domain = "groups.roblox.com"
    rate_limit_request(domain)
    
    try:
        url = f"https://{domain}/v1/groups/search?keyword={keyword}&limit={limit}"
        response = session.get(
            url,
            headers=get_enhanced_headers()
        )
        
        if response.status_code == 200:
            handle_request_result(domain, True)
            return response.json().get("data", [])
    
    except Exception as e:
        logger.error(f"Error searching for groups: {e}")
        handle_request_result(domain, False)
    
    return []

def get_asset_details(asset_id):
    """Get detailed information about a Roblox asset"""
    session = create_robust_session()
    domain = "economy.roblox.com"
    rate_limit_request(domain)
    
    try:
        url = f"https://{domain}/v2/assets/{asset_id}/details"
        response = session.get(
            url,
            headers=get_enhanced_headers(referer=f"https://www.roblox.com/library/{asset_id}")
        )
        
        if response.status_code == 200:
            handle_request_result(domain, True)
            return response.json()
    
    except Exception as e:
        logger.error(f"Error getting asset details: {e}")
        handle_request_result(domain, False)
    
    return None

# Apply these enhanced methods to the scanner
def patch_scanner_methods(scanner_instance):
    """
    Patch the scanner instance with our enhanced methods
    """
    scanner_instance._download_asset_thumbnail = download_asset_thumbnail
    scanner_instance._download_thumbnail = download_asset_thumbnail  # Alias
    
    logger.info("Scanner class _download_asset_thumbnail method patched with improved request methods")
    
    # Add missing methods if they don't exist
    if not hasattr(scanner_instance, 'scan_developer_assets'):
        scanner_instance.scan_developer_assets = lambda dev_id: scanner_instance._scan_source('developer', dev_id)
        logger.info("Added missing scan_developer_assets interface method")
    
    if not hasattr(scanner_instance, 'scan_group_assets'):
        scanner_instance.scan_group_assets = lambda group_id: scanner_instance._scan_source('group', group_id)
        logger.info("Added missing scan_group_assets interface method")
    
    if not hasattr(scanner_instance, 'scan_game_assets'):
        scanner_instance.scan_game_assets = lambda game_id: scanner_instance._scan_source('game', game_id)
        logger.info("Added missing scan_game_assets interface method")
    
    return scanner_instance