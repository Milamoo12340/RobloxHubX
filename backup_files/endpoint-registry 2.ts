/**
 * Central registry of all Roblox API endpoints for asset scanning
 * 
 * This file contains both:
 * 1. ACCESSIBLE_ENDPOINTS - Endpoints that work without authentication
 * 2. PROTECTED_ENDPOINTS - Endpoints that need bypassing/authentication (to implement later)
 * 
 * Placeholders can be used in URLs: {groupId}, {assetId}, {placeId}, etc.
 */

// Define all endpoint key types for type safety
export type EndpointKey = 
  // Group endpoints
  | 'GROUP_INFO' | 'GROUP_GAMES' | 'GROUP_ROLES' | 'GROUP_RELATIONSHIPS'
  | 'GROUP_WALL' | 'GROUP_MEMBERS' | 'GROUP_MEMBERSHIP_REQUESTS'
  | 'GROUP_AUDIT_LOG' | 'GROUP_POLICIES' | 'GROUP_SETTINGS'
  // Catalog endpoints
  | 'CATALOG_SEARCH' | 'MARKETPLACE_ITEMS' | 'CATALOG_RECENT' | 'CATALOG_BY_CREATOR' | 'CATALOG_SIMILAR'
  // Game endpoints
  | 'GAME_INFO' | 'GAME_STATS' | 'GAME_PASSES' | 'GAME_SOCIAL' | 'GAME_BADGES'
  | 'GAME_PRODUCTS' | 'GAME_SERVERS' | 'GAME_ICON' | 'GAME_THUMBNAILS'
  // Asset endpoints
  | 'ASSET_INFO' | 'ASSET_FAVORITES' | 'ASSET_RESELLERS' | 'ASSET_BUNDLES' 
  | 'ASSET_RECOMMENDATIONS' | 'ASSET_OWNERS' | 'ASSET_COMMENTS' | 'ASSET_CONTENTS' | 'ASSET_MEDIA'
  | 'ASSET_DELIVERY_BY_ID' | 'ASSET_DELIVERY_VERSION_BY_ID'
  // Thumbnails
  | 'ASSET_THUMBNAIL' | 'GAME_ICONS' | 'GAME_THUMBNAIL' | 'BUNDLE_THUMBNAIL'
  // Web pages
  | 'GROUP_PAGE' | 'GAME_PAGE' | 'LIBRARY_PAGE' | 'MARKETPLACE_PAGE'
  // Marketplace categories
  | 'MARKETPLACE_MODELS' | 'MARKETPLACE_MESHES' | 'MARKETPLACE_MESHPARTS'
  | 'MARKETPLACE_ANIMATIONS' | 'MARKETPLACE_DECALS' | 'MARKETPLACE_AUDIO'
  | 'MARKETPLACE_SCRIPTS' | 'MARKETPLACE_PLUGINS'
  // CDN endpoints
  | 'CDN_MODELS' | 'CDN_MESHES'
  // Creator Hub
  | 'CREATOR_HUB_MODELS' | 'CREATOR_HUB_MESHES' | 'CREATOR_HUB_IMAGES'
  | 'CREATOR_HUB_AUDIO' | 'CREATOR_HUB_ANIMATIONS'
  // Testing
  | 'TEST_SITE_GAMES' | 'PRIVATE_SERVERS'
  // User
  | 'USER_INVENTORY' | 'USER_CREATIONS' | 'USER_PROFILE'
  // Game Pass
  | 'GAME_PASS_INFO' | 'GAME_PASS_DETAILS' | 'GAME_PASS_THUMBNAIL'
  // Badges 
  | 'BADGES_API' | 'BADGE_INFO' | 'BADGE_THUMBNAIL' | 'BADGE_UPDATE' | 'BADGE_CREATE'
  | 'BADGE_ICONS' | 'BADGE_LOCALIZATION'
  // Developer Products
  | 'DEVELOPER_PRODUCTS' | 'DEVELOPER_PRODUCT_DETAILS' | 'DEVELOPER_PRODUCT_LOCALIZATION'
  // Bundles
  | 'BUNDLES' | 'BUNDLES_THUMBNAIL'
  // Asset Variants
  | 'ASSET_VERSIONS'
  // Creator Store (From Toolbox Service)
  | 'CREATOR_STORE_SEARCH'
  | 'CREATOR_STORE_ASSET_DETAILS'
  | 'CREATOR_STORE_CATEGORIES'
  // Team Create
  | 'TEAM_CREATE_SETTINGS' | 'TEAM_CREATE_MEMBERS'
  // Universe Management
  | 'UNIVERSE_ACTIVATE' | 'UNIVERSE_DEACTIVATE' | 'UNIVERSE_PERMISSIONS'
  // Followings
  | 'USER_FOLLOW_UNIVERSE' | 'USER_UNFOLLOW_UNIVERSE' | 'USER_FOLLOWING_STATUS' | 'USER_FOLLOWINGS'
  // Experience endpoints (discovered from Rodux repository)
  | 'EXPERIENCE_CONFIGURATION' | 'EXPERIENCE_MEDIA' | 'EXPERIENCE_DETAILS'
  // Lua Script Analysis (discovered from Rodux)
  | 'LUA_SCRIPT_ANALYSIS' | 'LUA_SCRIPTS_BULK'
  // Place Configuration (discovered from Rodux)
  | 'PLACE_CONFIGURATION' | 'PLACE_COMPATIBILITY' | 'PLACE_STATISTICS'
  // Avatar endpoints (discovered from Rodux)
  | 'AVATAR_ASSETS' | 'AVATAR_OUTFIT' | 'AVATAR_METADATA';

