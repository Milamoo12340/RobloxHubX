/**
 * PS99 All-in-One Tracker Launcher
 * 
 * This script launches and manages all PS99 tracking systems:
 * 1. Developer Activity Tracker - Monitors developer game sessions
 * 2. Asset Scanner - Tracks new PS99 assets
 * 3. Private Server Scanner - Finds testing environments
 * 4. Website Monitor - Watches the Big Games website for updates
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Trackers to run
  trackers: [
    {
      name: "Asset Scanner",
      script: "ps99-focused-asset-scanner.cjs",
      enabled: true,
      restartOnCrash: true,
      logFile: "logs/asset-scanner.log"
    },
    {
      name: "Developer Activity Tracker",
      script: "ps99-developer-tracker.cjs",
      enabled: true,
      restartOnCrash: true,
      logFile: "logs/developer-tracker.log"
    },
    {
      name: "Private Server Tracker",
      script: "private-server-tracker.cjs",
      enabled: true,
      restartOnCrash: true,
      logFile: "logs/private-server-tracker.log"
    },
    {
      name: "Website Monitor",
      script: "big-games-website-monitor.cjs",
      enabled: true,
      restartOnCrash: true,
      logFile: "logs/website-monitor.log"
    },
    {
      name: "24/7 Asset Monitor",
      script: "ps99-24-7-asset-monitor.js",
      enabled: true,
      restartOnCrash: true,
      logFile: "logs/asset-monitor.log"
    },
    {
      name: "Discord Bot (JacBot)",
      script: "discord-bot/scrappybot.js",
      type: "module",
      enabled: false, // Disabled until we resolve module issues
      restartOnCrash: true,
      logFile: "logs/jacbot.log"
    }
  ],
  
  // Health check interval (in ms)
  healthCheckInterval: 30 * 1000, // 30 seconds
  
  // Maximum restart attempts
  maxRestartAttempts: 5,
  
  // Restart delay (in ms)
  standardRestartDelay: 5 * 1000, // 5 seconds
  extendedRestartDelay: 5 * 60 * 1000, // 5 minutes
  
  // Logs directory
  logsDir: "./logs"
};

// Process management
const processes = new Map();

// Create logs directory if it doesn't exist
if (!fs.existsSync(CONFIG.logsDir)) {
  fs.mkdirSync(CONFIG.logsDir, { recursive: true });
}

// Utility: Format uptime as a readable string
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// Start a tracker
function startTracker(tracker) {
  if (!tracker.enabled) {
    console.log(`Tracker ${tracker.name} is disabled, skipping.`);
    return;
  }
  
  // Check if already running
  if (processes.has(tracker.name) && processes.get(tracker.name).process) {
    console.log(`Tracker ${tracker.name} is already running.`);
    return;
  }
  
  console.log(`Starting tracker: ${tracker.name}`);
  
  // Create log stream
  const logStream = fs.createWriteStream(tracker.logFile, { flags: 'a' });
  
  // Log startup
  const startupMessage = `\n\n=== ${tracker.name} STARTING at ${new Date().toLocaleString()} ===\n`;
  logStream.write(startupMessage);
  
  // Determine spawn args based on module type
  const spawnArgs = tracker.type === 'module' ? 
    ['--experimental-modules', tracker.script] : 
    [tracker.script];
  
  // Spawn process
  const process = spawn('node', spawnArgs, {
    stdio: 'pipe',
    detached: false
  });
  
  // Store process info
  processes.set(tracker.name, {
    process,
    startTime: Date.now(),
    restarts: processes.has(tracker.name) ? processes.get(tracker.name).restarts || 0 : 0,
    logStream
  });
  
  // Handle stdout
  process.stdout.on('data', (data) => {
    const output = data.toString();
    logStream.write(output);
    console.log(`[${tracker.name}] ${output.trim()}`);
  });
  
  // Handle stderr
  process.stderr.on('data', (data) => {
    const output = data.toString();
    logStream.write(`ERROR: ${output}`);
    console.error(`[${tracker.name}] ERROR: ${output.trim()}`);
  });
  
  // Handle process exit
  process.on('exit', (code) => {
    logStream.write(`\n=== ${tracker.name} EXITED with code ${code} at ${new Date().toLocaleString()} ===\n`);
    console.log(`[${tracker.name}] Process exited with code ${code}`);
    
    // Close log stream
    logStream.end();
    
    // Remove from processes map
    processes.delete(tracker.name);
    
    // Restart if enabled
    if (tracker.restartOnCrash) {
      handleRestartTracker(tracker);
    }
  });
  
  // Handle process error
  process.on('error', (err) => {
    console.error(`[${tracker.name}] Failed to start process:`, err);
    
    // Log error
    logStream.write(`\nSTART ERROR: ${err.message}\n`);
    
    // Close log stream
    logStream.end();
    
    // Remove from processes map
    processes.delete(tracker.name);
    
    // Restart if enabled
    if (tracker.restartOnCrash) {
      handleRestartTracker(tracker);
    }
  });
  
  console.log(`[${tracker.name}] Started with PID ${process.pid}`);
}

// Handle tracker restart with backoff
function handleRestartTracker(tracker) {
  // Get current restart count
  const currentProcess = processes.get(tracker.name) || { restarts: 0 };
  const restarts = currentProcess.restarts + 1;
  
  // Store restarts count
  processes.set(tracker.name, {
    ...currentProcess,
    restarts,
    process: null
  });
  
  // Calculate restart delay
  let delay = CONFIG.standardRestartDelay;
  if (restarts > CONFIG.maxRestartAttempts) {
    delay = CONFIG.extendedRestartDelay;
    console.log(`[${tracker.name}] Too many restart attempts (${restarts}), waiting ${delay/1000} seconds before trying again.`);
  } else {
    console.log(`[${tracker.name}] Restarting in ${delay/1000} seconds (attempt ${restarts}).`);
  }
  
  // Schedule restart
  setTimeout(() => {
    startTracker(tracker);
  }, delay);
}

// Check tracker health
function checkTrackerHealth() {
  console.log('\n=== Checking tracker health ===');
  
  for (const tracker of CONFIG.trackers) {
    if (!tracker.enabled) continue;
    
    const processInfo = processes.get(tracker.name);
    
    if (!processInfo || !processInfo.process) {
      console.log(`[HEALTH] ${tracker.name} is not running, starting...`);
      startTracker(tracker);
    } else {
      // Calculate uptime
      const uptime = (Date.now() - processInfo.startTime) / 1000;
      
      console.log(`[HEALTH] ${tracker.name} running for ${formatUptime(uptime)} (restarts: ${processInfo.restarts})`);
      
      // Reset restart count if running for a long time
      if (uptime > 3600) { // 1 hour
        processInfo.restarts = 0;
      }
    }
  }
}

// Print tracker status
function printTrackerStatus() {
  console.log('\n=== PS99 Tracker Status ===');
  
  let runningTrackers = 0;
  let totalTrackers = 0;
  
  for (const tracker of CONFIG.trackers) {
    totalTrackers++;
    if (!tracker.enabled) {
      console.log(`${tracker.name}: DISABLED`);
      continue;
    }
    
    const processInfo = processes.get(tracker.name);
    const isRunning = processInfo && processInfo.process;
    
    if (isRunning) runningTrackers++;
    
    const status = isRunning ? 'RUNNING' : 'STOPPED';
    const uptime = isRunning ? formatUptime((Date.now() - processInfo.startTime) / 1000) : 'N/A';
    const pid = isRunning ? processInfo.process.pid : 'N/A';
    
    console.log(`${tracker.name}: ${status}`);
    console.log(`  Uptime: ${uptime}`);
    console.log(`  Restarts: ${processInfo ? processInfo.restarts : 0}`);
    console.log(`  PID: ${pid}`);
    console.log(`  Log: ${tracker.logFile}`);
    console.log('');
  }
  
  console.log(`Overall: ${runningTrackers}/${totalTrackers} trackers running`);
}

// Start all trackers
function startAllTrackers() {
  console.log('=== Starting all PS99 trackers ===');
  
  for (const tracker of CONFIG.trackers) {
    if (tracker.enabled) {
      startTracker(tracker);
    } else {
      console.log(`Tracker ${tracker.name} is disabled, skipping.`);
    }
  }
  
  // Schedule health checks
  setInterval(checkTrackerHealth, CONFIG.healthCheckInterval);
  
  // Schedule status prints
  setInterval(printTrackerStatus, 60 * 60 * 1000); // Every hour
  
  console.log('All trackers started. Health checks will run every', 
    CONFIG.healthCheckInterval / 1000, 'seconds.');
}

// Stop all trackers
function stopAllTrackers() {
  console.log('=== Stopping all PS99 trackers ===');
  
  for (const [trackerName, processInfo] of processes.entries()) {
    if (processInfo.process) {
      console.log(`Stopping ${trackerName}...`);
      processInfo.process.kill();
    }
  }
  
  console.log('All trackers stopped.');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down all trackers...');
  stopAllTrackers();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Shutting down all trackers...');
  stopAllTrackers();
  process.exit(0);
});

// Start all trackers
startAllTrackers();

// Print initial status after a short delay
setTimeout(printTrackerStatus, 5000);

console.log('PS99 All-in-One Tracker Launcher started successfully!');