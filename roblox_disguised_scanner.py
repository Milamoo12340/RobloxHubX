"""
Roblox Disguised Scanner - Enhanced Detection Avoidance

This module provides advanced techniques for disguising our scanning activities 
on Roblox platforms. It includes specialized methods to make our requests appear
legitimate and avoid triggering anti-bot detection systems, even when performing
high-frequency scans for leaked assets.

The module also implements techniques inspired by Synapse and Hyperium scanners
to bypass security measures and discover hidden assets or testing grounds.

Features:
- Varied scan patterns that mimic natural browsing behavior
- Request obfuscation techniques to blend in with normal traffic
- Traffic distribution across multiple endpoints to avoid detection
- HTTP header normalization to match expected browser behavior
- Delayed and randomized timing to prevent pattern detection
- Cookie management to appear as a persistent, legitimate user
- Uses the anti_detection and enhanced_browser_rotation modules
"""

import random
import time
import logging
import json
import os
import requests
import threading
import urllib.parse
import ssl
import re
from datetime import datetime, timedelta

# Import our anti-detection modules
from anti_detection import (
    anti_detection_request, 
    get_rate_limit_stats,
    get_browser_identity,
    create_opener
)
from enhanced_browser_rotation import (
    get_next_browser,
    get_browser_headers,
    get_pool_stats
)

# Import search keywords
from search_keywords import (
    ANUBIS_KEYWORDS,
    DEVELOPER_TESTING_KEYWORDS,
    DEVELOPER_BLOG_KEYWORDS,
    ANTI_DETECTION_TERMS,
    ALL_ENHANCED_SEARCH_TERMS
)

# Configure logging
logger = logging.getLogger(__name__)

# Constants to make our scanning more stealthy
MAX_CONSECUTIVE_REQUESTS = 5       # Max requests to same domain in a row
MIN_DOMAIN_SWITCH_PAUSE = 2        # Seconds to pause when switching domains
HUMAN_THINK_TIME_MIN = 3           # Min seconds to mimic human thinking
HUMAN_THINK_TIME_MAX = 8           # Max seconds to mimic human thinking
BROWSING_SESSION_LENGTH = 25       # Approx requests before "browsing session" ends

# URLs that normal users visit that we can mix in to appear more realistic
COMMON_URLS = [
    "https://www.roblox.com/home",
    "https://www.roblox.com/discover",
    "https://www.roblox.com/catalog",
    "https://create.roblox.com/dashboard",
    "https://www.roblox.com/games",
    "https://www.roblox.com/search/users",
    "https://www.roblox.com/users/friends",
    "https://www.roblox.com/my/account",
    "https://www.roblox.com/transactions",
]

# Target URLs where we're actually looking for leaks
TARGET_URLS = [
    # Developer profiles - we check these most thoroughly
    "https://www.roblox.com/users/13365322/profile",  # Preston/ChickenEngineer
    "https://www.roblox.com/users/1493409/profile",   # Other key developers
    "https://www.roblox.com/users/31370263/profile",
    "https://www.roblox.com/users/1547685/profile",
    "https://www.roblox.com/users/97658457/profile",
    
    # Group pages
    "https://www.roblox.com/groups/3959677/BIG-GAMES",
    "https://www.roblox.com/groups/2703304/BIG-GAMES-Test-Group",
    "https://www.roblox.com/groups/5060810/OFFICIAL-BIG-GAMES-Staff-Group",
    
    # Asset discovery endpoints
    "https://create.roblox.com/marketplace/assets",
    "https://create.roblox.com/marketplace/models",
    "https://create.roblox.com/catalog/models",
    
    # Developer hub pages that might have test places
    "https://create.roblox.com/dashboard/creations",
    "https://create.roblox.com/dashboard/experiences",
]

