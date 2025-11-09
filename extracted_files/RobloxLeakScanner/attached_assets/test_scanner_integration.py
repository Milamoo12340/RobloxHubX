#!/usr/bin/env python3
"""
Test Scanner Integration

This module tests integrating our existing rate limiting and request bypass solutions 
to avoid hitting rate limits when scanning Roblox developer assets.

It uses:
1. roblox_request_bypass.py - Core request bypass implementation
2. improved_rate_limiting.py - Advanced rate limiting with caching
3. Enhanced_Anti_Detection_Methods/advanced_bypass.py - Sophisticated browser fingerprinting
"""

import os
import sys
import time
import json
import logging
import random
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# Import rate limiting and bypass modules
try:
    from roblox_request_bypass import make_request, json_request
    from improved_rate_limiting import ImprovedRateLimiter
    # Try to import the advanced bypass
    sys.path.append(os.path.join(parent_dir, "Enhanced_Anti_Detection_Methods"))
    from advanced_bypass import RobloxBypass
except ImportError as e:
    logger.error(f"Error importing required modules: {e}")
    sys.exit(1)

# Constants
CACHE_DIR = os.path.join("static", "test_images")
os.makedirs(CACHE_DIR, exist_ok=True)

# Default developers to scan (PS99/BIG Games related)
KEY_DEVELOPERS = [
    {"id": 13365322, "name": "ChickenEngineer"},     # Preston (BIG Games founder)
    {"id": 1493409, "name": "BuildIntoGames"},       # BIG Games official account
]

# Default groups to scan
KEY_GROUPS = [
    {"id": 1818, "name": "BIG Games"},               # Main BIG Games group
]

