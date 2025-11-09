"""
Synapse Anti-Detection Module for PS99 Developer Tracker

This module implements advanced anti-detection techniques similar to those used in Synapse,
allowing for more effective scanning and discovery of Roblox assets while avoiding
rate limiting and security measures.
"""

import os
import re
import time
import json
import random
import logging
import threading
import requests
from urllib.parse import urlparse
from collections import defaultdict
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Callable, Any, Optional, Union, Tuple

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Common user agents to simulate different browsers
USER_AGENTS = [
    # Chrome
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36",
    
    # Firefox
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (X11; Linux i686; rv:89.0) Gecko/20100101 Firefox/89.0",
    
    # Safari
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    
    # Edge
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59",
    
    # Mobile User Agents
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 11; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
    
    # Roblox Studio User Agent
    "Roblox/WinInet",
    
    # Xbox
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edge/44.18363.8131"
]

# Device/platform profiles
DEVICE_PROFILES = [
    {"platform": "Windows", "os": "10", "device": "Desktop"},
    {"platform": "Macintosh", "os": "10_15_7", "device": "Desktop"},
    {"platform": "X11", "os": "Linux x86_64", "device": "Desktop"},
    {"platform": "iPhone", "os": "14_6", "device": "Mobile"},
    {"platform": "iPad", "os": "14_6", "device": "Tablet"},
    {"platform": "Android", "os": "11", "device": "Mobile"},
    {"platform": "Xbox", "os": "10.0", "device": "Console"}
]

# Browser fingerprinting parameters
BROWSER_FINGERPRINTS = [
    {
        "user_agent": USER_AGENTS[0],
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept_language": "en-US,en;q=0.5",
        "accept_encoding": "gzip, deflate, br",
        "connection": "keep-alive",
        "upgrade_insecure_requests": "1",
        "cache_control": "max-age=0"
    },
    {
        "user_agent": USER_AGENTS[3],
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept_language": "en-US,en;q=0.9",
        "accept_encoding": "gzip, deflate",
        "connection": "keep-alive",
        "upgrade_insecure_requests": "1"
    },
    {
        "user_agent": USER_AGENTS[6],
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept_language": "en-GB,en;q=0.9",
        "accept_encoding": "gzip, deflate, br",
        "connection": "keep-alive"
    }
]

# Connection stealth strategies
class ConnectionStrategy(Enum):
    DIRECT = 0               # Direct connection, no special handling
    DELAY_RANDOM = 1         # Random delay between requests
    EXPONENTIAL_BACKOFF = 2  # Exponential backoff on rate limiting
    ROTATE_FINGERPRINT = 3   # Rotate browser fingerprints
    REALISTIC_NAVIGATION = 4 # Simulate realistic browsing patterns


@dataclass
class RequestConfig:
    """Configuration for a single request"""
    url: str
    method: str = "GET"
    headers: Optional[Dict[str, str]] = None
    params: Optional[Dict[str, str]] = None
    data: Optional[Dict[str, Any]] = None
    json_data: Optional[Dict[str, Any]] = None
    callback: Optional[Callable[[Any, Any], None]] = None
    retries: int = 3
    timeout: int = 10
    connection_strategy: ConnectionStrategy = ConnectionStrategy.DIRECT
    context: Optional[Dict[str, Any]] = None


