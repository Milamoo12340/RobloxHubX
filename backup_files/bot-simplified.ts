import express from "express";
import { storage } from "./storage";
import { Client, GatewayIntentBits } from 'discord.js';

// Create a simple express app
const app = express();
app.use(express.json());

// Define a simple route
app.get('/', (req, res) => {
  res.send('Pet Simulator 99 Discord Bot - Simplified Version');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Create a simple Discord bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Connect to Discord when the bot token is available
const botToken = process.env.DISCORD_BOT_TOKEN;
if (botToken) {
  console.log("Attempting to connect to Discord with the provided token...");
  
  // Set up event handlers
  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    console.log('Bot is ready to receive commands!');
  });
  
  client.on('messageCreate', (message) => {
    if (message.content === '!ping') {
      message.reply('Pong!');
    }
  });
  
  // Login to Discord
  client.login(botToken)
    .then(() => {
      console.log("Successfully connected to Discord!");
    })
    .catch((error) => {
      console.error("Failed to connect to Discord:", error);
    });
} else {
  console.log("No Discord bot token found. The bot will run without Discord functionality.");
}

console.log("Pet Simulator 99 Discord Bot (Simplified Version) is running!");