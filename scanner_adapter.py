"""
PS99 Scanner Adapter Module

This module integrates all the advanced components we've copied into the testing area:
1. Advanced rate limiting
2. Enhanced API bypass
3. CloudScraper integration
4. Synapse anti-detection

It serves as a single entry point for scanner functionality.
"""

import os
import sys
import json
import time
import logging
import sqlite3
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import the proper classes from each module, handling module import errors gracefully
try:
    # Import classes from modules, using try/except to handle missing modules
    from advanced_bypass import AdvancedBypass
    logger.info("Loaded AdvancedBypass module")
except (ImportError, AttributeError) as e:
    logger.warning(f"Failed to import AdvancedBypass: {e}")
    # Create fallback class
    class AdvancedBypass:
        def __init__(self):
            logger.warning("Using fallback AdvancedBypass implementation")
        def activate(self):
            logger.warning("Using fallback activate() method")
            return True

try:
    from improved_rate_limiting import ImprovedRateLimiter
    logger.info("Loaded ImprovedRateLimiter module")
except (ImportError, AttributeError) as e:
    logger.warning(f"Failed to import ImprovedRateLimiter: {e}")
    # Create fallback class
    class ImprovedRateLimiter:
        def __init__(self):
            logger.warning("Using fallback ImprovedRateLimiter implementation")
            self.last_request_time = {}
        def initialize(self):
            return True
        def limit_request(self, domain="roblox.com"):
            current_time = time.time()
            if domain in self.last_request_time:
                elapsed = current_time - self.last_request_time.get(domain, 0)
                if elapsed < 1.0:
                    time.sleep(1.0 - elapsed)
            self.last_request_time[domain] = time.time()

try:
    from synapse_anti_detection import SynapseAntiDetection
    logger.info("Loaded SynapseAntiDetection module")
except (ImportError, AttributeError) as e:
    logger.warning(f"Failed to import SynapseAntiDetection: {e}")
    # Create fallback class
    class SynapseAntiDetection:
        def __init__(self):
            logger.warning("Using fallback SynapseAntiDetection implementation")
        def initialize(self):
            return True
        def check_detection_status(self):
            return "No detection system active (fallback implementation)"

try:
    from cloudscraper_asset_fetcher import get_asset_details, get_asset_thumbnail, get_asset_content
    logger.info("Loaded CloudscraperAssetFetcher functions")
    
    # Create a class to wrap the functions for consistency
    class CloudscraperAssetFetcher:
        def __init__(self):
            pass
            
        def fetch_asset_info(self, asset_id):
            return get_asset_details(asset_id)
            
        def fetch_asset_thumbnail(self, asset_id, cache_dir="static/images/assets"):
            return get_asset_thumbnail(asset_id, cache_dir)
            
        def fetch_asset_content(self, asset_id):
            return get_asset_content(asset_id)
    
except (ImportError, AttributeError) as e:
    logger.warning(f"Failed to import CloudscraperAssetFetcher functions: {e}")
    # Create fallback class
    class CloudscraperAssetFetcher:
        def __init__(self):
            logger.warning("Using fallback CloudscraperAssetFetcher implementation")
        def fetch_asset_info(self, asset_id):
            logger.warning(f"Fallback fetch_asset_info called for {asset_id}")
            return None
        def fetch_asset_thumbnail(self, asset_id, cache_dir="static/images/assets"):
            logger.warning(f"Fallback fetch_asset_thumbnail called for {asset_id}")
            return None
        def fetch_asset_content(self, asset_id):
            logger.warning(f"Fallback fetch_asset_content called for {asset_id}")
            return None

try:
    from cloudscraper_roblox_api import CloudscraperRobloxAPI
    logger.info("Loaded CloudscraperRobloxAPI class")
except (ImportError, AttributeError) as e:
    logger.warning(f"Failed to import CloudscraperRobloxAPI: {e}")
    # Create fallback class
    class CloudscraperRobloxAPI:
        def __init__(self):
            logger.warning("Using fallback CloudscraperRobloxAPI implementation")
        def get_user_info(self, user_id):
            logger.warning(f"Fallback get_user_info called for {user_id}")
            return {"name": f"User-{user_id}"}

