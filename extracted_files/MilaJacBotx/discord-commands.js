/**
 * Discord Command Handler for PS99 Tracker
 * 
 * This module manages Discord bot commands for interacting with the PS99 trackers.
 * Commands allow users to start scans, check status, and get recent discoveries.
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Command definitions
const commandDefinitions = [
  {
    name: 'scan',
    description: 'Run a PS99 asset scan',
    options: [
      {
        name: 'type',
        description: 'Type of scan to run',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Quick Scan', value: 'quick' },
          { name: 'Full Scan', value: 'full' },
          { name: 'Developer Scan', value: 'developer' },
          { name: 'Urgent Scan', value: 'urgent' }
        ]
      }
    ],
    handler: handleScanCommand
  },
  {
    name: 'status',
    description: 'Get the status of PS99 trackers',
    handler: handleStatusCommand
  },
  {
    name: 'recent',
    description: 'Show recent PS99 discoveries',
    options: [
      {
        name: 'count',
        description: 'Number of recent discoveries to show',
        type: 4, // INTEGER
        required: false
      }
    ],
    handler: handleRecentCommand
  },
  {
    name: 'monitor',
    description: 'Start or stop continuous monitoring',
    options: [
      {
        name: 'action',
        description: 'Action to perform',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Start', value: 'start' },
          { name: 'Stop', value: 'stop' },
          { name: 'Status', value: 'status' }
        ]
      }
    ],
    handler: handleMonitorCommand
  },
  {
    name: 'help',
    description: 'Show available commands and help',
    handler: handleHelpCommand
  }
];

// Build slash commands
function buildSlashCommands() {
  return commandDefinitions.map(cmd => {
    const command = new SlashCommandBuilder()
      .setName(cmd.name)
      .setDescription(cmd.description);
    
    // Add options if present
    if (cmd.options) {
      for (const option of cmd.options) {
        switch (option.type) {
          case 3: // STRING
            let stringOption = command.addStringOption(opt => 
              opt.setName(option.name)
                 .setDescription(option.description)
                 .setRequired(option.required || false)
            );
            
            // Add choices if present
            if (option.choices) {
              stringOption.addChoices(...option.choices);
            }
            break;
            
          case 4: // INTEGER
            command.addIntegerOption(opt => 
              opt.setName(option.name)
                 .setDescription(option.description)
                 .setRequired(option.required || false)
            );
            break;
            
          case 5: // BOOLEAN
            command.addBooleanOption(opt => 
              opt.setName(option.name)
                 .setDescription(option.description)
                 .setRequired(option.required || false)
            );
            break;
        }
      }
    }
    
    return command;
  });
}

// Command handlers
async function handleScanCommand(interaction) {
  const scanType = interaction.options.getString('type');
  
  await interaction.deferReply();
  
  let scriptPath;
  let scanName;
  
  switch (scanType) {
    case 'quick':
      scriptPath = 'ps99-icon-thumbnail-scanner.cjs';
      scanName = 'Quick Icon & Thumbnail Scan';
      break;
    case 'full':
      scriptPath = 'ps99-focused-asset-scanner.cjs';
      scanName = 'Full Asset Scan';
      break;
    case 'developer':
      scriptPath = 'ps99-developer-tracker.cjs';
      scanName = 'Developer Activity Scan';
      break;
    case 'urgent':
      scriptPath = 'ps99-urgent-pet-finder.cjs';
      scanName = 'Urgent Pet Scan';
      break;
    default:
      await interaction.editReply('Invalid scan type. Use `/help` to see available scan types.');
      return;
  }
  
  await interaction.editReply(`Starting ${scanName}...`);
  
  // Run the scan
  try {
    const scan = spawn('node', [scriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Don't wait for process to finish
    scan.unref();
    
    await interaction.editReply(`${scanName} started! Results will be sent to the configured webhook.`);
  } catch (error) {
    await interaction.editReply(`Error starting scan: ${error.message}`);
  }
}

async function handleStatusCommand(interaction) {
  await interaction.deferReply();
  
  // Get status of running processes
  const ps = spawn('ps', ['aux']);
  
  let output = '';
  
  ps.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  ps.on('close', async (code) => {
    const trackers = [
      { name: 'Asset Scanner', process: 'ps99-focused-asset-scanner' },
      { name: 'Icon Scanner', process: 'ps99-icon-thumbnail-scanner' },
      { name: 'Developer Tracker', process: 'ps99-developer-tracker' },
      { name: 'Urgent Pet Finder', process: 'ps99-urgent-pet-finder' },
      { name: 'JacBot', process: 'jacbot.js' }
    ];
    
    // Check which trackers are running
    const status = trackers.map(tracker => {
      const isRunning = output.includes(tracker.process);
      return `${isRunning ? '🟢' : '🔴'} ${tracker.name}: ${isRunning ? 'Running' : 'Stopped'}`;
    });
    
    // Add cache info
    try {
      let cacheInfo = [];
      
      // Check for various cache files
      const cacheFiles = [
        { name: 'Asset Cache', file: './ps99_cache.json' },
        { name: 'Icon Cache', file: './ps99_icon_cache.json' },
        { name: 'Developer Cache', file: './ps99_developer_cache.json' }
      ];
      
      for (const cache of cacheFiles) {
        if (fs.existsSync(cache.file)) {
          const stat = fs.statSync(cache.file);
          const lastUpdated = new Date(stat.mtime).toLocaleString();
          cacheInfo.push(`📁 ${cache.name}: Last updated ${lastUpdated}`);
        }
      }
      
      // Add image count
      if (fs.existsSync('./ps99_images')) {
        const imageCount = fs.readdirSync('./ps99_images').length;
        cacheInfo.push(`🖼️ Saved Images: ${imageCount}`);
      }
      
      await interaction.editReply(`## PS99 Tracker Status\n\n${status.join('\n')}\n\n${cacheInfo.join('\n')}`);
    } catch (error) {
      await interaction.editReply(`## PS99 Tracker Status\n\n${status.join('\n')}\n\nError getting cache info: ${error.message}`);
    }
  });
}

async function handleRecentCommand(interaction) {
  await interaction.deferReply();
  
  const count = interaction.options.getInteger('count') || 5;
  
  try {
    // Look for cache files
    const cacheFiles = [
      { name: 'Assets', file: './ps99_cache.json' },
      { name: 'Icons', file: './ps99_icon_cache.json' },
      { name: 'Developers', file: './ps99_developer_cache.json' }
    ];
    
    let recentDiscoveries = [];
    
    for (const cache of cacheFiles) {
      if (fs.existsSync(cache.file)) {
        const cacheData = JSON.parse(fs.readFileSync(cache.file, 'utf8'));
        
        // Extract recent discoveries based on cache structure
        if (cache.name === 'Assets' && cacheData.assets) {
          // Convert assets object to array and sort by firstSeen
          const assets = Object.entries(cacheData.assets)
            .map(([id, asset]) => ({ id, ...asset }))
            .sort((a, b) => (b.firstSeen || 0) - (a.firstSeen || 0))
            .slice(0, count);
          
          for (const asset of assets) {
            recentDiscoveries.push({
              type: 'Asset',
              name: asset.name || `Asset #${asset.id}`,
              discovered: new Date(asset.firstSeen || Date.now()).toLocaleString(),
              link: `https://www.roblox.com/catalog/${asset.id}/`
            });
          }
        } else if (cache.name === 'Icons' && cacheData.gameThumbnails) {
          // Extract thumbnails with timestamp
          const lastUpdated = new Date(cacheData.lastScan || Date.now()).toLocaleString();
          recentDiscoveries.push({
            type: 'Game Thumbnails',
            name: `${cacheData.gameThumbnails.length} PS99 Thumbnails`,
            discovered: lastUpdated,
            link: `https://www.roblox.com/games/${CONFIG.placeId}/`
          });
        }
      }
    }
    
    // Sort by discovered date
    recentDiscoveries.sort((a, b) => new Date(b.discovered) - new Date(a.discovered));
    
    // Limit to requested count
    recentDiscoveries = recentDiscoveries.slice(0, count);
    
    if (recentDiscoveries.length === 0) {
      await interaction.editReply('No recent discoveries found.');
      return;
    }
    
    // Format output
    const formattedDiscoveries = recentDiscoveries.map(d => 
      `**${d.type}:** ${d.name}\n📅 ${d.discovered}\n🔗 [Link](${d.link})`
    );
    
    await interaction.editReply(`## Recent PS99 Discoveries\n\n${formattedDiscoveries.join('\n\n')}`);
  } catch (error) {
    await interaction.editReply(`Error getting recent discoveries: ${error.message}`);
  }
}

async function handleMonitorCommand(interaction) {
  await interaction.deferReply();
  
  const action = interaction.options.getString('action');
  
  switch (action) {
    case 'start':
      try {
        const monitor = spawn('node', ['run-all-ps99-trackers.cjs'], {
          detached: true,
          stdio: 'ignore'
        });
        
        monitor.unref();
        
        await interaction.editReply('Started PS99 monitoring! All trackers now running.');
      } catch (error) {
        await interaction.editReply(`Error starting monitoring: ${error.message}`);
      }
      break;
      
    case 'stop':
      try {
        // Kill all related processes
        const kill = spawn('pkill', ['-f', 'ps99-']);
        
        kill.on('close', async (code) => {
          await interaction.editReply('Stopped all PS99 trackers.');
        });
      } catch (error) {
        await interaction.editReply(`Error stopping monitoring: ${error.message}`);
      }
      break;
      
    case 'status':
      // Reuse status command
      await handleStatusCommand(interaction);
      break;
      
    default:
      await interaction.editReply('Invalid action. Use `/help` to see available options.');
  }
}

async function handleHelpCommand(interaction) {
  const helpText = `
## PS99 Asset Tracker Commands

**/scan [type]** - Run a PS99 asset scan
  • quick: Check game icon and thumbnails
  • full: Scan for all assets
  • developer: Check developer activity
  • urgent: High-frequency pet scan

**/status** - Get the status of all PS99 trackers

**/recent [count]** - Show recent PS99 discoveries
  • count: Number of discoveries to show (default: 5)

**/monitor [action]** - Control continuous monitoring
  • start: Start all trackers
  • stop: Stop all trackers
  • status: Check tracker status

**/help** - Show this help message

For more information, see the README.md file.
`;

  await interaction.reply(helpText);
}

// Export commands
module.exports = {
  commandDefinitions,
  buildSlashCommands,
  handleCommand: async (interaction) => {
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;
    const command = commandDefinitions.find(cmd => cmd.name === commandName);
    
    if (command) {
      await command.handler(interaction);
    }
  }
};