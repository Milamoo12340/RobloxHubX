/**
 * Roblox API Endpoints Reference
 * 
 * This file contains all the Roblox API endpoints used by the PS99 asset tracking system.
 * Use these endpoints to build your own tracking systems.
 */

module.exports = {
  // Core API endpoints
  CATALOG_API: 'https://catalog.roblox.com/v1',
  GAMES_API: 'https://games.roblox.com/v1',
  GROUPS_API: 'https://groups.roblox.com/v1',
  USERS_API: 'https://users.roblox.com/v1',
  INVENTORY_API: 'https://inventory.roblox.com/v2',
  ECONOMY_API: 'https://economy.roblox.com/v2',
  AVATAR_API: 'https://avatar.roblox.com/v1',
  THUMBNAILS_API: 'https://thumbnails.roblox.com/v1',
  PRESENCE_API: 'https://presence.roblox.com/v1',
  DEV_PRODUCTS_API: 'https://apis.roblox.com/developer-products',
  
  // Asset delivery endpoints
  ASSET_DELIVERY: 'https://assetdelivery.roblox.com/v1',
  CDN_API: 'https://t0.rbxcdn.com',
  
  // Search endpoints
  CATALOG_SEARCH: 'https://catalog.roblox.com/v1/search/items',
  USERS_SEARCH: 'https://users.roblox.com/v1/users/search',
  
  // Important PS99-specific endpoints
  PS99_UNIVERSE_ID: 3317771874,
  PS99_PLACE_ID: 8737899170,
  PS99_GROUP_ID: 3959677, // BIG Games Pets
  
  // Function endpoints
  endpoints: {
    // Catalog endpoints
    getAssetInfo: (assetId) => `https://economy.roblox.com/v2/assets/${assetId}/details`,
    searchCatalog: () => 'https://catalog.roblox.com/v1/search/items',
    getAssetThumbnail: (assetIds) => `https://thumbnails.roblox.com/v1/assets?assetIds=${assetIds}&size=420x420&format=Png`,
    
    // User endpoints
    getUserProfile: (userId) => `https://users.roblox.com/v1/users/${userId}`,
    getUserInventory: (userId, assetType) => `https://inventory.roblox.com/v2/users/${userId}/inventory/${assetType}`,
    getUserPresence: () => 'https://presence.roblox.com/v1/presence/users',
    
    // Group endpoints
    getGroupInfo: (groupId) => `https://groups.roblox.com/v1/groups/${groupId}`,
    getGroupRoles: (groupId) => `https://groups.roblox.com/v1/groups/${groupId}/roles`,
    getGroupMembers: (groupId, roleId) => `https://groups.roblox.com/v1/groups/${groupId}/roles/${roleId}/users`,
    getGroupGames: (groupId) => `https://games.roblox.com/v2/groups/${groupId}/games`,
    
    // Game endpoints
    getGameInfo: (universeId) => `https://games.roblox.com/v1/games?universeIds=${universeId}`,
    getGamePasses: (placeId) => `https://games.roblox.com/v1/games/${placeId}/game-passes`,
    getGameIcon: (universeId) => `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=256x256&format=Png`,
    getGameThumbnails: (universeId) => `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=5&size=768x432&format=Png`,
    getGameBadges: (universeId) => `https://badges.roblox.com/v1/universes/${universeId}/badges`,
    getDeveloperProducts: (universeId) => `https://apis.roblox.com/developer-products/v1/universe-developer-products?universeId=${universeId}`,
    
    // Asset delivery endpoints
    getAssetContent: (assetId) => `https://assetdelivery.roblox.com/v1/asset/?id=${assetId}`,
    getGamePassIcon: (gamePassId) => `https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${gamePassId}&size=512x512&format=Png`
  }
};