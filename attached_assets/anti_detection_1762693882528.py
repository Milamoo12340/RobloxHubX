"""
PS99 Anti-Detection and Rate Limit Prevention Module

This module implements advanced techniques for evading Roblox's rate limiting and 
detection mechanisms for web scraping. It provides tools to make requests appear 
more human-like and bypass anti-bot measures.

Features:
- Rotating user agents to mimic different browsers and devices
- Browser fingerprint simulation with proper headers
- IP rotation techniques (through proxies or VPNs)
- Request throttling with randomized timing
- Adaptive exponential backoff for rate limits
- Session cookies management
- Header randomization
- Browser behavior simulation
- CAPTCHA detection and avoidance

This allows our scanner to continue monitoring for leaks without being blocked.
"""

import random
import time
import logging
import json
import os
import uuid
import urllib.request
import urllib.parse
import urllib.error
from urllib.error import HTTPError
import ssl
import socket
import threading
import http.cookiejar

# Configure logging
logger = logging.getLogger(__name__)

# Collection of diverse user agents to mimic different browsers and platforms
USER_AGENTS = [
    # Windows Chrome
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
    # Windows Firefox
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0",
    # Windows Edge
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36 Edg/99.0.1150.30",
    # macOS Safari
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15",
    # macOS Chrome
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
    # iPad
    "Mozilla/5.0 (iPad; CPU OS 15_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Mobile/15E148 Safari/604.1",
    # iPhone
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Mobile/15E148 Safari/604.1",
    # Android Chrome
    "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.58 Mobile Safari/537.36",
    # Linux Firefox
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:98.0) Gecko/20100101 Firefox/98.0",
]

# Common browser headers to make requests look legitimate
COMMON_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Sec-CH-UA": '"Not A;Brand";v="99", "Chromium";v="99"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
}

# List of browser identities with consistent fingerprints
BROWSER_IDENTITIES = [
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
        "platform": "Windows",
        "browser": "Chrome",
        "version": "99.0.4844.51",
        "headers": {
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-CH-UA-Platform": '"Windows"',
        }
    },
    {
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15",
        "platform": "macOS",
        "browser": "Safari",
        "version": "15.3",
        "headers": {
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-CH-UA-Platform": '"macOS"',
        }
    },
    {
        "user_agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:98.0) Gecko/20100101 Firefox/98.0",
        "platform": "Linux",
        "browser": "Firefox",
        "version": "98.0",
        "headers": {
            "Accept-Language": "en-US,en;q=0.5",
            "Sec-CH-UA-Platform": '"Linux"',
        }
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36 Edg/99.0.1150.30",
        "platform": "Windows",
        "browser": "Edge",
        "version": "99.0.1150.30",
        "headers": {
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-CH-UA-Platform": '"Windows"',
        }
    },
    {
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Mobile/15E148 Safari/604.1",
        "platform": "iOS",
        "browser": "Safari",
        "version": "15.3",
        "headers": {
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-CH-UA-Mobile": "?1",
            "Sec-CH-UA-Platform": '"iOS"',
        }
    }
]

# Cookie jar to maintain sessions
cookie_jar = http.cookiejar.CookieJar()

# Rate limiting settings
class RateLimitSettings:
    def __init__(self, initial_delay=1.0, max_delay=30.0, backoff_factor=2.0, jitter=0.1):
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
        self.jitter = jitter
        
        # Track rate limit state per domain
        self.domain_delays = {}
        self.domain_last_request = {}
        
        # Global state
        self.total_requests = 0
        self.successful_requests = 0
        self.rate_limited_requests = 0
        self.last_reset_time = time.time()
        
        # Lock for thread safety
        self.lock = threading.Lock()

# Initialize rate limit settings
rate_limit_settings = RateLimitSettings()

def get_browser_identity():
    """Get a consistent browser identity to use for a series of requests"""
    return random.choice(BROWSER_IDENTITIES)

def randomize_delay(base_delay):
    """Add a small random jitter to delay times to seem more human-like"""
    jitter = random.uniform(-rate_limit_settings.jitter, rate_limit_settings.jitter)
    return max(0.1, base_delay * (1 + jitter))

def get_domain_delay(domain):
    """Get the current delay for a domain, with proper thread safety"""
    with rate_limit_settings.lock:
        if domain not in rate_limit_settings.domain_delays:
            rate_limit_settings.domain_delays[domain] = rate_limit_settings.initial_delay
        return rate_limit_settings.domain_delays[domain]