export const ACCESSIBLE_ENDPOINTS: Record<EndpointKey, string> = {
  // Group endpoints
  GROUP_INFO: 'https://groups.roblox.com/v1/groups/{groupId}',
  GROUP_GAMES: 'https://games.roblox.com/v2/groups/{groupId}/games',
  GROUP_ROLES: 'https://groups.roblox.com/v1/groups/{groupId}/roles',
  GROUP_RELATIONSHIPS: 'https://groups.roblox.com/v1/groups/{groupId}/relationships',
  GROUP_WALL: 'https://groups.roblox.com/v1/groups/{groupId}/wall/posts?limit=25&sortOrder=Desc',
  GROUP_MEMBERS: 'https://groups.roblox.com/v1/groups/{groupId}/users?limit=10',
  GROUP_MEMBERSHIP_REQUESTS: 'https://groups.roblox.com/v1/groups/{groupId}/join-requests',
  GROUP_AUDIT_LOG: 'https://apis.roblox.com/legacy-groups/v1/groups/{groupId}/audit-log',
  GROUP_POLICIES: 'https://apis.roblox.com/legacy-groups/v1/groups/policies',
  GROUP_SETTINGS: 'https://apis.roblox.com/legacy-groups/v1/groups/{groupId}/settings',
  
  // Catalog/Marketplace endpoints
  CATALOG_SEARCH: 'https://catalog.roblox.com/v1/search/items?category=All&limit=30&sortType=RecentlyUpdated',
  MARKETPLACE_ITEMS: 'https://economy.roblox.com/v2/search/items?category=All&limit=30&sortType=RecentlyUpdated',
  CATALOG_RECENT: 'https://catalog.roblox.com/v1/search/items/details?Category=All&Subcategory=All&CreatorName=BigGames&SortType=Recent&Limit=30',
  CATALOG_BY_CREATOR: 'https://catalog.roblox.com/v1/search/items?category=All&creatorTargetId={creatorId}&creatorType=Group&limit=30',
  CATALOG_SIMILAR: 'https://catalog.roblox.com/v1/similar-items/recommendations?assetTypeId=All&assetId={assetId}',
  
  // Game endpoints
  GAME_INFO: 'https://games.roblox.com/v1/games/votes?universeIds={universeIds}',
  GAME_STATS: 'https://games.roblox.com/v1/games?universeIds={universeIds}',
  GAME_PASSES: 'https://games.roblox.com/v1/games/{universeId}/game-passes?limit=50&sortOrder=Asc',
  GAME_SOCIAL: 'https://games.roblox.com/v1/games/{universeId}/social-links',
  GAME_BADGES: 'https://badges.roblox.com/v1/universes/{universeId}/badges?limit=100&sortOrder=Asc',
  GAME_PRODUCTS: 'https://games.roblox.com/v1/games/{universeId}/developer-products?limit=50',
  GAME_SERVERS: 'https://games.roblox.com/v1/games/{placeId}/servers/Public?limit=25&sortOrder=Asc',
  GAME_ICON: 'https://apis.roblox.com/legacy-game-internationalization/v1/game-icon/games/{gameId}',
  GAME_THUMBNAILS: 'https://apis.roblox.com/legacy-game-internationalization/v1/game-thumbnails/games/{gameId}/language-codes/en/image',
  
  // Asset endpoints
  ASSET_INFO: 'https://economy.roblox.com/v2/assets/{assetId}/details',
  ASSET_FAVORITES: 'https://catalog.roblox.com/v1/favorites/assets/{assetId}/count',
  ASSET_RESELLERS: 'https://economy.roblox.com/v1/assets/{assetId}/resellers?limit=10',
  ASSET_BUNDLES: 'https://catalog.roblox.com/v1/assets/{assetId}/bundles',
  ASSET_RECOMMENDATIONS: 'https://catalog.roblox.com/v1/assets/{assetId}/recommendations?maxRows=50',
  ASSET_OWNERS: 'https://inventory.roblox.com/v2/assets/{assetId}/owners?limit=50&sortOrder=Asc',
  ASSET_COMMENTS: 'https://www.roblox.com/comments/get-json?assetId={assetId}&startIndex=0&maxRows=50',
  ASSET_CONTENTS: 'https://api.roblox.com/marketplace/productinfo?assetId={assetId}',
  ASSET_MEDIA: 'https://www.roblox.com/library/get-asset-media?assetId={assetId}',
  ASSET_DELIVERY_BY_ID: 'https://apis.roblox.com/asset-delivery-api/v1/assetId/{assetId}',
  ASSET_DELIVERY_VERSION_BY_ID: 'https://apis.roblox.com/asset-delivery-api/v1/assetId/{assetId}/version/{versionNumber}',
  
  // Thumbnails
  ASSET_THUMBNAIL: 'https://thumbnails.roblox.com/v1/assets?assetIds={assetId}&size=420x420&format=Png',
  GAME_ICONS: 'https://thumbnails.roblox.com/v1/games/icons?universeIds={universeIds}&size=512x512&format=Png',
  GAME_THUMBNAIL: 'https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds={universeId}&size=768x432&format=Png',
  BUNDLE_THUMBNAIL: 'https://thumbnails.roblox.com/v1/bundles/thumbnails?bundleIds={bundleId}&size=420x420&format=Png',
  
  // Web pages (HTML)
  GROUP_PAGE: 'https://www.roblox.com/groups/{groupId}/about',
  GAME_PAGE: 'https://www.roblox.com/games/{placeId}',
  LIBRARY_PAGE: 'https://www.roblox.com/develop/library?CatalogContext=Studio&Category=Model&CreatorName=BigGames',
  MARKETPLACE_PAGE: 'https://create.roblox.com/marketplace/models?keyword=pet%20simulator',
  
  // Marketplace categories
  MARKETPLACE_MODELS: 'https://www.roblox.com/develop/library?CatalogContext=Studio&Category=Model&Subcategory=ClassicModel',
  MARKETPLACE_MESHES: 'https://www.roblox.com/develop/library?CatalogContext=Studio&Category=Model&Subcategory=Mesh',
  MARKETPLACE_MESHPARTS: 'https://www.roblox.com/develop/library?CatalogContext=Studio&Category=Model&Subcategory=MeshPart',
  MARKETPLACE_ANIMATIONS: 'https://www.roblox.com/develop/library?CatalogContext=Studio&Category=Animation',
  MARKETPLACE_DECALS: 'https://www.roblox.com/develop/library?CatalogContext=Studio&Category=Image',
  MARKETPLACE_AUDIO: 'https://www.roblox.com/develop/library?CatalogContext=Studio&Category=Audio',
  MARKETPLACE_SCRIPTS: 'https://www.roblox.com/develop/library?CatalogContext=Studio&Category=LuaScript',
  MARKETPLACE_PLUGINS: 'https://www.roblox.com/develop/library?CatalogContext=Studio&Category=Plugin',
  
  // CDN endpoints
  CDN_MODELS: 'https://assetdelivery.roblox.com/v1/asset/?id={assetId}',
  CDN_MESHES: 'https://assetdelivery.roblox.com/v1/asset/?id={assetId}',
  
  // Roblox Creator Hub pages
  CREATOR_HUB_MODELS: 'https://create.roblox.com/marketplace/models?keyword=pet%20simulator',
  CREATOR_HUB_MESHES: 'https://create.roblox.com/marketplace/meshes',
  CREATOR_HUB_IMAGES: 'https://create.roblox.com/marketplace/images',
  CREATOR_HUB_AUDIO: 'https://create.roblox.com/marketplace/audio',
  CREATOR_HUB_ANIMATIONS: 'https://create.roblox.com/marketplace/animations',
  
  // Testing Servers and Environments
  TEST_SITE_GAMES: 'https://www.roblox.com/games/{placeId}/#!/game-instances',
  PRIVATE_SERVERS: 'https://www.roblox.com/games/{placeId}/#!/private-servers',
  
  // User-based endpoints
  USER_INVENTORY: 'https://www.roblox.com/users/inventory/list-json?assetTypeId=10&cursor=&itemsPerPage=50&userId={userId}',
  USER_CREATIONS: 'https://www.roblox.com/users/{userId}/inventory#!/created',
  USER_PROFILE: 'https://www.roblox.com/users/{userId}/profile',
  
  // Game Pass Endpoints
  GAME_PASS_INFO: 'https://games.roblox.com/v1/games/{universeId}/game-passes?limit=100',
  GAME_PASS_DETAILS: 'https://api.roblox.com/marketplace/game-pass-product-info?gamePassId={gamePassId}',
  GAME_PASS_THUMBNAIL: 'https://thumbnails.roblox.com/v1/game-passes?gamePassIds={gamePassIds}&size=512x512&format=Png',
  
  // Badges Endpoints
  BADGES_API: 'https://badges.roblox.com/v1/universes/{universeId}/badges?limit=100&sortOrder=Asc',
  BADGE_INFO: 'https://badges.roblox.com/v1/badges/{badgeId}',
  BADGE_THUMBNAIL: 'https://thumbnails.roblox.com/v1/badges?badgeIds={badgeIds}&size=150x150&format=Png',
  BADGE_UPDATE: 'https://badges.roblox.com/v1/badges/{badgeId}',
  BADGE_CREATE: 'https://badges.roblox.com/v1/universes/{universeId}/badges',
  BADGE_ICONS: 'https://apis.roblox.com/legacy-badge-localization/v1/badge-icons/badges/{badgeId}',
  BADGE_LOCALIZATION: 'https://apis.roblox.com/legacy-badge-localization/v1/badge-localization/universes/{universeId}/badges',
  
  // Developer Products
  DEVELOPER_PRODUCTS: 'https://games.roblox.com/v1/games/{universeId}/developer-products?limit=100',
  DEVELOPER_PRODUCT_DETAILS: 'https://economy.roblox.com/v1/developer-products/{productId}',
  DEVELOPER_PRODUCT_LOCALIZATION: 'https://apis.roblox.com/legacy-developer-product-localization/v1/developer-product-localization/universes/{universeId}/developer-products',
  
  // Bundle Endpoints
  BUNDLES: 'https://catalog.roblox.com/v1/bundles/{bundleId}/details',
  BUNDLES_THUMBNAIL: 'https://thumbnails.roblox.com/v1/bundles/thumbnails?bundleIds={bundleIds}&size=420x420&format=Png',
  
  // Asset Variants
  ASSET_VERSIONS: 'https://assetdelivery.roblox.com/v1/asset/?id={assetId}&version={version}',
  
  // Creator Store (Toolbox Service) endpoints
  CREATOR_STORE_SEARCH: 'https://apis.roblox.com/toolbox-service/v2/assets:search?searchCategoryType={category}&keyword={keyword}&limit={limit}&cursor={cursor}&includeArchived={includeArchived}',
  CREATOR_STORE_ASSET_DETAILS: 'https://apis.roblox.com/toolbox-service/v1/assets/{assetId}',
  CREATOR_STORE_CATEGORIES: 'https://apis.roblox.com/toolbox-service/v1/categories',
  
  // Team Create
  TEAM_CREATE_SETTINGS: 'https://apis.roblox.com/legacy-team-create/v1/places/{placeId}/settings',
  TEAM_CREATE_MEMBERS: 'https://apis.roblox.com/legacy-team-create/v1/places/{placeId}/members',
  
  // Universe Management
  UNIVERSE_ACTIVATE: 'https://apis.roblox.com/universe-management-api/v1/universes/{universeId}/deactivation-status',
  UNIVERSE_DEACTIVATE: 'https://apis.roblox.com/universe-management-api/v1/universes/{universeId}/activation-status',
  UNIVERSE_PERMISSIONS: 'https://apis.roblox.com/universe-management-api/v1/universes/{universeId}/permissions',
  
  // User Following
  USER_FOLLOW_UNIVERSE: 'https://apis.roblox.com/user-followings-api/v1/followings/{userId}/universes/{universeId}',
  USER_UNFOLLOW_UNIVERSE: 'https://apis.roblox.com/user-followings-api/v1/followings/{userId}/universes/{universeId}',
  USER_FOLLOWING_STATUS: 'https://apis.roblox.com/user-followings-api/v1/followings/{userId}/universes/{universeId}/status',
  USER_FOLLOWINGS: 'https://apis.roblox.com/user-followings-api/v1/followings/{userId}/universes',
  
  // Experience endpoints (discovered from Rodux repository)
  EXPERIENCE_CONFIGURATION: 'https://apis.roblox.com/experience-configuration-api/v1/universes/{universeId}/configuration',
  EXPERIENCE_MEDIA: 'https://apis.roblox.com/experience-media-service/v1/universes/{universeId}/media',
  EXPERIENCE_DETAILS: 'https://apis.roblox.com/experience-management-api/v1/universes/{universeId}/details',
  
  // Lua Script Analysis (discovered from Rodux)
  LUA_SCRIPT_ANALYSIS: 'https://apis.roblox.com/lua-script-analysis-api/v1/analyses/{analysisId}',
  LUA_SCRIPTS_BULK: 'https://apis.roblox.com/lua-script-analysis-api/v1/scripts/bulk-analyze',
  
  // Place Configuration (discovered from Rodux)
  PLACE_CONFIGURATION: 'https://apis.roblox.com/place-configuration-api/v1/places/{placeId}/configuration',
  PLACE_COMPATIBILITY: 'https://apis.roblox.com/place-compatibility-api/v1/places/{placeId}/compatibility',
  PLACE_STATISTICS: 'https://apis.roblox.com/game-instances-api/v1/places/{placeId}/statistics',
  
  // Avatar endpoints (discovered from Rodux)
  AVATAR_ASSETS: 'https://avatar.roblox.com/v1/users/{userId}/avatar/assets',
  AVATAR_OUTFIT: 'https://avatar.roblox.com/v1/users/{userId}/outfits',
  AVATAR_METADATA: 'https://avatar.roblox.com/v1/avatar/metadata',
};

