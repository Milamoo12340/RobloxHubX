const { Client, GatewayIntentBits, Partials, Events, ActivityType, EmbedBuilder } = require('discord.js');
const nanoid = require('nanoid');
const db = require('./db');

// Define Pet Simulator 99 constants
const PET_SIMULATOR_99_GAME_ID = '8737899170';
const PET_SIMULATOR_DEV_GAME_ID = '15502302041';

// List of known Pet Simulator 99 developers
const petSimulatorDevelopers = [
  {
    id: 13365322, // Preston
    username: "Builderboy1005",
    role: "founder",
    isOfficial: true,
    games: [PET_SIMULATOR_99_GAME_ID],
    description: "Founder of Big Games and creator of Pet Simulator series"
  },
  {
    id: 1210210, // Another developer
    username: "bigGames",
    role: "developer",
    isOfficial: true,
    games: [PET_SIMULATOR_99_GAME_ID],
    description: "Big Games Studio official account"
  },
  {
    id: 2878290231,
    username: "bigGamesDev",
    role: "developer",
    isOfficial: true,
    games: [PET_SIMULATOR_99_GAME_ID, PET_SIMULATOR_DEV_GAME_ID],
    description: "Big Games developer account"
  },
  {
    id: 1784060946,
    username: "ChickenEngineer",
    role: "developer",
    isOfficial: true,
    games: [PET_SIMULATOR_99_GAME_ID],
    description: "Big Games developer, works on Pet Simulator pets"
  }
];

class DiscordBot {
  constructor() {
    this.client = new Client({ 
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ],
      partials: [Partials.Channel]
    });
    
    // Bot configuration
    this.leakChannelId = '1352979345257529404';
    this.generalChannelId = '1285623731053527126';
    this.clientId = '1352881326461812736';
    
    // Command prefix
    this.prefix = '!';
    
    // Register event handlers
    this.client.on(Events.ClientReady, this.onReady.bind(this));
    this.client.on(Events.MessageCreate, this.onMessage.bind(this));
    
    // Command handlers
    this.commands = {
      help: this.handleHelpCommand.bind(this),
      upload: this.handleUploadCommand.bind(this),
      leak: this.handleLeakCommand.bind(this),
      search: this.handleSearchCommand.bind(this),
      categorize: this.handleCategorizeCommand.bind(this),
      verify: this.handleVerifyCommand.bind(this),
      monitor: this.handleMonitorCommand.bind(this),
      discover: this.handleDiscoverCommand.bind(this),
      invite: this.handleInviteCommand.bind(this)
    };
    
