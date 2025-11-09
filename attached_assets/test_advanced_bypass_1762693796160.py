#!/usr/bin/env python3
"""
Test Advanced Bypass Solution

This script tests the advanced bypass solution we found in the Enhanced_Anti_Detection_Methods
folder, which contains a sophisticated implementation to bypass Roblox rate limiting.
"""

import os
import json
import time
import logging
from advanced_bypass import RobloxBypass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_advanced_bypass():
    """Test the advanced bypass solution with a few key requests"""
    print("="*60)
    print("TESTING ADVANCED BYPASS SOLUTION")
    print("="*60)
    print("Using the RobloxBypass class from Enhanced_Anti_Detection_Methods")
    
    # Initialize the RobloxBypass
    bypass = RobloxBypass()
    
    # Create output directory
    os.makedirs("test_results", exist_ok=True)
    
    # Test URLs
    test_urls = [
        # User info
        "https://users.roblox.com/v1/users/13365322",  # ChickenEngineer/Preston
        
        # Asset info
        "https://economy.roblox.com/v2/assets/11330799010/details",  # Random PS99 asset
        
        # Thumbnail
        "https://thumbnails.roblox.com/v1/assets?assetIds=11330799010&size=420x420&format=Png&isCircular=false"
    ]
    
    print(f"Testing {len(test_urls)} endpoints with the advanced bypass solution")
    
    # Record start time
    start_time = time.time()
    
    # Process each URL
    results = []
    for i, url in enumerate(test_urls, 1):
        print(f"\nTesting URL {i}/{len(test_urls)}: {url}")
        result = bypass.get(url)
        
        if result:
            status = "SUCCESS"
            results.append({
                "url": url,
                "status": status,
                "data": result if isinstance(result, dict) else {"text": result[:200] + "..." if len(result) > 200 else result}
            })
        else:
            status = "FAILED"
            results.append({
                "url": url,
                "status": status,
                "data": None
            })
            
        print(f"Result: {status}")
    
    # Calculate total time
    total_time = time.time() - start_time
    
    # Get stats
    stats = bypass.get_stats()
    
    # Save results to file
    output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_time_seconds": total_time,
        "stats": stats,
        "results": results
    }
    
    with open("test_results/advanced_bypass_results.json", "w") as f:
        json.dump(output, f, indent=2)
    
    # Print summary
    print("\n" + "="*60)
    print("TEST COMPLETED")
    print("="*60)
    print(f"Total time: {total_time:.2f} seconds")
    print(f"Success rate: {stats['success_rate']}")
    print(f"Results saved to: test_results/advanced_bypass_results.json")
    print("="*60)

if __name__ == "__main__":
    test_advanced_bypass()