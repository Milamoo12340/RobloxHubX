# Current Scanner Analysis
## Searching for developer IDs in current scanner
Results from searching for developer IDs:
../PS99_Leak_Detector_Ultra/app.py:DEVELOPER_IDS = [
../PS99_Leak_Detector_Ultra/app.py:        developer_ids=DEVELOPER_IDS,
../PS99_Leak_Detector_Ultra/view_leaks.py:DEVELOPER_IDS = [
../PS99_Leak_Detector_Ultra/view_leaks.py:    for dev_id in DEVELOPER_IDS:
../PS99_Leak_Detector_Ultra/display_assets.py:DEVELOPER_IDS = [
../PS99_Leak_Detector_Ultra/display_assets.py:    for dev_id in DEVELOPER_IDS:
## Searching for group IDs in current scanner
../PS99_Leak_Detector_Ultra/app.py:GROUP_IDS = [
../PS99_Leak_Detector_Ultra/app.py:        group_ids=GROUP_IDS,
## Searching for game IDs in current scanner
../PS99_Leak_Detector_Ultra/app.py:GAME_IDS = [
../PS99_Leak_Detector_Ultra/app.py:        game_ids=GAME_IDS
## Logs from scanner showing potential assets
## Developer IDs in comprehensive_roblox_scanner.py
    DEVELOPER_IDS, GROUP_IDS, GAME_IDS, STUDIO_SOURCES, 
    ASSET_TYPES, PS99_KEYWORDS, SCAN_INTERVAL, HISTORY_DAYS,
    RESULTS_PER_PAGE, THUMBNAIL_CACHE_DIR, NOTIFICATION_SOUND,
    ENABLE_DESKTOP_NOTIFICATIONS, ENABLE_SOUND_NOTIFICATIONS,
    ENABLE_VISUAL_HIGHLIGHTS, ENABLE_AUTO_CATEGORIZATION,
    CATEGORIZATION_RULES, DEFAULT_SETTINGS, USE_WEB_DOMAIN_FALLBACK
)

# Import enhanced search keywords for Anubis update and developer blogs
from search_keywords import (
    ANUBIS_KEYWORDS, DEVELOPER_TESTING_KEYWORDS, DEVELOPER_BLOG_KEYWORDS,
    ALL_ENHANCED_SEARCH_TERMS
)

# This function has been moved to main.py for better integration

class ComprehensiveRobloxScanner:
    """
    Advanced scanner for monitoring Roblox assets across multiple sources
    with real-time updates and history tracking.
    """
    
    def __init__(self, cache_dir=THUMBNAIL_CACHE_DIR, 
                 database_path="ps99_assets.db",
                 settings=None):
        """
        Initialize the scanner with the specified cache directory and database.
        
        Args:
            cache_dir: Directory to store downloaded thumbnails
            database_path: Path to the SQLite database for asset history
--
                                if developer_id in DEVELOPER_IDS:
                                    is_ps99_related = True
                                
                                if is_ps99_related:
                                    assets.append({
                                        'id': str(asset_id),
                                        'name': asset_data.get('Name', 'Unnamed Asset'),
                                        'description': asset_data.get('Description', ''),
## Group IDs in comprehensive_roblox_scanner.py
    DEVELOPER_IDS, GROUP_IDS, GAME_IDS, STUDIO_SOURCES, 
    ASSET_TYPES, PS99_KEYWORDS, SCAN_INTERVAL, HISTORY_DAYS,
    RESULTS_PER_PAGE, THUMBNAIL_CACHE_DIR, NOTIFICATION_SOUND,
    ENABLE_DESKTOP_NOTIFICATIONS, ENABLE_SOUND_NOTIFICATIONS,
    ENABLE_VISUAL_HIGHLIGHTS, ENABLE_AUTO_CATEGORIZATION,
    CATEGORIZATION_RULES, DEFAULT_SETTINGS, USE_WEB_DOMAIN_FALLBACK
)

# Import enhanced search keywords for Anubis update and developer blogs
from search_keywords import (
    ANUBIS_KEYWORDS, DEVELOPER_TESTING_KEYWORDS, DEVELOPER_BLOG_KEYWORDS,
    ALL_ENHANCED_SEARCH_TERMS
)

# This function has been moved to main.py for better integration

class ComprehensiveRobloxScanner:
    """
    Advanced scanner for monitoring Roblox assets across multiple sources
    with real-time updates and history tracking.
    """
--
                                if group_id in GROUP_IDS:
                                    is_ps99_related = True
                                
## Game IDs in comprehensive_roblox_scanner.py
    DEVELOPER_IDS, GROUP_IDS, GAME_IDS, STUDIO_SOURCES, 
    ASSET_TYPES, PS99_KEYWORDS, SCAN_INTERVAL, HISTORY_DAYS,
    RESULTS_PER_PAGE, THUMBNAIL_CACHE_DIR, NOTIFICATION_SOUND,
    ENABLE_DESKTOP_NOTIFICATIONS, ENABLE_SOUND_NOTIFICATIONS,
    ENABLE_VISUAL_HIGHLIGHTS, ENABLE_AUTO_CATEGORIZATION,
    CATEGORIZATION_RULES, DEFAULT_SETTINGS, USE_WEB_DOMAIN_FALLBACK
)

# Import enhanced search keywords for Anubis update and developer blogs
from search_keywords import (
    ANUBIS_KEYWORDS, DEVELOPER_TESTING_KEYWORDS, DEVELOPER_BLOG_KEYWORDS,
    ALL_ENHANCED_SEARCH_TERMS
)

# This function has been moved to main.py for better integration

class ComprehensiveRobloxScanner:
    """
    Advanced scanner for monitoring Roblox assets across multiple sources
    with real-time updates and history tracking.
    """
--
        logger.info(f"SCANNING: Number of games to scan: {len(GAME_IDS)}")
        logger.info(f"SCANNING: Game IDs: {GAME_IDS}")
        # Try to get additional developer IDs from web domain fallback if enabled
