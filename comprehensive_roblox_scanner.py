"""
Comprehensive Roblox Asset Scanner for PS99 Developer Tracker

This module contains the implementation of an advanced Roblox asset scanner that
monitors a variety of sources for new PS99-related content, including:
- Developer profiles (Preston/ChickenEngineer and other BIG Games developers)
- BIG Games community/group assets
- Game assets from PS99 and test places
- Roblox Creator Hub and Studio/Marketplace assets
- Custom sources added by users
- Developer blogs and testing grounds for upcoming updates
- Internet searches for leaked content and developer information
- Special monitoring for rumored "Anubis" update content

The scanner supports:
- Real-time asset detection with automatic thumbnail downloading
- 4-day history of all discovered assets
- Automatic asset categorization
- Background scanning thread that runs daily to avoid rate limiting
- Desktop and sound notifications for new assets
- Visual highlighting for newly discovered content
- Enhanced discovery of hidden developer testing areas
"""

import os
import re
import json
import time
import uuid
import logging

# Import web domain integration for fallback
from web_domain_integration import web_domain_client
import threading
import datetime
import urllib.parse
import urllib.request
from urllib.error import HTTPError
import ssl
import sqlite3
import base64
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional, Set, Tuple, Any, Union

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import scanner configuration
from enhanced_scanner_config import (
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
            settings: Optional custom settings to override defaults
        """
        self.cache_dir = cache_dir
        self.database_path = database_path
        self.settings = settings or DEFAULT_SETTINGS
        self.last_scan_time = {}
        self.scan_history = {}
        self.new_assets_since_notification = 0
        self.lock = threading.Lock()
        
        # Create cache directory if it doesn't exist
        os.makedirs(cache_dir, exist_ok=True)
        
        # Initialize database
        self._init_database()
        
        # Load cached assets if available
        self._load_cached_assets()
        
        logger.info(f"RobloxAssetScanner initialized with cache dir: {cache_dir}")
    
    def _init_database(self):
        """Initialize the SQLite database for asset history tracking"""
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        # Create assets table if it doesn't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            asset_type TEXT,
            creator_id TEXT,
            creator_name TEXT,
            source_type TEXT,
            source_id TEXT,
            source_name TEXT,
            timestamp TIMESTAMP,
            thumbnail_path TEXT,
            category TEXT,
            is_new INTEGER DEFAULT 1
        )
        ''')
        
        # Create settings table if it doesn't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
        ''')
        
        # Create custom sources table if it doesn't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS custom_sources (
            id TEXT PRIMARY KEY,
            type TEXT,
            value TEXT,
            name TEXT,
            enabled INTEGER DEFAULT 1
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def _load_cached_assets(self):
        """Load cached assets from the database for quick access"""
        self.cached_assets = {}
        
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        # Get all assets
        cursor.execute('SELECT id, name, description, asset_type, creator_name, timestamp, thumbnail_path, source_type, category, is_new FROM assets')
        rows = cursor.fetchall()
        
        for row in cursor.fetchall():
            asset_id, name, description, asset_type, creator_name, timestamp, thumbnail_path, source_type, category, is_new = row
            self.cached_assets[asset_id] = {
                'id': asset_id,
                'name': name,
                'description': description,
                'type': asset_type,
                'creator_name': creator_name,
                'timestamp': timestamp,
                'image_url': thumbnail_path if thumbnail_path else None,
                'source': source_type,
                'category': category,
                'is_new': bool(is_new)
            }
        
        conn.close()
    
    def _clear_old_assets(self):
        """Remove assets older than the configured history days"""
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=HISTORY_DAYS)
        
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        # Delete old assets
        cursor.execute('DELETE FROM assets WHERE timestamp < ?', (cutoff_date.isoformat(),))
        
        # Commit changes
        conn.commit()
        conn.close()
        
        # Update cached assets
        self._load_cached_assets()
    
    def _download_asset_thumbnail(self, asset_id):
        """
        Download an asset's thumbnail and save it to the cache directory.
        
        Args:
            asset_id: The Roblox asset ID
            
        Returns:
            Path to the cached thumbnail file or None if download failed
        """
        thumbnail_url = f"https://thumbnails.roblox.com/v1/assets?assetIds={asset_id}&size=420x420&format=Png&isCircular=false"
        
        # Create a context that ignores SSL certificate errors
        context = ssl._create_unverified_context()
        
        try:
            # Get thumbnail data URL
            with urllib.request.urlopen(thumbnail_url, context=context) as response:
                data = json.loads(response.read().decode())
                data_items = data.get('data', [])
                if data_items and 'imageUrl' in data_items[0]:
                    image_url = data_items[0]['imageUrl']
                    
                    # Download the actual image
                    cache_path = os.path.join(self.cache_dir, f"{asset_id}.png")
                    with urllib.request.urlopen(image_url, context=context) as img_response:
                        with open(cache_path, 'wb') as f:
                            f.write(img_response.read())
                    
                    logger.info(f"Downloaded thumbnail for asset {asset_id}")
                    return cache_path
                else:
                    return None
                    
        except Exception as e:
            logger.error(f"Error downloading thumbnail for asset {asset_id}: {e}")
            return None
    
    def _categorize_asset(self, asset_name, asset_description):
        """
        Automatically categorize an asset based on its name and description.
        
        Args:
            asset_name: The name of the asset
            asset_description: The description of the asset
            
        Returns:
            The determined category or "Other" if no match
        """
        if not ENABLE_AUTO_CATEGORIZATION:
            return "Uncategorized"
        
        text = (asset_name + " " + (asset_description or "")).lower()
        
        for category, keywords in CATEGORIZATION_RULES.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    return category
        
        return "Other"
    
    def scan_keywords(self, keywords, search_type="assets"):
        """
        Search for assets matching specific keywords.
        
        Args:
            keywords: List of keywords to search for
            search_type: Type of search to perform (assets, games, plugins, etc.)
            
        Returns:
            List of matching items found
        """
        assets = []
        
        # Create a context that ignores SSL certificate errors
        context = ssl._create_unverified_context()
        
        # Search for each keyword
        for keyword in keywords:
            try:
                # Add delay between requests to avoid rate limiting
                time.sleep(2)
                
                # Different endpoints based on search type
                if search_type == "assets":
                    search_url = f"https://catalog.roblox.com/v1/search/items?category=All&keyword={urllib.parse.quote_plus(keyword)}&limit=120"
                elif search_type == "games":
                    search_url = f"https://games.roblox.com/v1/games/list?keyword={urllib.parse.quote_plus(keyword)}&maxRows=50"
                elif search_type == "plugins":
                    search_url = f"https://create.roblox.com/marketplace/api/search/plugins?keyword={urllib.parse.quote_plus(keyword)}&limit=50"
                else:
                    search_url = f"https://catalog.roblox.com/v1/search/items?category=All&keyword={urllib.parse.quote_plus(keyword)}&limit=50"
                
                logger.info(f"Searching for keyword: {keyword}")
                
                max_retries = 3
                retry_count = 0
                while retry_count < max_retries:
                    try:
                        with urllib.request.urlopen(search_url, context=context) as response:
                            data = json.loads(response.read().decode())
                            items = data.get('data', [])
                            
                            for item in items:
                                asset_id = item.get('id')
                                if asset_id:
                                    # Get detailed asset info
                                    asset_url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
                                    try:
                                        # Add delay to avoid rate limiting
                                        time.sleep(1)
                                        
                                        with urllib.request.urlopen(asset_url, context=context) as asset_response:
                                            asset_data = json.loads(asset_response.read().decode())
                                            
                                            # Always include items specifically from our enhanced keyword searches
                                            assets.append({
                                                'id': str(asset_id),
                                                'name': asset_data.get('Name', 'Unnamed Asset'),
                                                'description': asset_data.get('Description', ''),
                                                'type': asset_data.get('AssetType', 'Unknown'),
                                                'creator_id': str(asset_data.get('Creator', {}).get('Id', 0)),
                                                'creator_name': asset_data.get('Creator', {}).get('Name', 'Unknown Creator'),
                                                'source_type': 'keyword_search',
                                                'source_id': 'keyword_' + keyword,
                                                'source_name': f'Keyword Search: {keyword}'
                                            })
                                            
                                            # If we find an Anubis-related item, log it with special emphasis
                                            if keyword in ANUBIS_KEYWORDS:
                                                logger.info(f"★★★ POTENTIAL ANUBIS UPDATE ASSET FOUND: {asset_data.get('Name', 'Unnamed')} ★★★")
                                            elif keyword in DEVELOPER_TESTING_KEYWORDS:
                                                logger.info(f"★★ POTENTIAL DEVELOPER TESTING AREA FOUND: {asset_data.get('Name', 'Unnamed')} ★★")
                                            elif keyword in DEVELOPER_BLOG_KEYWORDS:
                                                logger.info(f"★★ POTENTIAL DEVELOPER BLOG POST FOUND: {asset_data.get('Name', 'Unnamed')} ★★")
                                            
                                    except Exception as e:
                                        logger.error(f"Error getting asset details for {asset_id}: {e}")
                            
                            # If we've made it this far, break out of retry loop
                            break
                            
                    except HTTPError as e:
                        if e.code == 429:  # Rate limited
                            wait_time = 5
                            if retry_count > 0:
                                wait_time = 10
                            logger.warning(f"Rate limited (429). Waiting {wait_time} seconds before retry.")
                            time.sleep(wait_time)
                            retry_count += 1
                        elif e.code >= 500:  # Server error
                            wait_time = 2 * (retry_count + 1)
                            logger.warning(f"Server error ({e.code}). Retrying in {wait_time} seconds.")
                            time.sleep(wait_time)
                            retry_count += 1
                        else:
                            logger.error(f"HTTP Error: {e.code} - {e.reason} for URL: {search_url}")
                            break
                    except Exception as e:
                        logger.error(f"Error searching for keyword '{keyword}': {e}")
                        break
                
                if retry_count >= max_retries:
                    logger.error(f"Failed to fetch {search_url} after {max_retries} retries")
                
            except Exception as e:
                logger.error(f"Error during keyword search for '{keyword}': {e}")
        
        return assets
    
    def _scan_developer(self, developer_id):
        """
        Scan a developer's inventory for new assets.
        
        Args:
            developer_id: The Roblox developer ID
            
        Returns:
            List of new assets found
        """
        assets = []
        
        # Get the developer's username for reference
        dev_url = f"https://www.roblox.com/users/profile/playergames-json?userId={developer_id}"
        try:
            # Create a context that ignores SSL certificate errors
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(dev_url, context=context) as response:
                profile_data = json.loads(response.read().decode())
                username = profile_data.get('Username', f"Developer {developer_id}")
        except Exception as e:
            logger.error(f"Error getting developer profile: {e}")
            username = f"Developer {developer_id}"
        
        # Scan the developer's inventory
        inventory_url = f"https://inventory.roblox.com/v2/users/{developer_id}/inventory"
        asset_types_param = "%2C".join(ASSET_TYPES)
        full_url = f"{inventory_url}?assetTypes={asset_types_param}&limit=50&sortOrder=Desc"
        
        try:
            # Create a context that ignores SSL certificate errors
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(full_url, context=context) as response:
                data = json.loads(response.read().decode())
                items = data.get('data', [])
                
                for item in items:
                    asset_id = item.get('assetId')
                    if asset_id:
                        # Get detailed asset info
                        asset_url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
                        try:
                            with urllib.request.urlopen(asset_url, context=context) as asset_response:
                                asset_data = json.loads(asset_response.read().decode())
                                
                                # Check if this is a potential PS99 asset using our keyword list
                                is_ps99_related = False
                                name = asset_data.get('Name', '').lower()
                                description = asset_data.get('Description', '').lower()
                                
                                # Check name and description for any PS99 keywords
                                for keyword in PS99_KEYWORDS:
                                    if keyword.lower() in name or keyword.lower() in description:
                                        is_ps99_related = True
                                        break
                                
                                # Always include assets from known PS99 developers regardless of keywords
                                if developer_id in DEVELOPER_IDS:
                                    is_ps99_related = True
                                
                                if is_ps99_related:
                                    assets.append({
                                        'id': str(asset_id),
                                        'name': asset_data.get('Name', 'Unnamed Asset'),
                                        'description': asset_data.get('Description', ''),
                                        'type': asset_data.get('AssetType', 'Unknown'),
                                        'creator_id': str(developer_id),
                                        'creator_name': username,
                                        'source_type': 'developer',
                                        'source_id': str(developer_id),
                                        'source_name': username
                                    })
                        except Exception as e:
                            logger.error(f"Error getting asset details for {asset_id}: {e}")
        
        except Exception as e:
            logger.error(f"Error scanning developer assets: {e}")
        
        return assets
    
    def _scan_group(self, group_id):
        """
        Scan a group's assets for new content.
        
        Args:
            group_id: The Roblox group ID
            
        Returns:
            List of new assets found
        """
        assets = []
        
        # Get the group's name for reference
        group_url = f"https://groups.roblox.com/v1/groups/{group_id}"
        try:
            # Create a context that ignores SSL certificate errors
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(group_url, context=context) as response:
                group_data = json.loads(response.read().decode())
                group_name = group_data.get('name', f"Group {group_id}")
        except Exception as e:
            logger.error(f"Error getting group info: {e}")
            group_name = f"Group {group_id}"
        
        # Scan the group's assets
        assets_url = f"https://catalog.roblox.com/v1/search/items"
        params = urllib.parse.urlencode({
            'category': 'All',
            'creatorTargetId': group_id,
            'creatorType': 'Group',
            'limit': 50,
            'sortOrder': 'Desc'
        })
        full_url = f"{assets_url}?{params}"
        
        try:
            # Create a context that ignores SSL certificate errors
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(full_url, context=context) as response:
                data = json.loads(response.read().decode())
                items = data.get('data', [])
                
                for item in items:
                    asset_id = item.get('id')
                    if asset_id:
                        # Get detailed asset info
                        asset_url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
                        try:
                            with urllib.request.urlopen(asset_url, context=context) as asset_response:
                                asset_data = json.loads(asset_response.read().decode())
                                
                                # Check if this is a potential PS99 asset using our keyword list
                                is_ps99_related = False
                                name = asset_data.get('Name', '').lower()
                                description = asset_data.get('Description', '').lower()
                                
                                # Check name and description for any PS99 keywords
                                for keyword in PS99_KEYWORDS:
                                    if keyword.lower() in name or keyword.lower() in description:
                                        is_ps99_related = True
                                        break
                                
                                # Always include assets from known PS99 groups regardless of keywords
                                if group_id in GROUP_IDS:
                                    is_ps99_related = True
                                
                                if is_ps99_related:
                                    assets.append({
                                        'id': str(asset_id),
                                        'name': asset_data.get('Name', 'Unnamed Asset'),
                                        'description': asset_data.get('Description', ''),
                                        'type': asset_data.get('AssetType', 'Unknown'),
                                        'creator_id': str(group_id),
                                        'creator_name': group_name,
                                        'source_type': 'group',
                                        'source_id': str(group_id),
                                        'source_name': group_name
                                    })
                        except Exception as e:
                            logger.error(f"Error getting asset details for {asset_id}: {e}")
        
        except Exception as e:
            logger.error(f"Error scanning group assets: {e}")
        
        return assets
    
    def _scan_game(self, game_id):
        """
        Scan a game's assets for new content.
        
        Args:
            game_id: The Roblox game ID
            
        Returns:
            List of new assets found
        """
        assets = []
        
        # Get the game's details for reference
        game_url = f"https://games.roblox.com/v1/games?universeIds={game_id}"
        try:
            # Create a context that ignores SSL certificate errors
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(game_url, context=context) as response:
                game_data = json.loads(response.read().decode())
                game_name = game_data.get('data', [{}])[0].get('name', f"Game {game_id}")
        except Exception as e:
            logger.error(f"Error getting game info: {e}")
            game_name = f"Game {game_id}"
        
        # Scan the game's passes
        passes_url = f"https://games.roblox.com/v1/games/{game_id}/game-passes"
        
        try:
            # Create a context that ignores SSL certificate errors
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(passes_url, context=context) as response:
                data = json.loads(response.read().decode())
                passes = data.get('data', [])
                
                for game_pass in passes:
                    pass_id = game_pass.get('id')
                    if pass_id:
                        assets.append({
                            'id': str(pass_id),
                            'name': game_pass.get('name', 'Unnamed Game Pass'),
                            'description': game_pass.get('description', ''),
                            'type': 'GamePass',
                            'creator_id': str(game_id),
                            'creator_name': game_name,
                            'source_type': 'game',
                            'source_id': str(game_id),
                            'source_name': game_name
                        })
        
        except Exception as e:
            logger.error(f"Error scanning game passes: {e}")
        
        # Scan the game's developer products
        products_url = f"https://games.roblox.com/v1/games/{game_id}/developer-products"
        
        try:
            # Create a context that ignores SSL certificate errors
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(products_url, context=context) as response:
                data = json.loads(response.read().decode())
                products = data.get('data', [])
                
                for product in products:
                    product_id = product.get('id')
                    if product_id:
                        assets.append({
                            'id': str(product_id),
                            'name': product.get('name', 'Unnamed Developer Product'),
                            'description': product.get('description', ''),
                            'type': 'DeveloperProduct',
                            'creator_id': str(game_id),
                            'creator_name': game_name,
                            'source_type': 'game',
                            'source_id': str(game_id),
                            'source_name': game_name
                        })
        
        except Exception as e:
            logger.error(f"Error scanning developer products: {e}")
        
        return assets
    
    def _scan_marketplace(self, url):
        """
        Scan the Roblox Creator Marketplace for new content.
        
        Args:
            url: The marketplace URL to scan
            
        Returns:
            List of new assets found
        """
        assets = []
        
        try:
            # Create a context that ignores SSL certificate errors
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(url, context=context) as response:
                # For marketplace, we need to parse HTML, but we'll do a simplified version
                html = response.read().decode()
                
                # Extract asset IDs using a simple regex
                asset_ids = re.findall(r'data-asset-id="(\d+)"', html)
                
                for asset_id in asset_ids:
                    # Get detailed asset info
                    asset_url = f"https://economy.roblox.com/v2/assets/{asset_id}/details"
                    try:
                        with urllib.request.urlopen(asset_url, context=context) as asset_response:
                            asset_data = json.loads(asset_response.read().decode())
                            
                            # Check if this is a potential PS99 asset using our keyword list
                            is_ps99_related = False
                            name = asset_data.get('Name', '').lower()
                            description = asset_data.get('Description', '').lower()
                            
                            # Check name and description for any PS99 keywords
                            for keyword in PS99_KEYWORDS:
                                if keyword.lower() in name or keyword.lower() in description:
                                    is_ps99_related = True
                                    break
                            
                            if is_ps99_related:
                                assets.append({
                                    'id': str(asset_id),
                                    'name': asset_data.get('Name', 'Unnamed Asset'),
                                    'description': asset_data.get('Description', ''),
                                    'type': asset_data.get('AssetType', 'Unknown'),
                                    'creator_id': str(asset_data.get('Creator', {}).get('Id', 0)),
                                    'creator_name': asset_data.get('Creator', {}).get('Name', 'Unknown Creator'),
                                    'source_type': 'marketplace',
                                    'source_id': 'marketplace',
                                    'source_name': 'Roblox Creator Marketplace'
                                })
                    except Exception as e:
                        logger.error(f"Error getting asset details for {asset_id}: {e}")
        
        except Exception as e:
            logger.error(f"Error scanning marketplace: {e}")
        
        return assets
    
    def _scan_custom_source(self, source_type, source_value, source_name):
        """
        Scan a custom source defined by the user.
        
        Args:
            source_type: The type of source (developer, group, game, marketplace)
            source_value: The ID or URL of the source
            source_name: The name of the source
            
        Returns:
            List of new assets found
        """
        if source_type == 'developer':
            return self._scan_developer(int(source_value))
        elif source_type == 'group':
            return self._scan_group(int(source_value))
        elif source_type == 'game':
            return self._scan_game(int(source_value))
        elif source_type == 'marketplace':
            return self._scan_marketplace(source_value)
        else:
            logger.error(f"Unknown custom source type: {source_type}")
            return []
    
    def add_custom_source(self, source_type, source_value, source_name=None):
        """
        Add a custom source for scanning.
        
        Args:
            source_type: The type of source (developer, group, game, marketplace)
            source_value: The ID or URL of the source
            source_name: Optional name for the source
        
        Returns:
            True if added successfully, False otherwise
        """
        if source_name is None:
            source_name = f"Custom {source_type.capitalize()}"
        
        source_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'INSERT INTO custom_sources (id, type, value, name, enabled) VALUES (?, ?, ?, ?, ?)',
                (source_id, source_type, str(source_value), source_name, 1)
            )
            conn.commit()
            result = True
        except Exception as e:
            logger.error(f"Error adding custom source: {e}")
            result = False
        
        conn.close()
        return result
    
    def get_custom_sources(self):
        """
        Get all custom sources.
        
        Returns:
            List of custom sources
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, type, value, name, enabled FROM custom_sources')
        
        sources = [
            {
                'id': row[0],
                'type': row[1],
                'value': row[2],
                'name': row[3],
                'enabled': bool(row[4])
            }
            for row in cursor.fetchall()
        ]
        
        conn.close()
        return sources
    
    def remove_custom_source(self, source_id):
        """
        Remove a custom source.
        
        Args:
            source_id: The ID of the source to remove
            
        Returns:
            True if removed successfully, False otherwise
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('DELETE FROM custom_sources WHERE id = ?', (source_id,))
            conn.commit()
            result = True
        except Exception as e:
            logger.error(f"Error removing custom source: {e}")
            result = False
        
        conn.close()
        return result
    
    def toggle_custom_source(self, source_id, enabled=True):
        """
        Enable or disable a custom source.
        
        Args:
            source_id: The ID of the source to toggle
            enabled: Whether to enable or disable the source
            
        Returns:
            True if toggled successfully, False otherwise
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'UPDATE custom_sources SET enabled = ? WHERE id = ?',
                (1 if enabled else 0, source_id)
            )
            conn.commit()
            result = True
        except Exception as e:
            logger.error(f"Error toggling custom source: {e}")
            result = False
        
        conn.close()
        return result
    
    def scan_all_sources(self):
        """
        Scan all configured sources for new assets, including Anubis update keywords, 
        developer blogs, and hidden testing grounds.
        
        Returns:
            Dictionary with scan results including new assets found
        """
        # DEBUG LOGS - Print configured sources
        logger.info(f"SCANNING: Number of developers to scan: {len(DEVELOPER_IDS)}")
        logger.info(f"SCANNING: Developer IDs: {DEVELOPER_IDS}")
        logger.info(f"SCANNING: Number of groups to scan: {len(GROUP_IDS)}")
        logger.info(f"SCANNING: Group IDs: {GROUP_IDS}")
        logger.info(f"SCANNING: Number of games to scan: {len(GAME_IDS)}")
        logger.info(f"SCANNING: Game IDs: {GAME_IDS}")
        # Try to get additional developer IDs from web domain fallback if enabled
        if USE_WEB_DOMAIN_FALLBACK:
            try:
                # Get additional developer IDs
                web_developers = web_domain_client.get_developer_ids()
                if web_developers:
                    logger.info(f"Adding {len(web_developers)} additional developer IDs from web domain")
                    DEVELOPER_IDS.extend([dev_id for dev_id in web_developers if dev_id not in DEVELOPER_IDS])
                
                # Get additional group IDs
                web_groups = web_domain_client.get_group_ids()
                if web_groups:
                    logger.info(f"Adding {len(web_groups)} additional group IDs from web domain")
                    GROUP_IDS.extend([group_id for group_id in web_groups if group_id not in GROUP_IDS])
                
                # Get additional game IDs
                web_games = web_domain_client.get_game_ids()
                if web_games:
                    logger.info(f"Adding {len(web_games)} additional game IDs from web domain")
                    GAME_IDS.extend([game_id for game_id in web_games if game_id not in GAME_IDS])
            except Exception as e:
                logger.error(f"Error fetching additional IDs from web domain: {e}")
        all_assets = []
        new_assets = []
        
        with self.lock:
            # Scan developers
            for developer_id in DEVELOPER_IDS:
                assets = self._scan_developer(developer_id)
                all_assets.extend(assets)
                # Add delay to avoid rate limiting
                time.sleep(2)
            
            # Scan groups
            for group_id in GROUP_IDS:
                assets = self._scan_group(group_id)
                all_assets.extend(assets)
                # Add delay to avoid rate limiting
                time.sleep(2)
            
            # Scan games
            for game_id in GAME_IDS:
                assets = self._scan_game(game_id)
                all_assets.extend(assets)
                # Add delay to avoid rate limiting
                time.sleep(2)
            
            # Scan marketplace
            for url in STUDIO_SOURCES:
                assets = self._scan_marketplace(url)
                all_assets.extend(assets)
                # Add delay to avoid rate limiting
                time.sleep(1)
            
            # Scan custom sources
            custom_sources = self.get_custom_sources()
            for source in custom_sources:
                if source['enabled']:
                    assets = self._scan_custom_source(source['type'], source['value'], source['name'])
                    all_assets.extend(assets)
                    # Add delay to avoid rate limiting
                    time.sleep(1)
                    
            # Scan for Anubis update content - prioritizing this special scanning
            logger.info("Scanning for potential Anubis update content...")
            anubis_assets = self.scan_keywords(ANUBIS_KEYWORDS)
            all_assets.extend(anubis_assets)
            
            # Scan for developer testing areas
            logger.info("Scanning for potential developer testing grounds...")
            testing_assets = self.scan_keywords(DEVELOPER_TESTING_KEYWORDS)
            all_assets.extend(testing_assets)
            
            # Scan for developer blog posts and update announcements
            logger.info("Scanning for developer blogs and update information...")
            blog_assets = self.scan_keywords(DEVELOPER_BLOG_KEYWORDS)
            all_assets.extend(blog_assets)
            
            # Process and store new assets
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            for asset in all_assets:
                # Check if the asset already exists
                cursor.execute('SELECT id FROM assets WHERE id = ?', (asset['id'],))
                exists = cursor.fetchone() is not None
                
                if not exists:
                    # This is a new asset, download its thumbnail
                    thumbnail_path = self._download_asset_thumbnail(asset['id'])
                    
                    # Determine asset category
                    category = self._categorize_asset(asset['name'], asset['description'])
                    
                    # Insert into database
                    cursor.execute(
                        '''
                        INSERT INTO assets 
                        (id, name, description, asset_type, creator_id, creator_name, 
                         source_type, source_id, source_name, timestamp, thumbnail_path, 
                         category, is_new)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''',
                        (
                            asset['id'], 
                            asset['name'], 
                            asset['description'], 
                            asset['type'],
                            asset['creator_id'],
                            asset['creator_name'],
                            asset['source_type'],
                            asset['source_id'],
                            asset['source_name'],
                            datetime.datetime.now().isoformat(),
                            thumbnail_path if thumbnail_path else None,
                            category,
                            1
                        )
                    )
                    
                    new_assets.append({
                        'id': asset['id'],
                        'name': asset['name'],
                        'description': asset['description'],
                        'type': asset['type'],
                        'creator_name': asset['creator_name'],
                        'timestamp': datetime.datetime.now().isoformat(),
                        'image_url': thumbnail_path.replace('\\', '/') if thumbnail_path else None,
                        'source': asset['source_name'],
                        'category': category,
                        'is_new': True
                    })
            
            # Commit changes
            conn.commit()
            
            # Update last scan time
            self.last_scan_time = datetime.datetime.now()
            
            # Track how many new assets we found for notifications
            self.new_assets_since_notification += len(new_assets)
            
            # Update cached assets
            self._load_cached_assets()
            
            # Clean up old assets
            self._clear_old_assets()
            
            conn.close()
        
        return {
            'new_assets': new_assets,
            'total_assets': len(self.cached_assets),
            'scan_time': self.last_scan_time.isoformat() if isinstance(self.last_scan_time, datetime.datetime) else datetime.datetime.now().isoformat(),
            'new_asset_count': len(new_assets)
        }
    
    def get_assets(self, category=None, source=None, page=1, per_page=RESULTS_PER_PAGE):
        """
        Get assets from the database with optional filtering.
        
        Args:
            category: Optional category to filter by
            source: Optional source to filter by
            page: Page number for pagination
            per_page: Number of results per page
            
        Returns:
            Dictionary with paginated assets and pagination info
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        # Build query
        query = 'SELECT id, name, description, asset_type, creator_name, timestamp, thumbnail_path, source_name, category, is_new FROM assets'
        params = []
        
        filters = []
        if category:
            filters.append('category = ?')
            params.append(category)
        
        if source:
            filters.append('source_name = ?')
            params.append(source)
        
        if filters:
            query += ' WHERE ' + ' AND '.join(filters)
        
        # Add ordering and pagination
        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
        params.extend([per_page, (page - 1) * per_page])
        
        cursor.execute(query, params)
        
        assets = []
        for row in cursor.fetchall():
            asset_id, name, description, asset_type, creator_name, timestamp, thumbnail_path, source_name, category, is_new = row
            assets.append({
                'id': asset_id,
                'name': name,
                'description': description,
                'type': asset_type,
                'creator_name': creator_name,
                'timestamp': timestamp,
                'image_url': thumbnail_path.replace('\\', '/') if thumbnail_path else None,
                'source': source_name,
                'category': category,
                'is_new': bool(is_new)
            })
        
        # Get total count for pagination
        count_query = 'SELECT COUNT(*) FROM assets'
        if filters:
            count_query += ' WHERE ' + ' AND '.join(filters)
        
        cursor.execute(count_query, params[:-2] if params else [])
        total = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'assets': assets,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    
    def mark_assets_seen(self):
        """Mark all assets as seen (not new) in the database"""
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE assets SET is_new = 0')
        conn.commit()
        
        conn.close()
        
        # Reset notification counter
        self.new_assets_since_notification = 0
        
        # Update cached assets
        self._load_cached_assets()
    
    def get_categories(self):
        """
        Get all unique categories from the database.
        
        Returns:
            List of unique categories
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT DISTINCT category FROM assets')
        
        categories = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return categories
    
    def get_sources(self):
        """
        Get all unique sources from the database.
        
        Returns:
            List of unique sources
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT DISTINCT source_name FROM assets')
        
        sources = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return sources
    
    def get_stats(self):
        """
        Get scanner statistics.
        
        Returns:
            Dictionary with scanner statistics
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        # Total assets
        cursor.execute('SELECT COUNT(*) FROM assets')
        total_assets = cursor.fetchone()[0]
        
        # New assets
        cursor.execute('SELECT COUNT(*) FROM assets WHERE is_new = 1')
        new_assets = cursor.fetchone()[0]
        
        # Assets by category
        cursor.execute('SELECT category, COUNT(*) FROM assets GROUP BY category')
        category_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Assets by source type
        cursor.execute('SELECT source_type, COUNT(*) FROM assets GROUP BY source_type')
        source_type_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Assets by day
        cursor.execute('''
        SELECT DATE(timestamp) as day, COUNT(*) 
        FROM assets 
        GROUP BY day 
        ORDER BY day DESC
        LIMIT ?
        ''', (HISTORY_DAYS,))
        daily_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        conn.close()
        
        return {
            'total_assets': total_assets,
            'new_assets': new_assets,
            'category_counts': category_counts,
            'source_type_counts': source_type_counts,
            'daily_counts': daily_counts,
            'last_scan_time': self.last_scan_time.isoformat() if hasattr(self, 'last_scan_time') and isinstance(self.last_scan_time, datetime.datetime) else datetime.datetime.now().isoformat(),
            'monitored_developers': len(DEVELOPER_IDS),
            'monitored_groups': len(GROUP_IDS),
            'monitored_games': len(GAME_IDS),
            'custom_sources': len(self.get_custom_sources())
        }
    
    def search_assets(self, query, page=1, per_page=RESULTS_PER_PAGE):
        """
        Search assets by keyword.
        
        Args:
            query: Search query
            page: Page number for pagination
            per_page: Number of results per page
            
        Returns:
            Dictionary with search results and pagination info
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        # Build query
        search_query = '''
        SELECT id, name, description, asset_type, creator_name, timestamp, thumbnail_path, source_name, category, is_new 
        FROM assets 
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
        '''
        
        search_params = [f"%{query}%", f"%{query}%", per_page, (page - 1) * per_page]
        
        cursor.execute(search_query, search_params)
        
        assets = []
        for row in cursor.fetchall():
            asset_id, name, description, asset_type, creator_name, timestamp, thumbnail_path, source_name, category, is_new = row
            assets.append({
                'id': asset_id,
                'name': name,
                'description': description,
                'type': asset_type,
                'creator_name': creator_name,
                'timestamp': timestamp,
                'image_url': thumbnail_path.replace('\\', '/') if thumbnail_path else None,
                'source': source_name,
                'category': category,
                'is_new': bool(is_new)
            })
        
        # Get total count for pagination
        count_query = '''
        SELECT COUNT(*) 
        FROM assets 
        WHERE name LIKE ? OR description LIKE ?
        '''
        
        cursor.execute(count_query, [f"%{query}%", f"%{query}%"])
        total = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'assets': assets,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
            'query': query
        }
    
    def get_asset_details(self, asset_id):
        """
        Get detailed information about a specific asset.
        
        Args:
            asset_id: The asset ID
            
        Returns:
            Dictionary with asset details or None if not found
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        cursor.execute(
            '''
            SELECT id, name, description, asset_type, creator_id, creator_name, 
                   source_type, source_id, source_name, timestamp, thumbnail_path, 
                   category, is_new
            FROM assets 
            WHERE id = ?
            ''',
            (asset_id,)
        )
        
        row = cursor.fetchone()
        
        if row:
            asset = {
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'type': row[3],
                'creator_id': row[4],
                'creator_name': row[5],
                'source_type': row[6],
                'source_id': row[7],
                'source_name': row[8],
                'timestamp': row[9],
                'image_url': row[10].replace('\\', '/') if row[10] else None,
                'category': row[11],
                'is_new': bool(row[12])
            }
            
            # Add Roblox URLs
            if asset['source_type'] == 'developer':
                asset['source_url'] = f"https://www.roblox.com/users/{asset['source_id']}/profile"
            elif asset['source_type'] == 'group':
                asset['source_url'] = f"https://www.roblox.com/groups/{asset['source_id']}/about"
            elif asset['source_type'] == 'game':
                asset['source_url'] = f"https://www.roblox.com/games/{asset['source_id']}"
            
            # Add asset URL
            asset['asset_url'] = f"https://www.roblox.com/catalog/{asset['id']}"
            
            conn.close()
            return asset
        
        conn.close()
        return None
    
    def update_settings(self, new_settings):
        """
        Update scanner settings.
        
        Args:
            new_settings: Dictionary with new settings
            
        Returns:
            True if updated successfully, False otherwise
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        try:
            # Clear current settings
            cursor.execute('DELETE FROM settings')
            
            # Insert new settings
            for key, value in new_settings.items():
                cursor.execute(
                    'INSERT INTO settings (key, value) VALUES (?, ?)',
                    (key, json.dumps(value))
                )
            
            conn.commit()
            
            # Update current settings
            self.settings.update(new_settings)
            
            result = True
        except Exception as e:
            logger.error(f"Error updating settings: {e}")
            result = False
        
        conn.close()
        return result
    
    def get_settings(self):
        """
        Get current scanner settings.
        
        Returns:
            Dictionary with current settings
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT key, value FROM settings')
        
        settings = {}
        for row in cursor.fetchall():
            key, value = row
            settings[key] = json.loads(value)
        
        conn.close()
        
        # If no settings in database, use default
        if not settings:
            return self.settings
        
        return settings


# Initialize scanner
scanner = ComprehensiveRobloxScanner()
print("Using enhanced Roblox asset scanner (monitors Preston/ChickenEngineer and BIG Games)")

# Background scanner function for threading
def background_scanner():
    """Function to run in a background thread for automatic scanning"""
    print("Starting background scan of all PS99 sources...")
    
    while True:
        # Scan all sources
        scan_results = scanner.scan_all_sources()
        
        # Log the results
        if scan_results['new_asset_count'] > 0:
            logger.info(f"Found {scan_results['new_asset_count']} new assets during background scan")
        
        # Sleep for the configured interval
        time.sleep(SCAN_INTERVAL)