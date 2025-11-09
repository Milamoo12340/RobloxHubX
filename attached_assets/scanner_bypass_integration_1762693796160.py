"""
PS99 Roblox Scanner Bypass Integration

This module integrates the various anti-detection, disguised scanning, and browser
rotation components to create a unified scanner that can effectively bypass 
Roblox's rate limiting and detection systems while searching for upcoming PS99
content, particularly related to the rumored Anubis update.

It provides a simple interface for the main application to use all these enhanced
capabilities without needing to understand the complex implementation details.
"""

import logging
import time
import threading
import os
import json
from datetime import datetime, timedelta

# Import our enhanced modules
from anti_detection import (
    anti_detection_request,
    get_rate_limit_stats,
    reset_rate_limit_stats
)
from enhanced_browser_rotation import (
    get_next_browser,
    get_browser_headers,
    get_pool_stats
)
from roblox_disguised_scanner import (
    perform_disguised_scan,
    short_scan,
    medium_scan,
    thorough_scan,
    background_scan
)
from search_keywords import (
    ANUBIS_KEYWORDS,
    DEVELOPER_TESTING_KEYWORDS,
    DEVELOPER_BLOG_KEYWORDS,
    PS99_VERSION_KEYWORDS,
    PS99_MINING_KEYWORDS,
    PS99_EXCLUSIVE_KEYWORDS,
    ANTI_DETECTION_TERMS,
    ALL_ENHANCED_SEARCH_TERMS
)

# Configure logging
logger = logging.getLogger(__name__)

# Store scan results
RESULTS_PATH = "scan_results"
if not os.path.exists(RESULTS_PATH):
    os.makedirs(RESULTS_PATH)