class DisguisedScanner:
    """
    Scanner that disguises itself as normal user traffic to avoid detection
    while searching for leaks and upcoming assets
    """
    
    def __init__(self):
        """Initialize the disguised scanner"""
        self.current_session = {
            "request_count": 0,
            "last_domain": None,
            "consecutive_domain_requests": 0,
            "session_start_time": datetime.now(),
            "browser": get_next_browser(),
            "visited_urls": set(),
            "assets_found": [],
            "keywords_found": set(),
        }
        self.lock = threading.Lock()
    
    def _should_reset_session(self):
        """Determine if we should reset the browsing session"""
        with self.lock:
            # Reset if we've made enough requests in this session
            if self.current_session["request_count"] >= BROWSING_SESSION_LENGTH:
                return True
            
            # Reset if session has been going too long
            session_duration = datetime.now() - self.current_session["session_start_time"]
            if session_duration > timedelta(minutes=15):
                return True
            
            return False
    
    def _reset_session(self):
        """Reset the browsing session to appear as a new user"""
        with self.lock:
            logger.info("Resetting browsing session to avoid detection")
            
            # Store assets found before reset
            found_assets = self.current_session["assets_found"]
            found_keywords = self.current_session["keywords_found"]
            
            # Create a fresh session
            self.current_session = {
                "request_count": 0,
                "last_domain": None,
                "consecutive_domain_requests": 0,
                "session_start_time": datetime.now(),
                "browser": get_next_browser(),
                "visited_urls": set(),
                "assets_found": found_assets,  # Maintain found assets
                "keywords_found": found_keywords,  # Maintain found keywords
            }
            
            # Sleep to further separate sessions
            time.sleep(random.uniform(5, 10))
    
    def _simulate_human_thinking(self):
        """Simulate a human pausing to read/think"""
        time.sleep(random.uniform(HUMAN_THINK_TIME_MIN, HUMAN_THINK_TIME_MAX))
    
    def _get_next_url(self, is_target_focused=True):
        """
        Get the next URL to request, mixing targets with common URLs
        to appear more natural
        
        Args:
            is_target_focused: If True, prioritize target URLs
            
        Returns:
            URL to request next
        """
        with self.lock:
            # Determine if we should request a target or common URL
            # Higher chance of target URL if we're in target-focused mode
            if is_target_focused:
                use_target = random.random() < 0.8
            else:
                use_target = random.random() < 0.4
            
            if use_target:
                url_list = TARGET_URLS
            else:
                url_list = COMMON_URLS
            
            # Pick a URL, preferring ones we haven't visited
            unvisited_urls = [url for url in url_list if url not in self.current_session["visited_urls"]]
            if unvisited_urls and random.random() < 0.7:  # 70% chance to pick unvisited
                url = random.choice(unvisited_urls)
            else:
                url = random.choice(url_list)
            
            # Track that we've visited this URL
            self.current_session["visited_urls"].add(url)
            
            # Extract domain for tracking consecutive requests
            domain = urllib.parse.urlparse(url).netloc
            
            # If switching domains, pause appropriately
            if self.current_session["last_domain"] != domain:
                if self.current_session["last_domain"] is not None:
                    # Pause between domain switches
                    time.sleep(random.uniform(MIN_DOMAIN_SWITCH_PAUSE, MIN_DOMAIN_SWITCH_PAUSE * 2))
                
                self.current_session["last_domain"] = domain
                self.current_session["consecutive_domain_requests"] = 1
            else:
                self.current_session["consecutive_domain_requests"] += 1
                
                # If too many consecutive requests to same domain, force a domain switch
                if self.current_session["consecutive_domain_requests"] > MAX_CONSECUTIVE_REQUESTS:
                    # If we're making too many requests to the same domain, pick from the other list
                    if use_target:
                        url = random.choice(COMMON_URLS)
                    else:
                        url = random.choice(TARGET_URLS)
                    
                    # Reset consecutive counter and update last domain
                    domain = urllib.parse.urlparse(url).netloc
                    self.current_session["last_domain"] = domain
                    self.current_session["consecutive_domain_requests"] = 1
                    
                    # Extra pause for forced domain switch
                    time.sleep(random.uniform(MIN_DOMAIN_SWITCH_PAUSE * 1.5, MIN_DOMAIN_SWITCH_PAUSE * 3))
            
            self.current_session["request_count"] += 1
            return url
    
    def _extract_assets_from_response(self, response_text, url):
        """
        Extract potential asset IDs and info from response
        
        Args:
            response_text: HTML/JSON response text
            url: URL the response came from
            
        Returns:
            List of asset dictionaries
        """
        assets = []
        
        # Look for asset IDs in different formats
        
        # Standard asset ID format in Roblox URLs
        asset_id_pattern = r'(?:https?://)?(?:www\.)?roblox\.com/(?:catalog|library)/(\d+)'
        asset_matches = re.findall(asset_id_pattern, response_text)
        
        # Look for data-item-id attributes (commonly used in catalog)
        data_item_pattern = r'data-item-id="(\d+)"'
        data_item_matches = re.findall(data_item_pattern, response_text)
        
        # Look for asset IDs in JSON
        json_asset_pattern = r'"(?:assetId|id)":\s*(\d+)'
        json_asset_matches = re.findall(json_asset_pattern, response_text)
        
        # Look for universe IDs (for games)
        universe_id_pattern = r'"(?:universeId|universeid|universeID)":\s*(\d+)'
        universe_matches = re.findall(universe_id_pattern, response_text)
        
        # Combine all potential asset IDs
        all_ids = set(asset_matches + data_item_matches + json_asset_matches + universe_matches)
        
        # Extract names and descriptions when possible
        name_pattern = r'"name":\s*"([^"]+)"'
        desc_pattern = r'"description":\s*"([^"]*)"'
        
        # Process each potential asset ID
        for asset_id in all_ids:
            # Try to find associated name/description
            names = re.findall(name_pattern, response_text)
            descriptions = re.findall(desc_pattern, response_text)
            
            name = names[0] if names else "Unknown Asset"
            description = descriptions[0] if descriptions else ""
            
            # Look for keywords in name/description
            found_keywords = []
            for keyword in ALL_ENHANCED_SEARCH_TERMS:
                keyword_lower = keyword.lower()
                if keyword_lower in name.lower() or keyword_lower in description.lower():
                    found_keywords.append(keyword)
                    self.current_session["keywords_found"].add(keyword)
            
            # If we found keywords, or this is from a target URL, add the asset
            is_target_url = any(target in url for target in TARGET_URLS)
            has_keywords = len(found_keywords) > 0
            
            if is_target_url or has_keywords:
                assets.append({
                    'id': asset_id,
                    'name': name,
                    'description': description,
                    'source_url': url,
                    'found_time': datetime.now().isoformat(),
                    'found_keywords': found_keywords,
                    'is_potential_leak': has_keywords
                })
        
        return assets
    
    def _check_for_anubis_keywords(self, response_text):
        """
        Specifically check for Anubis update keywords
        
        Args:
            response_text: HTML/JSON response text
            
        Returns:
            List of found Anubis keywords
        """
        found_keywords = []
        
        for keyword in ANUBIS_KEYWORDS:
            keyword_lower = keyword.lower()
            if keyword_lower in response_text.lower():
                found_keywords.append(keyword)
                
        # Also check anti-detection variants
        for keyword in ANTI_DETECTION_TERMS:
            if keyword.lower() in response_text.lower():
                found_keywords.append(keyword)
        
        return found_keywords
    
    def _check_for_developer_testing(self, response_text):
        """
        Look for indications of developer testing areas
        
        Args:
            response_text: HTML/JSON response text
            
        Returns:
            List of found developer testing keywords
        """
        found_keywords = []
        
        for keyword in DEVELOPER_TESTING_KEYWORDS:
            keyword_lower = keyword.lower()
            if keyword_lower in response_text.lower():
                found_keywords.append(keyword)
        
        return found_keywords
    
    def scan_disguised(self, duration_minutes=10, target_focused=True):
        """
        Perform a disguised scan of Roblox assets
        
        Args:
            duration_minutes: How long to scan in minutes
            target_focused: If True, prioritize target URLs over common URLs
            
        Returns:
            Dictionary with scan results
        """
        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        # Reset session to start fresh
        self._reset_session()
        
        while datetime.now() < end_time:
            try:
                # Check if we should reset session
                if self._should_reset_session():
                    self._reset_session()
                
                # Get next URL to request
                url = self._get_next_url(is_target_focused=target_focused)
                
                # Get browser for this request
                browser = self.current_session["browser"]
                headers = get_browser_headers(browser)
                
                logger.info(f"Scanning {url} with disguised browser {browser['fingerprint']['name']}")
                
                # Make the request using our anti-detection module
                response_text = anti_detection_request(url)
                
                if response_text:
                    # Extract assets from response
                    new_assets = self._extract_assets_from_response(response_text, url)
                    
                    # If assets found, add them to our results
                    if new_assets:
                        self.current_session["assets_found"].extend(new_assets)
                        
                        # Log significant findings
                        for asset in new_assets:
                            if asset["is_potential_leak"]:
                                if any(k in ANUBIS_KEYWORDS for k in asset["found_keywords"]):
                                    logger.info(f"★★★ POTENTIAL ANUBIS UPDATE ASSET: {asset['name']} (ID: {asset['id']}) ★★★")
                                elif any(k in DEVELOPER_TESTING_KEYWORDS for k in asset["found_keywords"]):
                                    logger.info(f"★★ POTENTIAL DEVELOPER TESTING: {asset['name']} (ID: {asset['id']}) ★★")
                                else:
                                    logger.info(f"★ POTENTIAL LEAK: {asset['name']} (ID: {asset['id']}) ★")
                    
                    # Check specifically for Anubis keywords
                    anubis_keywords = self._check_for_anubis_keywords(response_text)
                    if anubis_keywords:
                        logger.info(f"Found Anubis keywords on {url}: {', '.join(anubis_keywords)}")
                        for keyword in anubis_keywords:
                            self.current_session["keywords_found"].add(keyword)
                    
                    # Check for developer testing areas
                    testing_keywords = self._check_for_developer_testing(response_text)
                    if testing_keywords:
                        logger.info(f"Found developer testing keywords on {url}: {', '.join(testing_keywords)}")
                        for keyword in testing_keywords:
                            self.current_session["keywords_found"].add(keyword)
                
                # Simulate human reading/thinking time
                self._simulate_human_thinking()
                
            except Exception as e:
                logger.error(f"Error during disguised scan: {e}")
                time.sleep(5)  # Pause on error
                
                # If many errors, try resetting session
                if random.random() < 0.7:
                    self._reset_session()
        
        # Scan complete, return results
        scan_duration = datetime.now() - start_time
        
        return {
            "assets_found": self.current_session["assets_found"],
            "keywords_found": list(self.current_session["keywords_found"]),
            "scan_duration_seconds": scan_duration.total_seconds(),
            "urls_visited": len(self.current_session["visited_urls"]),
            "browser_stats": get_pool_stats(),
            "rate_limit_stats": get_rate_limit_stats()
        }

# Create global scanner instance
disguised_scanner = DisguisedScanner()

def perform_disguised_scan(duration_minutes=10, target_focused=True):
    """
    Perform a disguised scan for new assets
    
    Args:
        duration_minutes: How long to scan in minutes
        target_focused: If True, prioritize target URLs over common URLs
        
    Returns:
        Scan results dictionary
    """
    return disguised_scanner.scan_disguised(
        duration_minutes=duration_minutes,
        target_focused=target_focused
    )

def short_scan():
    """Perform a short scan (useful for testing)"""
    return perform_disguised_scan(duration_minutes=2)

def medium_scan():
    """Perform a medium-length scan"""
    return perform_disguised_scan(duration_minutes=10)

def thorough_scan():
    """Perform a thorough scan with high focus on target URLs"""
    return perform_disguised_scan(duration_minutes=30, target_focused=True)

def background_scan():
    """Perform a long background scan"""
    return perform_disguised_scan(duration_minutes=60, target_focused=False)