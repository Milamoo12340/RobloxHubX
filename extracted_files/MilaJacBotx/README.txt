# PS99 Asset Tracking System

A comprehensive system for tracking Pet Simulator 99 assets and updates in real-time.

## Overview

This package includes a complete suite of tools for tracking PS99 assets, developers, and game updates:

- **Asset Scanners**: Monitor for new pets, models, meshes, and textures
- **Developer Trackers**: Watch PS99 developer activity in studio
- **Game Monitors**: Track icon changes, game passes, and descriptions
- **Discord Integration**: Send notifications through webhooks

## Setup Requirements

1. **Node.js**: v16 or higher
2. **Discord Server**: For receiving notifications
3. **Discord Bot**: For scraping Discord leak channels (optional)
4. **Discord Webhooks**: For sending notifications

## Getting Started

1. Clone or download this repository
2. Run `npm install` to install dependencies
3. Create a `.env` file with the required secrets:

```
# Required
DISCORD_WEBHOOK_URL=your_webhook_url_here
PETBOT_WEBHOOK_URL=your_petbot_webhook_url_here

# Optional - for Discord bot (JacBot)
DISCORD_BOT_TOKEN=your_bot_token_here
```

4. Start the trackers with `node run-all-ps99-trackers.cjs`

## Components

### Asset Scanners
- `ps99-focused-asset-scanner.cjs`: Monitors PS99 developer assets
- `ps99-critical-targets-monitor.cjs`: Watches key developers and groups
- `ps99-24-7-asset-monitor.js`: Runs continuous 24/7 monitoring
- `ps99-urgent-pet-finder.cjs`: High-frequency scanning for new pets
- `ps99-imminent-update-tracker.cjs`: Detects when updates are being deployed

### Developer Activity Trackers
- `ps99-developer-tracker.cjs`: Monitors when developers are in Studio
- `private-server-tracker.cjs`: Monitors private testing servers
- `key-developers.cjs`: Contains list of PS99 developers to monitor

### Website Monitors
- `big-games-website-monitor.cjs`: Monitors the Big Games website for updates

### Discord Integration
- `discord-bot/jacbot.js`: Discord bot for monitoring leak channels

## Bot Configuration

You need to set up two separate webhook systems:

1. **PetBot Webhook**: For asset discoveries and game updates
2. **JacBot Webhook**: For Discord scraping and community leaks

## Usage

To run all trackers simultaneously:
```
node run-all-ps99-trackers.cjs
```

To run individual trackers:
```
node ps99-focused-asset-scanner.cjs
node ps99-developer-tracker.cjs
node ps99-urgent-pet-finder.cjs
node big-games-website-monitor.cjs
```

## Developer List

The system monitors the following PS99 developers:

- Adam (chickenputty, 13365322): Lead Developer
- Jamien (JamienChee, 7707349): Lead Developer
- David (ForeverDev, 1210210): Core Developer
- Conner (CoderConner, 2213470865): Core Developer
- Joey (CoderJoey, 2882755487): Core Developer
- Spiffy (spiffyproe, 2880286252): Core Developer
- Mitchell (CoderMitchell, 2878290231): Core Developer
- Tony (CoderTony, 3983340648): Developer
- Preston (BuildIntoGames, 19717956): Big Games Founder

## BIG Games Group

- BIG Games Pets (3959677): Main group for PS99
- Universe ID: 3317771874
- Place ID: 8737899170

## Customization

You can modify the scan intervals in each file to adjust how frequently scans run:

- Urgent scans: 10-20 seconds (recommended during updates)
- Normal scans: 5-15 minutes (recommended for daily monitoring)
- Background scans: 30-60 minutes (recommended for long-term monitoring)

## Troubleshooting

- **Rate Limiting**: Scripts include automatic rate limiting and backoff
- **403/404 Errors**: Expected for private inventory items
- **Discord Connection**: Check bot token and webhook URLs
- **Missing Assets**: Try adjusting keywords in the scanners

## Credits

Created for tracking PS99 assets and updates.