/**
 * Central registry of all Roblox API endpoints for asset scanning
 * 
 * This file contains both:
 * 1. ACCESSIBLE_ENDPOINTS - Endpoints that work without authentication
 * 2. PROTECTED_ENDPOINTS - Endpoints that need bypassing/authentication (to implement later)
 * 
 * Placeholders can be used in URLs: {groupId}, {assetId}, {placeId}, etc.
 */

const ACCESSIBLE_ENDPOINTS = {
  // Group endpoints
  GROUP_INFO: 'https://groups.roblox.com/v1/groups/{groupId}',
  GROUP_GAMES: 'https://games.roblox.com/v2/groups/{groupId}/games',
  GROUP_ROLES: 'https://groups.roblox.com/v1/groups/{groupId}/roles',
  GROUP_RELATIONSHIPS: 'https://groups.roblox.com/v1/groups/{groupId}/relationships',
  
  // Catalog/Marketplace endpoints
  CATALOG_SEARCH: 'https://catalog.roblox.com/v1/search/items?category=All&limit=30&sortType=RecentlyUpdated',
  MARKETPLACE_ITEMS: 'https://economy.roblox.com/v2/search/items?category=All&limit=30&sortType=RecentlyUpdated',
  CATALOG_RECENT: 'https://catalog.roblox.com/v1/search/items/details?Category=All&Subcategory=All&CreatorName=BigGames&SortType=Recent&Limit=30',
  CATALOG_BY_CREATOR: 'https://catalog.roblox.com/v1/search/items?category=All&creatorTargetId={creatorId}&creatorType=Group&limit=30',
  
  // Game endpoints
  GAME_INFO: 'https://games.roblox.com/v1/games/votes?universeIds={universeIds}',
  GAME_STATS: 'https://games.roblox.com/v1/games?universeIds={universeIds}',
  GAME_PASSES: 'https://games.roblox.com/v1/games/{universeId}/game-passes?limit=50&sortOrder=Asc',
  GAME_SOCIAL: 'https://games.roblox.com/v1/games/{universeId}/social-links',
  GAME_BADGES: 'https://badges.roblox.com/v1/universes/{universeId}/badges?limit=100&sortOrder=Asc',
  
  // Asset endpoints
  ASSET_INFO: 'https://economy.roblox.com/v2/assets/{assetId}/details',
  ASSET_FAVORITES: 'https://catalog.roblox.com/v1/favorites/assets/{assetId}/count',
  ASSET_OWNERS: 'https://inventory.roblox.com/v2/assets/{assetId}/owners?limit=50&sortOrder=Asc',
  ASSET_CONTENTS: 'https://api.roblox.com/marketplace/productinfo?assetId={assetId}',
  ASSET_DELIVERY_BY_ID: 'https://apis.roblox.com/asset-delivery-api/v1/assetId/{assetId}',
  
  // Thumbnails
  ASSET_THUMBNAIL: 'https://thumbnails.roblox.com/v1/assets?assetIds={assetId}&size=420x420&format=Png',
  GAME_ICONS: 'https://thumbnails.roblox.com/v1/games/icons?universeIds={universeIds}&size=512x512&format=Png',
  GAME_THUMBNAIL: 'https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds={universeId}&size=768x432&format=Png',
  
  // CDN endpoints
  CDN_MODELS: 'https://assetdelivery.roblox.com/v1/asset/?id={assetId}',
  CDN_MESHES: 'https://assetdelivery.roblox.com/v1/asset/?id={assetId}',
  
  // User-based endpoints
  USER_INVENTORY: 'https://www.roblox.com/users/inventory/list-json?assetTypeId=10&cursor=&itemsPerPage=50&userId={userId}',
  USER_CREATIONS: 'https://www.roblox.com/users/{userId}/inventory#!/created',
  USER_PROFILE: 'https://www.roblox.com/users/{userId}/profile',
  
  // Badge Endpoints
  BADGES_API: 'https://badges.roblox.com/v1/universes/{universeId}/badges?limit=100&sortOrder=Asc',
  BADGE_INFO: 'https://badges.roblox.com/v1/badges/{badgeId}',
  BADGE_THUMBNAIL: 'https://thumbnails.roblox.com/v1/badges?badgeIds={badgeIds}&size=150x150&format=Png',
  
  // Creator Store (Toolbox Service)
  CREATOR_STORE_SEARCH: 'https://apis.roblox.com/toolbox-service/v2/assets:search?searchCategoryType={category}&query={query}&maxPageSize={maxPageSize}',
  CREATOR_STORE_ASSET_DETAILS: 'https://apis.roblox.com/toolbox-service/v1/assets/{assetId}'
};