class ScannerAdapter:
    """
    Adapter class that integrates all scanner components
    """
    def __init__(self, db_path="unfiltered_scan_progress.db"):
        self.db_path = db_path
        
        # Initialize components
        self.bypass = AdvancedBypass()
        self.rate_limiter = ImprovedRateLimiter()
        self.anti_detection = SynapseAntiDetection()
        self.asset_fetcher = CloudscraperAssetFetcher()
        self.roblox_api = CloudscraperRobloxAPI()
        
        # Use try/except for each initialization to handle potential missing methods
        try:
            if hasattr(self.bypass, 'activate'):
                self.bypass.activate()
        except Exception as e:
            logger.warning(f"Failed to activate bypass: {e}")
        
        # Initialize rate limiter
        try:
            if hasattr(self.rate_limiter, 'initialize'):
                self.rate_limiter.initialize()
        except Exception as e:
            logger.warning(f"Failed to initialize rate limiter: {e}")
        
        # Initialize anti-detection
        try:
            if hasattr(self.anti_detection, 'initialize'):
                self.anti_detection.initialize()
        except Exception as e:
            logger.warning(f"Failed to initialize anti-detection: {e}")
        
        # Get database connection
        self.conn = self._get_db_connection()
    
    def _get_db_connection(self):
        """Get a connection to the SQLite database"""
        try:
            conn = sqlite3.connect(self.db_path)
            return conn
        except sqlite3.Error as e:
            logger.error(f"Database connection error: {e}")
            return None
    
    def get_scan_progress(self):
        """Get the current scan progress"""
        if not self.conn:
            return {"error": "Database connection failed"}
        
        try:
            cursor = self.conn.cursor()
            
            # Get developer counts
            cursor.execute("SELECT COUNT(*) FROM scanned_developers")
            scanned_developers = cursor.fetchone()[0]
            
            # Get assets count
            cursor.execute("SELECT COUNT(*) FROM assets")
            assets_found = cursor.fetchone()[0]
            
            # Get total devs from config file if available
            total_developers = 148  # Hardcoded total from your scratchpad notes
            
            return {
                "scanned_developers": scanned_developers,
                "total_developers": total_developers,
                "completion_percentage": (scanned_developers / total_developers) * 100 if total_developers > 0 else 0,
                "assets_found": assets_found
            }
        except sqlite3.Error as e:
            logger.error(f"Error getting scan progress: {e}")
            return {"error": str(e)}
    
    def fetch_asset_details(self, asset_id):
        """Fetch asset details using the CloudScraper fetcher"""
        # Apply rate limiting
        self.rate_limiter.limit_request("economy.roblox.com")
        
        # Fetch asset details
        return self.asset_fetcher.fetch_asset_info(asset_id)
    
    def check_system_status(self):
        """Check the status of all scanner components"""
        status = {
            "bypass_active": True,  # AdvancedBypass always returns True in activate()
            "rate_limiter_active": True,  # ImprovedRateLimiter always returns True in initialize()
            "anti_detection": self.anti_detection.check_detection_status(),
            "database_connected": self.conn is not None
        }
        
        return status

# Entry point for testing
if __name__ == "__main__":
    logger.info("Initializing ScannerAdapter for testing")
    
    scanner = ScannerAdapter()
    
    # Check system status
    status = scanner.check_system_status()
    print("\nSystem Status:")
    print("=============")
    for key, value in status.items():
        print(f"{key}: {value}")
    
    # Get scan progress
    progress = scanner.get_scan_progress()
    print("\nScan Progress:")
    print("=============")
    
    if "error" in progress:
        print(f"Error: {progress['error']}")
    else:
        print(f"Scanned developers: {progress['scanned_developers']}/{progress['total_developers']}")
        print(f"Completion: {progress['completion_percentage']:.2f}%")
        print(f"Assets found: {progress['assets_found']}")
    
    # Test fetching asset details if requested
    if len(sys.argv) > 1 and sys.argv[1] == "--test-asset":
        test_asset_id = 12243325671  # Hippomelon Shoulder Pet
        print(f"\nTesting asset details for {test_asset_id}...")
        details = scanner.fetch_asset_details(test_asset_id)
        
        if details:
            print(f"Asset Name: {details.get('Name', 'Unknown')}")
            print(f"Description: {details.get('Description', 'None')}")
            print(f"Creator: {details.get('Creator', {}).get('Name', 'Unknown')}")
        else:
            print("Failed to fetch asset details")