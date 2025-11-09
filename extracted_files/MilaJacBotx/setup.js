/**
 * PS99 Tracker Setup Script
 * 
 * This script helps set up the PS99 asset tracking system
 * by creating necessary directories and config files.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Required directories
const requiredDirs = [
  'logs',
  'ps99_cache',
  'ps99_images',
  'ps99_fresh_cache',
  'discord_scraped_data'
];

// Create directories
function createDirectories() {
  console.log('Creating required directories...');
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
  }
  
  console.log('All directories created successfully!');
}

// Setup environment file
function setupEnv() {
  console.log('\nSetting up environment configuration...');
  
  if (fs.existsSync('.env')) {
    console.log('.env file already exists. Skipping...');
    return;
  }
  
  if (!fs.existsSync('.env.template')) {
    console.log('Warning: .env.template not found. Creating basic .env file...');
    
    const basicEnv = `# Required webhooks for notifications
# Create these in your Discord server: Server Settings > Integrations > Webhooks
DISCORD_WEBHOOK_URL=
PETBOT_WEBHOOK_URL=

# Optional - for Discord bot (JacBot)
# Create a bot at https://discord.com/developers/applications
DISCORD_BOT_TOKEN=
`;
    
    fs.writeFileSync('.env', basicEnv);
    console.log('Created basic .env file. Please edit it with your webhook URLs.');
    return;
  }
  
  // Copy template to .env
  fs.copyFileSync('.env.template', '.env');
  console.log('Created .env file from template. Please edit it with your webhook URLs.');
}

// Check for dependencies
function checkDependencies() {
  console.log('\nChecking package.json...');
  
  if (!fs.existsSync('package.json')) {
    console.log('Creating package.json...');
    
    const packageJson = {
      "name": "ps99-asset-tracker",
      "version": "1.0.0",
      "description": "Pet Simulator 99 asset tracking system",
      "main": "run-all-ps99-trackers.cjs",
      "scripts": {
        "start": "node run-all-ps99-trackers.cjs",
        "dev": "node ps99-focused-asset-scanner.cjs",
        "urgent": "node ps99-urgent-pet-finder.cjs",
        "tracker": "node ps99-imminent-update-tracker.cjs"
      },
      "dependencies": {
        "axios": "^1.1.3",
        "discord.js": "^14.7.1",
        "dotenv": "^16.0.3",
        "fs": "^0.0.1-security",
        "path": "^0.12.7"
      }
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('Created package.json');
  } else {
    console.log('package.json already exists');
  }
}

// Ask for configuration
function askForWebhooks() {
  console.log('\nSetup Discord webhook URLs for notifications:');
  console.log('(Leave blank to configure later in the .env file)');
  
  rl.question('Enter your Discord webhook URL for PetBot: ', (petbotUrl) => {
    rl.question('Enter your Discord webhook URL for JacBot: ', (jacbotUrl) => {
      if (petbotUrl || jacbotUrl) {
        let envContent = fs.readFileSync('.env', 'utf8');
        
        if (petbotUrl) {
          envContent = envContent.replace('PETBOT_WEBHOOK_URL=your_webhook_url_here', `PETBOT_WEBHOOK_URL=${petbotUrl}`);
        }
        
        if (jacbotUrl) {
          envContent = envContent.replace('DISCORD_WEBHOOK_URL=your_webhook_url_here', `DISCORD_WEBHOOK_URL=${jacbotUrl}`);
        }
        
        fs.writeFileSync('.env', envContent);
        console.log('Webhook URLs updated in .env file');
      }
      
      console.log('\nSetup complete! You can now run the trackers with:');
      console.log('npm start');
      rl.close();
    });
  });
}

// Run setup
function runSetup() {
  console.log('==================================================');
  console.log('       PS99 Asset Tracking System Setup');
  console.log('==================================================');
  
  createDirectories();
  setupEnv();
  checkDependencies();
  askForWebhooks();
}

runSetup();