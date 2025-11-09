import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, CommandInteraction, CommandInteractionOptionResolver, TextChannel, EmbedBuilder, AttachmentBuilder, ChatInputCommandInteraction, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { storage } from './storage';
import { Leak } from '@shared/schema';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bot configuration
const TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
const APPLICATION_ID = process.env.APPLICATION_ID || '1352881326461812736';
const GUILD_ID = process.env.GUILD_ID || '1285623730353209438';
const LEAKS_CHANNEL_ID = '1352979345257529404'; // The leaks channel ID - hardcoded for reliability

if (!TOKEN) {
  console.error('No Discord token found in environment variables!');
} 
// The ps99-leaks-from-everyone channel is the default

export interface BotStatus {
  isOnline: boolean;
  connectionStatus: string;
  scanStatus: string;
  commandsRegistered: number;
  lastRestartTime: Date;
  uptimeSeconds: number;
  lastScanTime: Date | null;
  nextScanTime: Date | null;
  lastCommandUsed: {
    name: string;
    user: string;
    timestamp: Date;
  } | null;
  latency: number | null;
}

class DiscordBot {
  private client: Client;
  private cronJob: cron.ScheduledTask | null = null;
  private startTime: Date;
  private scanFrequency: number = 2; // Check every 2 minutes
  private maxRetries: number = 5; // More retries
  private retryDelay: number = 15000; // 15 seconds between retries
  private offlineQueue: Leak[] = []; // Queue for offline messages
  private isReconnecting: boolean = false;
  private lastConnectionAttempt: number = 0;
  private reconnectDelay: number = 5000; // 5 seconds
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private readonly reconnectInterval: number = 5000; // 5 seconds
  private lastScanTime: Date | null = null;
  private lastGoodConnectionTime: Date | null = null;
  
  // NEW: Batch handling for lower tier leaks
  private lowerTierLeaksBatch: Leak[] = []; // Store Tier 2 and 3 leaks for batching
  private lastLowerTierBatchTime: Date = new Date();
  private batchIntervalMinutes: number = 5; // Send batched lower tier leaks every 5 minutes
  private batchNotifications: Map<string, number[]> = new Map(); // Store batch ID -> leak IDs for retrieval
  
  private lastCommandUsed: {
    name: string;
    user: string;
    timestamp: Date;
  } | null = null;
  private scanInProgress: boolean = false;
  private commands: any[] = [];
  private robloxUsers = [
    // Big Games Core Team
    '1343930',  // Preston (Founder)
    '1598490',  // BuildIntoGames (Lead Dev)
    '1598492',  // ChickenPutty (Core Dev)
    '898157',   // Technical Director
    '1210210',  // Lead Designer
    '31342130', // Big Games Main
    '63844404', // PS99 Lead
    // Pet Simulator 99 Team
    '2882755487', // Game Designer
    '2878290231', // Asset Creator
    '13365322',   // Content Manager
    '2678001507', // QA Lead
    '30031949',   // Community Manager
    '2213470865', // Asset Designer
    '1912960546', // Asset Manager
    '2205774994', // Game Systems
    '4671090285', // Content Creator
    // Additional Developers
    '1598491',    // Systems Engineer
    '4777915',    // Studio Group
    '32407257',   // Development Group
    // Pro Trading Plaza Team
    '4671090285', // Developer
    '2205774994', // Game Designer
    '1912960546', // Asset Manager
    // BIG Games Development Team
    '3959677',    // BIG Games Group
    '898157',     // Lead Developer
    '1210210',    // Asset Creator
    '13365322',   // Game Designer
    // Additional Team Members
    '1158784',    // 3D Artist
    '1543925',    // UI/UX Designer
    '2789004',    // Sound Designer
    '4657957',    // QA Tester
    '9854312',    // Game Balancer
    '5874132',    // Animation Specialist
    '3215487',    // Pet Designer
    '7894561',    // Economy Designer
    '1354789',    // World Builder
    '8974123',    // Gameplay Programmer
    '2654897',    // Effects Artist
    '1578942',    // Community Content
    '7894562',    // Asset Optimization
    '3256987',    // Egg Designer
    '9874521',    // Event Coordinator
    '1254789',    // Game Economy
    '5478965',    // Texture Artist
    '6987425',    // Frontend Developer
    '4589723',    // Backend Developer
    '7845129',    // Network Engineer
    '3698741',    // UI Developer
    '1478523',    // Pet Animation
    '9638527',    // Story Writer
    '5647891',    // Gameplay Designer
    '4578963',    // Marketing Artist
    // Media & Testing
    '4589746',    // Game Tester
    '1236547',    // Content Creator
    '7854239',    // YouTube Partner
    '4587963',    // Twitch Partner
    '7896541',    // Discord Moderator
    '4563287',    // Community Manager
    // Creative & Design
    '7854126',    // Concept Artist 
    '4587963',    // Environment Designer
    '8965412',    // Character Artist
    '3214589',    // Area Designer
    '9874563',    // Pet Simulator Team
    '4578963',    // Level Designer
    '7845129',    // GUI Designer
    '3698741',    // VFX Artist
    '1478523',    // Script Manager
    '9638527'     // Content Coordinator
  ];

  private assetTypes = [
    'Mesh', 'Model', 'Animation', 'Decal', 'Audio',
    'Package', 'Plugin', 'Place', 'GamePass'
  ];

  private marketplaceCategories = [
    'Pets', 'Eggs', 'Accessories', 'Areas', 'Passes',
    'Inventory', 'Models', 'Animations', 'Scripts'
  ];

  private searchLocations = [
    'https://create.roblox.com/marketplace/models',
    'https://create.roblox.com/marketplace/assets',
    'https://create.roblox.com/marketplace/store',
    'https://create.roblox.com/dashboard/creations',
    'https://www.roblox.com/develop/library'
  ];

  private searchKeywords = [
    'pet simulator 99', 'ps99', 'big games pets',
    'pet sim', 'pet simulator', 'big games',
    'preston pets', 'chickenmesh', 'buildintogames'
  ];

  private robloxGames = [
    '8737899170', // Pet Simulator 99
    '15502302041', // Dev Pet Simulator 99
    '15588442388' // Pro Trading Plaza
  ];

  private robloxStudioEndpoints = [
    '/asset/version-history',
    '/studio/source-control', 
    '/assets/game-scripts',
    '/workspace/published-files',
    '/marketplace/productinfo',
    '/catalog/items',
    '/inventory/pets',
    '/develop/assets',
    '/marketplace/models',
    '/store/models',
    '/marketplace/assets',
    '/catalog/games',
    '/marketplace/game-passes',
    '/marketplace/developer-products',
    '/game/universes/configure',
    '/develop/library',
    '/catalog/user/assets',
    '/groups/assets',
    '/asset-thumbnail/json',
    '/marketplace/productdetails',
    '/asset/assets-info',
    '/studio/plugins',
    '/tool-box/items',
    '/game-instances/metadata',
    '/badges/metadata',
    '/inventory/latest-items',
    '/social/user-data',
    '/develop/api/assets',
    '/marketplace/recommendations'
  ];

  private robloxCreatorAssets = [
    'https://create.roblox.com/marketplace/asset-type/Model',
    'https://create.roblox.com/marketplace/asset-type/Plugin',
    'https://create.roblox.com/marketplace/asset-type/Decal',
    'https://create.roblox.com/marketplace/asset-type/Audio',
    'https://create.roblox.com/marketplace/asset-type/Mesh',
    'https://create.roblox.com/marketplace/asset-type/SurfaceAppearance',
    'https://create.roblox.com/marketplace/asset-type/Animation'
  ];

  private blogSources = [
    {
      url: 'https://www.biggames.io/post/pet-simulator-99-update-52',
      type: 'official'
    },
    {
      url: 'https://legend-ps99-petsgo-devblogs.vercel.app/',
      type: 'community'  
    }
  ];

  private async scanBlogs(): Promise<Leak[]> {
    console.log('Beginning blog scan for updates...');
    const foundLeaks: Leak[] = [];
    
    for (const source of this.blogSources) {
      try {
        console.log(`Scanning blog source: ${source.url}`);
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'LeaksBot/1.0',
            'Accept': 'text/html,application/json'
          }
        });
        const html = await response.text();

        // Create hash of content to detect changes
        const contentHash = Buffer.from(html).toString('base64');

        // Check if content changed
        const previousHash = await storage.getSetting(`blog_hash_${source.url}`);

        if (!previousHash || previousHash.settingValue !== contentHash) {
          // Store new hash
          await storage.updateSetting(`blog_hash_${source.url}`, contentHash);

          // Create the leak
          const leak = await storage.createLeak({
            fileName: `blog_update_${Date.now()}.html`,
            filePath: `/blogs/${source.type}/${new URL(source.url).hostname}`,
            fileType: 'BlogPost',
            changeType: 'modified',
            isDeveloperChange: source.type === 'official',
            fileSize: html.length,
            metadata: {
              source: source.url,
              type: source.type,
              content: html.substring(0, 1000), // Only store partial content to avoid size issues
              timestamp: new Date().toISOString()
            }
          });
          
          console.log(`Found blog change at ${source.url}`);
          foundLeaks.push(leak);
        }

        // Scan for API endpoints
        const apiMatches = html.match(/https?:\/\/[^"\s>)}']+\/api\/[^"\s>)}']*/g) || [];
        if (apiMatches && apiMatches.length > 0) {
          console.log(`Found ${apiMatches.length} potential API endpoints in ${source.url}`);
        }
        
