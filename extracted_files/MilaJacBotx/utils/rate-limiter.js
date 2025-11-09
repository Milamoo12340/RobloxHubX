/**
 * Rate Limiter Utility
 * 
 * This utility helps manage API request rates to avoid hitting Roblox's rate limits.
 * It implements exponential backoff, domain-specific limits, and request queuing.
 */

const { setTimeout } = require('timers/promises');

// Rate limit configuration by domain
const RATE_LIMITS = {
  'roblox.com': {
    maxRequestsPerMinute: 60,
    defaultBackoff: 1000,
    maxBackoff: 30000,
    resetTime: 60 * 1000 // 1 minute
  },
  'catalog.roblox.com': {
    maxRequestsPerMinute: 30,
    defaultBackoff: 1000,
    maxBackoff: 30000,
    resetTime: 60 * 1000
  },
  'games.roblox.com': {
    maxRequestsPerMinute: 50,
    defaultBackoff: 1000,
    maxBackoff: 30000,
    resetTime: 60 * 1000
  },
  'apis.roblox.com': {
    maxRequestsPerMinute: 30,
    defaultBackoff: 1000,
    maxBackoff: 30000,
    resetTime: 60 * 1000
  },
  'thumbnails.roblox.com': {
    maxRequestsPerMinute: 50,
    defaultBackoff: 1000,
    maxBackoff: 30000,
    resetTime: 60 * 1000
  },
  'groups.roblox.com': {
    maxRequestsPerMinute: 40,
    defaultBackoff: 1000,
    maxBackoff: 30000,
    resetTime: 60 * 1000
  },
  'presence.roblox.com': {
    maxRequestsPerMinute: 30,
    defaultBackoff: 1000,
    maxBackoff: 30000,
    resetTime: 60 * 1000
  },
  'default': {
    maxRequestsPerMinute: 50,
    defaultBackoff: 1000,
    maxBackoff: 30000,
    resetTime: 60 * 1000
  }
};

// Track requests by domain
const requestTracker = {};

// Extract domain from URL
function getDomain(url) {
  try {
    const domain = new URL(url).hostname;
    
    // Check if domain is in our rate limits
    for (const key of Object.keys(RATE_LIMITS)) {
      if (domain.includes(key)) {
        return key;
      }
    }
    
    return 'default';
  } catch (error) {
    return 'default';
  }
}

// Initialize tracking for a domain
function initDomainTracking(domain) {
  if (!requestTracker[domain]) {
    requestTracker[domain] = {
      requests: 0,
      lastReset: Date.now(),
      backoff: 0,
      queue: [],
      processing: false
    };
  }
  
  // Reset if needed
  const tracker = requestTracker[domain];
  const limits = RATE_LIMITS[domain] || RATE_LIMITS.default;
  
  if (Date.now() - tracker.lastReset > limits.resetTime) {
    tracker.requests = 0;
    tracker.lastReset = Date.now();
    tracker.backoff = 0;
  }
  
  return tracker;
}

// Calculate wait time for a domain
function calculateWaitTime(domain) {
  const tracker = initDomainTracking(domain);
  const limits = RATE_LIMITS[domain] || RATE_LIMITS.default;
  
  // Check if we're over the limit
  if (tracker.requests >= limits.maxRequestsPerMinute) {
    // Calculate time until reset
    const timeUntilReset = limits.resetTime - (Date.now() - tracker.lastReset);
    
    if (timeUntilReset > 0) {
      return timeUntilReset;
    }
    
    // Reset if the time has passed
    tracker.requests = 0;
    tracker.lastReset = Date.now();
    tracker.backoff = 0;
    return 0;
  }
  
  // Check if we need to backoff
  if (tracker.backoff > 0) {
    return tracker.backoff;
  }
  
  return 0;
}

// Process queue for a domain
async function processQueue(domain) {
  const tracker = requestTracker[domain];
  
  if (tracker.processing || tracker.queue.length === 0) {
    return;
  }
  
  tracker.processing = true;
  
  while (tracker.queue.length > 0) {
    const waitTime = calculateWaitTime(domain);
    
    if (waitTime > 0) {
      console.log(`Rate limiting: Waiting ${waitTime}ms for ${domain}`);
      await setTimeout(waitTime);
    }
    
    const task = tracker.queue.shift();
    
    try {
      // Execute the task
      tracker.requests++;
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      // Handle rate limiting
      if (error.response && error.response.status === 429) {
        console.log(`Rate limit exceeded for ${domain}. Increasing backoff to ${tracker.backoff}ms`);
        
        // Increase backoff with exponential backoff
        const limits = RATE_LIMITS[domain] || RATE_LIMITS.default;
        tracker.backoff = Math.min(
          limits.maxBackoff, 
          tracker.backoff === 0 ? limits.defaultBackoff : tracker.backoff * 2
        );
        
        // Re-queue the task
        tracker.queue.unshift(task);
      } else {
        task.reject(error);
      }
    }
    
    // Small delay between requests
    await setTimeout(300);
  }
  
  tracker.processing = false;
}

// Queue a request
async function queueRequest(url, requestFn) {
  const domain = getDomain(url);
  const tracker = initDomainTracking(domain);
  
  return new Promise((resolve, reject) => {
    // Add to queue
    tracker.queue.push({
      fn: requestFn,
      resolve,
      reject
    });
    
    // Start processing if not already
    processQueue(domain);
  });
}

// Retry a failed request with backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempts++;
      
      if (attempts > maxRetries) {
        throw error;
      }
      
      // Calculate backoff time
      const backoffTime = Math.min(30000, 1000 * Math.pow(2, attempts - 1));
      console.log(`Retry ${attempts}/${maxRetries} after ${backoffTime}ms backoff`);
      
      await setTimeout(backoffTime);
    }
  }
}

module.exports = {
  queueRequest,
  retryWithBackoff,
  getDomain,
  RATE_LIMITS
};