class IntegratedScanner:
    """
    Test scanner that integrates our existing rate limiting solutions
    """
    
    def __init__(self, cache_dir=CACHE_DIR):
        """Initialize the scanner with rate limiting components"""
        self.cache_dir = cache_dir
        self.rate_limiter = ImprovedRateLimiter()
        self.bypass = RobloxBypass()
        self.assets_found = []
        
        logger.info(f"Initialized IntegratedScanner with cache_dir={cache_dir}")
    
    def scan_developer(self, developer_id):
        """
        Scan a developer's assets using our rate limiting components
        
        Args:
            developer_id: The Roblox developer ID to scan
            
        Returns:
            List of assets found
        """
        logger.info(f"Scanning developer ID {developer_id}")
        assets = []
        
        # First, get developer name (optional)
        dev_info_url = f"https://users.roblox.com/v1/users/{developer_id}"
        success, dev_info = json_request(dev_info_url)
        
        developer_name = "Unknown"
        if success and dev_info:
            developer_name = dev_info.get("name", "Unknown")
        
        logger.info(f"Scanning assets for developer: {developer_name} (ID: {developer_id})")
        
        # Scan developer's inventory for assets
        inventory_url = f"https://inventory.roblox.com/v1/users/{developer_id}/assets/collectibles?limit=100&sortOrder=Asc"
        
        # Use the advanced bypass for this request
        response_data = self.bypass.get(inventory_url)
        
        if response_data:
            try:
                if isinstance(response_data, dict):
                    inventory_data = response_data
                else:
                    # Parse the response if it's not already JSON
                    inventory_data = json.loads(response_data) if isinstance(response_data, str) else None
                
                if inventory_data and "data" in inventory_data:
                    for asset in inventory_data["data"]:
                        # Augment with additional info
                        asset["developer_id"] = developer_id
                        asset["developer_name"] = developer_name
                        asset["source"] = "developer"
                        
                        # Get asset details and thumbnail
                        self.get_asset_details(asset)
                        self.get_asset_thumbnail(asset)
                        
                        assets.append(asset)
            except Exception as e:
                logger.error(f"Error processing inventory data: {e}")
        
        logger.info(f"Found {len(assets)} assets for developer {developer_name}")
        self.assets_found.extend(assets)
        return assets
    
    def scan_group(self, group_id):
        """
        Scan a group's assets using our rate limiting components
        
        Args:
            group_id: The Roblox group ID to scan
            
        Returns:
            List of assets found
        """
        logger.info(f"Scanning group ID {group_id}")
        assets = []
        
        # First, get group name (optional)
        group_info_url = f"https://groups.roblox.com/v1/groups/{group_id}"
        success, group_info = json_request(group_info_url)
        
        group_name = "Unknown"
        if success and group_info:
            group_name = group_info.get("name", "Unknown")
        
        logger.info(f"Scanning assets for group: {group_name} (ID: {group_id})")
        
        # Scan group's inventory for assets
        inventory_url = f"https://inventory.roblox.com/v1/groups/{group_id}/assets?limit=100&sortOrder=Asc"
        
        # Use the improved rate limiter for this request
        success, data, _ = self.rate_limiter.make_request(inventory_url)
        
        if success and data:
            try:
                inventory_data = json.loads(data.decode('utf-8'))
                
                if "data" in inventory_data:
                    for asset in inventory_data["data"]:
                        # Augment with additional info
                        asset["group_id"] = group_id
                        asset["group_name"] = group_name
                        asset["source"] = "group"
                        
                        # Get asset details and thumbnail
                        self.get_asset_details(asset)
                        self.get_asset_thumbnail(asset)
                        
                        assets.append(asset)
            except Exception as e:
                logger.error(f"Error processing inventory data: {e}")
        
        logger.info(f"Found {len(assets)} assets for group {group_name}")
        self.assets_found.extend(assets)
        return assets
    
    def get_asset_details(self, asset):
        """
        Get additional details for an asset
        
        Args:
            asset: The asset to augment with details
        """
        asset_id = asset.get("assetId") or asset.get("id")
        if not asset_id:
            logger.warning("Asset has no ID, skipping details")
            return
        
        # Get asset details
        details_url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
        
        # Alternate between different request methods to avoid patterns
        if random.random() < 0.5:
            # Use basic make_request
            success, response_data, _ = make_request(details_url)
            if success and response_data:
                try:
                    details = json.loads(response_data.decode('utf-8'))
                    # Merge details into asset
                    for key, value in details.items():
                        if key not in asset:
                            asset[key] = value
                except Exception as e:
                    logger.error(f"Error parsing asset details: {e}")
        else:
            # Use RobloxBypass
            response_data = self.bypass.get(details_url)
            if response_data:
                try:
                    if isinstance(response_data, dict):
                        details = response_data
                    else:
                        details = json.loads(response_data) if isinstance(response_data, str) else None
                    
                    if details:
                        # Merge details into asset
                        for key, value in details.items():
                            if key not in asset:
                                asset[key] = value
                except Exception as e:
                    logger.error(f"Error parsing asset details: {e}")
    
    def get_asset_thumbnail(self, asset):
        """
        Get and save thumbnail for an asset
        
        Args:
            asset: The asset to get thumbnail for
        """
        asset_id = asset.get("assetId") or asset.get("id")
        if not asset_id:
            logger.warning("Asset has no ID, skipping thumbnail")
            return
        
        # Get thumbnail URL
        thumbnail_url = f"https://thumbnails.roblox.com/v1/assets?assetIds={asset_id}&size=420x420&format=Png&isCircular=false"
        
        # Use the improved rate limiter
        success, data, _ = self.rate_limiter.make_request(thumbnail_url)
        
        if success and data:
            try:
                thumbnail_data = json.loads(data.decode('utf-8'))
                data_items = thumbnail_data.get('data', [])
                
                if data_items and 'imageUrl' in data_items[0]:
                    image_url = data_items[0]['imageUrl']
                    
                    # Download the actual image
                    success, image_data, _ = make_request(image_url)
                    
                    if success and image_data:
                        # Save to file
                        cache_path = os.path.join(self.cache_dir, f"{asset_id}.png")
                        with open(cache_path, 'wb') as f:
                            f.write(image_data)
                        
                        # Add path to asset
                        asset["thumbnail_path"] = cache_path
                        logger.info(f"Saved thumbnail for asset {asset_id}")
            except Exception as e:
                logger.error(f"Error processing thumbnail: {e}")
    
    def run_test_scan(self):
        """
        Run a test scan of key developers and groups
        
        Returns:
            Dict with scan results
        """
        start_time = time.time()
        self.assets_found = []
        
        # Scan developers
        logger.info(f"Scanning {len(KEY_DEVELOPERS)} developers")
        for dev in KEY_DEVELOPERS:
            dev_assets = self.scan_developer(dev["id"])
            logger.info(f"Developer {dev['name']}: Found {len(dev_assets)} assets")
            
            # Add delay between developers
            delay = random.uniform(5, 10)
            logger.info(f"Waiting {delay:.1f} seconds before next request...")
            time.sleep(delay)
        
        # Scan groups
        logger.info(f"Scanning {len(KEY_GROUPS)} groups")
        for group in KEY_GROUPS:
            group_assets = self.scan_group(group["id"])
            logger.info(f"Group {group['name']}: Found {len(group_assets)} assets")
            
            # Add delay between groups
            delay = random.uniform(5, 10)
            logger.info(f"Waiting {delay:.1f} seconds before next request...")
            time.sleep(delay)
        
        # Calculate elapsed time
        elapsed_time = time.time() - start_time
        
        # Deduplicate assets
        unique_assets = []
        seen_ids = set()
        
        for asset in self.assets_found:
            asset_id = asset.get("assetId") or asset.get("id")
            if asset_id and asset_id not in seen_ids:
                seen_ids.add(asset_id)
                unique_assets.append(asset)
        
        # Sort by creation time (newest first)
        unique_assets.sort(key=lambda x: x.get("created", ""), reverse=True)
        
        # Prepare result summary
        result = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "elapsed_seconds": elapsed_time,
            "total_assets_found": len(self.assets_found),
            "unique_assets_found": len(unique_assets),
            "assets": unique_assets
        }
        
        # Save results to file
        with open("test_scan_results.json", "w") as f:
            json.dump(result, f, indent=2)
        
        return result

def main():
    """Run the integrated scanner test"""
    print("=" * 60)
    print("INTEGRATED SCANNER TEST")
    print("=" * 60)
    print("Testing combined rate limiting and bypass solutions")
    print(f"Caching images to {CACHE_DIR}")
    print("=" * 60)
    
    scanner = IntegratedScanner()
    
    print("Starting test scan...")
    print("=" * 60)
    
    try:
        result = scanner.run_test_scan()
        
        print("=" * 60)
        print(f"Scan completed in {result['elapsed_seconds']:.2f} seconds")
        print(f"Found {result['total_assets_found']} total assets")
        print(f"Found {result['unique_assets_found']} unique assets")
        print(f"Results saved to test_scan_results.json")
        print("=" * 60)
        
        # Display first 5 assets
        if result['assets']:
            print("\nRecent assets found:")
            for idx, asset in enumerate(result['assets'][:5]):
                print(f"{idx+1}. {asset.get('name', 'Unknown')} (ID: {asset.get('assetId', 'Unknown')})")
                print(f"   Created: {asset.get('created', 'Unknown')}")
                if 'thumbnail_path' in asset:
                    print(f"   Thumbnail: {asset['thumbnail_path']}")
                print()
        
        print("=" * 60)
    except Exception as e:
        print(f"Error during test scan: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()