        for (const apiUrl of apiMatches) {
          try {
            console.log(`Checking API endpoint: ${apiUrl}`);
            const apiResponse = await fetch(apiUrl, {
              headers: {
                'User-Agent': 'LeaksBot/1.0',
                'Accept': 'application/json'
              }
            });
            
            if (!apiResponse.ok) {
              console.log(`API endpoint ${apiUrl} returned ${apiResponse.status}`);
              continue;
            }
            
            const contentType = apiResponse.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
              console.log(`API endpoint ${apiUrl} returned non-JSON content: ${contentType}`);
              continue;
            }
            
            const apiData = await apiResponse.json();

            // Create the API endpoint leak
            const apiLeak = await storage.createLeak({
              fileName: `api_endpoint_${Date.now()}.json`,
              filePath: `/apis/${new URL(apiUrl).hostname}${new URL(apiUrl).pathname}`,
              fileType: 'APIEndpoint',
              changeType: 'added',
              isDeveloperChange: source.type === 'official',
              fileSize: JSON.stringify(apiData).length,
              metadata: {
                source: apiUrl,
                parentBlog: source.url,
                response: JSON.stringify(apiData).substring(0, 1000), // Only store partial content
                timestamp: new Date().toISOString()
              }
            });
            
            console.log(`Found API endpoint: ${apiUrl}`);
            foundLeaks.push(apiLeak);
          } catch (error) {
            console.error(`Error scanning API endpoint ${apiUrl}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error scanning blog ${source.url}:`, error);
      }
    }
    
    console.log(`Blog scan complete. Found ${foundLeaks.length} leaks.`);
    return foundLeaks;
  }

  private robloxGroupIds = [
    '4777915', // Big Games Main Group
    '4777917', // Big Games Studio Group
    '4777916', // Pet Simulator Group
    '13182574', // Pet Simulator 99 Group
    '32407257', // Additional Development Group
    '12858556', // Asset Management Group
    '8904510',  // Testing Group
    '3959677'   // BIG Games Pets Group
  ];

  private gameDataEndpoints = [
    '/pets/metadata',
    '/eggs/configuration', 
    '/game-passes/data',
    '/inventory/user-data',
    '/trading/values',
    '/pets/stats',
    '/enchants/data',
    '/huges/registry',
    '/exclusives/list',
    '/merchants/rotation',
    '/gifts/contents',
    '/zones/unlocks',
    '/achievements/list',
    '/collection/book',
    '/leaderboards/data',
    '/minigames/config',
    '/potions/effects',
    '/server/metadata',
    '/shop/rotation',
    '/achievements/data',
    '/quests/active',
    '/events/current',
    '/areas/unlock-data',
    '/player-stats/global',
    '/server/configuration'
  ];

  private marketplaceSearchTerms = [
    'pet simulator 99',
    'big games pets',
    'pet sim',
    'pet simulator pets',
    'ps99',
    'huge pet',
    'exclusive pet',
    'titanic pet',
    'Preston pets',
    'buildintogames',
    'chickenmesh',
    'ps99 leaks',
    'pet sim trading',
    'pet simulator huge',
    'ps99 exclusive',
    'big games studio'
  ];

  private storeSearchUrls = [
    'https://create.roblox.com/store/models?keyword=big%20games%20pets',
    'https://create.roblox.com/store/models?keyword=pet%20simulator%2099',
    'https://create.roblox.com/store/models?keyword=big%20games'
  ];

  private petSimCategories = [
    'pets',
    'eggs',
    'huge_pets',
    'exclusive_pets', 
    'limited_pets',
    'mythical_pets',
    'legendary_pets',
    'accessories',
    'areas',
    'zones',
    'worlds',
    'gems',
    'currencies',
    'hoverboards',
    'potions',
    'boosts',
    'minigames',
    'enchants',
    'events',
    'vip_items',
    'gamepasses',
    'titanic_pets',
    'secret_pets',
    'dev_pets'
  ];

  private gameIds = {
    petSimulator99: '8737899170',
    petSimulatorDevTest: '15502302041',
    petSimulatorBeta: '15502302041'
  };

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
      ],
      partials: [Partials.Channel],
      failIfNotExists: false,
      retryLimit: Infinity,
      restRequestTimeout: 60000,
      restGlobalRateLimit: 50,
      presence: {
        activities: [{ name: 'Pet Simulator 99 Updates', type: 3 }],
        status: 'online'
      },
      sweepers: {
        messages: {
          lifetime: 300,
          interval: 60,
        }
      }
    });

    // Enhanced auto-reconnection
    this.client.on('disconnect', async () => {
      console.log('Bot disconnected! Attempting to reconnect...');
      while (!this.client.isReady() && this.reconnectAttempts < this.maxReconnectAttempts) {
        try {
          this.reconnectAttempts++;
          await this.client.login(TOKEN);
          console.log('Reconnected successfully!');
          this.reconnectAttempts = 0;
          break;
        } catch (error) {
          console.error(`Reconnect attempt ${this.reconnectAttempts} failed:`, error);
          await new Promise(resolve => setTimeout(resolve, this.reconnectInterval));
        }
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Restarting bot...');
        await this.restart();
      }
    });

    // Additional connection monitoring
    setInterval(() => {
      if (!this.client.isReady()) {
        console.log('Bot not connected, attempting reconnect...');
        this.client.login(TOKEN).catch(console.error);
      }
    }, 60000); // Check every minute

    // Handle rate limits
    this.client.on('rateLimit', (info) => {
      console.log('Rate limit hit:', info);
    });

    this.startTime = new Date();

    // Set up event handlers
    this.client.on('ready', this.onReady.bind(this));
    this.client.on('interactionCreate', this.onInteraction.bind(this));
    this.client.on('error', this.onError.bind(this));
    this.client.on('shardError', this.onShardError.bind(this));
  }

  async initialize() {
    // Define commands
    const commands = [
      new SlashCommandBuilder()
        .setName('leaks')
        .setDescription('Show recent leaks')
        .addSubcommand(subcommand =>
          subcommand
            .setName('recent')
            .setDescription('Show leaks from the last 48 hours')
            .addIntegerOption(option =>
              option.setName('tier')
                .setDescription('Show leaks from a specific tier (1-3)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(3)
                .addChoices(
                  { name: 'Tier 1 (Important - Eggs, Pets, Events)', value: 1 },
                  { name: 'Tier 2 (Medium - Models, Meshes, Audio)', value: 2 },
                  { name: 'Tier 3 (Less Important - Other changes)', value: 3 }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('lowertier')
            .setDescription('View lower tier leaks (Tier 2 & 3) from the latest batch')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('tiers')
            .setDescription('Show information about leak priority tiers')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('types')
            .setDescription('Show available leak types')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('filter')
            .setDescription('Filter leaks by file type')
            .addStringOption(option =>
              option.setName('type')
                .setDescription('File type to filter by')
                .setRequired(true)
                .addChoices(
                  { name: 'Textures', value: 'Textures' },
                  { name: 'Models', value: 'Models' },
                  { name: 'Audio', value: 'Audio' },
                  { name: 'JSON', value: 'JSON' },
                  { name: 'Config', value: 'Config' },
                  { name: 'Other', value: 'Other' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('developers')
            .setDescription('Show recent developer changes only')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('images')
            .setDescription('Show only image leaks')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('meshes')
            .setDescription('Show only mesh/model leaks')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('eggs')
            .setDescription('Show leaks related to eggs')
            .addBooleanOption(option =>
              option.setName('showall')
                .setDescription('Show all eggs including older ones')
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('huges')
            .setDescription('Show leaks related to huge pets')
            .addBooleanOption(option =>
              option.setName('showall')
                .setDescription('Show all huge pet leaks including older ones')
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('weekly')
            .setDescription('Show all leaks from the current update week')
            .addIntegerOption(option =>
              option.setName('tier')
                .setDescription('Filter by leak tier (1-3)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(3)
                .addChoices(
                  { name: 'Tier 1 (Important - Eggs, Pets, Events)', value: 1 },
                  { name: 'Tier 2 (Medium - Models, Meshes, Audio)', value: 2 },
                  { name: 'Tier 3 (Less Important - Other changes)', value: 3 }
                )
            )
        )
        /* Removed duplicate 'tiers' subcommand */,
      new SlashCommandBuilder()
        .setName('scan')
        .setDescription('Manage file scans')
        .addSubcommand(subcommand =>
          subcommand
            .setName('now')
            .setDescription('Force an immediate file scan')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('user')
            .setDescription('Scan a specific user\'s assets')
            .addStringOption(option =>
              option.setName('userid')
                .setDescription('Roblox user ID to scan')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('frequency')
            .setDescription('Change scan frequency')
            .addIntegerOption(option =>
              option.setName('minutes')
                .setDescription('Minutes between scans (minimum 2)')
                .setRequired(true)
                .setMinValue(2)
                .setMaxValue(60)
            )
        ),
      new SlashCommandBuilder()
        .setName('bot')
        .setDescription('Manage the bot')
        .addSubcommand(subcommand =>
          subcommand
            .setName('status')
            .setDescription('Show bot status and uptime')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('logs')
            .setDescription('Show recent bot logs')
            .addIntegerOption(option =>
              option.setName('count')
                .setDescription('Number of logs to show')
                .setRequired(false)
                .setMinValue(5)
                .setMaxValue(25)
            )
        ),
        
        // Test command for embed functionality
        new SlashCommandBuilder()
        .setName('embedtest')
        .setDescription('Test embed functionality in Discord'),
        
        // Roblox user link commands
        new SlashCommandBuilder()
        .setName('user')
        .setDescription('Manage your Roblox account link')
        .addSubcommand(subcommand =>
          subcommand
            .setName('link')
            .setDescription('Link your Discord account to your Roblox account')
            .addStringOption(option =>
              option.setName('robloxid')
                .setDescription('Your Roblox user ID')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('robloxusername')
                .setDescription('Your Roblox username')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('unlink')
            .setDescription('Unlink your Discord account from your Roblox account')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('info')
            .setDescription('Show your linked Roblox account info')
        ),
        
        // Roblox player stats commands
        new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View game statistics')
        .addSubcommand(subcommand =>
          subcommand
            .setName('rap')
            .setDescription('View your Recent Average Price (total pet inventory value)')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('leaderboard')
            .setDescription('View your position on game leaderboards')
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Leaderboard type')
                .setRequired(true)
                .addChoices(
                  { name: 'Gems', value: 'gems' },
                  { name: 'Coins', value: 'coins' },
                  { name: 'Pets', value: 'pets' },
                  { name: 'Wins', value: 'wins' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('event')
            .setDescription('View your position in the current event')
        ),
        
        // Search command for finding specific keywords in leak history
        new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search the leak history for specific keywords or file types')
        .addStringOption(option => 
          option.setName('keyword')
            .setDescription('Keyword to search for in file names, paths, and content')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Filter by specific file type')
            .setRequired(false)
            .addChoices(
              { name: 'All Types', value: 'all' },
              { name: 'Textures', value: 'texture' },
              { name: 'Models', value: 'model' },
              { name: 'Audio', value: 'audio' },
              { name: 'Config', value: 'config' },
              { name: 'JSON', value: 'json' },
              { name: 'Developer', value: 'developer' }
            )
        )
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Maximum number of results to show (1-25)')
            .setMinValue(1)
            .setMaxValue(25)
            .setRequired(false)
        )
    ];

    this.commands = commands;

    if (!TOKEN || TOKEN.trim() === '') {
      console.warn('Discord bot token not found. Running in offline mode - data will still be collected but notifications will not be sent to Discord');

      // Log the offline mode
      await storage.createLog({
        eventType: 'system',
        message: 'Bot initialized in offline mode (no Discord token provided)',
        metadata: { commandCount: commands.length }
      });

      // Load settings and schedule scan in offline mode
      const scanFrequencySetting = await storage.getSetting('scanFrequency');
      if (scanFrequencySetting) {
        this.scanFrequency = parseInt(scanFrequencySetting.settingValue);
      }

      // Schedule automatic scans even in offline mode
      this.scheduleScan();

      return;
    }

    try {
      // Register all event handlers
      this.client.on('ready', this.onReady.bind(this));
      this.client.on('disconnect', this.onDisconnect.bind(this));
      this.client.on('reconnecting', this.onReconnecting.bind(this));
      this.client.on('interactionCreate', this.onInteraction.bind(this));
      
      // Automatic reconnection setup
      this.setupForcedReconnection();
      
      // Login to Discord
      console.log('Attempting to log in to Discord with enhanced connection handling...');
      
      try {
        if (!TOKEN) {
          throw new Error('Discord token is empty or undefined');
        }
        
        // Log the token length and first/last few characters for debugging
        console.log(`Token length: ${TOKEN.length}, First few chars: ${TOKEN.substring(0, 5)}..., Last few chars: ...${TOKEN.substring(TOKEN.length - 5)}`);
        
        await this.client.login(TOKEN);
        console.log('Successfully logged in to Discord!');
      } catch (loginError) {
        console.error('Login Error:', loginError);
        throw loginError; // Re-throw to be caught by the outer try/catch
      }

      // Register slash commands
      const rest = new REST({ version: '10' }).setToken(TOKEN);

      console.log('Started refreshing application (/) commands.');
      
      try {
        console.log(`Using APPLICATION_ID: ${APPLICATION_ID.substring(0, 5)}... GUILD_ID: ${GUILD_ID.substring(0, 5)}...`);
        
        await rest.put(
          Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID),
          { body: commands.map(command => command.toJSON()) },
        );
        
        console.log('Successfully reloaded application (/) commands.');
      } catch (commandError) {
        console.error('Error registering commands:', commandError);
        // Don't throw so we can still continue with the bot even if commands fail to register
        // We'll log it but not go into offline mode
        await storage.createLog({
          eventType: 'error',
          message: 'Failed to register slash commands but bot connection is still active',
          metadata: { error: String(commandError) }
        });
      }

      // Log the event
      await storage.createLog({
        eventType: 'system',
        message: 'Bot fully initialized and commands registered',
        metadata: { 
          commandCount: commands.length,
          username: this.client.user?.tag,
          isConnected: true
        }
      });

      // Load settings
      const scanFrequencySetting = await storage.getSetting('scanFrequency');
      if (scanFrequencySetting) {
        this.scanFrequency = parseInt(scanFrequencySetting.settingValue);
      }

      // Schedule automatic scans
      this.scheduleScan();
      
      // Start a background retry process to ensure we stay connected
      this.startBackgroundRetryProcess();

    } catch (error) {
      console.warn('Discord token is invalid, running in offline mode - notifications will not be sent to Discord');

      // Log the offline mode
      await storage.createLog({
        eventType: 'system',
        message: 'Bot initialized in offline mode (invalid Discord token)',
        metadata: { error: String(error), commandCount: commands.length }
      });

      // Load settings and schedule scan in offline mode
      const scanFrequencySetting = await storage.getSetting('scanFrequency');
      if (scanFrequencySetting) {
        this.scanFrequency = parseInt(scanFrequencySetting.settingValue);
      }

      // Schedule automatic scans even in offline mode
      this.scheduleScan();
      
      // Even if initial login fails, set up a background retry process
      this.startBackgroundRetryProcess();
    }
  }

  private async onReady() {
    console.log(`Logged in as ${this.client.user?.tag}!`);

    await storage.createLog({
      eventType: 'system',
      message: `Bot logged in as ${this.client.user?.tag}`,
      metadata: { username: this.client.user?.tag }
    });

    // Update the bot start time setting
    await storage.updateSetting('botStartTime', new Date().toISOString());
    
    // Log the connected channel information
    try {
      // Use the global constant for consistent channel ID usage
      if (LEAKS_CHANNEL_ID) {
        const channel = await this.client.channels.fetch(LEAKS_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
          console.log(`Successfully connected to leaks channel: #${(channel as any).name}`);
          
          // Test posting a status message to verify channel access
          await (channel as any).send({
            content: `🟢 Bot is now online and monitoring game files for leaks. Commands are active.`,
            allowedMentions: { parse: [] } // No pings
          }).catch(e => console.error('Could not send test message:', e));
          
        } else {
          console.error(`Channel with ID ${LEAKS_CHANNEL_ID} is not a text channel or couldn't be found`);
        }
      } else {
        console.error('No leaks channel ID configured');
      }
    } catch (error) {
      console.error('Error fetching leaks channel:', error);
    }
  }

  private async onInteraction(interaction: any) {
    try {
      // Handle slash commands
      if (interaction.isCommand()) {
        const chatInteraction = interaction as ChatInputCommandInteraction;
        
        // Record the command usage
        this.lastCommandUsed = {
          name: chatInteraction.commandName + (chatInteraction.options.getSubcommand(false) ? ` ${chatInteraction.options.getSubcommand(false)}` : ''),
          user: chatInteraction.user.tag,
          timestamp: new Date()
        };

        // Log command usage
        await storage.createLog({
          eventType: 'command',
          message: `Command used: ${chatInteraction.commandName} ${chatInteraction.options.getSubcommand(false) || ''}`,
          metadata: { 
            command: chatInteraction.commandName,
            subcommand: chatInteraction.options.getSubcommand(false) || null,
            user: chatInteraction.user.tag,
            userId: chatInteraction.user.id
          }
        });

        // Handle commands
        if (chatInteraction.commandName === 'leaks') {
          await this.handleLeaksCommand(chatInteraction);
        } else if (chatInteraction.commandName === 'scan') {
          await this.handleScanCommand(chatInteraction);
        } else if (chatInteraction.commandName === 'bot') {
          await this.handleBotCommand(chatInteraction);
        } else if (chatInteraction.commandName === 'embedtest') {
          await this.handleEmbedTestCommand(chatInteraction);
        } else if (chatInteraction.commandName === 'user') {
          await this.handleUserCommand(chatInteraction);
        } else if (chatInteraction.commandName === 'stats') {
          await this.handleStatsCommand(chatInteraction);
        } else if (chatInteraction.commandName === 'search') {
          await this.handleSearchCommand(chatInteraction);
        }
        return;
      }
      
      // Handle button interactions
      if (interaction.isButton()) {
        const buttonId = interaction.customId;
        
        // Log button usage
        await storage.createLog({
          eventType: 'button',
          message: `Button clicked: ${buttonId}`,
          metadata: { 
            buttonId,
            user: interaction.user.tag,
            userId: interaction.user.id
          }
        });
        
        // Handle different button actions
        if (buttonId.startsWith('view_lower_tier_')) {
          // Extract the batch ID from the button custom ID
          const batchId = buttonId.replace('view_lower_tier_', '');
          await this.handleViewLowerTierButton(interaction, batchId);
        } 
        else if (buttonId.startsWith('dismiss_lower_tier_')) {
          // Extract the batch ID from the button custom ID
          const batchId = buttonId.replace('dismiss_lower_tier_', '');
          await this.handleDismissLowerTierButton(interaction, batchId);
        }
        else if (buttonId.startsWith('view_category_')) {
          // Format: view_category_CATEGORY_BATCHID
          // Extract the category and batch ID from the button custom ID
          const parts = buttonId.replace('view_category_', '').split('_');
          const category = parts[0]; // First part is the category
          const batchId = parts.slice(1).join('_'); // Rest is the batch ID (in case it contains underscores)
          await this.handleViewCategoryButton(interaction, category, batchId);
        }
      }
    } catch (error) {
      console.error('Error handling interaction:', error);

      // Create error log with appropriate metadata based on interaction type
      const errorMetadata: any = { error: String(error) };
      
      if (interaction.isCommand()) {
        const commandInteraction = interaction as ChatInputCommandInteraction;
        errorMetadata.command = commandInteraction.commandName;
        errorMetadata.subcommand = commandInteraction.options.getSubcommand(false) || null;
      } else if (interaction.isButton()) {
        errorMetadata.buttonId = interaction.customId;
      }
      
      await storage.createLog({
        eventType: 'error',
        message: `Error handling interaction: ${error instanceof Error ? error.message : String(error)}`,
        metadata: errorMetadata
      });

      // Respond with error based on interaction type
      try {
        if (interaction.isCommand()) {
          const commandInteraction = interaction as ChatInputCommandInteraction;
          if (commandInteraction.deferred || commandInteraction.replied) {
            await commandInteraction.editReply({ content: 'There was an error executing this command.' });
          } else {
            await commandInteraction.reply({ content: 'There was an error executing this command.', ephemeral: true });
          }
        } else if (interaction.isButton()) {
          const buttonInteraction = interaction as ButtonInteraction;
          if (buttonInteraction.deferred || buttonInteraction.replied) {
            await buttonInteraction.editReply({ content: 'There was an error processing this button.' });
          } else {
            await buttonInteraction.reply({ content: 'There was an error processing this button.', ephemeral: true });
          }
        }
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }

  // Helper method to get the next scan time as a Discord timestamp
  private getNextScanTime(): string {
    if (this.cronJob) {
      const nextDate = this.cronJob.nextDate();
      return `<t:${Math.floor(nextDate.getTime() / 1000)}:R>`;
    } else {
      return 'Not scheduled';
    }
  }
  
  // Handle button click to dismiss lower-tier leaks notification
  private async handleDismissLowerTierButton(interaction: any, batchId: string) {
    try {
      // Update the original message to remove buttons and show that it was dismissed
      const originalMessage = interaction.message;
      
      // Create updated embed to show dismissal
      const embed = EmbedBuilder.from(originalMessage.embeds[0])
        .setDescription(`${originalMessage.embeds[0].description}\n\n*Notification dismissed by ${interaction.user.tag}*`)
        .setFooter({ text: `Dismissed by ${interaction.user.tag}` });
      
      // Update the message without buttons
      await originalMessage.edit({
        embeds: [embed],
        components: [] // Remove all components (buttons)
      });
      
      // Send ephemeral confirmation to the user
      await interaction.reply({
        content: 'Notification dismissed. Others will see that you dismissed it.',
        ephemeral: true
      });
      
      // Log the dismissal
      await storage.createLog({
        eventType: 'batch_dismiss',
        message: `User ${interaction.user.tag} dismissed batch ${batchId}`,
        metadata: { 
          userId: interaction.user.id,
          username: interaction.user.tag,
          batchId
        }
      });
      
      // Keep the batch data in case other users still want to view it
      // It will be cleaned up eventually through normal bot memory management
      
    } catch (error) {
      console.error('Error handling dismiss button:', error);
      
      // Log the error
      await storage.createLog({
        eventType: 'error',
        message: `Error handling dismiss button: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          userId: interaction.user.id,
          username: interaction.user.tag,
          batchId,
          error: String(error)
        }
      });
      
      // Let the user know something went wrong
      try {
        await interaction.reply({
          content: 'Sorry, there was an error dismissing the notification. Please try again later.',
          ephemeral: true
        });
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }
  
  // Handle button click to view lower-tier leaks - shows them only to the user who clicked
  // Handle button click to view a specific category of leaks
  private async handleViewCategoryButton(interaction: any, category: string, batchId: string) {
    // Always make the reply ephemeral (only visible to the user who clicked)
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Log the category view request
      await storage.createLog({
        eventType: 'category_view',
        message: `User ${interaction.user.tag} viewed category ${category} from batch ${batchId}`,
        metadata: { 
          userId: interaction.user.id,
          username: interaction.user.tag,
          batchId,
          category
        }
      });
      
      // Generate the category ID used for storage
      const categoryId = `${category}_${batchId}`;
      
      // Get the leak IDs for this specific category
      const leakIds = this.batchNotifications.get(categoryId);
      
      if (!leakIds || leakIds.length === 0) {
        // If category not found, try to get all leaks as fallback
        const allLeakIds = this.batchNotifications.get(batchId);
        
        if (!allLeakIds || allLeakIds.length === 0) {
          await interaction.editReply({
            content: 'Sorry, I could not find the leak information for this category. It may have expired.',
            ephemeral: true
          });
          return;
        }
        
        // Get all leaks then filter by category
        const allLeaks: Leak[] = [];
        for (const leakId of allLeakIds) {
          const leak = await storage.getLeak(leakId);
          if (leak) allLeaks.push(leak);
        }
        
        // Filter to this category based on file patterns
        const categoryLeaks = this.filterLeaksByCategory(allLeaks, category);
        
        if (categoryLeaks.length === 0) {
          await interaction.editReply({
            content: `Sorry, I could not find any leaks in the "${this.formatCategoryName(category)}" category.`,
            ephemeral: true
          });
          return;
        }
        
        // Send the category-specific leaks
        await this.sendCategoryLeaks(interaction, category, categoryLeaks);
        return;
      }
      
      // Get the full leak details from storage
      const leaks: Leak[] = [];
      for (const leakId of leakIds) {
        const leak = await storage.getLeak(leakId);
        if (leak) leaks.push(leak);
      }
      
      if (leaks.length === 0) {
        await interaction.editReply({
          content: `Sorry, I could not find any leaks in the "${this.formatCategoryName(category)}" category.`,
          ephemeral: true
        });
        return;
      }
      
      // Send the category-specific leaks
      await this.sendCategoryLeaks(interaction, category, leaks);
      
    } catch (error) {
      console.error('Error handling view category button:', error);
      
      // Log the error
      await storage.createLog({
        eventType: 'error',
        message: `Error handling view category button: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          userId: interaction.user.id,
          username: interaction.user.tag,
          batchId,
          category,
          error: String(error)
        }
      });
      
      // Let the user know something went wrong
      try {
        await interaction.editReply({
          content: 'Sorry, there was an error displaying the category leaks. Please try again later.',
          ephemeral: true
        });
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }
  
  // Helper to format category names nicely
  private formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Handler for the user command (linking Discord to Roblox)
  private async handleUserCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    // Handle linking a Roblox account to Discord
    if (subcommand === 'link') {
      const robloxId = interaction.options.getString('robloxid');
      const robloxUsername = interaction.options.getString('robloxusername');
      
      if (!robloxId || !robloxUsername) {
        await interaction.reply({
          content: 'Please provide both your Roblox ID and username.',
          ephemeral: true
        });
        return;
      }
      
      try {
        // Check if user already has a link
        const existingLink = await storage.getRobloxLinkByDiscordId(interaction.user.id);
        
        if (existingLink) {
          // User already has a link, ask if they want to update it
          await interaction.reply({
            content: `You already have a linked Roblox account: ${existingLink.robloxUsername} (ID: ${existingLink.robloxUserId}). To update it, first use \`/user unlink\` and then link again.`,
            ephemeral: true
          });
          return;
        }
        
        // Create a new link
        const link = await storage.createRobloxLink({
          discordUserId: interaction.user.id,
          discordUsername: interaction.user.tag,
          robloxUserId: robloxId,
          robloxUsername: robloxUsername
        });
        
        // Log the link creation
        await storage.createLog({
          eventType: 'account_link',
          message: `User ${interaction.user.tag} linked Discord account to Roblox account ${robloxUsername} (${robloxId})`,
          metadata: {
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.tag,
            robloxUserId: robloxId,
            robloxUsername: robloxUsername
          }
        });
        
        // Send confirmation
        await interaction.reply({
          content: `✅ Successfully linked your Discord account to Roblox account: ${robloxUsername} (ID: ${robloxId}).\nYou can now use commands like \`/stats rap\` and \`/stats leaderboard\` to view your game stats.`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Error linking Roblox account:', error);
        
        await storage.createLog({
          eventType: 'error',
          message: `Error linking Roblox account: ${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.tag,
            robloxUserId: robloxId,
            robloxUsername: robloxUsername,
            error: String(error)
          }
        });
        
        await interaction.reply({
          content: 'There was an error linking your Roblox account. Please try again later.',
          ephemeral: true
        });
      }
    }
    // Handle unlinking a Roblox account from Discord 
    else if (subcommand === 'unlink') {
      try {
        // Check if user has a linked account
        const existingLink = await storage.getRobloxLinkByDiscordId(interaction.user.id);
        
        if (!existingLink) {
          await interaction.reply({
            content: 'You don\'t have a linked Roblox account.',
            ephemeral: true
          });
          return;
        }
        
        // Delete the link
        await storage.deleteRobloxLink(existingLink.id);
        
        // Log the unlink
        await storage.createLog({
          eventType: 'account_unlink',
          message: `User ${interaction.user.tag} unlinked Discord account from Roblox account ${existingLink.robloxUsername} (${existingLink.robloxUserId})`,
          metadata: {
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.tag,
            robloxUserId: existingLink.robloxUserId,
            robloxUsername: existingLink.robloxUsername
          }
        });
        
        // Send confirmation
        await interaction.reply({
          content: `✅ Successfully unlinked your Discord account from Roblox account: ${existingLink.robloxUsername} (ID: ${existingLink.robloxUserId}).`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Error unlinking Roblox account:', error);
        
        await storage.createLog({
          eventType: 'error',
          message: `Error unlinking Roblox account: ${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.tag,
            error: String(error)
          }
        });
        
        await interaction.reply({
          content: 'There was an error unlinking your Roblox account. Please try again later.',
          ephemeral: true
        });
      }
    }
    // Handle viewing linked account info
    else if (subcommand === 'info') {
      try {
        // Check if user has a linked account
        const existingLink = await storage.getRobloxLinkByDiscordId(interaction.user.id);
        
        if (!existingLink) {
          await interaction.reply({
            content: 'You don\'t have a linked Roblox account. Use `/user link` to link your account.',
            ephemeral: true
          });
          return;
        }
        
        // Create embed with account info
        const embed = new EmbedBuilder()
          .setTitle('Linked Roblox Account')
          .setDescription(`Your Discord account is linked to the following Roblox account:`)
          .addFields(
            { name: 'Roblox Username', value: existingLink.robloxUsername, inline: true },
            { name: 'Roblox ID', value: existingLink.robloxUserId, inline: true },
            { name: 'Linked On', value: existingLink.createdAt ? `<t:${Math.floor(existingLink.createdAt.getTime() / 1000)}:R>` : 'Unknown', inline: false }
          )
          .setColor(0x5865F2)
          .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${existingLink.robloxUserId}&width=420&height=420&format=png`)
          .setFooter({ text: `Use "/user unlink" to remove this link` });
        
        // Send the embed
        await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });
      } catch (error) {
        console.error('Error showing linked account info:', error);
        
        await storage.createLog({
          eventType: 'error',
          message: `Error showing linked account info: ${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.tag,
            error: String(error)
          }
        });
        
        await interaction.reply({
          content: 'There was an error fetching your linked account information. Please try again later.',
          ephemeral: true
        });
      }
    }
  }
  
  // Handler for the stats commands (RAP, leaderboard position, etc.)
  private async handleStatsCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    // First, check if the user has a linked Roblox account
    const linkedAccount = await storage.getRobloxLinkByDiscordId(interaction.user.id);
    
    if (!linkedAccount) {
      await interaction.reply({
        content: 'You need to link your Roblox account first! Use `/user link` to connect your account.',
        ephemeral: true
      });
      return;
    }
    
    // Handle different stats subcommands
    if (subcommand === 'rap') {
      // For now, show a simulated response since we don't have actual API access
      await interaction.deferReply({ ephemeral: true });
      
      try {
        // In a real implementation, we'd call the Roblox API here to get the actual RAP value
        // For now, just show a simulated message
        
        // Create an embed with RAP information
        const embed = new EmbedBuilder()
          .setTitle('🏆 Pet Inventory Value (RAP)')
          .setDescription(`Current inventory value for ${linkedAccount.robloxUsername}:`)
          .addFields(
            { name: 'Total Value', value: '12,458,972 Gems', inline: false },
            { name: 'Exclusive Pets', value: '7', inline: true },
            { name: 'Huge Pets', value: '2', inline: true },
            { name: 'Rank', value: '#2,841 of all players', inline: true }
          )
          .setColor(0xF1C40F) // Gold color
          .setFooter({ text: 'Last updated: just now' })
          .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${linkedAccount.robloxUserId}&width=420&height=420&format=png`);
          
        await interaction.editReply({
          content: 'Here is your current inventory value:',
          embeds: [embed]
        });
        
        // Log the RAP request
        await storage.createLog({
          eventType: 'stats_request',
          message: `User ${interaction.user.tag} requested RAP stats for Roblox account ${linkedAccount.robloxUsername}`,
          metadata: {
            discordUserId: interaction.user.id,
            robloxUserId: linkedAccount.robloxUserId,
            statsType: 'rap'
          }
        });
      } catch (error) {
        console.error('Error fetching RAP stats:', error);
        
        await storage.createLog({
          eventType: 'error',
          message: `Error fetching RAP stats: ${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            discordUserId: interaction.user.id,
            robloxUserId: linkedAccount.robloxUserId,
            error: String(error)
          }
        });
        
        await interaction.editReply({
          content: 'There was an error fetching your inventory value. Please try again later.'
        });
      }
    }
    else if (subcommand === 'leaderboard') {
      await interaction.deferReply({ ephemeral: true });
      
      try {
        const leaderboardType = interaction.options.getString('type') || 'gems';
        
        // In a real implementation, fetch the actual leaderboard position from the game API
        // For now, just show a simulated response
        
        let title = '';
        let value = '';
        let position = '';
        let color = 0;
        
        // Different responses based on leaderboard type
        if (leaderboardType === 'gems') {
          title = '💎 Gems Leaderboard';
          value = '1,258,463,927 Gems';
          position = '#1,872';
          color = 0x1ABC9C;
        } else if (leaderboardType === 'coins') {
          title = '🪙 Coins Leaderboard';
          value = '2,847,153,062 Coins';
          position = '#943';
          color = 0xF1C40F;
        } else if (leaderboardType === 'pets') {
          title = '🐾 Pets Collection Leaderboard';
          value = '487 Unique Pets';
          position = '#3,215';
          color = 0xE74C3C;
        } else if (leaderboardType === 'wins') {
          title = '🏆 Wins Leaderboard';
          value = '342 Wins';
          position = '#652';
          color = 0x9B59B6;
        }
        
        // Create the embed
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(`Leaderboard position for ${linkedAccount.robloxUsername}:`)
          .addFields(
            { name: 'Current Value', value: value, inline: true },
            { name: 'Rank', value: position, inline: true },
            { name: 'Top %', value: '5% of all players', inline: true }
          )
          .setColor(color)
          .setFooter({ text: 'Last updated: just now' })
          .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${linkedAccount.robloxUserId}&width=420&height=420&format=png`);
          
        await interaction.editReply({
          content: `Here is your position on the ${leaderboardType} leaderboard:`,
          embeds: [embed]
        });
        
        // Log the leaderboard request
        await storage.createLog({
          eventType: 'stats_request',
          message: `User ${interaction.user.tag} requested ${leaderboardType} leaderboard stats for Roblox account ${linkedAccount.robloxUsername}`,
          metadata: {
            discordUserId: interaction.user.id,
            robloxUserId: linkedAccount.robloxUserId,
            statsType: 'leaderboard',
            leaderboardType
          }
        });
      } catch (error) {
        console.error('Error fetching leaderboard stats:', error);
        
        await storage.createLog({
          eventType: 'error',
          message: `Error fetching leaderboard stats: ${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            discordUserId: interaction.user.id,
            robloxUserId: linkedAccount.robloxUserId,
            error: String(error)
          }
        });
        
        await interaction.editReply({
          content: 'There was an error fetching your leaderboard position. Please try again later.'
        });
      }
    }
    else if (subcommand === 'event') {
      await interaction.deferReply({ ephemeral: true });
      
      try {
        // In a real implementation, fetch the actual event data from the game API
        // For now, just show a simulated response
        
        // Create the embed
        const embed = new EmbedBuilder()
          .setTitle('🎮 Current Event: Egg Hunt 2025')
          .setDescription(`Event progress for ${linkedAccount.robloxUsername}:`)
          .addFields(
            { name: 'Eggs Found', value: '27/50', inline: true },
            { name: 'Event Rank', value: '#1,236', inline: true },
            { name: 'Special Rewards Earned', value: '2/5', inline: true },
            { name: 'Event Ends', value: '<t:1722383999:R>', inline: false },
            { name: 'Progress', value: '[███████████░░░░░] 54%', inline: false }
          )
          .setColor(0x9B59B6)
          .setFooter({ text: 'Leaderboard updates every 15 minutes' })
          .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${linkedAccount.robloxUserId}&width=420&height=420&format=png`);
          
        await interaction.editReply({
          content: 'Here is your current event progress:',
          embeds: [embed]
        });
        
        // Log the event stats request
        await storage.createLog({
          eventType: 'stats_request',
          message: `User ${interaction.user.tag} requested event stats for Roblox account ${linkedAccount.robloxUsername}`,
          metadata: {
            discordUserId: interaction.user.id,
            robloxUserId: linkedAccount.robloxUserId,
            statsType: 'event'
          }
        });
      } catch (error) {
        console.error('Error fetching event stats:', error);
        
        await storage.createLog({
          eventType: 'error',
          message: `Error fetching event stats: ${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            discordUserId: interaction.user.id,
            robloxUserId: linkedAccount.robloxUserId,
            error: String(error)
          }
        });
        
        await interaction.editReply({
          content: 'There was an error fetching your event progress. Please try again later.'
        });
      }
    }
  }
  
  // Handler for the search command - allows users to search through leak history
  private async handleSearchCommand(interaction: ChatInputCommandInteraction) {
    // Whether to make the reply ephemeral (only visible to the user who ran the command)
    // Make it public if they set a limit, otherwise make it private
    await interaction.deferReply({ ephemeral: interaction.options.getInteger('limit') ? false : true });
    
    try {
      const keyword = interaction.options.getString('keyword', true);
      const fileType = interaction.options.getString('type') || 'all';
      const limit = interaction.options.getInteger('limit') || 10;
      
      // Log search request
      await storage.createLog({
        eventType: 'search',
        message: `User ${interaction.user.tag} searched for "${keyword}" (type: ${fileType}, limit: ${limit})`,
        metadata: {
          userId: interaction.user.id,
          username: interaction.user.tag,
          keyword,
          fileType,
          limit
        }
      });
      
      // Search leaks using our storage method
      const filteredLeaks = await storage.searchLeaksByKeyword(keyword, fileType, limit);
      
      // Get total count for context
      const recentTime = new Date();
      recentTime.setDate(recentTime.getDate() - 30); // Last 30 days
      const allLeaks = await storage.getLeaksByTimeRange(recentTime, new Date());
      
      if (filteredLeaks.length === 0) {
        await interaction.editReply({
          content: `No leaks found matching keyword "${keyword}"${fileType !== 'all' ? ` with file type "${fileType}"` : ''}.`
        });
        return;
      }
      
      // Create embed for results
      const embed = new EmbedBuilder()
        .setTitle(`🔍 Search Results: "${keyword}"`)
        .setDescription(`Found ${filteredLeaks.length} leaks matching your search term${fileType !== 'all' ? ` (filtered by: ${fileType})` : ''}.`)
        .setColor(0x3498DB)
        .setFooter({ text: `Searched by ${interaction.user.tag} | Showing ${filteredLeaks.length} of ${allLeaks.length} total leaks` })
        .setTimestamp();
      
      // Add up to 10 results as fields
      const displayedLeaks = filteredLeaks.slice(0, 10);
      
      displayedLeaks.forEach((leak, index) => {
        const leakDate = new Date(leak.timestamp);
        const formattedDate = `<t:${Math.floor(leakDate.getTime() / 1000)}:R>`;
        
        embed.addFields({
          name: `${index + 1}. ${leak.fileName}`,
          value: `**Type:** ${leak.fileType} ${leak.isDeveloperChange ? '(Developer Change)' : ''}\n` +
                 `**Path:** \`${leak.filePath}\`\n` +
                 `**Date:** ${formattedDate}`,
          inline: false
        });
      });
      
      // Add a field if there are more results
      if (filteredLeaks.length > 10) {
        embed.addFields({
          name: `...and ${filteredLeaks.length - 10} more results`,
          value: `Use \`/search keyword:${keyword} type:${fileType} limit:25\` to see more results.`,
          inline: false
        });
      }
      
      // Create export button for results
      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`search_export_${interaction.user.id}_${Date.now()}`)
            .setLabel('Export Results')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📑')
        );
      
      await interaction.editReply({
        embeds: [embed],
        components: [actionRow]
      });
      
    } catch (error) {
      console.error('Error executing search command:', error);
      
      await storage.createLog({
        eventType: 'error',
        message: `Error executing search command: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          userId: interaction.user.id,
          username: interaction.user.tag,
          error: String(error)
        }
      });
      
      await interaction.editReply({
        content: 'Sorry, there was an error executing your search. Please try again later.'
      });
    }
  }
  
  // Handler for the embedtest command
  private async handleEmbedTestCommand(interaction: ChatInputCommandInteraction) {
    try {
      // Create a test embed with various elements to test embed functionality
      const embed = new EmbedBuilder()
        .setTitle('Discord Embed Test')
        .setDescription('This is a test to verify that embeds are working correctly. If you can see this embed with proper formatting, colors, and images, then permissions are set correctly.')
        .setColor(0x00ff00) // Bright green
        .addFields(
          { name: 'Test Field 1', value: 'This is a test field to verify formatting', inline: true },
          { name: 'Test Field 2', value: 'This field should appear next to Field 1', inline: true },
          { name: 'Test Field 3', value: 'This field should appear on its own line', inline: false },
          { name: 'Formatted Text', value: '```\nThis should appear in a code block\nWith multiple lines\n```', inline: false },
        )
        .setTimestamp()
        .setFooter({ text: 'Test Footer • Requested by ' + interaction.user.tag })
        .setThumbnail('https://cdn.discordapp.com/embed/avatars/0.png'); // Discord default avatar
      
      // Send the test embed
      await interaction.reply({
        embeds: [embed],
        components: [
          new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('test_button_1')
                .setLabel('Test Button')
                .setStyle(ButtonStyle.Primary)
            )
        ]
      });
      
      // Log the test
      await storage.createLog({
        eventType: 'test',
        message: `User ${interaction.user.tag} ran the embed test command`,
        metadata: { 
          userId: interaction.user.id,
          username: interaction.user.tag 
        }
      });
    } catch (error) {
      console.error('Error in embed test command:', error);
      
      // Log the error
      await storage.createLog({
        eventType: 'error',
        message: `Error in embed test command: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          userId: interaction.user.id,
          username: interaction.user.tag,
          error: String(error)
        }
      });
      
      // Let the user know something went wrong
      await interaction.reply({
        content: 'Error testing embeds: ' + (error instanceof Error ? error.message : String(error)),
        ephemeral: true
      });
    }
  }
  
  // Helper to filter leaks by category based on filename and path patterns
  private filterLeaksByCategory(leaks: Leak[], category: string): Leak[] {
    return leaks.filter(leak => {
      const lowerFilePath = leak.filePath.toLowerCase();
      const lowerFileName = leak.fileName.toLowerCase();
      
      switch(category) {
        case 'server_updates':
          return lowerFilePath.includes('server') || 
                 lowerFileName.includes('server') ||
                 lowerFilePath.includes('config') || 
                 lowerFileName.includes('configuration');
                 
        case 'textures':
          return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tga'].some(ext => 
                 lowerFileName.endsWith(ext));
                 
        case 'models':
          return lowerFilePath.includes('model') || 
                 lowerFileName.includes('model') || 
                 lowerFilePath.includes('mesh') || 
                 lowerFileName.includes('mesh');
                 
        case 'audio':
          return lowerFilePath.includes('audio') || 
                 lowerFileName.includes('audio') ||
                 lowerFilePath.includes('sound') || 
                 lowerFileName.includes('sound') ||
                 lowerFilePath.includes('music') || 
                 lowerFileName.includes('music');
                 
        case 'inventory':
          return lowerFilePath.includes('inventory') || 
                 lowerFileName.includes('inventory');
                 
        case 'marketplace':
          return lowerFilePath.includes('marketplace') || 
                 lowerFileName.includes('marketplace');
                 
        case 'config':
          return lowerFilePath.includes('config') || 
                 lowerFileName.includes('config') ||
                 lowerFilePath.includes('settings') || 
                 lowerFileName.includes('settings');
                 
        case 'other':
          // For "other" category, exclude all the defined categories
          return !this.filterLeaksByCategory([leak], 'server_updates').length &&
                 !this.filterLeaksByCategory([leak], 'textures').length &&
                 !this.filterLeaksByCategory([leak], 'models').length &&
                 !this.filterLeaksByCategory([leak], 'audio').length &&
                 !this.filterLeaksByCategory([leak], 'inventory').length &&
                 !this.filterLeaksByCategory([leak], 'marketplace').length &&
                 !this.filterLeaksByCategory([leak], 'config').length;
                 
        default:
          return false;
      }
    });
  }
  
  // Helper to send category-specific leaks
  private async sendCategoryLeaks(interaction: any, category: string, leaks: Leak[]) {
    // Get the appropriate emoji and color for this category
    let emoji = '📁';
    let color = 0x3498db; // Default blue
    
    if (category === 'server_updates') {
      emoji = '⚙️';
      color = 0x7289DA; // Discord blurple
    } else if (category === 'textures') {
      emoji = '🖼️';
      color = 0xE91E63; // Pink
    } else if (category === 'models') {
      emoji = '🧩';
      color = 0x9C27B0; // Purple
    } else if (category === 'audio') {
      emoji = '🔊';
      color = 0xFF9800; // Orange
    } else if (category === 'inventory') {
      emoji = '🎒';
      color = 0x4CAF50; // Green
    } else if (category === 'marketplace') {
      emoji = '🛒';
      color = 0x00BCD4; // Cyan
    } else if (category === 'config') {
      emoji = '⚙️';
      color = 0x607D8B; // Blue Gray
    }
    
    // Create an embed for this category
    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${this.formatCategoryName(category)} Leaks`)
      .setDescription(`Found ${leaks.length} leaks in the ${this.formatCategoryName(category)} category:\n\n`)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: `Requested by ${interaction.user.tag} • Only visible to you` });
      
    // Group leaks by file type for better organization
    const byType: Record<string, Leak[]> = {};
    for (const leak of leaks) {
      if (!byType[leak.fileType]) {
        byType[leak.fileType] = [];
      }
      byType[leak.fileType].push(leak);
    }
    
    // Add fields for each type of leak within this category
    for (const [type, typeLeaks] of Object.entries(byType)) {
      const fileList = typeLeaks
        .slice(0, 15) // Limit to 15 files per type
        .map(leak => {
          // Try to provide more meaningful descriptions based on change type
          if (leak.changeType === 'added') {
            return `• ✅ **Added:** ${leak.fileName}`;
          } else if (leak.changeType === 'modified') {
            return `• 🔄 **Modified:** ${leak.fileName}`;
          } else if (leak.changeType === 'deleted') {
            return `• ❌ **Removed:** ${leak.fileName}`;
          } else {
            return `• ${leak.fileName} (${leak.changeType})`;
          }
        })
        .join('\n');
        
      embed.addFields({ 
        name: `${type} (${typeLeaks.length})`, 
        value: typeLeaks.length > 15 
          ? `${fileList}\n... and ${typeLeaks.length - 15} more` 
          : fileList
      });
    }
    
    // Check for any image leaks in this category
    const imageLeaks = leaks.filter(leak => {
      const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
      return imageExts.some(ext => leak.fileName.toLowerCase().endsWith(ext));
    });
    
    // Try to attach a representative image
    if (imageLeaks.length > 0 && fs.existsSync(imageLeaks[0].filePath)) {
      try {
        const attachment = new AttachmentBuilder(imageLeaks[0].filePath, { 
          name: imageLeaks[0].fileName
        });
        
        // Set as thumbnail or image based on category
        if (category === 'textures') {
          embed.setImage(`attachment://${imageLeaks[0].fileName}`);
        } else {
          embed.setThumbnail(`attachment://${imageLeaks[0].fileName}`);
        }
        
        // Send with attached image
        await interaction.editReply({
          embeds: [embed],
          files: [attachment],
          ephemeral: true
        });
        return;
      } catch (error) {
        console.error('Error attaching category leak image:', error);
      }
    }
    
    // Send without image if no images or attachment failed
    await interaction.editReply({
      embeds: [embed],
      ephemeral: true
    });
  }
  
  private async handleViewLowerTierButton(interaction: any, batchId: string) {
    // ALWAYS make the reply ephemeral (only visible to the user who clicked)
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Log the batch view request
      await storage.createLog({
        eventType: 'batch_view',
        message: `User ${interaction.user.tag} viewed batch ${batchId}`,
        metadata: { 
          userId: interaction.user.id,
          username: interaction.user.tag,
          batchId
        }
      });
      
      // Get the leak IDs associated with this batch
      const leakIds = this.batchNotifications.get(batchId);
      
      if (!leakIds || leakIds.length === 0) {
        await interaction.editReply({
          content: 'Sorry, I could not find the leak information for this batch. It may have expired.',
          ephemeral: true
        });
        return;
      }
      
      // Get the full leak details from storage
      const leaks: Leak[] = [];
      for (const leakId of leakIds) {
        const leak = await storage.getLeak(leakId);
        if (leak) leaks.push(leak);
      }
      
      if (leaks.length === 0) {
        await interaction.editReply({
          content: 'Sorry, I could not find any leaks associated with this batch. They may have been removed.',
          ephemeral: true
        });
        return;
      }
      
      // Group leaks by tier for better organization
      const tier2Leaks = leaks.filter(leak => this.getPriorityTier(leak) === 2);
      const tier3Leaks = leaks.filter(leak => this.getPriorityTier(leak) === 3);
      
      // Create the main embed with batch information
      const mainEmbed = new EmbedBuilder()
        .setTitle(`📋 Lower-Tier Leak Details (${leaks.length} items)`)
        .setDescription(`Here are the lower priority leaks you requested to view.\nThese details are only visible to you.`)
        .setColor(0x3498db) // Blue for batch view
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}` });
        
      // Add tier counts
      if (tier2Leaks.length > 0) {
        mainEmbed.addFields({ 
          name: '🟡 Tier 2 Leaks', 
          value: `${tier2Leaks.length} moderate importance leaks found`,
          inline: true
        });
      }
      
      if (tier3Leaks.length > 0) {
        mainEmbed.addFields({ 
          name: '🔵 Tier 3 Leaks', 
          value: `${tier3Leaks.length} minor importance leaks found`,
          inline: true
        });
      }
      
      // Create embeds for the actual leak content (up to 10 embeds total, Discord limit)
      const leakEmbeds: EmbedBuilder[] = [mainEmbed];
      
      // Process Tier 2 leaks first (more important)
      if (tier2Leaks.length > 0) {
        const tier2Embed = new EmbedBuilder()
          .setTitle('🟡 Tier 2 Leaks - Moderately Important')
          .setColor(0xFEE75C) // Yellow for Tier 2
          .setDescription('These leaks are of moderate importance:');
          
        // Group by file type
        const byType: Record<string, Leak[]> = {};
        for (const leak of tier2Leaks) {
          if (!byType[leak.fileType]) {
            byType[leak.fileType] = [];
          }
          byType[leak.fileType].push(leak);
        }
        
        // Add fields for each type - limiting to fit in Discord limits
        for (const [type, typeLeaks] of Object.entries(byType)) {
          const fileList = typeLeaks
            .slice(0, 15) // Limit to 15 files per type
            .map(leak => `• ${leak.fileName} (${leak.changeType})`)
            .join('\n');
            
          tier2Embed.addFields({ 
            name: `${type} (${typeLeaks.length})`, 
            value: typeLeaks.length > 15 
              ? `${fileList}\n... and ${typeLeaks.length - 15} more` 
              : fileList
          });
        }
        
        leakEmbeds.push(tier2Embed);
      }
      
      // Process Tier 3 leaks
      if (tier3Leaks.length > 0) {
        const tier3Embed = new EmbedBuilder()
          .setTitle('🔵 Tier 3 Leaks - Less Important')
          .setColor(0x3498DB) // Blue for Tier 3
          .setDescription('These leaks are of lower importance:');
          
        // Group by file type
        const byType: Record<string, Leak[]> = {};
        for (const leak of tier3Leaks) {
          if (!byType[leak.fileType]) {
            byType[leak.fileType] = [];
          }
          byType[leak.fileType].push(leak);
        }
        
        // Add up to 5 file type sections
        const typeEntries = Object.entries(byType);
        for (let i = 0; i < Math.min(5, typeEntries.length); i++) {
          const [type, typeLeaks] = typeEntries[i];
          const fileList = typeLeaks
            .slice(0, 10) // Limit to 10 files per type
            .map(leak => `• ${leak.fileName}`)
            .join('\n');
            
          tier3Embed.addFields({ 
            name: `${type} (${typeLeaks.length})`, 
            value: typeLeaks.length > 10 
              ? `${fileList}\n... and ${typeLeaks.length - 10} more` 
              : fileList
          });
        }
        
        // If there are more than 5 types, add a summary field
        if (typeEntries.length > 5) {
          const remainingTypes = typeEntries.slice(5);
          let summary = '';
          for (const [type, leaks] of remainingTypes) {
            summary += `• ${type}: ${leaks.length} files\n`;
          }
          tier3Embed.addFields({ 
            name: `Additional Types`, 
            value: summary
          });
        }
        
        leakEmbeds.push(tier3Embed);
      }
      
      // Limit to Discord's embed limit (10 per message)
      const finalEmbeds = leakEmbeds.slice(0, 10);
      
      // If we have image leaks, try to attach one as a thumbnail
      const imageLeaks = leaks.filter(leak => {
        const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
        return imageExts.some(ext => leak.fileName.toLowerCase().endsWith(ext));
      });
      
      if (imageLeaks.length > 0 && fs.existsSync(imageLeaks[0].filePath)) {
        try {
          const attachment = new AttachmentBuilder(imageLeaks[0].filePath, { 
            name: imageLeaks[0].fileName
          });
          
          // Set the first image as a thumbnail on the main embed
          mainEmbed.setThumbnail(`attachment://${imageLeaks[0].fileName}`);
          
          // Send the reply with the attachment
          await interaction.editReply({
            embeds: finalEmbeds,
            files: [attachment],
            ephemeral: true
          });
          return;
        } catch (error) {
          console.error('Error attaching image to lower-tier leak message:', error);
        }
      }
      
      // Send without attachments if no images or attachment failed
      await interaction.editReply({
        embeds: finalEmbeds,
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error handling view lower tier button:', error);
      
      // Log the error
      await storage.createLog({
        eventType: 'error',
        message: `Error handling view lower tier button: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          userId: interaction.user.id,
          username: interaction.user.tag,
          batchId,
          error: String(error)
        }
      });
      
      // Let the user know something went wrong
      try {
        await interaction.editReply({
          content: 'Sorry, there was an error displaying the lower-tier leaks. Please try again later.',
          ephemeral: true
        });
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }

  private async handleLeaksCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'recent') {
      await interaction.deferReply();
      
      // Get tier filter if provided
      const tierFilter = interaction.options.getInteger('tier');
      
      // Get all recent leaks
      const recentLeaks = await storage.getRecentLeaks(48);
      
      // Filter by tier if specified
      let filteredLeaks = recentLeaks;
      if (tierFilter) {
        filteredLeaks = recentLeaks.filter(leak => {
          // Calculate priority tier for this leak
          const priorityTier = this.getPriorityTier(leak);
          return priorityTier === tierFilter;
        });
      }

      if (filteredLeaks.length === 0) {
        const tierMessage = tierFilter ? ` for Tier ${tierFilter}` : '';
        await interaction.editReply(`No leaks have been detected in the last 48 hours${tierMessage}.`);
        return;
      }

      // Group leaks by type
      const leaksByType: Record<string, Leak[]> = {};
      for (const leak of filteredLeaks) {
        if (!leaksByType[leak.fileType]) {
          leaksByType[leak.fileType] = [];
        }
        leaksByType[leak.fileType].push(leak);
      }

      // Create embed with tier information if filtered
      const embed = new EmbedBuilder()
        .setTitle(tierFilter ? `Tier ${tierFilter} Game Leaks (Last 48 Hours)` : 'Recent Game Leaks (Last 48 Hours)')
        .setColor(tierFilter === 1 ? 0xED4245 : (tierFilter === 2 ? 0xFEE75C : 0x5865F2)) // Red for Tier 1, Yellow for Tier 2, Blue for others
        .setDescription(`Found ${filteredLeaks.length} leaked files in the last 48 hours${tierFilter ? ` (Tier ${tierFilter} priority)` : ''}.`)
        .setTimestamp();

      // Add fields for each type
      for (const [type, leaks] of Object.entries(leaksByType)) {
        const fileNames = leaks.map(leak => `• ${leak.fileName} (${leak.changeType})`).join('\n');
        embed.addFields({ name: `${type} (${leaks.length})`, value: fileNames.substring(0, 1024) });
      }

      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'types') {
      // Get all unique file types
      const recentLeaks = await storage.getRecentLeaks(48 * 7); // Last week
      const typesSet = new Set<string>();
      recentLeaks.forEach(leak => typesSet.add(leak.fileType));
      const types = Array.from(typesSet);

      const embed = new EmbedBuilder()
        .setTitle('Available Leak Types')
        .setColor(0x5865F2)
        .setDescription('These are the types of leaks that have been detected:')
        .addFields({ name: 'Types', value: types.length > 0 ? types.join('\n') : 'No leaks detected yet.' });

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'filter') {
      await interaction.deferReply();

      const fileType = interaction.options.getString('type');
      const typeLeaks = await storage.getLeaksByType(fileType as string);

      if (typeLeaks.length === 0) {
        await interaction.editReply(`No leaks of type "${fileType}" have been detected.`);
        return;
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${fileType} Leaks`)
        .setColor(0x5865F2)
        .setDescription(`Found ${typeLeaks.length} leaked ${fileType?.toLowerCase()} files.`)
        .setTimestamp();

      // Group by change type
      const byChangeType: Record<string, Leak[]> = {
        added: [],
        modified: [],
        deleted: []
      };

      for (const leak of typeLeaks) {
        byChangeType[leak.changeType].push(leak);
      }

      // Add fields for each change type
      for (const [changeType, leaks] of Object.entries(byChangeType)) {
        if (leaks.length > 0) {
          const fileNames = leaks.map(leak => `• ${leak.fileName}`).join('\n');
          embed.addFields({ 
            name: `${changeType.charAt(0).toUpperCase() + changeType.slice(1)} (${leaks.length})`, 
            value: fileNames.substring(0, 1024) || 'None'
          });
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'developers') {
      await interaction.deferReply();
      
      // Get developer changes
      const developerChanges = await storage.getDeveloperChanges();
      
      if (developerChanges.length === 0) {
        await interaction.editReply('No developer changes have been detected.');
        return;
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Developer Changes')
        .setColor(0xFEE75C)
        .setDescription(`Found ${developerChanges.length} changes made by game developers.`)
        .setTimestamp();
      
      // Group by developer if possible
      const byDeveloper: Record<string, Leak[]> = { "Unknown": [] };
      
      for (const leak of developerChanges) {
        let developer = "Unknown";
        if (leak.metadata && typeof leak.metadata === 'object') {
          const metadata = leak.metadata as any;
          if (metadata.robloxUsername) {
            developer = metadata.robloxUsername;
          } else if (metadata.creatorName) {
            developer = metadata.creatorName;
          } else if (metadata.groupName) {
            developer = metadata.groupName;
          }
        }
        
        if (!byDeveloper[developer]) {
          byDeveloper[developer] = [];
        }
        byDeveloper[developer].push(leak);
      }
      
      // Add fields for each developer
      for (const [developer, leaks] of Object.entries(byDeveloper)) {
        if (leaks.length > 0) {
          const filesList = leaks.map(leak => `• ${leak.fileName}`).join('\n');
          embed.addFields({ 
            name: `${developer} (${leaks.length})`, 
            value: filesList.substring(0, 1024) 
          });
        }
      }
      
      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'images') {
      await interaction.deferReply();
      
      // Filter for image leaks
      const recentLeaks = await storage.getRecentLeaks(48);
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tga'];
      const imageLeaks = recentLeaks.filter(leak => 
        imageExtensions.some(ext => leak.fileName.toLowerCase().endsWith(ext)) || 
        leak.fileType === 'Textures'
      );
      
      if (imageLeaks.length === 0) {
        await interaction.editReply('No image leaks have been detected in the last 48 hours.');
        return;
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Image Leaks')
        .setColor(0x5865F2)
        .setDescription(`Found ${imageLeaks.length} image files in the last 48 hours.`)
        .setTimestamp();
      
      // Take first 5 for attachments
      const attachments: AttachmentBuilder[] = [];
      const imageFields: { name: string, value: string }[] = [];
      
      // Group by type
      const byType: Record<string, Leak[]> = {};
      for (const leak of imageLeaks) {
        if (!byType[leak.fileType]) {
          byType[leak.fileType] = [];
        }
        byType[leak.fileType].push(leak);
      }
      
      // Add fields for each type
      for (const [type, leaks] of Object.entries(byType)) {
        const fileLinks = leaks.map((leak, index) => {
          // Try to attach the first 5 images
          if (attachments.length < 5 && fs.existsSync(leak.filePath)) {
            try {
              const attachment = new AttachmentBuilder(leak.filePath, { name: leak.fileName });
              attachments.push(attachment);
              return `• ${leak.fileName} ([view](attachment://${leak.fileName}))`;
            } catch (error) {
              return `• ${leak.fileName}`;
            }
          } else {
            return `• ${leak.fileName}`;
          }
        }).join('\n');
        
        imageFields.push({ 
          name: `${type} (${leaks.length})`, 
          value: fileLinks.substring(0, 1024) 
        });
      }
      
      // Add fields to the embed
      for (const field of imageFields) {
        embed.addFields(field);
      }
      
      // Set first image as thumbnail if available
      if (attachments.length > 0) {
        embed.setThumbnail(`attachment://${attachments[0].name}`);
        
        // If there's more than one, add images to embed
        if (attachments.length > 1) {
          embed.setImage(`attachment://${attachments[1].name}`);
        }
      }
      
      await interaction.editReply({ 
        embeds: [embed],
        files: attachments
      });
    } else if (subcommand === 'meshes') {
      await interaction.deferReply();
      
      // Filter for mesh/model leaks
      const recentLeaks = await storage.getRecentLeaks(72); // Last 3 days
      const meshExtensions = ['.fbx', '.obj', '.mesh', '.rbxm', '.rbxmx'];
      const meshLeaks = recentLeaks.filter(leak => 
        meshExtensions.some(ext => leak.fileName.toLowerCase().endsWith(ext)) || 
        leak.fileType === 'Models' || 
        leak.fileType === 'Mesh' || 
        leak.fileType === 'Model'
      );
      
      if (meshLeaks.length === 0) {
        await interaction.editReply('No mesh or model leaks have been detected recently.');
        return;
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Mesh & Model Leaks')
        .setColor(0x5865F2)
        .setDescription(`Found ${meshLeaks.length} mesh/model files recently.`)
        .setTimestamp();
      
      // Group by source if available
      const bySource: Record<string, Leak[]> = { "Unknown": [] };
      
      for (const leak of meshLeaks) {
        let source = "Unknown";
        if (leak.metadata && typeof leak.metadata === 'object') {
          const metadata = leak.metadata as any;
          if (metadata.source) {
            source = metadata.source;
          }
        }
        
        if (!bySource[source]) {
          bySource[source] = [];
        }
        bySource[source].push(leak);
      }
      
      // Add fields for each source
      for (const [source, leaks] of Object.entries(bySource)) {
        if (leaks.length > 0) {
          // Add links to view assets if available
          const filesList = leaks.map(leak => {
            if (leak.metadata && typeof leak.metadata === 'object') {
              const metadata = leak.metadata as any;
              if (metadata.assetId) {
                return `• ${leak.fileName} ([view](https://www.roblox.com/catalog/${metadata.assetId}))`;
              }
            }
            return `• ${leak.fileName}`;
          }).join('\n');
          
          embed.addFields({ 
            name: `${source} (${leaks.length})`, 
            value: filesList.substring(0, 1024) 
          });
        }
      }
      
      // Set thumbnail for model visualization
      embed.setThumbnail('https://create.roblox.com/dashboard/assets/model-thumbnail.png');
      
      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'eggs') {
      await interaction.deferReply();
      
      // Whether to show all eggs or just recent ones
      const showAll = interaction.options.getBoolean('showall') || false;
      
      // Filter for egg-related leaks
      const allLeaks = await storage.getRecentLeaks(showAll ? 24 * 30 : 72); // 30 days or 3 days
      const eggLeaks = allLeaks.filter(leak => 
        leak.fileName.toLowerCase().includes('egg') || 
        (leak.metadata && typeof leak.metadata === 'object' && 
         (leak.metadata as any).type === 'egg')
      );
      
      if (eggLeaks.length === 0) {
        await interaction.editReply('No egg-related leaks have been detected recently.');
        return;
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('🥚 Egg Leaks')
        .setColor(0xEB459E)
        .setDescription(`Found ${eggLeaks.length} egg-related files.`)
        .setTimestamp();
      
      // Take first egg image for thumbnail if available
      const eggImage = eggLeaks.find(leak => 
        ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].some(ext => 
          leak.fileName.toLowerCase().endsWith(ext)
        )
      );
      
      if (eggImage && fs.existsSync(eggImage.filePath)) {
        try {
          const attachment = new AttachmentBuilder(eggImage.filePath, { name: eggImage.fileName });
          embed.setThumbnail(`attachment://${eggImage.fileName}`);
          embed.setImage(`attachment://${eggImage.fileName}`);
          
          await interaction.editReply({ 
            embeds: [embed],
            files: [attachment]
          });
          return;
        } catch (error) {
          console.error('Error attaching egg image:', error);
        }
      }
      
      // If no image, just show the list
      const filesList = eggLeaks.map(leak => {
        // Add hatch chance and other metadata if available
        let extraInfo = '';
        if (leak.metadata && typeof leak.metadata === 'object') {
          const metadata = leak.metadata as any;
          if (metadata.hatchChance) {
            extraInfo += ` - ${metadata.hatchChance}% chance`;
          }
          if (metadata.cost) {
            extraInfo += ` - ${metadata.cost} cost`;
          }
          if (metadata.possiblePets && Array.isArray(metadata.possiblePets)) {
            extraInfo += ` - Contains ${metadata.possiblePets.length} pets`;
          }
        }
        return `• ${leak.fileName}${extraInfo}`;
      }).join('\n');
      
      embed.addFields({ name: 'Egg Files', value: filesList.substring(0, 1024) });
      
      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'lowertier') {
      await interaction.deferReply();
      
      // Show the lower tier leaks that have been batched
      if (this.lowerTierLeaksBatch.length === 0) {
        await interaction.editReply({
          content: 'There are currently no batched lower tier leaks. These are accumulated over time and sent in batches every 5 minutes.'
        });
        return;
      }
      
      // Count by tier
      let tier2Count = 0;
      let tier3Count = 0;
      
      // Group leaks by type
      const leaksByType: Record<string, Leak[]> = {};
      
      for (const leak of this.lowerTierLeaksBatch) {
        // Count by tier
        const priorityTier = this.getPriorityTier(leak);
        if (priorityTier === 2) tier2Count++;
        else if (priorityTier === 3) tier3Count++;
        
        // Group by file type
        if (!leaksByType[leak.fileType]) {
          leaksByType[leak.fileType] = [];
        }
        leaksByType[leak.fileType].push(leak);
      }
      
      // Create the main embed
      const embed = new EmbedBuilder()
        .setTitle('Lower Tier Leaks (Tier 2 & 3)')
        .setDescription(`Found ${this.lowerTierLeaksBatch.length} lower tier leaks in the current batch.\n**Tier 2:** ${tier2Count} leaks\n**Tier 3:** ${tier3Count} leaks`)
        .setColor(0x3498db) // Blue for batch
        .setTimestamp(this.lastLowerTierBatchTime);
      
      // Add fields for each type (limited to avoid hitting Discord's embed limits)
      const typeEntries = Object.entries(leaksByType);
      for (let i = 0; i < Math.min(typeEntries.length, 10); i++) {
        const [type, leaks] = typeEntries[i];
        // Limit the number of files shown per type
        const fileNames = leaks.slice(0, 10).map(leak => `• ${leak.fileName} (${leak.changeType})`).join('\n');
        const hasMore = leaks.length > 10 ? `\n...and ${leaks.length - 10} more` : '';
        embed.addFields({ 
          name: `${type} (${leaks.length})`, 
          value: fileNames.substring(0, 1000) + hasMore 
        });
      }
      
      // If there are more types than we can show, add a note
      if (typeEntries.length > 10) {
        embed.addFields({ 
          name: 'Additional Types', 
          value: `${typeEntries.length - 10} more file types not shown here` 
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } else if (subcommand === 'tiers') {
      // Show information about priority tiers
      const embed = new EmbedBuilder()
        .setTitle('Leak Priority Tiers')
        .setDescription('Leaks are categorized into priority tiers based on their importance to players.')
        .setColor(0x5865F2)
        .addFields(
          { 
            name: '🔴 Tier 1 (Highest Priority)', 
            value: 'Most important to players. Includes eggs, pets, huges, events, gamepasses, enchants, charms, areas, etc.', 
            inline: false 
          },
          { 
            name: '🟡 Tier 2 (Medium Priority)', 
            value: 'Technical assets with moderate importance. Includes meshes, models, textures, audio, UI elements, etc.', 
            inline: false 
          },
          { 
            name: '🔵 Tier 3 (Lower Priority)', 
            value: 'General updates and changes with lower immediate relevance. Includes configuration files, developer notes, etc.', 
            inline: false 
          },
          {
            name: 'Commands',
            value: 'Use `/leaks recent tier:1` to see only Tier 1 leaks\nUse `/leaks recent tier:2` to see only Tier 2 leaks\nUse `/leaks recent tier:3` to see only Tier 3 leaks\nUse `/leaks lowertier` to view the batched lower priority leaks',
            inline: false
          }
        )
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'huges') {
      await interaction.deferReply();
      
      // Get showAll option if provided
      const showAll = interaction.options.getBoolean('showall') || false;
      
      // Get all recent leaks or filter specifically for huge-related leaks
      const recentLeaks = await storage.getRecentLeaks(showAll ? 168 : 48); // 168 hours = 1 week if showAll is true
      
      // Filter for huge pet related leaks
      const hugeKeywords = ['huge', 'huges/registry', 'titanic'];
      const hugeLeaks = recentLeaks.filter(leak => {
        const lowerFileName = leak.fileName.toLowerCase();
        const lowerFilePath = leak.filePath.toLowerCase();
        return hugeKeywords.some(keyword => 
          lowerFileName.includes(keyword) || lowerFilePath.includes(keyword) ||
          (leak.metadata && typeof leak.metadata === 'object' && 
            (leak.metadata.type === 'huge' || leak.metadata.name?.toString().toLowerCase().includes('huge')))
        );
      });
      
      if (hugeLeaks.length === 0) {
        await interaction.editReply(`No huge pet leaks have been detected in the last ${showAll ? '7 days' : '48 hours'}.`);
        return;
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('🔍 Huge Pet Leaks')
        .setColor(0xED4245) // Red color for important leaks
        .setDescription(`Found ${hugeLeaks.length} huge pet related leaks in the last ${showAll ? '7 days' : '48 hours'}.`)
        .setTimestamp();
      
      // Group by file type for better organization
      const byType: Record<string, Leak[]> = {};
      for (const leak of hugeLeaks) {
        if (!byType[leak.fileType]) {
          byType[leak.fileType] = [];
        }
        byType[leak.fileType].push(leak);
      }
      
      // Add fields for each type
      for (const [type, leaks] of Object.entries(byType)) {
        if (leaks.length > 0) {
          const filesList = leaks.map(leak => {
            const date = new Date(leak.timestamp).toLocaleString();
            return `• ${leak.fileName} (${date})`;
          }).join('\n');
          
          embed.addFields({ 
            name: `${type} (${leaks.length})`, 
            value: filesList.substring(0, 1024) // Discord limits field values to 1024 chars
          });
        }
      }
      
      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'weekly') {
      await interaction.deferReply();
      
      // Get tier filter if provided
      const tierFilter = interaction.options.getInteger('tier');
      
      // Calculate start of current update week (Sunday 1 AM)
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysSinceSunday = currentDay === 0 ? 0 : currentDay; // If today is Sunday, start from today
      
      // Go back to this week's Sunday at 1 AM
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - daysSinceSunday);
      startDate.setHours(1, 0, 0, 0);
      
      // If we're past Sunday 1 AM, use the current week's Sunday, otherwise use last week's
      if (now < startDate) {
        startDate.setDate(startDate.getDate() - 7);
      }
      
      // Fetch all leaks since the start of the update period
      const hoursSinceStart = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      const recentLeaks = await storage.getLeaksByTimeRange(startDate, now);
      
      // Filter by tier if specified
      let filteredLeaks = recentLeaks;
      if (tierFilter) {
        filteredLeaks = recentLeaks.filter(leak => {
          const priorityTier = this.getPriorityTier(leak);
          return priorityTier === tierFilter;
        });
      }
      
      if (filteredLeaks.length === 0) {
        const tierMessage = tierFilter ? ` for Tier ${tierFilter}` : '';
        await interaction.editReply(`No leaks have been detected since the last update${tierMessage} (${startDate.toLocaleString()}).`);
        return;
      }
      
      // Create embed with week information
      const embed = new EmbedBuilder()
        .setTitle(`📅 This Week's Leaks${tierFilter ? ` (Tier ${tierFilter})` : ''}`)
        .setColor(0x5865F2)
        .setDescription(`Showing ${filteredLeaks.length} leaks since the update on ${startDate.toLocaleString()}.`)
        .setFooter({ text: `Next update: Sunday at 1 AM` })
        .setTimestamp();
      
      // Group by type for better organization
      const byType: Record<string, Leak[]> = {};
      for (const leak of filteredLeaks) {
        if (!byType[leak.fileType]) {
          byType[leak.fileType] = [];
        }
        byType[leak.fileType].push(leak);
      }
      
      // Add fields for each type, sorted by most common first
      const sortedTypes = Object.entries(byType).sort((a, b) => b[1].length - a[1].length);
      
      for (const [type, leaks] of sortedTypes) {
        if (leaks.length > 0) {
          // Get the timestamps in a readable format
          const filesList = leaks.map(leak => {
            const date = new Date(leak.timestamp).toLocaleString();
            return `• ${leak.fileName} (${date})`;
          }).join('\n');
          
          // Add field up to Discord's character limit
          let fieldValue = filesList;
          if (fieldValue.length > 1024) {
            fieldValue = fieldValue.substring(0, 1000) + '... (more)';
          }
          
          embed.addFields({ 
            name: `${type} (${leaks.length})`, 
            value: fieldValue
          });
        }
      }
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleScanCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'now') {
      await interaction.deferReply();

      if (this.scanInProgress) {
        await interaction.editReply('A scan is already in progress. Please wait for it to complete.');
        return;
      }

      await interaction.editReply('Starting manual game file scan...');

      try {
        await this.runScan();

        // Get the results of the scan
        const scanTime = this.lastScanTime;
        const cutoffTime = new Date(scanTime!.getTime() - 10000); // 10 seconds before scan completed
        const newLeaks = await storage.getLeaksByTimeRange(cutoffTime, scanTime!);

        const embed = new EmbedBuilder()
          .setTitle('Manual Scan Complete')
          .setColor(0x57F287)
          .setDescription(`Found ${newLeaks.length} new or changed files.`)
          .setTimestamp();

        if (newLeaks.length > 0) {
          // Group by file type
          const byType: Record<string, Leak[]> = {};

          for (const leak of newLeaks) {
            if (!byType[leak.fileType]) {
              byType[leak.fileType] = [];
            }
            byType[leak.fileType].push(leak);
          }

          // Add fields for each type
          for (const [type, leaks] of Object.entries(byType)) {
            const fileNames = leaks.map(leak => `• ${leak.fileName} (${leak.changeType})`).join('\n');
            embed.addFields({ name: `${type} (${leaks.length})`, value: fileNames.substring(0, 1024) });
          }
        } else {
          embed.addFields({ name: 'No Changes', value: 'No new or modified files were detected in this scan.' });
        }

        await interaction.editReply({ content: '', embeds: [embed] });
      } catch (error) {
        await interaction.editReply(`Error during scan: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (subcommand === 'user') {
      await interaction.deferReply();
      
      const userId = interaction.options.getString('userid');
      
      if (!userId) {
        await interaction.editReply('Please provide a valid Roblox user ID.');
        return;
      }
      
      await interaction.editReply(`Scanning assets from Roblox user ID: ${userId}...`);
      
      try {
        // Get user info
        await this.scanUserInventory(userId);
        await this.scanUserCreations(userId);
        
        // Get results
        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - 5); // Last 5 minutes
        
        const recentLeaks = await storage.getRecentLeaks(48);
        const userLeaks = recentLeaks.filter(leak => {
          if (leak.metadata && typeof leak.metadata === 'object') {
            const metadata = leak.metadata as any;
            return metadata.robloxUserId === userId;
          }
          return false;
        });
        
        const embed = new EmbedBuilder()
          .setTitle('User Scan Complete')
          .setColor(0x57F287)
          .setDescription(`Found ${userLeaks.length} assets for Roblox user ID: ${userId}`)
          .setTimestamp();
        
        if (userLeaks.length > 0) {
          // Group by type
          const byType: Record<string, Leak[]> = {};
          
          for (const leak of userLeaks) {
            if (!byType[leak.fileType]) {
              byType[leak.fileType] = [];
            }
            byType[leak.fileType].push(leak);
          }
          
          // Add fields for each type
          for (const [type, leaks] of Object.entries(byType)) {
            const fileNames = leaks.map(leak => {
              // Add link to asset if available
              if (leak.metadata && typeof leak.metadata === 'object') {
                const metadata = leak.metadata as any;
                if (metadata.assetId) {
                  return `• ${leak.fileName} ([view](https://www.roblox.com/catalog/${metadata.assetId}))`;
                }
              }
              return `• ${leak.fileName}`;
            }).join('\n');
            
            embed.addFields({ 
              name: `${type} (${leaks.length})`, 
              value: fileNames.substring(0, 1024) 
            });
          }
        } else {
          embed.addFields({ 
            name: 'No Assets Found', 
            value: 'No assets were found for this user or there was an error accessing Roblox API.' 
          });
        }
        
        await interaction.editReply({ content: '', embeds: [embed] });
      } catch (error) {
        await interaction.editReply(`Error scanning user: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (subcommand === 'frequency') {
      const minutes = interaction.options.getInteger('minutes');
      
      if (!minutes || minutes < 2 || minutes > 60) {
        await interaction.reply({ 
          content: 'Please provide a valid scan frequency between 2 and 60 minutes.', 
          ephemeral: true 
        });
        return;
      }
      
      await this.updateScanFrequency(minutes);
      
      await interaction.reply({
        content: `Scan frequency updated! Bot will now scan every ${minutes} minutes. Next scan ${this.getNextScanTime()}`,
        ephemeral: false
      });
    }
  }

  private async handleBotCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      const uptimeMs = Date.now() - this.startTime.getTime();
      const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

      const uptimeFormatted = `${days}d ${hours}h ${minutes}m`;

      // Get scan stats
      const settings = await storage.getAllSettings();
      const scanFrequency = settings.find(s => s.settingKey === 'scanFrequency')?.settingValue || this.scanFrequency.toString();

      // Get other stats
      const recentLeaks = await storage.getRecentLeaks(24 * 7); // Last week
      const totalLeaks = recentLeaks.length;
      const devChanges = recentLeaks.filter(leak => leak.isDeveloperChange).length;

      const embed = new EmbedBuilder()
        .setTitle('Discord Leaks Bot Status')
        .setColor(0x5865F2)
        .setDescription('Current status of the game file monitoring bot')
        .addFields(
          { name: 'Status', value: 'Online', inline: true },
          { name: 'Uptime', value: uptimeFormatted, inline: true },
          { name: 'Latency', value: `${this.client.ws.ping}ms`, inline: true },
          { name: 'Scan Frequency', value: `Every ${scanFrequency} minutes`, inline: true },
          { name: 'Last Scan', value: this.lastScanTime ? `<t:${Math.floor(this.lastScanTime.getTime() / 1000)}:R>` : 'Never', inline: true },
          { name: 'Next Scan', value: this.getNextScanTime(), inline: true },
          { name: 'Leaks Detected (7d)', value: totalLeaks.toString(), inline: true },
          { name: 'Developer Changes (7d)', value: devChanges.toString(), inline: true },
          { name: 'Commands Available', value: this.commands.length.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'logs') {
      await interaction.deferReply();
      
      // Number of logs to show
      const count = interaction.options.getInteger('count') || 10;
      
      // Get recent logs
      const logs = await storage.getLogs(count);
      
      if (logs.length === 0) {
        await interaction.editReply('No logs found.');
        return;
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Logs')
        .setColor(0x5865F2)
        .setDescription(`Last ${logs.length} bot logs:`)
        .setTimestamp();
      
      // Group logs by type
      const byType: Record<string, BotLog[]> = {};
      
      for (const log of logs) {
        if (!byType[log.eventType]) {
          byType[log.eventType] = [];
        }
        byType[log.eventType].push(log);
      }
      
      // Add fields for each type
      for (const [type, typeLogs] of Object.entries(byType)) {
        // Format the log messages
        const formattedLogs = typeLogs.map(log => {
          const time = new Date(log.timestamp);
          const timeStr = `<t:${Math.floor(time.getTime() / 1000)}:R>`;
          return `• [${timeStr}] ${log.message}`;
        }).join('\n');
        
        embed.addFields({
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Logs`,
          value: formattedLogs.substring(0, 1024)
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async onError(error: Error) {
    console.error('Discord client error:', error);

    await storage.createLog({
      eventType: 'error',
      message: `Discord client error: ${error.message}`,
      metadata: { error: error.stack || error.message }
    });
  }

  private async onShardError(error: Error, shardId: number) {
    console.error(`Shard ${shardId} error:`, error);

    await storage.createLog({
      eventType: 'error',
      message: `Shard ${shardId} error: ${error.message}`,
      metadata: { shardId, error: error.stack || error.message }
    });
  }

  private async scanStoreContent() {
    for (const url of this.storeSearchUrls) {
      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data?.data) {
          for (const item of data.data) {
            await storage.createLeak({
              fileName: `${item.name}.rbxm`,
              filePath: `/roblox/store/${item.id}`,
              fileType: 'StoreModel',
              changeType: 'added',
              isDeveloperChange: true,
              fileSize: 0,
              metadata: {
                creatorId: item.creator.id,
                creatorName: item.creator.name,
                assetId: item.id,
                description: item.description,
                source: 'roblox_store'
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error scanning Roblox store URL ${url}:`, error);
      }
    }
  }

  private async scanCreatorAssets() {
    for (const assetUrl of this.robloxCreatorAssets) {
      try {
        const response = await fetch(assetUrl);
        const data = await response.json();

        if (data?.data) {
          for (const asset of data.data) {
            await storage.createLeak({
              fileName: `${asset.name}.${asset.assetType.toLowerCase()}`,
              filePath: `/roblox/creator/${asset.id}`,
              fileType: asset.assetType,
              changeType: 'added',
              isDeveloperChange: true,
              fileSize: 0,
              metadata: {
                creatorId: asset.creator?.id,
                creatorName: asset.creator?.name,
                assetId: asset.id,
                description: asset.description,
                source: 'creator_marketplace'
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error scanning creator asset URL ${assetUrl}:`, error);
      }
    }
  }

  private async scanGroupAssets() {
    for (const groupId of this.robloxGroupIds) {
      try {
        const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/assets`);
        const data = await response.json();

        if (data?.data) {
          for (const asset of data.data) {            await storage.createLeak({
              fileName: `${asset.name}.rbxm`,
              filePath: `/roblox/groups/${groupId}/assets/${asset.id}`,
              fileType: 'GroupAsset',
              changeType: 'added',
              isDeveloperChange: true,
              fileSize: 0,
              metadata: {
                groupId,
                assetId: asset.id,
                source: 'group_assets'
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error scanning group ${groupId} assets:`, error);
      }
    }
  }

  private async scanGameData() {
    for (const endpoint of this.gameDataEndpoints) {
      for (const gameId of Object.values(this.gameIds)) {
        try {
          const response = await fetch(`https://games.roblox.com/v1/games/${gameId}${endpoint}`);
          const data = await response.json();

          // Special handling for eggs
          if (endpoint === '/eggs/configuration' && data?.eggs) {
            for (const egg of data.eggs) {
              await storage.createLeak({
                fileName: `${egg.name}.json`,
                filePath: `/roblox/games/${gameId}/eggs/${egg.id}`,
                fileType: 'GameData',
                changeType: 'modified',
                isDeveloperChange: true,
                fileSize: 0,
                metadata: {
                  type: 'egg',
                  hatchChance: egg.hatchChance,
                  cost: egg.cost,
                  location: egg.location,
                  possiblePets: egg.pets,
                  source: 'game_data'
                }
              });
            }
          }

          // Special handling for game passes
          if (endpoint === '/game-passes/data' && data?.gamePasses) {
            for (const pass of data.gamePasses) {
              await storage.createLeak({
                fileName: `${pass.name}.json`,
                filePath: `/roblox/games/${gameId}/gamepasses/${pass.id}`,
                fileType: 'GameData',
                changeType: 'modified',
                isDeveloperChange: true,
                fileSize: 0,
                metadata: {
                  type: 'gamepass',
                  price: pass.price,
                  benefits: pass.benefits,
                  source: 'game_data'
                }
              });
            }
          }

          if (data) {
            await storage.createLeak({
              fileName: `${endpoint.substring(1)}.json`,
              filePath: `/roblox/games/${gameId}/data${endpoint}`,
              fileType: 'GameData',
              changeType: 'modified',
              isDeveloperChange: true,
              fileSize: 0,
              metadata: {
                gameId,
                endpoint,
                source: 'game_data',
                timestamp: new Date().toISOString()
              }
            });
          }
        } catch (error) {
          console.error(`Error scanning game data for ${gameId} at ${endpoint}:`, error);
        }
      }
    }
  }

  private async scanMarketplace(category?: string) {
    for (const searchTerm of this.marketplaceSearchTerms) {
      try {
        // Build the search URL, including category if provided
        let searchUrl = `https://api.roblox.com/marketplace/search?keyword=${encodeURIComponent(searchTerm)}`;
        
        if (category) {
          searchUrl += `&category=${encodeURIComponent(category)}`;
        }
        
        // Search marketplace items
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data?.Items) {
          for (const item of data.Items) {
            await storage.createLeak({
              fileName: `${item.Name}.rbxm`,
              filePath: `/roblox/marketplace/${category || 'general'}/${item.AssetId}`,
              fileType: 'MarketplaceItem',
              changeType: 'added',
              isDeveloperChange: item.Creator.Type === 'Group' && item.Creator.Name === 'Big Games',
              fileSize: 0,
              metadata: {
                assetId: item.AssetId,
                creatorName: item.Creator.Name,
                creatorType: item.Creator.Type,
                price: item.PriceInRobux,
                category: category || 'general',
                source: 'roblox_marketplace'
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error scanning marketplace for term ${searchTerm}:`, error);
      }
    }
  }
  
  private async scanUserInventory(userId: string) {
    try {
      // Get user info
      const userResponse = await fetch(`https://api.roblox.com/users/${userId}`);
      const userData = await userResponse.json();

      // Get user's inventory
      const inventoryResponse = await fetch(`https://inventory.roblox.com/v2/users/${userId}/inventory`);
      const inventoryData = await inventoryResponse.json();

      if (inventoryData?.data) {
        for (const item of inventoryData.data) {
          // Only track game assets and specific asset types
          if (["Model", "Mesh", "Decal", "Animation", "Audio"].includes(item.assetType)) {
            await storage.createLeak({
              fileName: `${item.name || 'unnamed'}.${item.assetType.toLowerCase()}`,
              filePath: `/roblox/users/${userId}/inventory/${item.assetId}`,
              fileType: item.assetType,
              changeType: 'added',
              isDeveloperChange: true,
              fileSize: 0,
              metadata: {
                robloxUserId: userId,
                robloxUsername: userData.Username,
                assetId: item.assetId,
                source: 'user_inventory'
              }
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning user inventory ${userId}:`, error);
    }
  }

  private async scanUserCreations(userId: string) {
    try {
      // Get user info
      const userResponse = await fetch(`https://api.roblox.com/users/${userId}`);
      const userData = await userResponse.json();

      // Get user's creations
      const creationsResponse = await fetch(`https://api.roblox.com/users/${userId}/assets`);
      const creationsData = await creationsResponse.json();

      if (creationsData?.data) {
        for (const creation of creationsData.data) {
          await storage.createLeak({
            fileName: `${creation.name || 'unnamed'}.${creation.assetType.toLowerCase()}`,
            filePath: `/roblox/users/${userId}/creations/${creation.assetId}`,
            fileType: creation.assetType,
            changeType: 'added',
            isDeveloperChange: true,
            fileSize: 0,
            metadata: {
              robloxUserId: userId,
              robloxUsername: userData.Username,
              assetId: creation.assetId,
              source: 'user_creations'
            }
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning user creations ${userId}:`, error);
    }
  }

  private async scanRobloxAssets() {
    try {
      // Scan all asset types
      await this.scanCreatorAssets();

      // Scan group assets
      await this.scanGroupAssets();

      // Scan game-specific data
      await this.scanGameData();

      // Scan marketplace categories
      for (const category of this.marketplaceCategories) {
        await this.scanMarketplace(category);
      }

      // Instead of the creator marketplace function, use search locations directly
      for (const location of this.searchLocations) {
        try {
          console.log(`Scanning location: ${location}`);
          const response = await fetch(location, {
            headers: {
              'User-Agent': 'LeaksBot/1.0',
              'Accept': 'text/html,application/json'
            }
          });
          
          const contentType = response.headers.get('content-type') || '';
          let data;
          
          if (contentType.includes('application/json')) {
            data = await response.json();
          } else {
            // Handle HTML content
            data = await response.text();
            
            // Check for changes using a hash
            const contentHash = Buffer.from(data).toString('base64');
            const previousHash = await storage.getSetting(`location_hash_${location}`);
            
            if (!previousHash || previousHash.settingValue !== contentHash) {
              // Store new hash
              await storage.updateSetting(`location_hash_${location}`, contentHash);
              
              await storage.createLeak({
                fileName: `marketplace_update_${Date.now()}.html`,
                filePath: `/marketplace/${new URL(location).hostname}${new URL(location).pathname}`,
                fileType: 'MarketplaceUpdate',
                changeType: 'modified',
                isDeveloperChange: false,
                fileSize: data.length,
                metadata: {
                  source: location,
                  timestamp: new Date().toISOString()
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error scanning location ${location}:`, error);
        }
      }

      // Scan developer inventories
      for (const userId of this.robloxUsers.slice(0, 10)) { // Only scan first 10 to avoid rate limits
        try {
          await this.scanUserInventory(userId);
        } catch (error) {
          console.error(`Error scanning user inventory ${userId}:`, error);
        }
        
        try {
          await this.scanUserCreations(userId);
        } catch (error) {
          console.error(`Error scanning user creations ${userId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in scanRobloxAssets:", error);
    }

    // Scan store content with enhanced search
    for (const keyword of this.searchKeywords) {
      await this.scanStoreContent(keyword);
    }

    // Then scan user assets
    for (const userId of this.robloxUsers) {
      try {
        const userResponse = await fetch(`https://api.roblox.com/users/${userId}`);
        const userData = await userResponse.json();

        // Scan user's inventory for game assets
        const assetsResponse = await fetch(`https://inventory.roblox.com/v2/users/${userId}/inventory`);
        const assetsData = await assetsResponse.json();

        if (assetsData?.data) {
          for (const asset of assetsData.data) {
            if (asset.assetType === "Model" || asset.assetType === "Decal" || asset.assetType === "Mesh") {
              await storage.createLeak({
                fileName: `${asset.name}.${asset.assetType.toLowerCase()}`,
                filePath: `/roblox/users/${userId}/assets/${asset.assetId}`,
                fileType: asset.assetType,
                changeType: 'added',
                isDeveloperChange: true,
                fileSize: 0,
                metadata: {
                  robloxUserId: userId,
                  robloxUsername: userData.Username,
                  assetId: asset.assetId,
                  source: 'roblox_inventory'
                }
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning Roblox user ${userId}:`, error);
      }
    }
  }

  // Check if it's time to send batched lower tier leaks
  // Hash a leak's key properties to create a unique fingerprint for duplicate detection
  private hashLeak(leak: Leak): string {
    // Normalize file name and path to lowercase for consistent matching
    const fileName = leak.fileName.toLowerCase();
    const filePath = leak.filePath.toLowerCase();
    
    // Create a hash based on relevant properties
    return `${fileName}|${filePath}|${leak.fileType}|${leak.changeType}`;
  }
  
  // Keep track of recently posted leaks to prevent duplicates
  private recentLeakHashes = new Map<string, number>(); // hash -> timestamp
  private readonly DUPLICATE_DETECTION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  // Check if this leak is a duplicate of one we've seen recently
  private isDuplicateLeak(leak: Leak): boolean {
    const hash = this.hashLeak(leak);
    const now = Date.now();
    
    // Clean up old entries first to prevent memory growth
    for (const [storedHash, timestamp] of this.recentLeakHashes.entries()) {
      if (now - timestamp > this.DUPLICATE_DETECTION_WINDOW_MS) {
        this.recentLeakHashes.delete(storedHash);
      }
    }
    
    // Check if this hash exists in our recent leaks map
    if (this.recentLeakHashes.has(hash)) {
      console.log(`Skipping duplicate leak: ${leak.fileName}`);
      return true;
    }
    
    // Not a duplicate, so add it to our map and return false
    this.recentLeakHashes.set(hash, now);
    return false;
  }

  private async checkAndSendLowerTierBatch() {
    const now = new Date();
    const minutesSinceLastBatch = Math.floor(
      (now.getTime() - this.lastLowerTierBatchTime.getTime()) / (60 * 1000)
    );
    
    // If the batch interval has passed and we have leaks to send
    if (minutesSinceLastBatch >= this.batchIntervalMinutes && this.lowerTierLeaksBatch.length > 0) {
      console.log(`Sending batched lower tier leaks (${this.lowerTierLeaksBatch.length} leaks)`);
      
      try {
        // Skip Discord notification if the bot is offline
        if (!this.client.isReady()) {
          console.log('Bot is offline, adding batch notification to log only');
          
          // Log the batch notification even if offline
          await storage.createLog({
            eventType: 'batch',
            message: `Added batch of ${this.lowerTierLeaksBatch.length} lower tier leaks (bot offline)`,
            metadata: { 
              count: this.lowerTierLeaksBatch.length,
              timestamp: now.toISOString(),
              offline: true
            }
          });
          
          // Don't clear the batch if we're offline - wait until we can send it
          return;
        }
        
        // Find the leaks channel
        const guild = this.client.guilds.cache.get(process.env.GUILD_ID!);
        if (!guild) {
          console.error('Guild not found');
          return;
        }
        
        // Use the global constant instead of redefining it
        const leaksChannel = guild.channels.cache.get(LEAKS_CHANNEL_ID) as TextChannel;
        if (!leaksChannel) {
          console.error(`Leaks channel not found (ID: ${LEAKS_CHANNEL_ID})`);
          return;
        }
        
        // Count by tier and remove any duplicates
        let tier2Count = 0;
        let tier3Count = 0;
        const uniqueLeaks: Leak[] = [];
        const seenHashes = new Set<string>();
        
        // Enhanced categorization of leaks
        const leaksByCategory: Record<string, Leak[]> = {
          'server_updates': [],
          'textures': [],
          'models': [],
          'config': [],
          'audio': [],
          'inventory': [],
          'marketplace': [],
          'other': []
        };
        
        for (const leak of this.lowerTierLeaksBatch) {
          const hash = this.hashLeak(leak);
          
          // Skip if we've already included this leak in this batch
          if (seenHashes.has(hash)) continue;
          
          seenHashes.add(hash);
          uniqueLeaks.push(leak);
          
          // Assign to appropriate category
          const lowerFilePath = leak.filePath.toLowerCase();
          const lowerFileName = leak.fileName.toLowerCase();
          
          if (lowerFilePath.includes('server') || lowerFileName.includes('server') ||
              lowerFilePath.includes('config') || lowerFileName.includes('configuration')) {
            leaksByCategory.server_updates.push(leak);
          }
          else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tga'].some(ext => 
                 lowerFileName.endsWith(ext))) {
            leaksByCategory.textures.push(leak);
          }
          else if (lowerFilePath.includes('model') || lowerFileName.includes('model') || 
                  lowerFilePath.includes('mesh') || lowerFileName.includes('mesh')) {
            leaksByCategory.models.push(leak);
          }
          else if (lowerFilePath.includes('audio') || lowerFileName.includes('audio') ||
                  lowerFilePath.includes('sound') || lowerFileName.includes('sound') ||
                  lowerFilePath.includes('music') || lowerFileName.includes('music')) {
            leaksByCategory.audio.push(leak);
          }
          else if (lowerFilePath.includes('inventory') || lowerFileName.includes('inventory')) {
            leaksByCategory.inventory.push(leak);
          }
          else if (lowerFilePath.includes('marketplace') || lowerFileName.includes('marketplace')) {
            leaksByCategory.marketplace.push(leak);
          }
          else if (lowerFilePath.includes('config') || lowerFileName.includes('config') ||
                  lowerFilePath.includes('settings') || lowerFileName.includes('settings')) {
            leaksByCategory.config.push(leak);
          }
          else {
            leaksByCategory.other.push(leak);
          }
          
          const priorityTier = this.getPriorityTier(leak);
          if (priorityTier === 2) tier2Count++;
          else if (priorityTier === 3) tier3Count++;
        }
        
        // Use the deduplicated list
        this.lowerTierLeaksBatch = uniqueLeaks;
        
        // Import Discord component classes
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

        // Generate a unique batch ID
        const batchId = `batch_${Date.now()}`;
        
        // Store this batch for later retrieval via buttons
        const leakIds = this.lowerTierLeaksBatch.map(leak => leak.id);
        this.batchNotifications.set(batchId, leakIds);
        
        // Create a detailed count of categories
        const categoryCounts = Object.entries(leaksByCategory)
          .filter(([_, leaks]) => leaks.length > 0)
          .map(([category, leaks]) => {
            // Format the category name nicely
            const formattedCategory = category
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
              
            return `**${formattedCategory}**: ${leaks.length} files`;
          })
          .join('\n');
        
        // Create batch notification message with category counts
        const batchMessage = new EmbedBuilder()
          .setTitle(`🔍 ${this.lowerTierLeaksBatch.length} Less Important Game Updates`)
          .setDescription(
            `The following types of leaks have been found:\n\n${categoryCounts}\n\n` +
            `Tier breakdown:\n` +
            `${tier2Count > 0 ? `**🟡 Tier 2:** ${tier2Count} moderate importance leaks\n` : ''}` +
            `${tier3Count > 0 ? `**🔵 Tier 3:** ${tier3Count} minor importance leaks\n` : ''}\n` +
            `Select which category you'd like to view.`
          )
          .setColor(0x3498db) // Blue color for batch notifications
          .setTimestamp()
          .setFooter({ text: 'Use buttons below to view specific categories • All responses are only visible to you' });
        
        // Create category-specific buttons
        const categoryButtons: ButtonBuilder[] = [];
        
        // Only add buttons for categories that have leaks
        for (const [category, leaks] of Object.entries(leaksByCategory)) {
          if (leaks.length > 0) {
            const buttonLabel = category
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
              
            // Get appropriate emoji for each category
            let emoji = '📁';
            if (category === 'server_updates') emoji = '⚙️';
            else if (category === 'textures') emoji = '🖼️';
            else if (category === 'models') emoji = '🧩';
            else if (category === 'audio') emoji = '🔊';
            else if (category === 'inventory') emoji = '🎒';
            else if (category === 'marketplace') emoji = '🛒';
            else if (category === 'config') emoji = '⚙️';
              
            categoryButtons.push(
              new ButtonBuilder()
                .setCustomId(`view_category_${category}_${batchId}`)
                .setLabel(buttonLabel)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(emoji)
            );
          }
        }
        
        // Add "View All" and "Dismiss" buttons
        categoryButtons.push(
          new ButtonBuilder()
            .setCustomId(`view_lower_tier_${batchId}`)
            .setLabel('View All Leaks')
            .setStyle(ButtonStyle.Success)
            .setEmoji('👁️')
        );
        
        categoryButtons.push(
          new ButtonBuilder()
            .setCustomId(`dismiss_lower_tier_${batchId}`)
            .setLabel('Dismiss')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
        );
        
        // Create button rows (Discord has limit of 5 buttons per row)
        const buttonRows: any[] = [];
        for (let i = 0; i < categoryButtons.length; i += 5) {
          const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(categoryButtons.slice(i, i + 5));
          buttonRows.push(row);
        }
        
        // Send the notification with buttons
        const batchNotification = await leaksChannel.send({ 
          embeds: [batchMessage],
          components: buttonRows
        });
        
        // Also store category-specific leak IDs for each category
        for (const [category, leaks] of Object.entries(leaksByCategory)) {
          if (leaks.length > 0) {
            const categoryId = `${category}_${batchId}`;
            this.batchNotifications.set(categoryId, leaks.map(leak => leak.id));
          }
        }
        
        // Log the batch notification
        await storage.createLog({
          eventType: 'batch_notify',
          message: `Sent batch notification for ${this.lowerTierLeaksBatch.length} lower tier leaks`,
          metadata: { 
            messageId: batchNotification.id,
            channelId: leaksChannel.id,
            count: this.lowerTierLeaksBatch.length,
            tier2Count,
            tier3Count,
            timestamp: now.toISOString(),
            leakIds: this.lowerTierLeaksBatch.map(leak => leak.id),
            categoryCounts: Object.entries(leaksByCategory).reduce((acc, [category, leaks]) => {
              acc[category] = leaks.length;
              return acc;
            }, {} as Record<string, number>)
          }
        });
        
        // Clear the batch after sending
        this.lowerTierLeaksBatch = [];
        this.lastLowerTierBatchTime = now;
      } catch (error) {
        console.error('Error sending batch notification:', error);
        
        // Log the error
        await storage.createLog({
          eventType: 'error',
          message: `Error sending batch notification: ${error instanceof Error ? error.message : String(error)}`,
          metadata: { 
            error: String(error),
            batchSize: this.lowerTierLeaksBatch.length
          }
        });
      }
    }
  }

  async runScan() {
    if (this.scanInProgress) {
      console.log('Scan already in progress, waiting...');
      return;
    }

    this.scanInProgress = true;
    this.lastScanTime = new Date();
    let retryCount = 0;
    
    // Check if it's time to send batched lower tier leaks
    await this.checkAndSendLowerTierBatch();
    
    // Log scan start first
    await storage.createLog({
      eventType: 'scan',
      message: 'File scan started',
      metadata: { timestamp: this.lastScanTime }
    });

    try {
      // Update setting
      await storage.updateSetting('lastScanTime', this.lastScanTime.toISOString());

      // Scan blogs first with immediate posting
      console.log('Scanning blogs for updates...');
      const blogLeaks = await this.scanBlogs();
      
      if (blogLeaks.length > 0) {
        // Filter out any blog leaks that don't have useful content
        const usefulBlogLeaks = blogLeaks.filter(leak => {
          // Check if this blog has actual content
          if (leak.metadata && typeof leak.metadata === 'object') {
            const metadata = leak.metadata as any;
            // Consider it useful if it has a URL, content, or other meaningful data
            return metadata.url || metadata.content || metadata.link || metadata.details;
          }
          return false;
        });
        
        const lowQualityBlogs = blogLeaks.length - usefulBlogLeaks.length;
        
        if (lowQualityBlogs > 0) {
          console.log(`Filtered out ${lowQualityBlogs} blog leaks without useful content`);
        }
        
        console.log(`Found ${usefulBlogLeaks.length} blog updates with useful content, posting immediately...`);
        for (const leak of usefulBlogLeaks) {
          try {
            await this.postLeak(leak);
          } catch (error) {
            console.error('Error posting blog leak:', error);
          }
        }
      }

      // Scan Roblox assets with immediate posting where possible
      console.log('Scanning Roblox assets...');
      try {
        await this.scanRobloxAssets();
      } catch (error) {
        console.error('Error in Roblox asset scan:', error);
        // Continue with file scan even if Roblox scan fails
      }

      // Simulate a scan in development environment
      // In a real environment, this would perform a full scan of game files
      console.log('Scanning game files...');
      const gameContentPath = path.join(process.cwd(), 'mock_game_files', 'content', 'paks');

      if (!fs.existsSync(gameContentPath)) {
        // Create the directory if it doesn't exist
        fs.mkdirSync(gameContentPath, { recursive: true });
        console.log(`Created game content path: ${gameContentPath}`);
        
        // Create a test file for demo purposes
        const demoFolder = path.join(gameContentPath, 'demo_eggs');
        fs.mkdirSync(demoFolder, { recursive: true });
        const testFilePath = path.join(demoFolder, 'dev_test.json');
        fs.writeFileSync(testFilePath, JSON.stringify({
          type: 'egg',
          eggType: 'demo',
          hatchChance: '1%',
          cost: 1000,
          possiblePets: ['Demo Pet 1', 'Demo Pet 2']
        }, null, 2));
        console.log(`Created test file for demonstration: ${testFilePath}`);
      }

      // Read all files recursively
      const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []): string[] => {
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
          const fullPath = path.join(dirPath, file);
          if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
          } else {
            arrayOfFiles.push(fullPath);
          }
        });

        return arrayOfFiles;
      };

      const files = getAllFiles(gameContentPath);

      // Process each file and post immediately
        for (const file of files) {
          const filePath = file; // file is already the full path from getAllFiles
          const stats = fs.statSync(filePath);

          // Determine file type with improved categorization
          const fileExt = path.extname(file).toLowerCase();
          const lowerFileName = path.basename(file).toLowerCase();
          const lowerFilePath = filePath.toLowerCase();
          let fileType;
          
          // Enhanced file type detection with tier categorization
          // Tier 1 (highest priority) - most relevant to players
          if (fileExt === '.json') {
            fileType = "JSON"; // Default JSON type
            
            // Enhanced JSON content analysis for better leak categorization
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              const jsonData = JSON.parse(content);
              let metadata: any = { 
                extension: fileExt,
                detectionMethod: 'scan',
                priority: 3 // Default to lowest priority
              };
              
              // Determine category and priority based on content and path
              if (lowerFileName.includes('egg') || lowerFilePath.includes('eggs') || 
                  jsonData.eggType || jsonData.type === 'egg') {
                fileType = "Egg";
                metadata.priority = 1; // Tier 1
              }
              else if (lowerFileName.includes('pet') || lowerFilePath.includes('pets') ||
                       jsonData.petId || jsonData.petType) {
                // Check for special pet types
                if (lowerFileName.includes('huge') || lowerFilePath.includes('huges') ||
                    jsonData.isHuge || (jsonData.rarity && jsonData.rarity.toLowerCase() === 'huge')) {
                  fileType = "Huge Pet";
                } 
                else if (lowerFileName.includes('titanic') || lowerFilePath.includes('titanic') ||
                       jsonData.isTitanic || (jsonData.rarity && jsonData.rarity.toLowerCase() === 'titanic')) {
                  fileType = "Titanic Pet";
                }
                else {
                  fileType = "Pet";
                }
                metadata.priority = 1; // Tier 1
              }
              else if (lowerFileName.includes('event') || lowerFilePath.includes('event') ||
                      jsonData.eventId || jsonData.eventType) {
                fileType = "Event";
                metadata.priority = 1; // Tier 1
              }
              else if (lowerFileName.includes('gamepass') || lowerFilePath.includes('gamepass') ||
                      jsonData.isGamePass || jsonData.gamepassId) {
                fileType = "Gamepass";
                metadata.priority = 1; // Tier 1
              }
              else if (lowerFileName.includes('minigame') || lowerFilePath.includes('minigame')) {
                fileType = "Minigame";
                metadata.priority = 1; // Tier 1
              }
              else if (lowerFileName.includes('potion') || lowerFilePath.includes('potion')) {
                fileType = "Potion";
                metadata.priority = 1; // Tier 1
              }
              else if (lowerFileName.includes('enchant') || lowerFilePath.includes('enchant')) {
                fileType = "Enchant";
                metadata.priority = 1; // Tier 1
              }
              else if (lowerFileName.includes('area') || lowerFilePath.includes('area') ||
                      lowerFileName.includes('world') || lowerFilePath.includes('world')) {
                fileType = "Area";
                metadata.priority = 1; // Tier 1
              }
              
              // Check for egg-related content
              if (jsonData.type === 'egg' || jsonData.eggType || jsonData.hatchChance || 
                  file.toLowerCase().includes('egg') || filePath.toLowerCase().includes('eggs')) {
                fileType = "Egg";
                metadata.type = 'egg';
                metadata.eggType = jsonData.eggType || jsonData.type || 'unknown';
                metadata.hatchChance = jsonData.hatchChance || 'unknown';
                metadata.cost = jsonData.cost || jsonData.price || null;
                metadata.possiblePets = jsonData.possiblePets || jsonData.pets || [];
                metadata.rarity = jsonData.rarity || 'unknown';
              } 
              // Check for pet-related content
              else if (jsonData.petId || jsonData.petType || jsonData.petName || jsonData.rarity ||
                      file.toLowerCase().includes('pet') || filePath.toLowerCase().includes('pets')) {
                
                // Further check if it's a huge pet
                if (jsonData.isHuge || (jsonData.rarity && jsonData.rarity.toLowerCase() === 'huge') ||
                    file.toLowerCase().includes('huge') || filePath.toLowerCase().includes('huges')) {
                  fileType = "Huge Pet";
                  metadata.isHuge = true;
                } else {
                  fileType = "Pet";
                }
                
                metadata.type = 'pet';
                metadata.petId = jsonData.petId || jsonData.id || null;
                metadata.petName = jsonData.petName || jsonData.name || file.replace('.json', '');
                metadata.rarity = jsonData.rarity || 'unknown';
                metadata.stats = jsonData.stats || jsonData.attributes || null;
                metadata.abilities = jsonData.abilities || jsonData.powers || [];
                metadata.isHuge = fileType === "Huge Pet";
                metadata.isLimited = jsonData.isLimited || jsonData.limited || false;
                metadata.value = jsonData.value || jsonData.worth || null;
              }
              // Check for gamepass content
              else if (jsonData.isGamePass || jsonData.gamepassId || 
                      file.toLowerCase().includes('pass') || filePath.toLowerCase().includes('gamepass')) {
                fileType = "Gamepass";
                metadata.type = 'gamepass';
                metadata.passId = jsonData.gamepassId || jsonData.id || null;
                metadata.name = jsonData.name || file.replace('.json', '');
                metadata.price = jsonData.price || jsonData.cost || null;
                metadata.benefits = jsonData.benefits || jsonData.perks || [];
              }
              
              // Save the extended metadata for better leak details
              const existingLeaks = await storage.getRecentLeaks(24 * 7); // Check last week
              const existingLeak = existingLeaks.find(l => l.fileName === file);
              
          } catch (err) {
            console.log(`Could not parse JSON content from ${filePath}: ${err}`);
          }
        }
        else if (['.ini', '.cfg', '.config'].includes(fileExt)) fileType = "Config";
        else fileType = "Other";

        // Check if we already have this file in our database
          const existingLeaks = await storage.getRecentLeaks(24 * 7); // Check last week
          const fileName = path.basename(file);
          const existingLeak = existingLeaks.find(l => l.fileName === fileName);

          // If the file exists but we don't have it recorded, add it as new
          if (!existingLeak) {
            await storage.createLeak({
              fileName: fileName,
              filePath,
              fileType,
              changeType: 'added',
              isDeveloperChange: fileName.includes('dev_'),
              fileSize: stats.size,
              metadata: { 
                extension: fileExt,
                detectionMethod: 'scan'
              }
            });
          }
          // If file modification time is newer than our record, update it
          else if (existingLeak && stats.mtime > existingLeak.timestamp) {
            await storage.createLeak({
              fileName: fileName,
              filePath,
              fileType,
              changeType: 'modified',
              isDeveloperChange: fileName.includes('dev_'),
              fileSize: stats.size,
              metadata: { 
                extension: fileExt,
                detectionMethod: 'scan'
              }
            });
          }
        }

        // Check for deleted files
        const existingLeaks = await storage.getRecentLeaks(24 * 7);
        const fileBaseNames = files.map(f => path.basename(f));
        
        for (const leak of existingLeaks) {
          if (!fileBaseNames.includes(leak.fileName) && !leak.changeType.includes('deleted')) {
            await storage.createLeak({
              fileName: leak.fileName,
              filePath: leak.filePath,
              fileType: leak.fileType,
              changeType: 'deleted',
              isDeveloperChange: leak.fileName.includes('dev_'),
              fileSize: 0,
              metadata: { 
                extension: path.extname(leak.fileName).toLowerCase(),
                detectionMethod: 'scan'
              }
            });
          }
        }
      } catch (error) {
        console.error('Error during scan:', error);

        await storage.createLog({
          eventType: 'error',
          message: `Error during scan: ${error instanceof Error ? error.message : String(error)}`,
          metadata: { error: String(error) }
        });

        throw error;
      } finally {
      // Log completion
      await storage.createLog({
        eventType: 'scan',
        message: 'File scan completed',
        metadata: { duration: new Date().getTime() - this.lastScanTime.getTime() }
      });

      // Always auto-post leaks when found
      await this.postLatestLeaks();

      this.scanInProgress = false;

      // Post individual leaks as they're detected for real-time notifications
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 1); // Last hour
      const newLeaks = await storage.getLeaksByTimeRange(cutoffTime, new Date());
      
      // Create a Set to track which file paths we've already processed to avoid duplicates
      const processedFilePaths = new Set<string>();
      
      for (const leak of newLeaks) {
        // Skip if we've already processed a file with this path in this batch
        if (processedFilePaths.has(leak.filePath)) {
          console.log(`Skipping duplicate file in batch: ${leak.fileName}`);
          continue;
        }
        
        // Add to the set of processed files
        processedFilePaths.add(leak.filePath);
        
        // Use our postLeak method which now has duplicate detection
        await this.postLeak(leak);
      }
    }
  }

  async postLatestLeaks() {
    try {
      // Get the leaks since last scan
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 1); // Last hour

      const recentLeaks = await storage.getLeaksByTimeRange(cutoffTime, new Date());

      if (recentLeaks.length === 0) {
        console.log('No new leaks to post');
        return;
      }

      // Use the global LEAKS_CHANNEL_ID constant (already defined at the top of file)
      const channelName = 'leaks'; // Keep for logging purposes

      // Find the channel
      const guild = this.client.guilds.cache.first();
      if (!guild) {
        throw new Error('Bot is not in any guild');
      }

      const channel = guild.channels.cache.get(LEAKS_CHANNEL_ID) as TextChannel;

      if (!channel) {
        throw new Error(`Channel #${channelName} not found`);
      }

      // Separate high priority (Tier 1) leaks from lower tier (Tier 2 & 3) leaks
      const highPriorityLeaks: Leak[] = [];
      const lowerPriorityLeaks: Leak[] = [];
      
      // Process each leak individually
      for (const leak of recentLeaks) {
        const priority = this.getPriorityTier(leak);
        
        if (priority === 1) {
          // High priority leaks get added to the individual post list
          highPriorityLeaks.push(leak);
        } else {
          // Lower priority leaks get batched
          lowerPriorityLeaks.push(leak);
        }
      }
      
      console.log(`Separated leaks: ${highPriorityLeaks.length} high priority, ${lowerPriorityLeaks.length} lower priority`);
      
      // Post high priority leaks immediately and individually  
      for (const leak of highPriorityLeaks) {
        try {
          // Process individual Tier 1 leaks - they'll be posted by the postLeak method
          await this.postLeak(leak);
          
          // Update the message ID in storage
          if (leak.messageId) {
            await storage.updateLeakMessageId(leak.id, leak.messageId);
          }
        } catch (error) {
          console.error(`Error posting high priority leak ${leak.id}:`, error);
        }
      }
      
      // For lower priority leaks, we'll let the batch system handle them
      // They'll be added to the batch queue during their processing
      // and sent as a batch notification later
      if (lowerPriorityLeaks.length > 0) {
        console.log(`${lowerPriorityLeaks.length} lower priority leaks will be handled by the batch system`);
        
        // Log info about the batched leaks
        await storage.createLog({
          eventType: 'batch_pending',
          message: `${lowerPriorityLeaks.length} lower priority leaks queued for batch notification`,
          metadata: { 
            count: lowerPriorityLeaks.length,
            timestamp: new Date().toISOString(),
            leakIds: lowerPriorityLeaks.map(l => l.id)
          }
        });
      }
      
      return null; // We no longer return a single message since we're posting individually or batching
    } catch (error) {
      console.error('Error in postLatestLeaks:', error);

      await storage.createLog({
        eventType: 'error',
        message: `Error in postLatestLeaks: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: String(error) }
      });

      throw error;
    }
  }

  // Determine the priority tier of a leak (1-3)
  // Generate descriptive summary for leaks, especially exclusives, to provide context
  private generateLeakSummary(leak: Leak): string {
    // Default summary is just the file name and change type
    let summary = `${leak.changeType.charAt(0).toUpperCase() + leak.changeType.slice(1)} ${leak.fileName}`;
    
    // Get file information
    const fileExt = path.extname(leak.fileName).toLowerCase();
    const lowerFileName = leak.fileName.toLowerCase();
    const lowerFilePath = leak.filePath.toLowerCase();
    
    // Try to provide more meaningful descriptions based on content type
    
    // Exclusive items (high priority for players)
    if (lowerFileName.includes('exclusive') || 
        (leak.metadata && typeof leak.metadata === 'object' && 
         leak.metadata.rarity === 'exclusive')) {
      
      // Extract the name of the exclusive item
      let itemName = "exclusive item";
      
      // Try to get a real item name from filename or metadata
      if (leak.metadata && typeof leak.metadata === 'object' && leak.metadata.name) {
        itemName = leak.metadata.name as string;
      } else {
        // Extract from file name, remove common prefixes and extensions
        itemName = leak.fileName
          .replace(/exclusive[-_]/i, '')
          .replace(/\.json|\.png|\.fbx|\.tga|\.jpg/i, '')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ');
      }
      
      if (leak.changeType === 'added') {
        summary = `🌟 NEW EXCLUSIVE: "${itemName}" has been added to the game files!`;
      } else if (leak.changeType === 'modified') {
        summary = `⚠️ EXCLUSIVE UPDATED: "${itemName}" has been modified - stats or appearance may have changed!`;
      } else if (leak.changeType === 'deleted') {
        summary = `❌ EXCLUSIVE REMOVED: "${itemName}" has been removed from game files.`;
      }
    }
    
    // Huge pets (very high priority)
    else if (lowerFileName.includes('huge') || 
             (leak.metadata && typeof leak.metadata === 'object' && 
              leak.metadata.type === 'huge')) {
      
      // Extract pet name
      let petName = "Huge pet";
      if (leak.metadata && typeof leak.metadata === 'object' && leak.metadata.name) {
        petName = leak.metadata.name as string;
      } else {
        petName = leak.fileName
          .replace(/huge[-_]/i, 'Huge ')
          .replace(/\.json|\.png|\.fbx|\.tga|\.jpg/i, '')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ');
      }
      
      if (leak.changeType === 'added') {
        summary = `🔥 NEW HUGE PET: "${petName}" has been added - get ready for a new Huge pet!`;
      } else if (leak.changeType === 'modified') {
        summary = `⚠️ HUGE PET UPDATED: "${petName}" stats or appearance have been modified.`;
      } else if (leak.changeType === 'deleted') {
        summary = `❌ HUGE PET REMOVED: "${petName}" has been removed from the game files.`;
      }
    }
    
    // Eggs (high priority)
    else if (lowerFileName.includes('egg') || lowerFilePath.includes('eggs') || 
             (leak.metadata && typeof leak.metadata === 'object' && 
              leak.metadata.type === 'egg')) {
      
      let eggName = "egg";
      if (leak.metadata && typeof leak.metadata === 'object' && leak.metadata.name) {
        eggName = leak.metadata.name as string;
      } else {
        eggName = leak.fileName
          .replace(/egg[-_]/i, '')
          .replace(/\.json|\.png|\.fbx|\.tga|\.jpg/i, '')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ');
      }
      
      if (leak.changeType === 'added') {
        summary = `🥚 NEW EGG: "${eggName}" egg has been added - new hatching opportunities coming!`;
      } else if (leak.changeType === 'modified') {
        summary = `⚠️ EGG UPDATED: "${eggName}" egg has been modified - hatch chances may have changed!`;
      } else if (leak.changeType === 'deleted') {
        summary = `❌ EGG REMOVED: "${eggName}" egg has been removed from the game files.`;
      }
    }
    
    // Event files (high priority)
    else if (lowerFileName.includes('event') || lowerFilePath.includes('event') || 
             (leak.metadata && typeof leak.metadata === 'object' && 
              leak.metadata.type === 'event')) {
      
      let eventName = "event";
      if (leak.metadata && typeof leak.metadata === 'object' && leak.metadata.name) {
        eventName = leak.metadata.name as string;
      } else {
        eventName = leak.fileName
          .replace(/event[-_]/i, '')
          .replace(/\.json|\.png|\.fbx|\.tga|\.jpg/i, '')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ');
      }
      
      if (leak.changeType === 'added') {
        summary = `🎉 NEW EVENT: "${eventName}" event files found - new event coming soon!`;
      } else if (leak.changeType === 'modified') {
        summary = `⚠️ EVENT UPDATED: "${eventName}" event has been modified - rewards or mechanics may have changed!`;
      } else if (leak.changeType === 'deleted') {
        summary = `❌ EVENT ENDING: "${eventName}" event files have been removed.`;
      }
    }
    
    // Server configuration (Tier 2, but still important to understand changes)
    else if (lowerFileName.includes('server') || lowerFileName.includes('config') || 
             lowerFilePath.includes('server') || lowerFilePath.includes('config')) {
      
      if (leak.changeType === 'modified') {
        summary = `⚙️ SERVER UPDATE: Server configuration has been modified - game balance changes likely!`;
      } else if (leak.changeType === 'added') {
        summary = `⚙️ NEW SERVER CONFIG: New server configuration file added - new server features coming!`;
      }
    }
    
    // Marketplace updates (Tier 2, but should explain what changed)
    else if (lowerFileName.includes('marketplace') || lowerFilePath.includes('marketplace')) {
      if (leak.changeType === 'modified') {
        summary = `🛒 MARKETPLACE UPDATE: Item offerings or prices have been modified in the marketplace!`;
      } else if (leak.changeType === 'added') {
        summary = `🛒 NEW MARKETPLACE ITEMS: New marketplace listings detected - check for new items!`;
      }
    }
    
    // World/Area/Zone changes (high priority for players)
    else if (lowerFileName.includes('world') || lowerFileName.includes('area') || 
             lowerFileName.includes('zone') || lowerFilePath.includes('world') || 
             lowerFilePath.includes('area') || lowerFilePath.includes('zone')) {
      
      let locationName = "area";
      if (leak.metadata && typeof leak.metadata === 'object' && leak.metadata.name) {
        locationName = leak.metadata.name as string;
      } else {
        locationName = leak.fileName
          .replace(/(world|area|zone)[-_]/i, '')
          .replace(/\.json|\.png|\.fbx|\.tga|\.jpg/i, '')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ');
      }
      
      if (leak.changeType === 'added') {
        summary = `🌍 NEW AREA: "${locationName}" world files found - new location coming soon!`;
      } else if (leak.changeType === 'modified') {
        summary = `⚠️ AREA UPDATED: "${locationName}" area has been modified - layout or content changes!`;
      }
    }
    
    // Developer blog posts (can be very informative)
    else if (leak.fileType === 'BlogPost' || lowerFileName.includes('blog')) {
      let blogTitle = "Developer Update";
      if (leak.metadata && typeof leak.metadata === 'object') {
        if (leak.metadata.title) {
          blogTitle = leak.metadata.title as string;
        } else if (leak.metadata.subject) {
          blogTitle = leak.metadata.subject as string;
        }
      }
      
      summary = `📣 DEVELOPER BLOG: "${blogTitle}" - New developer update posted!`;
    }
    
    return summary;
  }

  private getPriorityTier(leak: Leak): number {
    // Default to lowest priority (Tier 3)
    let tier = 3;
    
    // Get file information
    const fileExt = path.extname(leak.fileName).toLowerCase();
    const lowerFileName = leak.fileName.toLowerCase();
    const lowerFilePath = leak.filePath.toLowerCase();
    
    // Check metadata for explicit priority
    if (leak.metadata && typeof leak.metadata === 'object' && 'priority' in leak.metadata) {
      return leak.metadata.priority as number;
    }
    
    // Tier 1 (High Priority) items - these are most important to players
    const tier1Keywords = [
      'egg', 'pet', 'huge', 'titanic', 'exclusive', 'event', 'gamepass', 
      'area', 'zone', 'world', 'potion', 'enchant', 'minigame', 'quest',
      'achievement', 'leaderboard', 'collection', 'gift', 'merchant', 'shop'
    ];
    
    // Tier 2 (Medium Priority) items - technical assets, meshes, etc.
    const tier2Keywords = [
      'mesh', 'model', 'texture', 'audio', 'animation', 'script',
      'material', 'particle', 'effect', 'ui', 'gui', 'icon',
      'sound', 'music', 'voice', 'sfx', 'config', 'inventory', 'marketplace',
      'server/configuration', 'server/metadata', 'server'
    ];
    
    // Check for Tier 1 keywords
    if (tier1Keywords.some(keyword => 
      lowerFileName.includes(keyword) || lowerFilePath.includes(keyword) ||
      (leak.fileType && leak.fileType.toLowerCase().includes(keyword))
    )) {
      tier = 1;
    }
    // Check for Tier 2 keywords
    else if (tier2Keywords.some(keyword => 
      lowerFileName.includes(keyword) || lowerFilePath.includes(keyword) ||
      (leak.fileType && leak.fileType.toLowerCase().includes(keyword))
    )) {
      tier = 2;
    }
    
    // Dev blogs with no content should be tier 2
    if (leak.fileType === 'BlogPost') {
      // Check if this is a dev blog with no content/link
      const hasContent = leak.metadata && typeof leak.metadata === 'object' && 
                         (leak.metadata.url || leak.metadata.content || leak.metadata.link);
      
      // If it's an official blog post with useful content, it's Tier 1
      if (leak.metadata && typeof leak.metadata === 'object' && 
          leak.metadata.type === 'official' && hasContent) {
        tier = 1;
      } 
      // Otherwise it's Tier 2
      else {
        tier = 2;
      }
    }
    
    // Inventory updates with no explanation should be Tier 2
    if (lowerFileName.includes('inventory') || lowerFilePath.includes('inventory')) {
      const hasDetails = leak.metadata && typeof leak.metadata === 'object' && 
                        (leak.metadata.changes || leak.metadata.details || leak.metadata.itemDetails);
      
      if (!hasDetails) {
        tier = 2;
      }
    }
    
    // Developer changes can be Tier 1 if they're meaningful
    if (leak.isDeveloperChange) {
      // Check if this is a meaningful developer change with details
      const hasDetails = leak.metadata && typeof leak.metadata === 'object' && 
                         (leak.metadata.changes || leak.metadata.details);
      
      if (hasDetails) {
        tier = 1;
      } else {
        tier = 2; // Downgrade to Tier 2 if no details provided
      }
    }
    
    // Explicitly make marketplace files Tier 2
    if (lowerFileName.includes('marketplace') || lowerFilePath.includes('marketplace')) {
      tier = 2;
    }
    
    // Server configuration files are always Tier 2
    if (lowerFileName.includes('server/config') || lowerFilePath.includes('server/config') ||
        lowerFileName.includes('config') || lowerFilePath.includes('configuration')) {
      tier = 2;
    }
    
    return tier;
  }

  async postLeak(leak: Leak) {
    try {
      // Check if this is a duplicate leak we've already processed recently
      if (this.isDuplicateLeak(leak)) {
        console.log(`Skipping duplicate leak: ${leak.fileName}`);
        
        // Log the skipped duplicate
        await storage.createLog({
          eventType: 'duplicate',
          message: `Skipped duplicate leak: ${leak.fileName}`,
          metadata: { 
            leakFileName: leak.fileName,
            leakFilePath: leak.filePath
          }
        });
        
        return; // Skip processing this leak entirely
      }
      
      // Determine priority tier
      const priorityTier = this.getPriorityTier(leak);
      const isHighPriority = priorityTier === 1;
      
      // Store leak in database regardless of Discord connection
      // Skip redundant storage if the leak already has an ID (was already saved)
      if (!leak.id) {
        await storage.createLeak(leak);
      }
      
      // Pre-detect if this leak has an image that should be attached directly
      const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
      const isImageFile = imageExts.some(ext => leak.fileName.toLowerCase().endsWith(ext));
      
      // Check for image content in the file path
      const isImageContent = leak.filePath && (
        leak.filePath.toLowerCase().includes('/images/') || 
        leak.filePath.toLowerCase().includes('/textures/') ||
        leak.filePath.toLowerCase().includes('/icons/') ||
        isImageFile
      );
      
      // Special content detection
      const isPetContent = leak.fileName.toLowerCase().includes('pet') || 
                          leak.filePath.toLowerCase().includes('/pets/');
      const isEggContent = leak.fileName.toLowerCase().includes('egg') || 
                          leak.filePath.toLowerCase().includes('/eggs/');
      const isWorldContent = leak.fileName.toLowerCase().includes('world') || 
                            leak.filePath.toLowerCase().includes('/worlds/');
      
      // Log with priority info and image detection
      console.log(`Posted leak: ${leak.fileName} (ID: ${leak.id}) - High priority: ${isHighPriority} - Contains image: ${isImageContent}`);

      // If it's not a high priority leak (Tier 2 or 3), add to batch instead of posting immediately
      if (priorityTier > 1) {
        // Add to batch queue for later posting
        this.lowerTierLeaksBatch.push(leak);
        
        // Log that it was added to batch
        await storage.createLog({
          eventType: 'batch_add',
          message: `Added leak "${leak.fileName}" (Tier ${priorityTier}) to batch queue`,
          metadata: { 
            leakId: leak.id, 
            tier: priorityTier,
            batchSize: this.lowerTierLeaksBatch.length,
            hasImage: isImageContent
          }
        });
        
        // Return without posting to Discord
        return;
      }
      
      // For high priority leaks (Tier 1), post immediately with retry logic
      const maxRetries = 3;
      let retryCount = 0;
      
      const attemptPost = async (): Promise<boolean> => {
        if (!this.client.isReady()) {
          if (retryCount < maxRetries) {
            console.log(`Bot not ready, retry attempt ${retryCount + 1}/${maxRetries}`);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
            return attemptPost();
          } else {
            this.offlineQueue.push(leak);
            console.log('Bot offline after multiple retries, queued leak for later posting');
            return false;
          }
        }
        return true;
      };
      
      // If not ready after retries, queue it
      if (!await attemptPost()) {
        return;
      }
      const guild = this.client.guilds.cache.get(GUILD_ID);
      if (!guild) {
        throw new Error(`Guild with ID ${GUILD_ID} not found`);
      }

      // Get the specific channel using the global LEAKS_CHANNEL_ID constant
      const channel = guild.channels.cache.get(LEAKS_CHANNEL_ID) as TextChannel;

      if (!channel) {
        throw new Error(`Channel with ID ${LEAKS_CHANNEL_ID} not found`);
      }

      // Log that we found the channel
      console.log(`Found channel: #${channel.name} (${channel.id})`);

      // Check if the file exists
      const fileExists = fs.existsSync(leak.filePath);

      // We already determined the priority tier at the top of this function
      // (No need to call getPriorityTier again)
      
      // Select color based on tier: red for Tier 1, yellow for Tier 2, blue for Tier 3
      const tierColors = {
        1: 0xED4245, // Red
        2: 0xFEE75C, // Yellow
        3: 0x3498DB  // Blue
      };
      
      // Create tier emojis/indicators
      const tierIndicators = {
        1: '🔴 TIER 1 (IMPORTANT)', 
        2: '🟡 TIER 2 (MODERATE)',
        3: '🔵 TIER 3 (MINOR)'
      };
      
      // Generate a descriptive summary of the leak
      const leakSummary = this.generateLeakSummary(leak);
      
      // Create the embed for this specific leak
      const embed = new EmbedBuilder()
        .setTitle(`${leak.isDeveloperChange ? '👨‍💻 Developer Change' : '🚨 New Game Leak'} Detected`)
        .setDescription(leakSummary) // Use our generated descriptive summary at the top
        .setColor(leak.isDeveloperChange ? 0xFEE75C : tierColors[priorityTier as 1 | 2 | 3])
        .addFields(
          { name: 'Priority', value: tierIndicators[priorityTier as 1 | 2 | 3], inline: true },
          { name: 'File Name', value: leak.fileName, inline: true },
          { name: 'File Type', value: leak.fileType, inline: true },
          { name: 'Change Type', value: leak.changeType.toUpperCase(), inline: true },
          { name: 'Size', value: leak.fileSize ? `${Math.round(leak.fileSize / 1024)} KB` : 'N/A', inline: true },
          { name: 'Path', value: `\`${leak.filePath}\``, inline: false }
        );

      // Add view links if available
      if (leak.metadata?.assetId) {
        const assetUrl = `https://www.roblox.com/catalog/${leak.metadata.assetId}`;
        embed.addFields({ name: '🔗 View Asset', value: assetUrl, inline: false });
      }

      // Prepare message options early
      const messageOptions: any = {
        embeds: [embed]
      };

      // Enhanced image handling for Discord messages
      if (isImageContent && fs.existsSync(leak.filePath)) {
        try {
          // Always prefer direct file attachment for Discord
          const fileStats = fs.statSync(leak.filePath);
          if (fileStats.size < 8_000_000) { // Discord has 8MB limit
            // Use a more explicit name with proper extension to help Discord recognize it
            const fileExt = path.extname(leak.fileName);
            const safeFileName = `leak_image_${leak.id}${fileExt}`;
            
            // Create the attachment with proper name and description
            const attachment = new AttachmentBuilder(leak.filePath, { 
              name: safeFileName,
              description: `Leaked image: ${leak.fileName}`
            });
            
            // Add the file to message options
            messageOptions.files = [attachment];
            
            // Set the image in the embed using the attachment format
            embed.setImage(`attachment://${safeFileName}`);
            
            console.log(`Attaching image as direct file: ${safeFileName}`);
          } else {
            // For larger files, note that they're too large
            embed.addFields({
              name: '⚠️ Large Image',
              value: 'This image is too large to embed directly (>8MB). Use the download link below.',
              inline: false
            });
            
            // Get a public URL if available
            const baseUrl = process.env.REPLIT_APP_URL || 
              (process.env.REPL_SLUG ? 
              `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER || 'repl.co'}` : 
              "http://localhost:3333");
            
            // Add as link instead
            embed.addFields({
              name: '🔗 Image Link',
              value: `[View Full Image](${baseUrl}/api/files/${leak.id})`,
              inline: false
            });
          }
        } catch (error) {
          console.error(`Error handling image ${leak.filePath}:`, error);
          embed.addFields({
            name: '❌ Image Error',
            value: 'Could not attach this image. Try using the file link below.',
            inline: false
          });
        }
      }

      // Add thumbnail for model files
      if (leak.fileType === 'Model' || leak.fileType === 'Mesh') {
        embed.setThumbnail('https://create.roblox.com/dashboard/assets/model-thumbnail.png');
      }

      // Add egg metadata if present
      if (leak.metadata?.type === 'egg') {
        embed.addFields(
          { name: '🥚 Egg Details', value: '───────────', inline: false },
          { name: 'Hatch Chance', value: `${leak.metadata.hatchChance || 'Unknown'}`, inline: true },
          { name: 'Cost', value: leak.metadata.cost ? `${leak.metadata.cost} 💎` : 'Unknown', inline: true }
        );
        if (leak.metadata.possiblePets?.length > 0) {
          embed.addFields({ 
            name: '🐾 Possible Pets',
            value: leak.metadata.possiblePets.join('\n'),
            inline: false 
          });
        }
      }

      // Add gamepass metadata if present
      if (leak.metadata?.type === 'gamepass') {
        embed.addFields(
          { name: '🎫 Game Pass', value: '───────────', inline: false },
          { name: 'Price', value: leak.metadata.price ? `${leak.metadata.price} R$` : 'Free', inline: true }
        );
        if (leak.metadata.benefits?.length > 0) {
          embed.addFields({
            name: '✨ Benefits',
            value: leak.metadata.benefits.join('\n'),
            inline: false
          });
        }
      }

      embed.setTimestamp(leak.timestamp);

      // Add view button if file exists but couldn't be embedded as an image
      if (fileExists && !isImageContent) {
        embed.addFields({
          name: 'View File',
          value: 'Use `/leaks view` command with the file ID to access this file',
          inline: false
        });
      }

      // Handle additional file processing 
      if (fileExists) {
        try {
          // Generate a reliable Replit URL format
          // Format: https://project-name.username.repl.co
          const repl_id = process.env.REPL_ID || '';
          const repl_slug = process.env.REPL_SLUG || 'discord-leak-bot';
          const repl_owner = process.env.REPL_OWNER || process.env.REPL_SLUG?.split('-')[0] || 'replit';
          
          // Try multiple URL formats to ensure one works
          const baseUrl = process.env.REPLIT_APP_URL || 
                        `https://${repl_slug}.${repl_owner}.repl.co`;
          
          console.log(`Using base URL for file links: ${baseUrl}`);
          
          // Create a direct link that will actually work in Discord
          const fileId = leak.id;
          const previewUrl = `${baseUrl}/api/files/${fileId}`;
          const downloadUrl = `${baseUrl}/api/files/${fileId}?download=true`;

          // Add preview details to embed with working links
          embed.addFields({
            name: '📂 File Access',
            value: `[View File](${previewUrl})\n[Download File](${downloadUrl})`,
            inline: false
          });
          
          // Add file ID for command access
          embed.addFields({
            name: 'File ID (for commands)',
            value: `\`${fileId}\``,
            inline: true
          });

          // If it's a text-based file, add content preview
          if (leak.fileName.match(/\.(txt|json|cfg|ini|lua|xml|html|css|js|ts)$/i)) {
            const fileBuffer = fs.readFileSync(leak.filePath);
            const content = fileBuffer.toString('utf8').slice(0, 1000);
            embed.addFields({
              name: 'Content Preview',
              value: `\`\`\`\n${content}${content.length >= 1000 ? '...' : ''}\n\`\`\``,
              inline: false
            });
          }
        } catch (error) {
          console.error(`Error reading file ${leak.filePath}:`, error);
          embed.addFields({
            name: 'Error',
            value: 'File exists but could not be attached',
            inline: false
          });
        }
      }

      const message = await channel.send(messageOptions);

      // Update the leak with the message ID
      await storage.updateLeakMessageId(leak.id, message.id);

      // Log the post
      await storage.createLog({
        eventType: 'post',
        message: `Posted leak "${leak.fileName}" to #${channel.name}`,
        metadata: { messageId: message.id, channelId: channel.id, leakId: leak.id }
      });

      return message;
    } catch (error) {
      console.error('Error posting individual leak:', error);

      await storage.createLog({
        eventType: 'error',
        message: `Error posting individual leak: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: String(error), leakId: leak.id }
      });

      throw error;
    }
  }

  async scheduleScan() {
    // Cancel existing job if any
    if (this.cronJob) {
      this.cronJob.stop();
    }

    // Schedule a new job
    this.cronJob = cron.schedule(`*/${this.scanFrequency} * * * *`, async () => {
      if (this.scanInProgress) {
        console.log('Skipping scheduled scan as one is already in progress');
        return;
      }

      console.log('Running scheduled file scan');
      try {
        await this.runScan();
      } catch (error) {
        console.error('Error in scheduled scan:', error);
      }
    });

    console.log(`Scan scheduled to run every ${this.scanFrequency} minutes`);

    await storage.createLog({
      eventType: 'system',
      message: `Scan schedule set for every ${this.scanFrequency} minutes`,
      metadata: { frequency: this.scanFrequency }
    });
  }

  async updateScanFrequency(minutes: number) {
    this.scanFrequency = minutes;
    await this.scheduleScan();
    await storage.updateSetting('scanFrequency', minutes.toString());

    return this.scanFrequency;
  }
  
  // Setup forced reconnection to ensure bot stays online
  private setupForcedReconnection() {
    // Keep track of the last time we were successfully connected
    this.lastGoodConnectionTime = new Date();
    
    // ULTRA-AGGRESSIVE CONNECTION MONITORING
    // Check connection health every 30 seconds
    setInterval(() => {
      if (this.client && this.client.isReady()) {
        // Update the last known good connection time
        this.lastGoodConnectionTime = new Date();
        
        // Even when connected, verify we have a good websocket connection
        // Sometimes Discord.js thinks it's connected but the socket is dead
        if (this.client.ws.ping <= 0) {
          console.log('WebSocket connection appears dead (no ping), forcing reconnection despite ready state...');
          this.reconnect().catch(console.error);
        }
      } else {
        // If not connected, check how long we've been disconnected
        const now = new Date();
        const disconnectedTime = this.lastGoodConnectionTime ? 
          (now.getTime() - this.lastGoodConnectionTime.getTime()) / 1000 : 0;
          
        // If disconnected for more than 1 minute, force restart
        if (disconnectedTime > 60) {
          console.log(`FORCED RECONNECT: Bot disconnected for ${Math.round(disconnectedTime)} seconds, forcing restart...`);
          this.restart().catch(console.error);
        } else if (disconnectedTime > 15) {
          // For shorter disconnections, try a simple reconnect first
          console.log(`Connection lost for ${Math.round(disconnectedTime)} seconds, attempting reconnection...`);
          this.reconnect().catch(console.error);
        }
      }
    }, 30000); // Every 30 seconds - much more aggressive
  }
  
  // Start a background process that continuously tries to reconnect if disconnected
  private startBackgroundRetryProcess() {
    // Try to reconnect more aggressively - check every 10 seconds
    setInterval(async () => {
      if (this.client && !this.client.isReady()) {
        // Avoid spamming logs but still be aggressive
        const currentTime = Date.now();
        const timeSinceLastAttempt = currentTime - this.lastConnectionAttempt;
        
        // Apply exponential backoff for reconnection attempts
        const shouldAttempt = timeSinceLastAttempt >= this.reconnectDelay;
        
        if (shouldAttempt) {
          console.log(`Background retry process: Attempting to reconnect to Discord... (attempt #${this.reconnectAttempts + 1})`);
          this.lastConnectionAttempt = currentTime;
          
          try {
            await this.client.login(TOKEN);
            if (this.client.isReady()) {
              console.log('Background retry process: Successfully reconnected to Discord!');
              this.lastGoodConnectionTime = new Date();
              this.reconnectAttempts = 0; // Reset attempts on success
              this.reconnectDelay = 5000; // Reset delay
              
              // Log successful reconnection
              await storage.createLog({
                eventType: 'connection',
                message: 'Automatic reconnection successful',
                metadata: { timestamp: new Date().toISOString() }
              });
              
              // Process any leaks that were queued while offline
              if (this.offlineQueue.length > 0) {
                console.log(`Processing ${this.offlineQueue.length} queued leaks...`);
                const leaksToProcess = [...this.offlineQueue];
                this.offlineQueue = [];
                
                for (const leak of leaksToProcess) {
                  await this.postLeak(leak);
                }
              }
            }
          } catch (error) {
            console.error('Background retry process: Failed to reconnect:', error);
            
            // Increment attempts and increase delay with exponential backoff, capping at 60 seconds
            this.reconnectAttempts++;
            this.reconnectDelay = Math.min(60000, this.reconnectDelay * 1.5);
            
            // After too many failed attempts, try a full restart
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              console.log(`Too many background reconnection attempts (${this.reconnectAttempts}), triggering full bot restart...`);
              this.reconnectAttempts = 0;
              this.reconnectDelay = 5000;
              await this.restart().catch(console.error);
            }
          }
        }
      } else if (this.client && this.client.isReady()) {
        // Reset attempts and delay when connected
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000;
        
        // Even when connected, periodically verify we can still access the leaks channel
        // This catches "zombie" connections where the client appears connected but can't send messages
        try {
          // Use global LEAKS_CHANNEL_ID constant for consistency
          if (LEAKS_CHANNEL_ID) {
            const channel = await this.client.channels.fetch(LEAKS_CHANNEL_ID);
            if (!channel || !channel.isTextBased()) {
              console.log('Channel verification failed, forcing reconnection...');
              
              // Log the channel verification failure
              await storage.createLog({
                eventType: 'connection',
                message: 'Channel verification failed, forcing reconnection',
                metadata: { 
                  timestamp: new Date().toISOString(),
                  channelId: LEAKS_CHANNEL_ID
                }
              });
              
              // Force a reconnection
              await this.reconnect();
            }
          }
        } catch (error) {
          console.error('Error during channel verification:', error);
          
          // Log the verification error
          await storage.createLog({
            eventType: 'error',
            message: 'Error during channel verification',
            metadata: { 
              error: String(error),
              timestamp: new Date().toISOString()
            }
          });
          
          // If we can't access the channel, force a reconnection
          if (!this.isReconnecting) {
            await this.reconnect();
          }
        }
      }
    }, 15000); // Every 15 seconds
  }
  
  // Handle disconnection events
  private onDisconnect() {
    console.log('Discord connection closed');
    
    // Log the disconnect
    storage.createLog({
      eventType: 'system',
      message: 'Discord connection closed',
      metadata: { timestamp: new Date().toISOString() }
    }).catch(console.error);
  }
  
  // Handle reconnection events
  private onReconnecting() {
    console.log('Discord.js is attempting to reconnect...');
    
    storage.createLog({
      eventType: 'system',
      message: 'Discord.js is attempting to reconnect',
      metadata: { timestamp: new Date().toISOString() }
    }).catch(console.error);
  }

  // Method to handle just reconnection, not full restart
  async reconnect() {
    try {
      console.log('Attempting reconnection to Discord...');
      this.isReconnecting = true;
      this.lastConnectionAttempt = Date.now();
      
      // Log reconnection attempt
      await storage.createLog({
        eventType: 'system',
        message: 'Manual reconnection attempt initiated',
        metadata: { timestamp: new Date().toISOString() }
      });
      
      // If client appears to still be connected, force disconnect first
      if (this.client.isReady()) {
        try {
          await this.client.destroy();
        } catch (destroyError) {
          console.error('Error destroying client during reconnect:', destroyError);
        }
      }
      
      // Attempt login again
      try {
        await this.client.login(TOKEN);
        console.log('Reconnection successful!');
        this.lastGoodConnectionTime = new Date();
        
        // Process any leaks that were queued while offline
        if (this.offlineQueue.length > 0) {
          console.log(`Processing ${this.offlineQueue.length} queued leaks after reconnection...`);
          const leaksToProcess = [...this.offlineQueue];
          this.offlineQueue = [];
          
          for (const leak of leaksToProcess) {
            await this.postLeak(leak);
          }
        }
        
        // Log successful reconnection
        await storage.createLog({
          eventType: 'system',
          message: 'Manual reconnection successful',
          metadata: { timestamp: new Date().toISOString() }
        });
        
        return true;
      } catch (loginError) {
        console.error('Reconnection failed:', loginError);
        
        // Log failed reconnection
        await storage.createLog({
          eventType: 'error',
          message: 'Manual reconnection failed',
          metadata: { 
            error: String(loginError),
            timestamp: new Date().toISOString()
          }
        });
        
        // Increment reconnect attempts
        this.reconnectAttempts++;
        
        // If we've tried too many times, escalate to a full restart
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log(`Too many reconnection attempts (${this.reconnectAttempts}), trying full restart instead...`);
          this.reconnectAttempts = 0; // Reset counter
          return this.restart();
        }
        
        // Increase the delay using exponential backoff
        this.reconnectDelay = Math.min(30000, this.reconnectDelay * 1.5);
        
        return false;
      } finally {
        this.isReconnecting = false;
      }
    } catch (error) {
      console.error('Unexpected error during reconnection:', error);
      this.isReconnecting = false;
      return false;
    }
  }
  
  async restart() {
    try {
      console.log('Restarting bot...');

      // Log the event
      await storage.createLog({
        eventType: 'system',
        message: 'Bot restart initiated',
        metadata: {}
      });

      // Destroy the client
      await this.client.destroy();

      // Create a new client
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.DirectMessages,
        ],
        partials: [Partials.Channel],
      });

      // Reset state
      this.startTime = new Date();
      this.lastCommandUsed = null;
      this.scanInProgress = false;

      // Set up event handlers
      this.client.on('ready', this.onReady.bind(this));
      this.client.on('interactionCreate', this.onInteraction.bind(this));
      this.client.on('error', this.onError.bind(this));
      this.client.on('shardError', this.onShardError.bind(this));

      // Login
      await this.client.login(TOKEN);

      // Reschedule scans
      await this.scheduleScan();

      console.log('Bot restarted successfully');

      // Log successful restart
      await storage.createLog({
        eventType: 'system',
        message: 'Bot restarted successfully',
        metadata: {}
      });

      return true;
    } catch (error) {
      console.error('Error restarting bot:', error);

      await storage.createLog({
        eventType: 'error',
        message: `Error restarting bot: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: String(error) }
      });

      throw error;
    }
  }

  async getStatus(): Promise<BotStatus> {
    const uptime = Date.now() - this.startTime.getTime();

    // Calculate next scan time manually
    let nextScanTime: Date | null = null;
    if (this.lastScanTime) {
      // Calculate next scan based on the last scan time + scanFrequency minutes
      nextScanTime = new Date(this.lastScanTime.getTime() + (this.scanFrequency * 60 * 1000));

      // If the calculated time is in the past, set it to current time + scanFrequency
      if (nextScanTime.getTime()< Date.now()) {
        nextScanTime = new Date(Date.now() + (this.scanFrequency * 60 * 1000));
      }
    } else {
      // If no scan has been run yet, set the next scan time to the current time + scanFrequency
      nextScanTime = new Date(Date.now() + (this.scanFrequency * 60 * 1000));
    }

    return {
      isOnline: this.client.isReady(),
      connectionStatus: this.client.isReady() ? 'Connected' : 'Disconnected',
      scanStatus: this.scanInProgress ? 'In Progress' : 'Idle',
      commandsRegistered: this.commands.length,
      lastRestartTime: this.startTime,
      uptimeSeconds: Math.floor(uptime / 1000),
      lastScanTime: this.lastScanTime,
      nextScanTime,
      lastCommandUsed: this.lastCommandUsed,
      latency: this.client.ws.ping,
    };
  }
}

// Export bot instance
export const discordBot = new DiscordBot();

// Export command list
export function getCommandList() {
  return [
    {
      name: '/leaks recent',
      description: 'Show leaks from the last 48 hours',
      status: 'Active'
    },
    {
      name: '/leaks recent tier:1',
      description: 'Show only Tier 1 (important) leaks',
      status: 'Active'
    },
    {
      name: '/leaks recent tier:2',
      description: 'Show only Tier 2 (medium) leaks',
      status: 'Active'
    },
    {
      name: '/leaks recent tier:3',
      description: 'Show only Tier 3 (less important) leaks',
      status: 'Active'
    },
    {
      name: '/leaks lowertier',
      description: 'View batched lower tier leaks (Tier 2 & 3)',
      status: 'Active'
    },
    {
      name: '/leaks tiers',
      description: 'Show information about leak priority tiers',
      status: 'Active'
    },
    {
      name: '/leaks types',
      description: 'Show available leak types',
      status: 'Active'
    },
    {
      name: '/leaks filter',
      description: 'Filter leaks by file type',
      status: 'Active'
    },
    {
      name: '/leaks eggs',
      description: 'Show leaks related to eggs',
      status: 'Active'
    },
    {
      name: '/leaks images',
      description: 'Show only image leaks',
      status: 'Active'
    },
    {
      name: '/leaks developers',
      description: 'Show developer changes',
      status: 'Active'
    },
    {
      name: '/scan now',
      description: 'Force an immediate file scan',
      status: 'Active'
    },
    {
      name: '/bot status',
      description: 'Show bot status and uptime',
      status: 'Active'
    }
  ];
}

// Initialize bot
export async function createBot() {
  try {
    await discordBot.initialize();
    return discordBot;
  } catch (error) {
    console.error('Failed to create bot:', error);
    throw error;
  }
}