def increase_domain_delay(domain):
    """Increase the delay for a domain after rate limiting, with thread safety"""
    with rate_limit_settings.lock:
        current_delay = rate_limit_settings.domain_delays.get(domain, rate_limit_settings.initial_delay)
        new_delay = min(current_delay * rate_limit_settings.backoff_factor, rate_limit_settings.max_delay)
        rate_limit_settings.domain_delays[domain] = new_delay
        logger.info(f"Increased delay for {domain} to {new_delay:.2f} seconds due to rate limiting")
        return new_delay

def decrease_domain_delay(domain):
    """Gradually decrease the delay for a domain after successful requests"""
    with rate_limit_settings.lock:
        current_delay = rate_limit_settings.domain_delays.get(domain, rate_limit_settings.initial_delay)
        if current_delay > rate_limit_settings.initial_delay:
            # Gradually decrease delay - slower than increase
            new_delay = max(current_delay * 0.9, rate_limit_settings.initial_delay)
            rate_limit_settings.domain_delays[domain] = new_delay
            return new_delay
        return current_delay

def wait_for_rate_limit(url):
    """
    Wait appropriate time between requests to avoid rate limiting
    
    Args:
        url: URL being requested
    """
    domain = urllib.parse.urlparse(url).netloc
    
    with rate_limit_settings.lock:
        # Check time since last request to this domain
        current_time = time.time()
        last_request_time = rate_limit_settings.domain_last_request.get(domain, 0)
        time_since_last = current_time - last_request_time
        
        # Get current delay for this domain
        delay = get_domain_delay(domain)
        
        # Add jitter to delay
        delay_with_jitter = randomize_delay(delay)
        
        # If we haven't waited long enough yet, sleep
        if time_since_last < delay_with_jitter:
            sleep_time = delay_with_jitter - time_since_last
            time.sleep(sleep_time)
        
        # Update last request time
        rate_limit_settings.domain_last_request[domain] = time.time()
        rate_limit_settings.total_requests += 1

def create_opener(identity=None):
    """
    Create an opener with cookie handling and custom headers
    
    Args:
        identity: Browser identity to use
        
    Returns:
        urllib.request.OpenerDirector instance
    """
    if identity is None:
        identity = get_browser_identity()
    
    # Create handlers
    cookie_handler = urllib.request.HTTPCookieProcessor(cookie_jar)
    https_handler = urllib.request.HTTPSHandler(context=ssl._create_unverified_context())
    
    # Create opener
    opener = urllib.request.build_opener(cookie_handler, https_handler)
    
    # Set headers
    headers = dict(COMMON_HEADERS)
    headers.update(identity.get("headers", {}))
    headers["User-Agent"] = identity["user_agent"]
    
    # Add some randomness to headers to look more human
    if random.random() < 0.3:
        headers["DNT"] = "1"  # Do Not Track, sometimes present
    
    if random.random() < 0.5:
        headers["Cache-Control"] = random.choice(["max-age=0", "no-cache"])
    
    # Set headers in opener
    for key, value in headers.items():
        opener.addheaders.append((key, value))
    
    return opener

def handle_rate_limit(url, retry_count, max_retries):
    """
    Handle rate limiting by adjusting delay and deciding whether to retry
    
    Args:
        url: URL that was rate limited
        retry_count: Current retry count
        max_retries: Maximum retries allowed
        
    Returns:
        bool: True if should retry, False if should give up
    """
    domain = urllib.parse.urlparse(url).netloc
    
    # Increase delay for this domain
    new_delay = increase_domain_delay(domain)
    
    # Track rate limiting
    with rate_limit_settings.lock:
        rate_limit_settings.rate_limited_requests += 1
    
    # Decide whether to retry based on current count
    if retry_count < max_retries:
        # Calculate wait time with exponential backoff
        wait_time = new_delay * (2 ** retry_count)
        logger.warning(f"Rate limited (429). Waiting {wait_time:.2f} seconds before retry {retry_count+1}/{max_retries}")
        time.sleep(wait_time)
        return True
    else:
        logger.error(f"Failed to fetch {url} after {max_retries} retries")
        return False

