# Updated PS99 Scanner Implementation Plan
# Updated PS99 Scanner Implementation Plan

Based on your guidance, we'll keep all developers already listed in the scanner (assuming they're in the official drop-down menus), add any missing developers, and focus on implementing the anti-rate limiting techniques.

## 1. Developer Updates

The current scanner already tracks 23 developers. We should add the one missing developer:

```python
# Add this developer to DEVELOPER_IDS
2033432,  # Merely - Listed in BIG Games Pets as a developer
```

## 2. Group Validation

Since our primary concern is rate limiting, we won't remove any groups unless you specifically request it. We'll focus instead on implementing anti-rate limiting techniques.

## 3. Anti-Rate Limiting Implementation

The scanner is currently experiencing constant HTTP 429 errors, which indicates rate limiting by Roblox's API. Here's the code to implement:

### 3.1 Browser Fingerprint Rotation
```python
def rotate_browser_fingerprint():
    """Rotate browser fingerprint to avoid detection"""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.66",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36",
    ]
    
    accept_headers = [
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ]
    
    accept_languages = [
        "en-US,en;q=0.9",
        "en-US,en;q=0.8",
        "en-GB,en;q=0.9",
        "en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7",
    ]
    
    headers = {
        "User-Agent": random.choice(user_agents),
        "Accept": random.choice(accept_headers),
        "Accept-Language": random.choice(accept_languages),
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
    }
    
    return headers
```

### 3.2 Exponential Backoff for Rate Limiting
```python
def make_request_with_backoff(url, max_retries=5, initial_delay=1):
    """Make request with exponential backoff for rate limiting"""
    headers = rotate_browser_fingerprint()
    
    for attempt in range(max_retries):
        try:
            # Add jitter to request timing
            jitter = random.uniform(0.1, 0.5)
            time.sleep(jitter)
            
            response = requests.get(url, headers=headers, timeout=10)
            
            # Check if rate limited
            if response.status_code == 429:
                # Calculate delay with jitter
                delay = initial_delay * (2 ** attempt) + random.uniform(0, 1)
                logger.warning(f"Rate limited. Retrying in {delay:.2f} seconds...")
                time.sleep(delay)
                continue
                
            response.raise_for_status()
            return response
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            
            # Add jitter to delay
            delay = initial_delay * (2 ** attempt) + random.uniform(0, 1)
            logger.warning(f"Retrying in {delay:.2f} seconds...")
            time.sleep(delay)
    
    logger.error(f"Failed after {max_retries} attempts")
    return None
```

### 3.3 Request Distribution and Batching
```python
def distribute_requests(urls, max_concurrent=2, batch_size=5, batch_delay=5):
    """
    Distribute requests across multiple threads with controlled concurrency and batching
    
    Args:
        urls: List of URLs to request
        max_concurrent: Maximum number of concurrent requests
        batch_size: Number of URLs to process in a batch
        batch_delay: Delay in seconds between batches
    
    Returns:
        List of (url, response) tuples for successful requests
    """
    results = []
    
    # Process URLs in batches
    for i in range(0, len(urls), batch_size):
        batch_urls = urls[i:i+batch_size]
        logger.info(f"Processing batch {i//batch_size + 1}/{math.ceil(len(urls)/batch_size)}")
        
        with ThreadPoolExecutor(max_workers=max_concurrent) as executor:
            future_to_url = {executor.submit(make_request_with_backoff, url): url for url in batch_urls}
            
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    response = future.result()
                    if response:
                        results.append((url, response))
                except Exception as e:
                    logger.error(f"Error processing {url}: {e}")
        
        # Add delay between batches to avoid rate limiting
        if i + batch_size < len(urls):
            delay = batch_delay + random.uniform(1, 3)  # Add randomness
            logger.info(f"Waiting {delay:.2f} seconds before next batch...")
            time.sleep(delay)
    
    return results
```

### 3.4 Session Management
```python
class RobloxSession:
    """Manages Roblox API sessions with rotation and cookies"""
    
    def __init__(self, cookie=None):
        self.session = requests.Session()
        self.last_request_time = 0
        self.min_request_interval = 1.0  # Minimum time between requests
        
        if cookie:
            self.session.cookies.update({".ROBLOSECURITY": cookie})
        
        # Set default headers
        self.session.headers.update(rotate_browser_fingerprint())
    
    def get(self, url, **kwargs):
        """Make a GET request with rate limiting and browser fingerprint rotation"""
        # Ensure minimum time between requests
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        
        if time_since_last_request < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last_request
            time.sleep(sleep_time)
        
        # Rotate browser fingerprint
        self.session.headers.update(rotate_browser_fingerprint())
        
        # Make request
        self.last_request_time = time.time()
        return self.session.get(url, **kwargs)
    
    def rotate_identity(self):
        """Rotate session identity with new fingerprint"""
        self.session.headers.update(rotate_browser_fingerprint())
```

## 4. Additional Improvements

### 4.1 Asset Verification and Display
```python
def display_asset(asset_data):
    """Display asset with comprehensive information"""
    # Get developer name
    try:
        creator_response = make_request_with_backoff(f"https://users.roblox.com/v1/users/{asset_data['creator_id']}")
        if creator_response:
            creator_data = creator_response.json()
            creator_name = creator_data.get('name', f"Unknown (ID: {asset_data['creator_id']})")
        else:
            creator_name = f"Unknown (ID: {asset_data['creator_id']})"
    except Exception:
        creator_name = f"Unknown (ID: {asset_data['creator_id']})"
    
    # Format output
    asset_info = f"""
    ★★★ POTENTIAL UPDATE ASSET FOUND ★★★
    Name: {asset_data['name']}
    ID: {asset_data['id']}
    Created by: {creator_name} (ID: {asset_data['creator_id']})
    Created on: {asset_data['created']}
    Asset URL: https://www.roblox.com/catalog/{asset_data['id']}
    Preview URL: {asset_data.get('thumbnail_url', 'No preview available')}
    Keywords matched: {', '.join(asset_data['matched_keywords'])}
    """
    
    logger.info(asset_info)
    
    # Save asset image if available
    if 'thumbnail_url' in asset_data:
        save_asset_image(asset_data['id'], asset_data['thumbnail_url'])
    
    # Add to discovered assets database
    add_to_discovered_assets(asset_data)
```

## 5. Implementation Strategy

1. Add the missing developer (Merely - 2033432) to the DEVELOPER_IDS list
2. Implement the anti-rate limiting techniques directly in the comprehensive_roblox_scanner.py file
3. Improve the asset display and verification for better leak reports
4. Test the scanner with a limited number of developer IDs first to ensure rate limiting is handled properly

## 6. Testing Approach

1. Implement a dry-run mode that simulates requests without making actual API calls
2. Start with a small subset of developers to test anti-rate limiting
3. Monitor error rates to ensure HTTP 429 errors are being handled
4. Gradually expand testing to include all developers

Before making any actual changes to the code, we'll wait for your explicit approval.