class SynapseAntiDetection:
    """
    Implements Synapse-style anti-detection techniques for asset scanning and discovery.
    """
    
    def __init__(self):
        # Session management
        self.sessions = {}
        self.active_session = None
        # Advanced stealth settings
        self.advanced_stealth_enabled = False
        
    def enable_advanced_stealth(self, enabled=True):
        """Enable or disable advanced stealth techniques"""
        self.advanced_stealth_enabled = enabled
        logger.info(f"Advanced stealth techniques {'enabled' if enabled else 'disabled'}")
        
        # Request tracking for rate limiting
        self.request_timestamps = defaultdict(list)
        self.domain_delays = {}
        
        # Shared cookie jar for domain-specific cookies
        self.cookies = {}
        
        # Thread synchronization
        self.session_lock = threading.Lock()
        
        # Initialize sessions
        self._init_sessions()
    
    def _init_sessions(self):
        """Initialize sessions with different browser fingerprints"""
        for i, fingerprint in enumerate(BROWSER_FINGERPRINTS):
            session = requests.Session()
            session.headers.update({
                "User-Agent": fingerprint["user_agent"],
                "Accept": fingerprint["accept"],
                "Accept-Language": fingerprint["accept_language"],
                "Accept-Encoding": fingerprint["accept_encoding"],
                "Connection": fingerprint["connection"]
            })
            
            if "upgrade_insecure_requests" in fingerprint:
                session.headers["Upgrade-Insecure-Requests"] = fingerprint["upgrade_insecure_requests"]
                
            if "cache_control" in fingerprint:
                session.headers["Cache-Control"] = fingerprint["cache_control"]
                
            self.sessions[f"session_{i}"] = session
            
        # Set active session to the first one
        self.active_session = "session_0"
    
    def _get_session(self, rotate=False):
        """Get the current session, optionally rotating to a new one"""
        with self.session_lock:
            if rotate:
                # Rotate to a different session
                sessions = list(self.sessions.keys())
                current_index = sessions.index(self.active_session)
                next_index = (current_index + 1) % len(sessions)
                self.active_session = sessions[next_index]
                
            return self.sessions[self.active_session]
    
    def _apply_request_delay(self, domain):
        """Apply an appropriate delay based on domain and request history with advanced anti-detection patterns"""
        # Check if we have a specific delay for this domain
        if domain in self.domain_delays:
            time.sleep(self.domain_delays[domain])
            return
            
        # Calculate delay based on recent request history across different time windows
        current_time = time.time()
        recent_requests = self.request_timestamps[domain]
        
        # Track requests in different time windows
        very_recent = [t for t in recent_requests if current_time - t < 15]  # Last 15 seconds
        recent = [t for t in recent_requests if current_time - t < 60]       # Last minute
        medium = [t for t in recent_requests if current_time - t < 300]      # Last 5 minutes
        
        # Remove old requests (older than 10 minutes)
        recent_requests = [t for t in recent_requests if current_time - t < 600]
        self.request_timestamps[domain] = recent_requests
        
        # Calculate request rates
        very_recent_rate = len(very_recent)
        recent_rate = len(recent)
        medium_rate = len(medium)
        
        # Implement progressive backoff with Synapse-style stealth patterns
        if 'roblox.com' in domain or 'rbxcdn.com' in domain:
            # Roblox domains need special handling due to stricter rate limiting
            
            # Apply human-like behavioral patterns (variable delay)
            human_factor = random.random() * 0.5  # 0-0.5 second random addition
            
            # If very recent activity is high, implement longer delay
            if very_recent_rate > 5:
                # Aggressive backoff for very recent high activity
                delay = 5.0 + (random.random() * 10.0) + human_factor  # 5-15.5 second delay
                logger.debug(f"Applying aggressive backoff delay for {domain}: {delay:.2f} seconds")
                
            # Progressive scale based on recent activity
            elif recent_rate > 30:
                # Major slowdown to avoid 429 errors
                delay = 3.0 + (random.random() * 7.0) + human_factor  # 3-10.5 second delay
                logger.debug(f"Applying major slowdown for {domain}: {delay:.2f} seconds")
                
            elif recent_rate > 15:
                # Moderate slowdown
                delay = 2.0 + (random.random() * 4.0) + human_factor  # 2-6.5 second delay
                logger.debug(f"Applying moderate slowdown for {domain}: {delay:.2f} seconds")
                
            elif medium_rate > 50:
                # Long-term activity slowdown
                delay = 1.0 + (random.random() * 3.0) + human_factor  # 1-4.5 second delay
                logger.debug(f"Applying long-term activity slowdown for {domain}: {delay:.2f} seconds")
                
            else:
                # Occasionally add a longer pause to simulate realistic browsing
                if random.random() < 0.1:  # 10% chance of a longer pause
                    # Apply a more human-like random delay to appear less bot-like
                    delay = 0.5 + (random.random() * 3.0) + human_factor  # 0.5-4.0 seconds
                    logger.debug(f"Applying human-like longer pause for {domain}: {delay:.2f} seconds")
                else:
                    # Normal delay with slight randomness
                    delay = 0.5 + (random.random() * 1.5) + human_factor  # 0.5-2.5 seconds
                    logger.debug(f"Applying standard delay for {domain}: {delay:.2f} seconds")
        else:
            # Standard domains can use simpler delay logic
            if recent_rate > 20:
                delay = 1.0 + (random.random() * 2.0)  # 1-3 second delay
            else:
                delay = 0.2 + (random.random() * 0.8)  # 0.2-1 second delay
            
        time.sleep(delay)
    
    def _handle_rate_limiting(self, response, domain):
        """Handle rate limiting by adjusting delay for the domain"""
        status_code = response.status_code
        
        if status_code == 429:  # Too Many Requests
            # Increase domain delay
            current_delay = self.domain_delays.get(domain, 0)
            self.domain_delays[domain] = min(current_delay + random.uniform(5.0, 10.0), 30.0)
            logger.warning(f"Rate limited (429). Increasing delay for {domain} to {self.domain_delays[domain]:.2f} seconds")
            return True
            
        elif status_code == 503:  # Service Unavailable
            # Apply moderate delay
            current_delay = self.domain_delays.get(domain, 0)
            self.domain_delays[domain] = min(current_delay + random.uniform(2.0, 5.0), 20.0)
            logger.warning(f"Server error (503). Applying delay for {domain} of {self.domain_delays[domain]:.2f} seconds")
            return True
            
        elif status_code == 403:  # Forbidden
            # May indicate detection, try rotating session
            logger.warning(f"Received 403 Forbidden for {domain}. Rotating session.")
            return False
            
        elif status_code == 200:  # Success
            # Gradually reduce delay for successful requests
            if domain in self.domain_delays and self.domain_delays[domain] > 0:
                self.domain_delays[domain] = max(0, self.domain_delays[domain] - 0.5)
                
        return False
    
    def _update_cookies(self, response, domain):
        """Update shared cookies from response"""
        if not response.cookies:
            return
            
        # Update cookies for this domain
        if domain not in self.cookies:
            self.cookies[domain] = {}
            
        for cookie_name, cookie_value in response.cookies.items():
            self.cookies[domain][cookie_name] = cookie_value
    
    def _apply_cookies(self, session, domain):
        """Apply shared cookies to session"""
        if domain in self.cookies:
            for cookie_name, cookie_value in self.cookies[domain].items():
                session.cookies.set(cookie_name, cookie_value, domain=domain)
    
    def _simulate_human_navigation(self, session, base_url):
        """Simulate human-like navigation patterns"""
        # Extract domain from URL
        parsed_url = urlparse(base_url)
        domain = parsed_url.netloc
        
        # Common pages to visit
        common_pages = [
            "/",
            "/games",
            "/catalog",
            "/develop",
            "/library"
        ]
        
        # Visit 1-2 random pages
        num_pages = random.randint(1, 2)
        visited_pages = []
        
        for _ in range(num_pages):
            page = random.choice(common_pages)
            if page in visited_pages:
                continue
                
            url = f"{parsed_url.scheme}://{domain}{page}"
            try:
                logger.debug(f"Simulating navigation to {url}")
                response = session.get(url, timeout=5)
                self._update_cookies(response, domain)
                
                # Add some delay between navigation
                time.sleep(random.uniform(1.0, 3.0))
                visited_pages.append(page)
                
            except Exception as e:
                logger.error(f"Error during simulated navigation to {url}: {str(e)}")
    
    def make_request(self, url, method="GET", headers=None, params=None, data=None, json_data=None, 
                     connection_strategy=ConnectionStrategy.EXPONENTIAL_BACKOFF, max_retries=3, callback=None):
        """
        Make a request with advanced anti-detection measures
        
        Args:
            url: URL to request
            method: HTTP method
            headers: Additional headers
            params: URL parameters
            data: Form data
            json_data: JSON data
            connection_strategy: Strategy for connection stealth
            max_retries: Maximum number of retries
            callback: Callback function for the response
            
        Returns:
            Response data or None if request failed
        """
        # Extract domain for rate limiting
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        
        # Update request history
        self.request_timestamps[domain].append(time.time())
        
        # Apply connection strategy
        if connection_strategy == ConnectionStrategy.DELAY_RANDOM:
            time.sleep(random.uniform(0.5, 2.0))
        elif connection_strategy == ConnectionStrategy.EXPONENTIAL_BACKOFF:
            self._apply_request_delay(domain)
        
        # Prepare session
        rotate_session = (connection_strategy == ConnectionStrategy.ROTATE_FINGERPRINT)
        session = self._get_session(rotate=rotate_session)
        
        # Apply shared cookies
        self._apply_cookies(session, domain)
        
        # Apply human-like navigation pattern
        if connection_strategy == ConnectionStrategy.REALISTIC_NAVIGATION:
            self._simulate_human_navigation(session, f"{parsed_url.scheme}://{domain}")
        
        # Prepare headers
        request_headers = {}
        if headers:
            request_headers.update(headers)
        
        # Add referer for more realistic requests
        if "Referer" not in request_headers:
            if random.random() < 0.7:  # 70% chance to add referer
                request_headers["Referer"] = f"{parsed_url.scheme}://{domain}/"
        
        # Make request with retries
        response_data = None
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response = None
                
                if method.upper() == "GET":
                    response = session.get(url, headers=request_headers, params=params, timeout=10)
                elif method.upper() == "POST":
                    response = session.post(url, headers=request_headers, params=params, 
                                           data=data, json=json_data, timeout=10)
                elif method.upper() == "PUT":
                    response = session.put(url, headers=request_headers, params=params, 
                                          data=data, json=json_data, timeout=10)
                elif method.upper() == "DELETE":
                    response = session.delete(url, headers=request_headers, params=params, timeout=10)
                else:
                    logger.error(f"Unsupported HTTP method: {method}")
                    break
                
                # Update cookies from response
                self._update_cookies(response, domain)
                
                # Check for rate limiting or other issues
                if self._handle_rate_limiting(response, domain):
                    retry_count += 1
                    time.sleep(self.domain_delays.get(domain, 5.0))  # Use domain-specific delay
                    continue
                
                # Process successful response
                if response.status_code == 200:
                    # Determine response type
                    content_type = response.headers.get("Content-Type", "")
                    
                    if "application/json" in content_type:
                        response_data = response.json()
                    else:
                        response_data = response.content
                        
                    # Call callback if provided
                    if callback:
                        callback(response_data, domain)
                        
                    break
                    
                else:
                    # Log error for non-200 responses
                    logger.error(f"HTTP Error: {response.status_code} - {response.reason} for URL: {url}")
                    
                    # Try again for server errors (500+)
                    if response.status_code >= 500:
                        retry_count += 1
                        time.sleep(random.uniform(2.0, 4.0))
                    else:
                        # Don't retry for client errors except rate limiting (which is handled above)
                        break
                    
            except requests.RequestException as e:
                logger.error(f"Request error for {url}: {str(e)}")
                retry_count += 1
                time.sleep(random.uniform(1.0, 3.0))
                
            except Exception as e:
                logger.error(f"Unexpected error for {url}: {str(e)}")
                break
        
        return response_data
    
    def process_batch_requests(self, requests_config):
        """
        Process a batch of requests with appropriate delays and anti-detection
        
        Args:
            requests_config: List of RequestConfig objects
            
        Returns:
            List of results
        """
        results = []
        
        for config in requests_config:
            result = self.make_request(
                url=config.url,
                method=config.method,
                headers=config.headers,
                params=config.params,
                data=config.data,
                json_data=config.json_data,
                connection_strategy=config.connection_strategy,
                max_retries=config.retries,
                callback=config.callback
            )
            
            results.append(result)
            
            # Add delay between requests
            time.sleep(random.uniform(0.5, 2.0))
        
        return results


def extract_asset_data_with_synapse(asset_id):
    """
    Extract detailed data about an asset using Synapse anti-detection methods
    
    Args:
        asset_id: The asset ID to query
        
    Returns:
        Dictionary with asset data or None if extraction failed
    """
    synapse = SynapseAntiDetection()
    
    # Multiple endpoints to try
    endpoints = [
        f"https://economy.roblox.com/v1/assets/{asset_id}/details",
        f"https://assetdelivery.roblox.com/v1/asset/?id={asset_id}",
        f"https://develop.roblox.com/v1/assets/{asset_id}"
    ]
    
    asset_data = None
    
    for endpoint in endpoints:
        response_data = synapse.make_request(
            url=endpoint,
            connection_strategy=ConnectionStrategy.EXPONENTIAL_BACKOFF
        )
        
        if response_data:
            # Try to parse JSON data
            if isinstance(response_data, bytes):
                try:
                    data = json.loads(response_data.decode('utf-8'))
                    asset_data = data
                    break
                except:
                    # Not JSON, might be binary data
                    asset_data = {"binary_data": True}
                    break
            else:
                asset_data = response_data
                break
    
    return asset_data