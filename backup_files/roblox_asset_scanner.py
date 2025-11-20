"""
PS99 Roblox Asset Scanner

This module provides functionality to scan for Pet Simulator 99 assets and leaks
from Roblox developer environments, Creator Marketplace, game passes, meshes,
and other Roblox sources.
"""

import os
import json
import time
import logging
import datetime
import requests
from typing import Dict, List, Any, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Constants
ASSET_CACHE_DIR = os.path.join("static", "images", "assets")
os.makedirs(ASSET_CACHE_DIR, exist_ok=True)

# Big Games and related developer IDs
BIG_GAMES_GROUP_ID = 5060810  # Big Games group ID
BIG_GAMES_CREATOR_IDS = [
    5060810,  # Big Games group
    1547288,  # Preston (Roblox username: "BuildIntoGames")
    168476,   # ChickenEngineer (Important PS99 dev)
]

# Pet Simulator 99 Game ID
PS99_PLACE_ID = 8737899170  # Pet Simulator 99 place ID
PS99_UNIVERSE_ID = 3317731774  # Pet Simulator 99 universe ID

# Roblox API endpoints
CATALOG_API = "https://catalog.roblox.com/v1/catalog/items/details"
ASSET_INFO_API = "https://api.roblox.com/marketplace/productinfo"
GAME_PASS_API = "https://api.roblox.com/marketplace/game-pass-product-info"
ASSET_THUMBNAIL_API = "https://thumbnails.roblox.com/v1/assets"
GROUP_API = "https://groups.roblox.com/v1/groups"
USER_API = "https://users.roblox.com/v1/users"
DEVELOP_API = "https://develop.roblox.com/v1"
INVENTORY_API = "https://inventory.roblox.com/v2/assets"

# Asset types to track (based on Roblox AssetTypeId)
TRACKED_ASSET_TYPES = {
    1: "Image",
    2: "T-Shirt",
    3: "Audio",
    4: "Mesh",
    5: "Lua",
    8: "Hat",
    9: "Place",
    10: "Model",
    11: "Shirt",
    12: "Pants",
    13: "Decal",
    17: "Head",
    18: "Face",
    19: "Gear",
    21: "Badge",
    24: "Animation",
    27: "Torso",
    28: "Right Arm",
    29: "Left Arm",
    30: "Left Leg",
    31: "Right Leg",
    32: "Package",
    34: "GamePass",
    38: "Plugin",
    41: "MeshPart",
    42: "HairAccessory",
    43: "FaceAccessory",
    44: "NeckAccessory",
    45: "ShoulderAccessory",
    46: "FrontAccessory",
    47: "BackAccessory",
    48: "WaistAccessory",
    49: "ClimbAnimation",
    50: "DeathAnimation",
    51: "FallAnimation",
    52: "IdleAnimation",
    53: "JumpAnimation",
    54: "RunAnimation",
    55: "SwimAnimation",
    56: "WalkAnimation",
    61: "EmoteAnimation"
}

# PS99 related keywords to look for in assets
PS99_KEYWORDS = [
    "pet simulator", "pet sim", "ps99", "slime factory", "huge pet", 
    "titanic pet", "gargantuan", "big games", "hatchable", "exclusive pet",
    "egg", "boost", "rainbow", "gift", "mythical", "legendary", "godly",
    "charm", "enchant", "tnt", "potion", "gamepass", "diamonds", "agony",
    "gem", "breakable", "plushie", "doodle"
]


