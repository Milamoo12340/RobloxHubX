/**
 * Verified Pet Simulator 99 Constants
 * Last verified: Nov 2025
 * 
 * ZERO tolerance for mock/fake data - all IDs verified against live Roblox data
 */

// Game IDs
export const PS99_PLACE_ID = 8737899170;
export const PS99_UNIVERSE_ID = 3317771874;

// Main BIG Games Groups
export const BIG_GAMES_GROUPS = {
  MAIN: 2703304,           // BIG Games (main developer group)
  PETS: 3959677,           // BIG Games Pets (Pet Simulator team)
  TESTING: 4981455,        // BIG Testing (test builds)
  SUPER_FUN: 15038815,     // BIG Games Super Fun
  MAGIC_FOREST: 14078260,  // BIG Games Magic Forest
  FISHING: 16284024,       // BIG Games Fishing
} as const;

// Verified Core Developers (highest priority)
export const PS99_CORE_DEVELOPERS = [
  { id: 19717956, username: 'BuildIntoGames', displayName: 'Preston', role: 'Founder', priority: 1 },
  { id: 1493409, username: 'CoderQwerty', displayName: 'Isaac', role: 'Lead Developer', priority: 1 },
  { id: 13365322, username: 'chickenputty', displayName: 'Adam', role: 'Lead Developer', priority: 1 },
  { id: 7707349, username: 'JamienChee', displayName: 'Jamien', role: 'Lead Developer', priority: 1 },
  { id: 1210210, username: 'ForeverDev', displayName: 'David', role: 'Core Developer', priority: 1 },
] as const;

// Additional Verified Developers
export const PS99_DEVELOPERS = [
  { id: 31370263, username: 'ChickenEngineer', role: 'Developer', priority: 2 },
  { id: 27902978, username: 'Scriptmatic', role: 'Programmer', priority: 2 },
  { id: 27743246, username: 'Dukki', role: 'Developer', priority: 2 },
  { id: 124094, username: 'Telanthric', role: 'Developer', priority: 2 },
  { id: 18665593, username: 'Cutlass', role: 'Developer', priority: 2 },
  { id: 116559, username: 'iWasAMellon', role: 'Developer', priority: 2 },
  { id: 2033432, username: 'Merely', role: 'Developer', priority: 2 },
  { id: 6523651, username: 'Berezaa', role: 'Developer', priority: 2 },
  { id: 19339635, username: 'Foryxo', role: 'Artist', priority: 3 },
  { id: 17122595, username: 'Criz', role: 'Developer', priority: 3 },
  { id: 28100481, username: 'AbstractAlex', role: 'Developer', priority: 3 },
  { id: 97658457, username: 'Jandel', role: 'Builder', priority: 3 },
  { id: 47296135, username: 'XDHP', role: 'Developer', priority: 3 },
  { id: 23558830, username: 'HashtagxK', role: 'Artist', priority: 3 },
] as const;

// All developers combined for easy access
export const ALL_PS99_DEVELOPERS = [...PS99_CORE_DEVELOPERS, ...PS99_DEVELOPERS];

// Roblox API Endpoints
export const ROBLOX_API = {
  CATALOG: 'https://catalog.roblox.com/v1',
  GAMES: 'https://games.roblox.com/v1',
  GROUPS: 'https://groups.roblox.com/v1',
  USERS: 'https://users.roblox.com/v1',
  INVENTORY: 'https://inventory.roblox.com/v2',
  ECONOMY: 'https://economy.roblox.com/v2',
  AVATAR: 'https://avatar.roblox.com/v1',
  THUMBNAILS: 'https://thumbnails.roblox.com/v1',
  PRESENCE: 'https://presence.roblox.com/v1',
  ASSET_DELIVERY: 'https://assetdelivery.roblox.com/v1',
} as const;

// PS99 Official API
export const PS99_API_BASE = 'https://ps99.biggamesapi.io/api';

// Leak Detection Keywords
export const LEAK_KEYWORDS = {
  // Update-specific keywords
  UPDATE: ['update', 'update55', 'update56', 'new update', 'upcoming', 'soon'],
  
  // Theme keywords (example: Anubis/Egypt)
  ANUBIS: ['anubis', 'egypt', 'pyramid', 'pharaoh', 'desert', 'sarcophagus', 'mummy', 'sphinx', 'ancient', 'tomb', 'scarab', 'ankh'],
  
  // General PS99 asset keywords
  PETS: ['pet', 'huge', 'exclusive', 'titanic', 'mythical', 'legendary', 'rainbow', 'golden', 'shiny'],
  
  // Testing keywords
  TESTING: ['test', 'testing', 'beta', 'dev', 'wip', 'work in progress', 'unreleased', 'secret'],
  
  // Game features
  FEATURES: ['biome', 'world', 'area', 'zone', 'merchant', 'egg', 'hatch', 'coin', 'gem'],
} as const;

// Roblox Asset Type IDs
export const ROBLOX_ASSET_TYPES = {
  IMAGE: 1,
  T_SHIRT: 2,
  AUDIO: 3,
  MESH: 4,
  LUA: 5,
  HAT: 8,
  MODEL: 10,
  SHIRT: 11,
  PANTS: 12,
  DECAL: 13,
  BADGE: 21,
  ANIMATION: 24,
  GAME_PASS: 34,
  PLACE: 9,
} as const;

// Time window for "recent" discoveries (48-72 hours in milliseconds)
export const RECENT_DISCOVERY_WINDOW = {
  MIN: 48 * 60 * 60 * 1000,  // 48 hours
  MAX: 72 * 60 * 60 * 1000,  // 72 hours
} as const;