    // Auto-discovery settings
    this.autoDiscoveryInterval = null;
    this.autoDiscoveryEnabled = true;
  }
  
  // Initialize and start the bot
  async start() {
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.error('Discord bot token not set. Cannot start bot.');
      return false;
    }
    
    try {
      console.log('Connecting to Discord...');
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      return true;
    } catch (error) {
      console.error('Failed to connect to Discord:', error);
      return false;
    }
  }
  
  // Client ready event handler
  onReady() {
    console.log(`Bot logged in as ${this.client.user.tag}`);
    
    // Set bot status/activity
    this.client.user.setPresence({
      activities: [{ 
        name: 'Pet Simulator 99', 
        type: ActivityType.Watching 
      }],
      status: 'online'
    });
    
    // Start auto-discovery interval if enabled
    if (this.autoDiscoveryEnabled) {
      this.startAutoDiscovery();
    }
  }
  
  // Message event handler
  async onMessage(message) {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check if message starts with command prefix
    if (message.content.startsWith(this.prefix)) {
      const args = message.content.slice(this.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      
      // Check if command exists
      if (this.commands[commandName]) {
        try {
          await this.commands[commandName](message, args);
        } catch (error) {
          console.error(`Error executing command ${commandName}:`, error);
          await message.reply('An error occurred while processing your command.');
        }
      }
    }
  }
  
  // Help command handler
  async handleHelpCommand(message) {
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Pet Simulator 99 Leak Bot Commands')
      .setDescription('Here are the available commands:')
      .addFields(
        { name: `${this.prefix}help`, value: 'Shows this help message' },
        { name: `${this.prefix}upload`, value: 'Upload a file as a potential leak' },
        { name: `${this.prefix}leak [category] [title]`, value: 'Post a new leak with attached file' },
        { name: `${this.prefix}search [query]`, value: 'Search for existing leaks' },
        { name: `${this.prefix}categorize [leak_id] [category]`, value: 'Categorize an existing leak' },
        { name: `${this.prefix}verify [leak_id]`, value: 'Verify a leak as authentic' },
        { name: `${this.prefix}monitor [add/remove] [developer_id]`, value: 'Monitor a Roblox developer' },
        { name: `${this.prefix}discover`, value: 'Run auto-discovery for new Pet Simulator 99 content' },
        { name: `${this.prefix}invite`, value: 'Get invite link for this bot' }
      )
      .setTimestamp()
      .setFooter({ text: 'Pet Simulator 99 Leak Bot' });
    
    await message.reply({ embeds: [helpEmbed] });
  }
  
  // Upload command handler
  async handleUploadCommand(message) {
    const attachments = message.attachments.size > 0 ? Array.from(message.attachments.values()) : [];
    
    if (attachments.length === 0) {
      return message.reply('Please attach a file to upload!');
    }
    
    const responseEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Upload Successful')
      .setDescription(`Received ${attachments.length} file(s).`)
      .setTimestamp();
    
    for (const attachment of attachments) {
      try {
        // This would store the file in the database in a real implementation
        const fileId = nanoid.nanoid(8);
        responseEmbed.addFields({
          name: `File: ${attachment.name}`,
          value: `ID: ${fileId}\nSize: ${Math.round(attachment.size / 1024)} KB\nType: ${attachment.contentType || 'Unknown'}`
        });
      } catch (error) {
        console.error('Error processing attachment:', error);
      }
    }
    
    await message.reply({ embeds: [responseEmbed] });
  }
  
  // Leak command handler
  async handleLeakCommand(message, args) {
    const attachments = message.attachments.size > 0 ? Array.from(message.attachments.values()) : [];
    
    if (args.length < 2) {
      return message.reply('Usage: !leak [category] [title]');
    }
    
    const category = args[0].toLowerCase();
    const title = args.slice(1).join(' ');
    
    const leakEmbed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle(`New Leak: ${title}`)
      .setDescription('A new potential leak has been posted.')
      .addFields(
        { name: 'Category', value: category },
        { name: 'Posted By', value: message.author.tag },
        { name: 'Attachments', value: attachments.length > 0 ? `${attachments.length} file(s) attached` : 'No files attached' }
      )
      .setTimestamp();
    
    // This would create a leak in the database in a real implementation
    const leakId = nanoid.nanoid(8);
    
    // Get leak channel if available
    const leakChannel = this.client.channels.cache.get(this.leakChannelId);
    
    if (leakChannel) {
      await leakChannel.send({ embeds: [leakEmbed], files: attachments.map(a => a.url) });
      await message.reply(`Leak posted in <#${this.leakChannelId}> with ID: ${leakId}`);
    } else {
      // Post in the current channel if leak channel not found
      await message.reply({ embeds: [leakEmbed], content: `Leak created with ID: ${leakId}` });
    }
  }
  
  // Search command handler
  async handleSearchCommand(message, args) {
    if (args.length === 0) {
      return message.reply('Usage: !search [query]');
    }
    
    const query = args.join(' ');
    
    // This would search the database in a real implementation
    const searchResults = [
      { id: nanoid.nanoid(8), title: 'Example Search Result 1', category: 'asset' },
      { id: nanoid.nanoid(8), title: 'Example Search Result 2', category: 'model' }
    ];
    
    const resultsEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Search Results for: ${query}`)
      .setDescription(`Found ${searchResults.length} result(s).`)
      .setTimestamp();
    
    searchResults.forEach(result => {
      resultsEmbed.addFields({
        name: result.title,
        value: `ID: ${result.id}\nCategory: ${result.category}`
      });
    });
    
    await message.reply({ embeds: [resultsEmbed] });
  }
  
  // Categorize command handler
  async handleCategorizeCommand(message, args) {
    if (args.length < 2) {
      return message.reply('Usage: !categorize [leak_id] [category]');
    }
    
    const leakId = args[0];
    const category = args[1];
    
    // This would update the leak in the database in a real implementation
    
    const responseEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Leak Categorized')
      .setDescription(`Leak ${leakId} has been categorized as "${category}".`)
      .setTimestamp();
    
    await message.reply({ embeds: [responseEmbed] });
  }
  
  // Verify command handler
  async handleVerifyCommand(message, args) {
    if (args.length < 1) {
      return message.reply('Usage: !verify [leak_id]');
    }
    
    const leakId = args[0];
    
    // This would update the leak verification status in the database in a real implementation
    
    const responseEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Leak Verified')
      .setDescription(`Leak ${leakId} has been marked as verified.`)
      .setTimestamp();
    
    await message.reply({ embeds: [responseEmbed] });
  }
  
  // Monitor command handler
  async handleMonitorCommand(message, args) {
    if (args.length < 2) {
      return message.reply('Usage: !monitor [add/remove] [developer_id]');
    }
    
    const action = args[0].toLowerCase();
    const developerId = args[1];
    
    if (action !== 'add' && action !== 'remove') {
      return message.reply('Invalid action. Use "add" or "remove".');
    }
    
    // This would update the monitored developers in the database in a real implementation
    
    const responseEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Monitor Updated')
      .setDescription(`Developer ${developerId} has been ${action === 'add' ? 'added to' : 'removed from'} the monitor list.`)
      .setTimestamp();
    
    await message.reply({ embeds: [responseEmbed] });
  }
  
  // Auto-discovery command handler
  async handleDiscoverCommand(message) {
    await message.reply('Starting auto-discovery for Pet Simulator 99 content...');
    
    try {
      const results = await this.runDiscovery();
      
      const resultsEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Auto-Discovery Results')
        .setDescription(`Found content from ${results.length} source(s).`)
        .setTimestamp();
      
      for (const result of results) {
        resultsEmbed.addFields({
          name: result.developer || result.source || 'Unknown Source',
          value: `Items found: ${result.itemsFound}`
        });
      }
      
      await message.reply({ embeds: [resultsEmbed] });
    } catch (error) {
      console.error('Error running discovery:', error);
      await message.reply('An error occurred while running auto-discovery.');
    }
  }
  
  // Invite command handler
  async handleInviteCommand(message) {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${this.clientId}&permissions=274878024704&scope=bot`;
    
    const inviteEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Invite Pet Simulator 99 Leak Bot')
      .setDescription(`[Click here to invite the bot to your server](${inviteUrl})`)
      .setTimestamp();
    
    await message.reply({ embeds: [inviteEmbed] });
  }
  
  // Start auto-discovery interval
  startAutoDiscovery() {
    console.log('Starting auto-discovery scheduler...');
    
    // Clear existing interval if any
    if (this.autoDiscoveryInterval) {
      clearInterval(this.autoDiscoveryInterval);
    }
    
    // Run auto-discovery every 3 hours
    this.autoDiscoveryInterval = setInterval(async () => {
      console.log('Running scheduled auto-discovery...');
      try {
        const results = await this.runDiscovery();
        this.notifyAutoDiscoveryResults(results);
      } catch (error) {
        console.error('Error in scheduled auto-discovery:', error);
      }
    }, 3 * 60 * 60 * 1000); // 3 hours in milliseconds
    
    // Run immediately
    setTimeout(async () => {
      console.log('Running initial auto-discovery...');
      try {
        const results = await this.runDiscovery();
        this.notifyAutoDiscoveryResults(results);
      } catch (error) {
        console.error('Error in initial auto-discovery:', error);
      }
    }, 10000); // 10 seconds delay for initial run
  }
  
  // Stop auto-discovery interval
  stopAutoDiscovery() {
    console.log('Stopping auto-discovery scheduler...');
    
    if (this.autoDiscoveryInterval) {
      clearInterval(this.autoDiscoveryInterval);
      this.autoDiscoveryInterval = null;
    }
  }
  
  // Run auto-discovery for Pet Simulator 99 content
  async runDiscovery() {
    console.log('Running auto-discovery process...');
    
    const results = [];
    
    // Get all of the Pet Simulator developers
    const developers = petSimulatorDevelopers;
    
    // Process each developer
    for (const developer of developers) {
      try {
        // Discover assets from this developer
        console.log(`Scanning developer ${developer.username} (${developer.id})...`);
        const assets = await this.discoverDeveloperAssets(developer.id);
        
        // Process the discovered assets
        const processed = await this.processDiscoveredAssets(assets, 1); // Use ID 1 for system user
        
        if (processed.length > 0) {
          console.log(`Found ${processed.length} new assets from ${developer.username}`);
          results.push({
            developer: developer.username,
            developerID: developer.id,
            itemsFound: processed.length,
            items: processed
          });
        } else {
          console.log(`No new assets found from ${developer.username}`);
        }
      } catch (error) {
        console.error(`Error processing developer ${developer.id}:`, error);
      }
    }
    
    // Discover general game updates
    console.log(`Checking for general game updates...`);
    try {
      const updates = await this.discoverGameUpdates();
      console.log(`Found ${updates.length} game updates`);
      results.push({
        source: "Pet Simulator 99 Game",
        itemsFound: updates.length,
        items: updates
      });
    } catch (error) {
      console.error(`Error checking game updates:`, error);
    }
    
    // Update the last auto-discovery time
    // This would update the setting in the database in a real implementation
    
    console.log(`Auto-discovery complete. Processed ${results.length} sources.`);
    return results;
  }
  
  // Check Roblox developer profiles for new Pet Simulator 99 assets
  async discoverDeveloperAssets(developerId) {
    console.log(`Checking developer ID ${developerId} for new assets...`);
    
    // API URL for developer assets
    // If available, we would use the Roblox API here
    // For now, we'll return mock data
    return [
      {
        assetId: `roblox_${nanoid.nanoid(6)}`,
        assetType: "Model",
        name: `Pet Simulator 99 Asset ${nanoid.nanoid(4)}`,
        description: "Auto-discovered asset",
        creatorId: developerId,
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  // Check Pet Simulator 99 game for updates
  async discoverGameUpdates() {
    console.log(`Checking Pet Simulator 99 game for updates...`);
    
    // API URL for game updates
    // If available, we would use the Roblox API here
    // For now, we'll return mock data
    return [
      {
        updateId: nanoid.nanoid(8),
        gameId: PET_SIMULATOR_99_GAME_ID,
        updateType: "version",
        version: `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
        timestamp: new Date().toISOString()
      }
    ];
  }
  
  // Process discovered assets and store them
  async processDiscoveredAssets(assets, userId) {
    const results = [];
    
    for (const asset of assets) {
      try {
        // Create a file entry
        // This would store the file in the database in a real implementation
        const file = {
          id: nanoid.nanoid(8),
          filename: asset.name,
          fileType: "roblox_asset",
          fileSize: 0,
          uploaderId: userId,
          fileData: JSON.stringify(asset),
          assetId: asset.assetId
        };
        
        // Verify if content is related to Pet Simulator 99
        const verification = this.verifyPetSimulatorContent({
          title: asset.name,
          description: asset.description,
          metadata: {
            gameId: PET_SIMULATOR_99_GAME_ID,
            developerId: asset.creatorId
          }
        });
        
        // Create a leak entry if confidence is high enough
        if (verification.confidence > 30) {
          // This would store the leak in the database in a real implementation
          const leak = {
            id: nanoid.nanoid(8),
            fileId: file.id,
            title: asset.name,
            description: asset.description || "Auto-discovered asset",
            leakType: "automatic",
            category: "auto-discovered",
            gameName: "Pet Simulator 99",
            leakedBy: userId,
            tags: ["Auto-Discovered", "Roblox Asset", asset.assetType]
          };
          
          results.push({
            file,
            leak,
            verification
          });
        } else {
          console.log(`Asset ${asset.assetId} (${asset.name}) didn't meet confidence threshold: ${verification.confidence}`);
        }
      } catch (error) {
        console.error(`Error processing asset:`, error);
      }
    }
    
    return results;
  }
  
  // Verify if content is likely related to Pet Simulator 99
  verifyPetSimulatorContent(content) {
    // Start with base confidence
    let confidence = 0;
    const reasons = [];
    
    // Check for Pet Simulator keywords in title
    if (content.title) {
      const title = content.title.toLowerCase();
      if (title.includes("pet simulator") || title.includes("pet sim") || title.includes("ps99")) {
        confidence += 30;
        reasons.push("Title contains Pet Simulator keywords");
      }
      if (title.includes("huge") && title.includes("pet")) {
        confidence += 20;
        reasons.push("Title references Huge Pets (PS99 feature)");
      }
    }
    
    // Check for Pet Simulator keywords in description
    if (content.description) {
      const desc = content.description.toLowerCase();
      if (desc.includes("pet simulator") || desc.includes("pet sim") || desc.includes("ps99")) {
        confidence += 20;
        reasons.push("Description contains Pet Simulator keywords");
      }
      if (desc.includes("big games") || desc.includes("preston")) {
        confidence += 15;
        reasons.push("Description mentions Big Games or Preston");
      }
    }
    
    // Check for relevant tags
    if (content.tags && content.tags.length > 0) {
      const relevantTags = content.tags.filter(tag => {
        const lowerTag = tag.toLowerCase();
        return lowerTag.includes("pet") || 
          lowerTag.includes("simulator") || 
          lowerTag.includes("ps99") || 
          lowerTag.includes("biggames");
      });
      
      if (relevantTags.length > 0) {
        confidence += 15 * Math.min(relevantTags.length, 3);
        reasons.push(`Contains ${relevantTags.length} relevant tags`);
      }
    }
    
    // Check metadata if available
    if (content.metadata) {
      if (content.metadata.gameId === PET_SIMULATOR_99_GAME_ID) {
        confidence += 50;
        reasons.push("Content directly linked to Pet Simulator 99 game ID");
      }
      
      if (content.metadata.developerId && 
          petSimulatorDevelopers.some(dev => dev.id === content.metadata.developerId)) {
        confidence += 40;
        reasons.push("Content created by known Pet Simulator developer");
      }
    }
    
    // Determine if the content is verified based on confidence
    const isVerified = confidence >= 50;
    const reason = reasons.join(", ");
    
    return {
      isVerified,
      confidence,
      reason: reason || "No specific indicators found"
    };
  }
  
  // Notify auto-discovery results to the appropriate channel
  async notifyAutoDiscoveryResults(results) {
    if (results.length === 0) {
      console.log('No auto-discovery results to notify.');
      return;
    }
    
    // Get leak channel if available
    const leakChannel = this.client.channels.cache.get(this.leakChannelId);
    
    if (!leakChannel) {
      console.log('Leak channel not found. Cannot notify auto-discovery results.');
      return;
    }
    
    const itemsFound = results.reduce((total, result) => total + result.itemsFound, 0);
    
    if (itemsFound === 0) {
      console.log('No items found in auto-discovery. Skipping notification.');
      return;
    }
    
    const resultsEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Auto-Discovery Results')
      .setDescription(`Found ${itemsFound} new item(s) from ${results.length} source(s).`)
      .setTimestamp();
    
    for (const result of results) {
      if (result.itemsFound > 0) {
        resultsEmbed.addFields({
          name: result.developer || result.source || 'Unknown Source',
          value: `Items found: ${result.itemsFound}`
        });
      }
    }
    
    await leakChannel.send({ embeds: [resultsEmbed] });
    
    // Send individual leak embeds
    for (const result of results) {
      if (result.items && result.items.length > 0) {
        for (const item of result.items) {
          if (item.leak) {
            const leakEmbed = new EmbedBuilder()
              .setColor('#ff9900')
              .setTitle(`Auto-Discovered: ${item.leak.title}`)
              .setDescription(item.leak.description || 'No description')
              .addFields(
                { name: 'Category', value: item.leak.category },
                { name: 'Type', value: item.leak.leakType },
                { name: 'Game', value: item.leak.gameName },
                { name: 'Tags', value: item.leak.tags.join(', ') },
                { name: 'Confidence', value: `${item.verification.confidence}%`, inline: true },
                { name: 'Verified', value: item.verification.isVerified ? 'Yes' : 'No', inline: true }
              )
              .setTimestamp();
            
            await leakChannel.send({ embeds: [leakEmbed] });
          }
        }
      }
    }
  }
}

// Export the Discord bot class
module.exports = DiscordBot;