// Endpoints that need authentication/bypassing
const PROTECTED_ENDPOINTS = {
  // Asset delivery endpoints
  ASSET_DELIVERY_LEGACY: 'https://assetdelivery.roblox.com/v1/asset/?id={assetId}',
  ASSET_DELIVERY_NEW: 'https://assetdelivery.roblox.com/v2/asset?id={assetId}',
  ASSET_DELIVERY_BATCH: 'https://assetdelivery.roblox.com/v1/assets/batch',
  
  // Open Cloud APIs
  ASSET_DELIVERY_OPEN_CLOUD: 'https://apis.roblox.com/asset-delivery-api/v1/assetId/{assetId}',
  ASSET_DELIVERY_VERSION_OPEN_CLOUD: 'https://apis.roblox.com/asset-delivery-api/v1/assetId/{assetId}/version/{versionNumber}',
  
  // Open Cloud v2 Assets API
  ASSETS_CREATE: 'https://apis.roblox.com/assets/v1/assets',
  ASSETS_GET: 'https://apis.roblox.com/assets/v1/assets/{assetId}',
  ASSETS_UPDATE: 'https://apis.roblox.com/assets/v1/assets/{assetId}',
  
  // Open Cloud v2 Datastores API
  DATASTORES_LIST: 'https://apis.roblox.com/datastores/v1/universes/{universeId}/standard-datastores',
  DATASTORES_KEYS: 'https://apis.roblox.com/datastores/v1/universes/{universeId}/standard-datastores/{datastoreName}/scopes/{scope}/keys',
  DATASTORES_ENTRY: 'https://apis.roblox.com/datastores/v1/universes/{universeId}/standard-datastores/{datastoreName}/scopes/{scope}/entries/{entryKey}',
  
  // Open Cloud v2 Messaging API
  MESSAGING_PUBLISH: 'https://apis.roblox.com/messaging-service/v1/universes/{universeId}/topics/{topic}',
  
  // Open Cloud v2 Ordered Datastores API
  ORDERED_DATASTORES_LIST: 'https://apis.roblox.com/ordered-data-stores/v1/universes/{universeId}/orderedDataStores',
  ORDERED_DATASTORES_ENTRIES: 'https://apis.roblox.com/ordered-data-stores/v1/universes/{universeId}/orderedDataStores/{orderedDataStore}/scopes/{scope}/entries',
  
  // Open Cloud v2 Place Publishing API
  PLACE_PUBLISHING: 'https://apis.roblox.com/universes/v1/{universeId}/places/{placeId}/versions'
};

/**
 * Replace placeholders in a URL with actual values
 * @param {string} url - URL with placeholders like {assetId}
 * @param {Object} params - Object with param values, e.g. { assetId: '12345' }
 * @returns {string} The URL with placeholders replaced
 */
function formatUrl(url, params = {}) {
  let formattedUrl = url;
  
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{${key}}`;
    formattedUrl = formattedUrl.replace(placeholder, value);
  }
  
  return formattedUrl;
}

module.exports = {
  ACCESSIBLE_ENDPOINTS,
  PROTECTED_ENDPOINTS,
  formatUrl
};