// Endpoints that need authentication/bypassing - for future implementation
export const PROTECTED_ENDPOINTS = {
  // Asset delivery endpoints
  ASSET_DELIVERY_LEGACY: 'https://assetdelivery.roblox.com/v1/asset/?id={assetId}',
  ASSET_DELIVERY_NEW: 'https://assetdelivery.roblox.com/v2/asset?id={assetId}',
  ASSET_DELIVERY_BATCH: 'https://assetdelivery.roblox.com/v1/assets/batch',
  
  // Legacy Open Cloud APIs (from documentation)
  // Asset Delivery API 
  ASSET_DELIVERY_OPEN_CLOUD: 'https://apis.roblox.com/asset-delivery-api/v1/assetId/{assetId}',
  ASSET_DELIVERY_VERSION_OPEN_CLOUD: 'https://apis.roblox.com/asset-delivery-api/v1/assetId/{assetId}/version/{versionNumber}',
  
  // Legacy Groups API
  GROUPS_AUDIT_LOG: 'https://apis.roblox.com/legacy-groups/v1/groups/{groupId}/audit-log',
  GROUPS_POLICIES: 'https://apis.roblox.com/legacy-groups/v1/groups/policies',
  GROUPS_SETTINGS: 'https://apis.roblox.com/legacy-groups/v1/groups/{groupId}/settings',
  GROUPS_STATUS: 'https://apis.roblox.com/legacy-groups/v1/groups/{groupId}/status',
  GROUPS_DESCRIPTION: 'https://apis.roblox.com/legacy-groups/v1/groups/{groupId}/description',
  GROUPS_PENDING_JOINS: 'https://apis.roblox.com/legacy-groups/v1/user/groups/pending',
  
  // Legacy Localization Tables API
  LOCALIZATION_TABLES_METADATA: 'https://apis.roblox.com/legacy-localization-tables/v1/autolocalization/metadata',
  LOCALIZATION_TABLES_CREATE: 'https://apis.roblox.com/legacy-localization-tables/v1/autolocalization/games/{gameId}/autolocalizationtable',
  LOCALIZATION_TABLES_SETTINGS: 'https://apis.roblox.com/legacy-localization-tables/v1/autolocalization/games/{gameId}/settings',
  LOCALIZATION_TABLES_GET: 'https://apis.roblox.com/legacy-localization-tables/v1/localization-table/tables/{tableId}',
  
  // Legacy Publish API
  PUBLISH_BADGE_ICON: 'https://apis.roblox.com/legacy-publish/v1/badges/{badgeId}/icon',
  
  // Development APIs - need authentication
  DEVELOP_API: 'https://develop.roblox.com/v1/universes/{universeId}',
  PLACE_CONFIGURATION: 'https://develop.roblox.com/v1/places/{placeId}',
  
  // Creator marketplace
  CREATOR_MARKETPLACE: 'https://apis.roblox.com/marketplace-sales/v1/items/details',
  CREATOR_DASHBOARD: 'https://create.roblox.com/dashboard/creations?activeTab=Model',
  
  // Avatar APIs
  AVATAR_ASSETS: 'https://avatar.roblox.com/v1/recent-items/all/list',
  AVATAR_CATALOG: 'https://avatar.roblox.com/v1/recent-items/Asset/list',
  
  // Game pass/developer products
  GAME_PASS_INFO: 'https://www.roblox.com/game-pass/{gamePassId}',
  DEV_PRODUCTS: 'https://www.roblox.com/places/{placeId}/developerproducts',
  
  // Content endpoints
  MESH_CONTENT: 'https://data.roblox.com/Data/Upload.ashx?assetid={assetId}',
  PACKAGE_CONTENTS: 'https://data.roblox.com/Data/Package.ashx?id={assetId}',
  
  // Open Cloud v2 APIs (needs API key)
  OPEN_CLOUD: 'https://apis.roblox.com/assets/v1/assets',
  OPEN_CLOUD_GET: 'https://apis.roblox.com/assets/v1/assets/{assetId}',
  
  // Open Cloud DataStore APIs (needs API key)
  DATASTORE_LIST: 'https://apis.roblox.com/datastores/v1/universes/{universeId}/standard-datastores',
  DATASTORE_ENTRIES: 'https://apis.roblox.com/datastores/v1/universes/{universeId}/standard-datastores/{datastoreName}/entries',
  DATASTORE_ENTRY: 'https://apis.roblox.com/datastores/v1/universes/{universeId}/standard-datastores/{datastoreName}/entries/{entryKey}',
  
  // Open Cloud MemoryStore APIs (needs API key)
  MEMORYSTORE_LIST: 'https://apis.roblox.com/memory-stores/v1/universes/{universeId}/memory-stores',
  MEMORYSTORE_ENTRIES: 'https://apis.roblox.com/memory-stores/v1/universes/{universeId}/memory-stores/{memorystoreName}/entries',
  
  // Open Cloud Messaging APIs (needs API key)
  MESSAGING_PUBLISH: 'https://apis.roblox.com/messaging-service/v1/universes/{universeId}/topics/{topic}',
  
  // Open Cloud Place APIs (needs API key)
  PLACE_PUBLISH: 'https://apis.roblox.com/universes/v1/{universeId}/places/{placeId}/versions',
  PLACE_INFO: 'https://apis.roblox.com/universes/v1/{universeId}/places/{placeId}',
  PLACE_LIST: 'https://apis.roblox.com/universes/v1/{universeId}/places',
  
  // Open Cloud Avatar APIs (needs API key)
  AVATAR_GET: 'https://apis.roblox.com/users/v1/{userId}/avatar',
  
  // Legacy Badges API
  BADGES_UPDATE: 'https://apis.roblox.com/legacy-badges/v1/badges/{badgeId}',
  BADGES_CREATE: 'https://apis.roblox.com/legacy-badges/v1/universes/{universeId}/badges',
  
  // Legacy Develop API
  TEAMCREATE_SETTINGS: 'https://apis.roblox.com/legacy-develop/v1/universes/{universeId}/teamcreate',
  TEAMCREATE_MEMBERS: 'https://apis.roblox.com/legacy-develop/v1/places/{placeId}/teamcreate/active_session/members',
  TEAMCREATE_CLOSE: 'https://apis.roblox.com/legacy-develop/v2/teamtest/{placeId}',
  UNIVERSE_ACTIVATE: 'https://apis.roblox.com/legacy-develop/v1/universes/{universeId}/activate',
  UNIVERSE_DEACTIVATE: 'https://apis.roblox.com/legacy-develop/v1/universes/{universeId}/deactivate',
  
  // Legacy Followings API
  FOLLOW_UNIVERSE: 'https://apis.roblox.com/legacy-followings/v1/users/{userId}/universes/{universeId}',
  GET_FOLLOWING_STATUS: 'https://apis.roblox.com/legacy-followings/v1/users/{userId}/universes/{universeId}/status',
  GET_FOLLOWINGS: 'https://apis.roblox.com/legacy-followings/v1/users/{userId}/universes',
  GET_FOLLOWINGS_V2: 'https://apis.roblox.com/legacy-followings/v2/users/{userId}/universes',
  
  // Legacy Internationalization API
  BADGE_LOCALIZED_ICONS: 'https://apis.roblox.com/legacy-game-internationalization/v1/badges/{badgeId}/icons',
  BADGE_LOCALIZED_NAMES: 'https://apis.roblox.com/legacy-game-internationalization/v1/badges/{badgeId}/name-description',
  GAMEPASS_LOCALIZED_ICONS: 'https://apis.roblox.com/legacy-game-internationalization/v1/game-passes/{gamePassId}/icons',
  GAMEPASS_LOCALIZED_NAMES: 'https://apis.roblox.com/legacy-game-internationalization/v1/game-passes/{gamePassId}/name-description',
  DEVPRODUCT_LOCALIZED_ICONS: 'https://apis.roblox.com/legacy-game-internationalization/v1/developer-products/{developerProductId}/icons',
  GAME_LOCALIZED_ICONS: 'https://apis.roblox.com/legacy-game-internationalization/v1/game-icon/games/{gameId}',
  GAME_LOCALIZED_THUMBNAILS: 'https://apis.roblox.com/legacy-game-internationalization/v1/game-thumbnails/games/{gameId}/language-codes/{languageCode}/image',
  
  // Private testing servers and sites
  TEST_SITES: 'https://gametest.roblox.com/game-instances/v1/games/{placeId}/servers/Public',
  
  // Social graph/presence
  PRESENCE: 'https://presence.roblox.com/v1/presence/users',
};

// Common HTTP headers to try when making requests
export const HTTP_HEADERS = {
  // Standard headers
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.roblox.com',
  'Referer': 'https://www.roblox.com/',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  // Default headers for convenience
  DEFAULT: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.roblox.com',
    'Referer': 'https://www.roblox.com/',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
};

export default {
  ACCESSIBLE_ENDPOINTS,
  PROTECTED_ENDPOINTS,
  HTTP_HEADERS
};