class RobloxAssetScanner:
    """Scanner for Roblox assets related to Pet Simulator 99"""
    
    def __init__(self):
        """Initialize the scanner with cache directories"""
        self.asset_cache_dir = ASSET_CACHE_DIR
        os.makedirs(self.asset_cache_dir, exist_ok=True)
        
        # Log initialization
        logger.info(f"RobloxAssetScanner initialized with cache dir: {self.asset_cache_dir}")
        
        # Track rate limits
        self.last_request_time = 0
        
    def _rate_limit_request(self):
        """Ensure we don't exceed Roblox API rate limits"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        # Limit to 1 request per 0.5 seconds (2 per second)
        if time_since_last < 0.5:
            delay = 0.5 - time_since_last
            logger.debug(f"Rate limiting - sleeping for {delay:.2f}s")
            time.sleep(delay)
            
        self.last_request_time = time.time()
    
    def _make_request(self, url: str, method: str = "GET", params: Optional[Dict] = None, 
                     data: Optional[Dict] = None, headers: Optional[Dict] = None) -> Dict:
        """Make a rate-limited request to the Roblox API"""
        self._rate_limit_request()
        
        default_headers = {
            "User-Agent": "PS99AssetTracker/1.0",
            "Accept": "application/json"
        }
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, params=params, headers=default_headers)
            elif method.upper() == "POST":
                response = requests.post(url, params=params, json=data, headers=default_headers)
            else:
                logger.error(f"Unsupported request method: {method}")
                return {"success": False, "error": f"Unsupported request method: {method}"}
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 5))
                logger.warning(f"Rate limited by Roblox API - retrying after {retry_after}s")
                time.sleep(retry_after)
                return self._make_request(url, method, params, data, headers)
            
            # Handle other errors
            if response.status_code != 200:
                logger.error(f"API error: {response.status_code} - {response.text}")
                return {
                    "success": False, 
                    "status_code": response.status_code,
                    "error": response.text
                }
            
            # Parse and return JSON response
            try:
                result = response.json()
                return result
            except Exception as e:
                logger.error(f"Error parsing JSON response: {e}")
                return {"success": False, "error": f"JSON parse error: {str(e)}"}
        
        except Exception as e:
            logger.error(f"Request error: {e}")
            return {"success": False, "error": str(e)}
    
    def _download_asset_thumbnail(self, asset_id: int) -> Optional[str]:
        """Download an asset's thumbnail and return the local path"""
        try:
            # Get the thumbnail URL from Roblox API
            url = f"{ASSET_THUMBNAIL_API}?assetIds={asset_id}&size=420x420&format=Png"
            response = self._make_request(url)
            
            if "data" not in response or not response["data"]:
                logger.error(f"No thumbnail data for asset {asset_id}")
                return None
            
            thumbnail_url = response["data"][0].get("imageUrl")
            if not thumbnail_url:
                logger.error(f"No thumbnail URL for asset {asset_id}")
                return None
            
            # Download the thumbnail
            self._rate_limit_request()  # Rate limit thumbnail download too
            img_response = requests.get(thumbnail_url)
            if img_response.status_code != 200:
                logger.error(f"Failed to download thumbnail: {img_response.status_code}")
                return None
            
            # Save the thumbnail
            local_path = os.path.join(self.asset_cache_dir, f"asset_{asset_id}.png")
            with open(local_path, "wb") as f:
                f.write(img_response.content)
            
            logger.info(f"Downloaded thumbnail for asset {asset_id} to {local_path}")
            return local_path
        
        except Exception as e:
            logger.error(f"Error downloading thumbnail for asset {asset_id}: {e}")
            return None
    
    def get_asset_info(self, asset_id: int) -> Dict:
        """Get information about a specific Roblox asset"""
        url = f"{ASSET_INFO_API}?assetId={asset_id}"
        return self._make_request(url)
    
    def get_user_info(self, user_id: int) -> Dict:
        """Get information about a specific Roblox user"""
        url = f"{USER_API}/{user_id}"
        return self._make_request(url)
    
    def get_group_info(self, group_id: int) -> Dict:
        """Get information about a specific Roblox group"""
        url = f"{GROUP_API}/{group_id}"
        return self._make_request(url)
    
    def search_catalog(self, keyword: str, creator_id: Optional[int] = None,
                      asset_type: Optional[int] = None, limit: int = 25) -> List[Dict]:
        """Search the Roblox catalog for PS99-related assets"""
        # Set up the request data
        data = {
            "category": "All",
            "limit": limit,
            "sortAggregation": 0,  # 0 = Most favorited
            "sortType": "Relevance",
            "keyword": keyword
        }
        
        if creator_id:
            data["creatorTargetId"] = creator_id
        
        if asset_type:
            data["subcategory"] = asset_type
        
        # Make the request
        response = self._make_request(CATALOG_API, method="POST", data=data)
        
        if "data" not in response:
            logger.error(f"No data in catalog search response: {response}")
            return []
        
        # Process the results
        results = []
        for item in response["data"]:
            # Skip items that don't match our keywords and creators if we're not filtering
            if not creator_id:
                if item["creatorTargetId"] not in BIG_GAMES_CREATOR_IDS:
                    # Check if it might be PS99 related
                    name_lower = item["name"].lower()
                    if not any(kw in name_lower for kw in PS99_KEYWORDS):
                        continue
            
            # Add the processed item
            processed_item = {
                "id": item["id"],
                "name": item["name"],
                "description": item.get("description", ""),
                "creatorType": item["creatorType"],
                "creatorId": item["creatorTargetId"],
                "creatorName": item["creatorName"],
                "price": item.get("price", 0),
                "assetType": TRACKED_ASSET_TYPES.get(item.get("assetType"), "Unknown"),
                "assetTypeId": item.get("assetType"),
                "created": item.get("createdAt"),
                "updated": item.get("updatedAt"),
                "local_image": None  # Will be populated later if we download it
            }
            
            # Try to download the thumbnail
            local_image = self._download_asset_thumbnail(item["id"])
            if local_image:
                processed_item["local_image"] = local_image
            
            results.append(processed_item)
        
        logger.info(f"Found {len(results)} PS99-related assets for keyword: {keyword}")
        return results
    
    def get_creator_latest_assets(self, creator_id: int, limit: int = 50) -> List[Dict]:
        """Get the latest assets uploaded by a creator"""
        # For now, we'll search multiple PS99 keywords to find relevant assets
        all_assets = []
        
        # Limit our search to a few key terms to avoid rate limits
        search_terms = ["pet simulator", "ps99", "slime", "exclusive pet", "huge pet"]
        
        for term in search_terms:
            assets = self.search_catalog(term, creator_id=creator_id, limit=limit // len(search_terms))
            all_assets.extend(assets)
            time.sleep(1)  # Add delay between searches
        
        # Sort by creation date (newest first)
        try:
            all_assets.sort(key=lambda x: x.get("created", ""), reverse=True)
        except Exception as e:
            logger.error(f"Error sorting assets by creation date: {e}")
        
        return all_assets[:limit]
    
    def get_game_passes(self, universe_id: int = PS99_UNIVERSE_ID) -> List[Dict]:
        """Get game passes for PS99"""
        try:
            url = f"https://games.roblox.com/v1/games/{universe_id}/game-passes"
            params = {"limit": 100, "sortOrder": "Desc"}
            
            response = self._make_request(url, params=params)
            
            if not response.get("data"):
                logger.error(f"No game passes found for universe {universe_id}")
                return []
            
            game_passes = []
            for pass_data in response["data"]:
                try:
                    # Get more details about the game pass
                    pass_id = pass_data["id"]
                    pass_info = self._make_request(f"{GAME_PASS_API}?assetId={pass_id}")
                    
                    processed_pass = {
                        "id": pass_id,
                        "name": pass_data["name"],
                        "description": pass_data.get("description", ""),
                        "price": pass_info.get("PriceInRobux", 0),
                        "creator": "Big Games",
                        "created": pass_info.get("Created"),
                        "updated": pass_info.get("Updated"),
                        "assetType": "GamePass",
                        "assetTypeId": 34,
                        "local_image": None
                    }
                    
                    # Try to download the thumbnail
                    local_image = self._download_asset_thumbnail(pass_id)
                    if local_image:
                        processed_pass["local_image"] = local_image
                    
                    game_passes.append(processed_pass)
                except Exception as e:
                    logger.error(f"Error processing game pass {pass_data['id']}: {e}")
            
            return game_passes
        
        except Exception as e:
            logger.error(f"Error getting game passes: {e}")
            return []
    
    def monitor_dev_changes(self) -> List[Dict]:
        """
        Monitor for changes in PS99 developer activity
        
        In a real implementation, this would track file changes, model uploads,
        and other developer activities in real time. For this demo, we'll return
        sample data that shows what this would look like.
        """
        # This would be implemented with real monitoring of developer changes 
        # on the Roblox platform. For now, we return sample data.
        sample_changes = [
            {
                "id": "change_1",
                "type": "FileModified",
                "file_name": "zones/unlocks.json",
                "file_type": "GameData",
                "change_type": "MODIFIED",
                "size": "N/A",
                "path": f"/roblox/games/{PS99_PLACE_ID}/data/zones/unlocks",
                "creator_id": BIG_GAMES_CREATOR_IDS[0],
                "creator_name": "Big Games",
                "timestamp": datetime.datetime.now() - datetime.timedelta(hours=12),
                "description": "Modified zones unlock data, possibly adding new area"
            },
            {
                "id": "change_2",
                "type": "ModelUploaded",
                "file_name": "SlimeFactoryBuilding.rbxm",
                "file_type": "Model",
                "change_type": "ADDED",
                "size": "24.3 MB",
                "path": f"/roblox/games/{PS99_PLACE_ID}/workspace/SlimeFactory",
                "creator_id": BIG_GAMES_CREATOR_IDS[1],
                "creator_name": "BuildIntoGames",
                "timestamp": datetime.datetime.now() - datetime.timedelta(hours=24),
                "description": "New Slime Factory model added to workspace"
            },
            {
                "id": "change_3",
                "type": "AssetUploaded",
                "file_name": "HugeSlimePet.mesh",
                "file_type": "MeshPart",
                "change_type": "ADDED",
                "size": "8.7 MB",
                "path": f"/roblox/asset/141278356221",
                "creator_id": BIG_GAMES_CREATOR_IDS[2],
                "creator_name": "ChickenEngineer",
                "timestamp": datetime.datetime.now() - datetime.timedelta(hours=36),
                "description": "New mesh for Huge Slime Pet added to assets"
            },
            {
                "id": "change_4",
                "type": "GamePassCreated",
                "file_name": "Super Slime Pass",
                "file_type": "GamePass",
                "change_type": "ADDED",
                "size": "N/A",
                "path": f"/roblox/games/{PS99_PLACE_ID}/gamepasses/97552345",
                "creator_id": BIG_GAMES_CREATOR_IDS[0],
                "creator_name": "Big Games",
                "timestamp": datetime.datetime.now() - datetime.timedelta(hours=48),
                "description": "New game pass for Slime Factory event"
            }
        ]
        
        return sample_changes
    
    def scan_all_sources(self, limit: int = 50) -> Dict[str, List[Dict]]:
        """
        Scan all PS99 asset sources and return a combined result
        
        This would be the main function to call periodically to update the asset database.
        """
        results = {
            "big_games_assets": [],
            "game_passes": [],
            "dev_changes": [],
            "latest_leaks": []
        }
        
        # 1. Get assets from Big Games creators
        for creator_id in BIG_GAMES_CREATOR_IDS:
            assets = self.get_creator_latest_assets(creator_id, limit=limit//len(BIG_GAMES_CREATOR_IDS))
            results["big_games_assets"].extend(assets)
        
        # 2. Get game passes
        game_passes = self.get_game_passes()
        results["game_passes"] = game_passes
        
        # 3. Get developer changes
        dev_changes = self.monitor_dev_changes()
        results["dev_changes"] = dev_changes
        
        # 4. Combine all data for a "latest leaks" view (sorted by timestamp)
        all_data = []
        
        # Add Big Games assets
        for asset in results["big_games_assets"]:
            leak_entry = {
                "id": f"asset_{asset['id']}",
                "type": "Asset",
                "name": asset["name"],
                "description": asset.get("description", ""),
                "asset_type": asset["assetType"],
                "creator_name": asset["creatorName"],
                "timestamp": asset.get("created"),
                "image_url": asset.get("local_image"),
                "source": "Big Games Creator Assets"
            }
            all_data.append(leak_entry)
        
        # Add game passes
        for pass_data in results["game_passes"]:
            leak_entry = {
                "id": f"gamepass_{pass_data['id']}",
                "type": "GamePass",
                "name": pass_data["name"],
                "description": pass_data.get("description", ""),
                "asset_type": "GamePass",
                "creator_name": "Big Games",
                "timestamp": pass_data.get("created"),
                "image_url": pass_data.get("local_image"),
                "price": pass_data.get("price"),
                "source": "Game Passes"
            }
            all_data.append(leak_entry)
        
        # Add developer changes
        for change in results["dev_changes"]:
            leak_entry = {
                "id": change["id"],
                "type": "DevChange",
                "name": change["file_name"],
                "description": change["description"],
                "asset_type": change["file_type"],
                "creator_name": change["creator_name"],
                "timestamp": change["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
                "change_type": change["change_type"],
                "path": change["path"],
                "source": "Developer Activity"
            }
            all_data.append(leak_entry)
        
        # Sort by timestamp (newest first) if available
        try:
            all_data.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        except Exception as e:
            logger.error(f"Error sorting leaks by timestamp: {e}")
        
        results["latest_leaks"] = all_data[:limit]
        
        return results
    
    def get_sample_assets(self) -> List[Dict]:
        """
        Get sample PS99 assets for demonstration
        
        This simulates a real scan with realistic asset data from Pet Simulator 99.
        """
        # Gather assets from various sources to create a realistic demo
        results = []
        
        # 1. Create some realistic PS99 asset data based on the images
        realistic_assets = [
            {
                "id": 18223856577,
                "name": "Agony Devil Mesh",
                "description": "Mesh for the new Agony Devil pet. This pet will have fire effects and special animations.",
                "assetType": {"name": "MeshPart"},
                "assetTypeId": 41,
                "creator": {
                    "name": "BIG Games Pets",
                    "id": 5060810,
                    "url": "/groups/5060810"
                },
                "created": "Created: 4/6/2025",
                "local_image": "static/images/assets/agony_devil.jpg",
                "keywords_matched": ["pet", "devil", "agony"]
            },
            {
                "id": 18147893883,
                "name": "Cat Flex Mesh",
                "description": "Mesh for the new Cat Flex pet. Special animation support for trading plaza display.",
                "assetType": {"name": "MeshPart"},
                "assetTypeId": 41,
                "creator": {
                    "name": "BIG Games Pets",
                    "id": 5060810,
                    "url": "/groups/5060810"
                },
                "created": "Created: 4/5/2025",
                "local_image": "static/images/assets/cat_flex.jpg",
                "keywords_matched": ["pet", "cat", "flex"]
            },
            {
                "id": 65480067,
                "name": "Breakable Mayhem Enchant",
                "description": "Special enchant that boosts breakable damage. Limited time item for Slime event.",
                "assetType": {"name": "GamePass"},
                "assetTypeId": 34,
                "creator": {
                    "name": "Big Games",
                    "id": 5060810,
                    "url": "/groups/5060810"
                },
                "created": "Created: 4/2/2025",
                "price": 3200,
                "local_image": "static/images/assets/breakable_enchant.jpg",
                "keywords_matched": ["enchant", "breakable", "mayhem"]
            },
            {
                "id": 23456789,
                "name": "Butterfly Exclusive Egg",
                "description": "Limited edition Butterfly Egg. Chance to hatch exclusive butterfly-themed pets.",
                "assetType": {"name": "Model"},
                "assetTypeId": 10,
                "creator": {
                    "name": "BIG Games Pets",
                    "id": 5060810,
                    "url": "/groups/5060810"
                },
                "created": "Created: 4/1/2025",
                "local_image": "static/images/assets/butterfly_egg.jpg",
                "keywords_matched": ["egg", "exclusive", "butterfly"]
            },
            {
                "id": 97555264,
                "name": "Super Shiny Hunter Game Pass",
                "description": "Improves your chances of hatching shiny pets by 25%!",
                "assetType": {"name": "GamePass"},
                "assetTypeId": 34,
                "creator": {
                    "name": "Big Games",
                    "id": 5060810,
                    "url": "/groups/5060810"
                },
                "created": "Created: 3/30/2025",
                "price": 1600,
                "local_image": "static/images/assets/shiny_pass.jpg",
                "keywords_matched": ["gamepass", "shiny", "hunter"]
            },
            {
                "id": 87654321,
                "name": "Slime Factory Building Model",
                "description": "Main structure for the new Slime Factory event area. Players will produce and customize slimes here.",
                "assetType": {"name": "Model"},
                "assetTypeId": 10,
                "creator": {
                    "name": "BIG Games Pets",
                    "id": 5060810,
                    "url": "/groups/5060810"
                },
                "created": "Created: 3/25/2025",
                "local_image": "static/images/assets/slime_factory.jpg",
                "keywords_matched": ["slime", "factory", "event"]
            },
            {
                "id": 34567890,
                "name": "Huge Slime Pet",
                "description": "Exclusive HUGE Slime Pet for the upcoming Slime Factory event.",
                "assetType": {"name": "Model"},
                "assetTypeId": 10,
                "creator": {
                    "name": "BIG Games Pets",
                    "id": 5060810,
                    "url": "/groups/5060810"
                },
                "created": "Created: 3/20/2025",
                "local_image": "static/images/assets/huge_slime_pet.jpg",
                "keywords_matched": ["huge", "pet", "slime"]
            },
            {
                "id": 45678901,
                "name": "+40 Eggs! Developer Product",
                "description": "Hatch 40+ more eggs at a time with 40 egg open!",
                "assetType": {"name": "DeveloperProduct"},
                "assetTypeId": 0,
                "creator": {
                    "name": "BIG Games Pets",
                    "id": 5060810,
                    "url": "/groups/5060810"
                },
                "created": "Created: 3/15/2025",
                "price": 1499,
                "local_image": "static/images/assets/40_eggs.jpg",
                "keywords_matched": ["eggs", "hatch", "40"]
            }
        ]
        
        # 2. Add developer changes
        dev_changes = self.monitor_dev_changes()
        for change in dev_changes:
            change_asset = {
                "id": int(str(hash(change["id"]))[:10]),  # Create a numeric ID from the hash
                "name": f"{change['file_name']} - Developer Change",
                "description": change["description"],
                "assetType": {"name": change["file_type"]},
                "assetTypeId": TRACKED_ASSET_TYPES.get(change["file_type"], 0),
                "creator": {
                    "name": change["creator_name"],
                    "id": change["creator_id"],
                    "url": f"/users/{change['creator_id']}"
                },
                "created": change["timestamp"].strftime("Created: %m/%d/%Y"),
                "local_image": "static/images/assets/slime_factory.jpg",  # Default image
                "change_type": change["change_type"],
                "path": change["path"],
                "keywords_matched": ["developer", "change", change["file_type"].lower()]
            }
            realistic_assets.append(change_asset)
        
        return realistic_assets


# Example usage
if __name__ == "__main__":
    scanner = RobloxAssetScanner()
    assets = scanner.get_sample_assets()
    print(f"Found {len(assets)} PS99 assets and leaks")
    
    for asset in assets[:5]:  # Print first 5 for demo
        print(f"Asset: {asset['name']}")
        print(f"Creator: {asset['creator']['name']}")
        print(f"Type: {asset['assetType']['name']}")
        print(f"Created: {asset['created']}")
        print("-" * 50)