import express from "express";
import { storage } from "./storage";
import { DiscordBot } from "./bot/discord";

// Create a simple express app
const app = express();
app.use(express.json());

// Create basic routes
app.get("/", (req, res) => {
  res.json({ message: "Pet Simulator 99 Leaks Bot API" });
});

// Create a Discord bot instance
const bot = new DiscordBot(storage);

// Connect to Discord if token is available
const token = process.env.DISCORD_BOT_TOKEN;
if (token) {
  bot.connectToDiscord(token)
    .then(() => {
      console.log("Connected to Discord successfully");
    })
    .catch((error) => {
      console.error("Failed to connect to Discord:", error);
    });
} else {
  console.log("No Discord bot token found");
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});