class ScannerBypassManager:
    """
    Manages all the different scanning techniques and anti-detection
    measures in a unified interface
    """
    
    def __init__(self):
        """Initialize the scanner bypass manager"""
        self.scheduled_scan_thread = None
        self.is_scanning = False
        self.last_scan_time = None
        self.last_scan_results = None
        self.scan_interval_hours = 24  # Default scan interval
        self.assets_discovered = {}
        self.start_time = datetime.now()
        
        # Create lock for thread safety
        self.lock = threading.Lock()
    
    def start_background_scanner(self, scan_interval_hours=24):
        """
        Start a background scanner thread that runs at specified intervals
        
        Args:
            scan_interval_hours: Hours between scans
        """
        if self.scheduled_scan_thread and self.scheduled_scan_thread.is_alive():
            logger.warning("Background scanner is already running")
            return False
        
        self.scan_interval_hours = scan_interval_hours
        
        def scheduled_scanner():
            logger.info(f"Starting scheduled scanner thread with {scan_interval_hours} hour interval")
            
            while True:
                try:
                    # Run a thorough scan
                    self.is_scanning = True
                    logger.info("Running scheduled thorough scan")
                    
                    # Use our disguised scanner for enhanced bypass
                    results = thorough_scan()
                    
                    # Process and save results
                    with self.lock:
                        self.last_scan_time = datetime.now()
                        self.last_scan_results = results
                        self._process_scan_results(results)
                    
                    self.is_scanning = False
                    
                    # Save results to disk
                    self._save_scan_results(results)
                    
                    # Sleep until next scan
                    logger.info(f"Scan complete. Next scan in {scan_interval_hours} hours")
                    time.sleep(scan_interval_hours * 3600)
                    
                except Exception as e:
                    logger.error(f"Error in background scanner thread: {e}")
                    self.is_scanning = False
                    time.sleep(3600)  # Sleep for an hour before retry on error
        
        # Start the thread
        self.scheduled_scan_thread = threading.Thread(target=scheduled_scanner, daemon=True)
        self.scheduled_scan_thread.start()
        
        return True
    
    def run_quick_scan(self):
        """
        Run a quick scan for immediate results
        
        Returns:
            Dictionary with scan results
        """
        if self.is_scanning:
            logger.warning("A scan is already in progress")
            return {"error": "Scan already in progress"}
        
        try:
            self.is_scanning = True
            logger.info("Running quick scan")
            
            # Use short scan for a quick check
            results = short_scan()
            
            # Process and save results
            with self.lock:
                self.last_scan_time = datetime.now()
                self.last_scan_results = results
                self._process_scan_results(results)
            
            # Save results to disk
            self._save_scan_results(results)
            
            self.is_scanning = False
            return results
        
        except Exception as e:
            logger.error(f"Error in quick scan: {e}")
            self.is_scanning = False
            return {"error": str(e)}
    
    def run_targeted_keyword_scan(self, keywords=None, duration_minutes=5):
        """
        Run a scan targeting specific keywords
        
        Args:
            keywords: List of specific keywords to target (defaults to Anubis keywords)
            duration_minutes: How long to scan
            
        Returns:
            Dictionary with scan results
        """
        if self.is_scanning:
            logger.warning("A scan is already in progress")
            return {"error": "Scan already in progress"}
        
        if keywords is None:
            # Default to Anubis + Developer Testing keywords for targeted scan
            keywords = ANUBIS_KEYWORDS + DEVELOPER_TESTING_KEYWORDS
        
        try:
            self.is_scanning = True
            logger.info(f"Running targeted keyword scan for: {', '.join(keywords[:5])}...")
            
            # Use disguised scanning with customized duration
            results = perform_disguised_scan(
                duration_minutes=duration_minutes,
                target_focused=True
            )
            
            # Process and save results
            with self.lock:
                self.last_scan_time = datetime.now()
                self.last_scan_results = results
                self._process_scan_results(results)
            
            # Focus on assets matching our keywords
            filtered_assets = []
            for asset in results["assets_found"]:
                # Check if any of the targeted keywords are in this asset
                matched_keywords = []
                for keyword in keywords:
                    keyword_lower = keyword.lower()
                    if (keyword_lower in asset["name"].lower() or
                        keyword_lower in asset["description"].lower()):
                        matched_keywords.append(keyword)
                
                if matched_keywords:
                    asset["matched_keywords"] = matched_keywords
                    filtered_assets.append(asset)
            
            # Add filtered assets to results
            results["filtered_assets"] = filtered_assets
            results["filtered_count"] = len(filtered_assets)
            
            # Save results to disk
            self._save_scan_results(results, suffix="targeted")
            
            self.is_scanning = False
            return results
        
        except Exception as e:
            logger.error(f"Error in targeted keyword scan: {e}")
            self.is_scanning = False
            return {"error": str(e)}
    
    def search_specific_assets(self, asset_ids):
        """
        Search for specific asset IDs with enhanced anti-detection
        
        Args:
            asset_ids: List of asset IDs to search for
            
        Returns:
            Dictionary with asset details
        """
        results = {
            "assets": [],
            "errors": [],
            "success_count": 0,
            "error_count": 0
        }
        
        import random
        
        for asset_id in asset_ids:
            try:
                # Get a browser with enhanced anti-detection
                browser = get_next_browser()
                headers = get_browser_headers(browser)
                
                # Construct URL for asset
                asset_url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
                
                # Make request with anti-detection
                response_text = anti_detection_request(asset_url)
                
                if response_text:
                    # Parse the response
                    try:
                        asset_data = json.loads(response_text)
                        
                        # Check if asset is related to our search terms
                        asset_name = asset_data.get("Name", "").lower()
                        asset_desc = asset_data.get("Description", "").lower()
                        
                        # Check for each category of keywords
                        anubis_matches = []
                        testing_matches = []
                        version_matches = []
                        mining_matches = []
                        exclusive_matches = []
                        
                        for keyword in ANUBIS_KEYWORDS:
                            if keyword.lower() in asset_name or keyword.lower() in asset_desc:
                                anubis_matches.append(keyword)
                        
                        for keyword in DEVELOPER_TESTING_KEYWORDS:
                            if keyword.lower() in asset_name or keyword.lower() in asset_desc:
                                testing_matches.append(keyword)
                        
                        for keyword in PS99_VERSION_KEYWORDS:
                            if keyword.lower() in asset_name or keyword.lower() in asset_desc:
                                version_matches.append(keyword)
                        
                        for keyword in PS99_MINING_KEYWORDS:
                            if keyword.lower() in asset_name or keyword.lower() in asset_desc:
                                mining_matches.append(keyword)
                        
                        for keyword in PS99_EXCLUSIVE_KEYWORDS:
                            if keyword.lower() in asset_name or keyword.lower() in asset_desc:
                                exclusive_matches.append(keyword)
                        
                        # Add keyword matches to asset data
                        asset_data["anubis_matches"] = anubis_matches
                        asset_data["testing_matches"] = testing_matches
                        asset_data["version_matches"] = version_matches
                        asset_data["mining_matches"] = mining_matches
                        asset_data["exclusive_matches"] = exclusive_matches
                        
                        # Determine if this is a significant asset
                        is_significant = (
                            len(anubis_matches) > 0 or
                            len(testing_matches) > 0 or
                            len(version_matches) > 0 or
                            len(mining_matches) > 0 or
                            len(exclusive_matches) > 0
                        )
                        
                        asset_data["is_significant"] = is_significant
                        
                        # Add asset to results
                        results["assets"].append(asset_data)
                        results["success_count"] += 1
                        
                        # Log significant assets
                        if is_significant:
                            if anubis_matches:
                                logger.info(f"★★★ ANUBIS UPDATE ASSET: {asset_data.get('Name')} (ID: {asset_id}) ★★★")
                            elif testing_matches:
                                logger.info(f"★★ DEVELOPER TESTING ASSET: {asset_data.get('Name')} (ID: {asset_id}) ★★")
                            else:
                                logger.info(f"★ SIGNIFICANT ASSET: {asset_data.get('Name')} (ID: {asset_id}) ★")
                    
                    except json.JSONDecodeError:
                        results["errors"].append({
                            "asset_id": asset_id,
                            "error": "Invalid JSON response"
                        })
                        results["error_count"] += 1
                else:
                    results["errors"].append({
                        "asset_id": asset_id,
                        "error": "Failed to retrieve asset data"
                    })
                    results["error_count"] += 1
                
                # Add delay between requests to avoid detection
                time.sleep(random.uniform(2, 5))
                
            except Exception as e:
                logger.error(f"Error searching for asset {asset_id}: {e}")
                results["errors"].append({
                    "asset_id": asset_id,
                    "error": str(e)
                })
                results["error_count"] += 1
                time.sleep(5)  # Longer delay after error
        
        return results
    
    def get_scan_stats(self):
        """
        Get statistics about scanning activities
        
        Returns:
            Dictionary with scan statistics
        """
        with self.lock:
            return {
                "scan_status": "in_progress" if self.is_scanning else "idle",
                "last_scan_time": self.last_scan_time.isoformat() if self.last_scan_time else None,
                "scan_interval_hours": self.scan_interval_hours,
                "uptime_hours": (datetime.now() - self.start_time).total_seconds() / 3600,
                "total_assets_discovered": len(self.assets_discovered),
                "browser_stats": get_pool_stats(),
                "rate_limit_stats": get_rate_limit_stats(),
                "next_scheduled_scan": (self.last_scan_time + timedelta(hours=self.scan_interval_hours)).isoformat() if self.last_scan_time else None
            }
    
    def _process_scan_results(self, results):
        """
        Process scan results and update internal state
        
        Args:
            results: Scan results dictionary
        """
        # Add assets to discovered assets dict
        for asset in results.get("assets_found", []):
            asset_id = asset.get("id")
            if asset_id:
                self.assets_discovered[asset_id] = asset
    
    def _save_scan_results(self, results, suffix=""):
        """
        Save scan results to disk
        
        Args:
            results: Scan results dictionary
            suffix: Optional suffix for filename
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"scan_results_{timestamp}"
            if suffix:
                filename += f"_{suffix}"
            filename += ".json"
            
            filepath = os.path.join(RESULTS_PATH, filename)
            
            with open(filepath, "w") as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"Saved scan results to {filepath}")
        
        except Exception as e:
            logger.error(f"Error saving scan results: {e}")
    
    def get_recent_discoveries(self, limit=50):
        """
        Get recent asset discoveries
        
        Args:
            limit: Maximum number of assets to return
            
        Returns:
            List of recently discovered assets
        """
        with self.lock:
            # Convert to list and sort by found_time (newest first)
            assets_list = list(self.assets_discovered.values())
            
            # Try to sort by found_time if available
            try:
                assets_list.sort(key=lambda x: x.get("found_time", ""), reverse=True)
            except:
                pass  # If sorting fails, keep original order
            
            return assets_list[:limit]
    
    def reset_stats(self):
        """Reset scanning statistics"""
        with self.lock:
            reset_rate_limit_stats()
            return {"status": "success", "message": "Statistics reset successful"}

# Create global scanner bypass manager
scanner_bypass_manager = ScannerBypassManager()

# Convenience functions for the main application
def start_background_scanner(interval_hours=24):
    """Start the background scanner"""
    return scanner_bypass_manager.start_background_scanner(interval_hours)

def run_quick_scan():
    """Run a quick scan"""
    return scanner_bypass_manager.run_quick_scan()

def search_for_anubis():
    """Run a targeted scan for Anubis update content"""
    return scanner_bypass_manager.run_targeted_keyword_scan(keywords=ANUBIS_KEYWORDS)

def search_for_developer_testing():
    """Run a targeted scan for developer testing grounds"""
    return scanner_bypass_manager.run_targeted_keyword_scan(keywords=DEVELOPER_TESTING_KEYWORDS)

def check_specific_assets(asset_ids):
    """Check specific asset IDs"""
    return scanner_bypass_manager.search_specific_assets(asset_ids)

def get_scan_stats():
    """Get scanning statistics"""
    return scanner_bypass_manager.get_scan_stats()

def get_recent_discoveries(limit=50):
    """Get recently discovered assets"""
    return scanner_bypass_manager.get_recent_discoveries(limit)

def reset_stats():
    """Reset scanning statistics"""
    return scanner_bypass_manager.reset_stats()