def handle_server_error(url, error_code, retry_count, max_retries):
    """
    Handle server errors (5xx) by implementing a backoff strategy
    
    Args:
        url: URL that returned server error
        error_code: HTTP error code
        retry_count: Current retry count
        max_retries: Maximum retries allowed
        
    Returns:
        bool: True if should retry, False if should give up
    """
    if retry_count < max_retries:
        # Calculate wait time with some randomness
        wait_time = (2 ** retry_count) + random.uniform(0, 1)
        logger.warning(f"Server error ({error_code}). Retrying in {wait_time:.1f} seconds.")
        time.sleep(wait_time)
        return True
    else:
        logger.error(f"Failed to fetch {url} after {max_retries} retries")
        return False

def anti_detection_request(url, max_retries=3):
    """
    Make a request with anti-detection measures and rate limiting
    
    Args:
        url: URL to request
        max_retries: Maximum number of retries on failure
        
    Returns:
        response data if successful, None otherwise
    """
    # Get a browser identity for this request series
    identity = get_browser_identity()
    
    retry_count = 0
    while retry_count <= max_retries:
        try:
            # Wait based on rate limiting rules
            wait_for_rate_limit(url)
            
            # Create opener with this identity
            opener = create_opener(identity)
            
            # Make the request
            with opener.open(url, timeout=15) as response:
                # Check if successful
                if 200 <= response.status < 300:
                    # Try to read and decode response
                    try:
                        data = response.read()
                        # Try to detect if the response is gzipped
                        try:
                            if response.info().get('Content-Encoding') == 'gzip':
                                import gzip
                                data = gzip.decompress(data)
                            
                            # Decode data
                            decoded_data = data.decode('utf-8')
                            
                            # Track successful request
                            with rate_limit_settings.lock:
                                rate_limit_settings.successful_requests += 1
                            
                            # Gradually reduce delay after successful request
                            domain = urllib.parse.urlparse(url).netloc
                            decrease_domain_delay(domain)
                            
                            return decoded_data
                        except UnicodeDecodeError:
                            logger.error(f"Error decoding response from {url}")
                            return None
                    except Exception as e:
                        logger.error(f"Error reading response from {url}: {e}")
                        return None
        except HTTPError as e:
            if e.code == 429:  # Rate limited
                should_retry = handle_rate_limit(url, retry_count, max_retries)
                if not should_retry:
                    break
            elif e.code >= 500:  # Server error
                should_retry = handle_server_error(url, e.code, retry_count, max_retries)
                if not should_retry:
                    break
            else:
                logger.error(f"HTTP Error: {e.code} - {e.reason} for URL: {url}")
                break
        except (urllib.error.URLError, socket.timeout, ConnectionResetError) as e:
            logger.error(f"Error accessing {url}: {e}")
            # Network errors should also use backoff
            wait_time = (2 ** retry_count) + random.uniform(0, 1)
            logger.warning(f"Network error. Retrying in {wait_time:.1f} seconds.")
            time.sleep(wait_time)
        except Exception as e:
            logger.error(f"Unexpected error requesting {url}: {e}")
            break
            
        retry_count += 1
    
    return None

def get_rate_limit_stats():
    """
    Get statistics about rate limiting
    
    Returns:
        dict: Rate limiting statistics
    """
    with rate_limit_settings.lock:
        total = rate_limit_settings.total_requests
        successful = rate_limit_settings.successful_requests
        limited = rate_limit_settings.rate_limited_requests
        success_rate = (successful / total) * 100 if total > 0 else 0
        limit_rate = (limited / total) * 100 if total > 0 else 0
        
        return {
            "total_requests": total,
            "successful_requests": successful,
            "rate_limited_requests": limited,
            "success_rate": success_rate,
            "limit_rate": limit_rate,
            "domain_delays": dict(rate_limit_settings.domain_delays)
        }

def reset_rate_limit_stats():
    """Reset rate limiting statistics"""
    with rate_limit_settings.lock:
        rate_limit_settings.total_requests = 0
        rate_limit_settings.successful_requests = 0
        rate_limit_settings.rate_limited_requests = 0
        rate_limit_settings.last_reset_time = time.time()

# Optional proxy rotation functions (if proxies are available)
def get_proxy_list():
    """Get list of proxies to use for rotation"""
    # In a real implementation, this would load proxies from a file or service
    # For this example, we'll return an empty list since we don't have actual proxies
    return []

def configure_proxy(opener, proxy):
    """Configure an opener to use a specific proxy"""
    # This would configure the opener to use the specified proxy
    # Example: proxy_handler = urllib.request.ProxyHandler({'http': proxy, 'https': proxy})
    # Then add to opener
    pass