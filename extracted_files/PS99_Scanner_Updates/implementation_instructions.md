# PS99 Scanner Implementation Instructions

This document provides instructions for implementing the anti-rate limiting techniques and updating the scanner code.

## Step 1: Add the Missing Developer

Add the developer "Merely" (ID: 2033432) to the DEVELOPER_IDS list in comprehensive_roblox_scanner.py:

```python
DEVELOPER_IDS = [
    13365322, 1493409, 31370263, 1547685, 97658457, 27902978, 27743246, 124094, 
    18665593, 116559, 154740428, 83364191, 98346734, 79187030, 6523651, 28100481, 
    19339635, 47296135, 17122595, 116705184, 94730921, 23558830, 16015415, 
    2033432,  # Merely - Listed in BIG Games Pets as a developer
]
```

## Step 2: Add the Anti-Rate Limiting Module

1. Add the anti_rate_limiting.py file to the project
2. Import it in comprehensive_roblox_scanner.py:

```python
from anti_rate_limiting import (
    rotate_browser_fingerprint, 
    make_request_with_backoff, 
    distribute_requests,
    RobloxSession
)
```

## Step 3: Update Request Methods

Replace all direct requests.get() calls with make_request_with_backoff():

```python
# Replace this:
response = requests.get(url)

# With this:
response = make_request_with_backoff(url)
```

## Step 4: Update Developer Asset Scanning

Replace the developer asset scanning method with a batched version:

```python
def scan_developer_assets(self, developer_id):
    """Scan assets from a developer using anti-rate limiting techniques"""
    try:
        # Get developer profile
        profile_url = f"https://users.roblox.com/v1/users/{developer_id}"
        profile_response = make_request_with_backoff(profile_url)
        
        if not profile_response:
            logger.error(f"Error getting developer profile: Failed to get response")
            return
            
        profile_data = profile_response.json()
        developer_name = profile_data.get('name', f'Unknown ({developer_id})')
        
        # Get developer's creations
        creations_url = f"https://inventory.roblox.com/v2/users/{developer_id}/inventory/items?itemType=1"
        creations_response = make_request_with_backoff(creations_url)
        
        if not creations_response:
            logger.error(f"Error scanning developer assets: Failed to get response")
            return
            
        try:
            inventory_data = creations_response.json()
            assets = inventory_data.get('data', [])
            
            # Create URLs to fetch asset details
            asset_urls = [f"https://api.roblox.com/marketplace/productinfo?assetId={asset['id']}" for asset in assets]
            
            # Use distribute_requests to handle rate limiting
            asset_responses = distribute_requests(
                asset_urls, 
                max_concurrent=2,
                batch_size=5,
                batch_delay=5
            )
            
            # Process successful responses
            for url, response in asset_responses:
                asset_id = url.split('assetId=')[1]
                try:
                    asset_data = response.json()
                    
                    # Check if asset matches PS99 keywords
                    if self._check_asset_keywords(asset_data):
                        # Enhanced output with more details
                        asset_data['creator_id'] = developer_id
                        asset_data['creator_name'] = developer_name
                        self._display_asset(asset_data)
                        
                except Exception as e:
                    logger.error(f"Error processing asset data for {asset_id}: {e}")
                    
        except Exception as e:
            logger.error(f"Error parsing developer assets response: {e}")
            
    except Exception as e:
        logger.error(f"Error scanning developer assets: {e}")
```

## Step 5: Implement Asset Display Enhancements

Add an enhanced asset display method:

```python
def _display_asset(self, asset_data):
    """Display asset with comprehensive information"""
    # Format output
    asset_info = f"""
    ★★★ POTENTIAL UPDATE ASSET FOUND ★★★
    Name: {asset_data['Name']}
    ID: {asset_data['AssetId']}
    Created by: {asset_data.get('creator_name', 'Unknown')} (ID: {asset_data.get('creator_id', 'Unknown')})
    Created on: {asset_data.get('Created', 'Unknown')}
    Asset URL: https://www.roblox.com/catalog/{asset_data['AssetId']}
    Preview URL: {asset_data.get('ThumbnailUrl', 'No preview available')}
    Keywords matched: {', '.join(asset_data.get('matched_keywords', ['Unknown']))}
    """
    
    logger.info(asset_info)
    
    # Save asset image if available
    if 'ThumbnailUrl' in asset_data:
        self._save_asset_image(asset_data['AssetId'], asset_data['ThumbnailUrl'])
    
    # Add to discovered assets database
    self._add_to_discovered_assets(asset_data)
```

## Step 6: Testing

Before deploying to production, test the changes with a limited scan:

```python
def test_anti_rate_limiting():
    """Test anti-rate limiting with a small set of developers"""
    scanner = RobloxAssetScanner()
    
    # Test with high-priority developers only
    test_developers = [1547685, 31370263]  # Preston and ChickenEngineer
    
    for dev_id in test_developers:
        scanner.scan_developer_assets(dev_id)
        
    print("Test completed. Check logs for rate limiting errors.")
```

## Step 7: Full Implementation

After testing is successful, update all scanning methods to use the new anti-rate limiting techniques.
