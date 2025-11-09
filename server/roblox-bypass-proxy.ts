/**
 * Roblox API Bypass Proxy
 * 
 * Advanced anti-detection proxy implementing techniques from professional Roblox scanners:
 * - 8 rotating browser sessions with unique fingerprints
 * - Randomized headers and User-Agents
 * - Fake Roblox cookies for legitimacy
 * - Exponential backoff with jitter
 * - Request caching to minimize API calls
 * - Human-like timing patterns (1-2.5s + occasional longer pauses)
 * - Domain-specific rate limiting
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// User-Agent pool (from scanner files)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.66",
  "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
];

const ACCEPT_HEADERS = [
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
];

const ACCEPT_LANGUAGES = [
  "en-US,en;q=0.9",
  "en-US,en;q=0.8",
  "en-GB,en;q=0.9",
  "en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7",
  "en-AU,en;q=0.9",
];

interface BrowserSession {
  headers: Record<string, string>;
  cookies: Record<string, string>;
  lastUsed: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface DomainStats {
  lastRequest: number;
  backoffLevel: number;
  requestCount: number;
  rateLimitCount: number;
}

class RobloxBypassProxy {
  private sessions: BrowserSession[] = [];
  private currentSessionIndex = 0;
  private cache = new Map<string, CacheEntry>();
  private domainStats = new Map<string, DomainStats>();
  private cacheDir = path.join(process.cwd(), '.roblox-cache');
  
  // Statistics
  private totalRequests = 0;
  private successfulRequests = 0;
  private rateLimitedRequests = 0;
  private cachedRequests = 0;

  constructor() {
    this.initializeSessions();
    this.initializeCache();
  }

  private random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }

  private generateBrowserFingerprint(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": this.randomChoice(USER_AGENTS),
      "Accept": this.randomChoice(ACCEPT_HEADERS),
      "Accept-Language": this.randomChoice(ACCEPT_LANGUAGES),
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
      "DNT": "1",
      "Pragma": "no-cache",
    };

    // Add Sec-Fetch headers
    headers["Sec-Fetch-Dest"] = "document";
    headers["Sec-Fetch-Mode"] = "navigate";
    headers["Sec-Fetch-Site"] = "none";
    headers["Sec-Fetch-User"] = "?1";

    // Add Chrome client hints (50% chance)
    if (Math.random() < 0.5) {
      headers["Sec-CH-UA"] = '"Google Chrome";v="95", "Chromium";v="95", ";Not A Brand";v="99"';
      headers["Sec-CH-UA-Mobile"] = Math.random() < 0.5 ? "?1" : "?0";
      headers["Sec-CH-UA-Platform"] = this.randomChoice(['"Windows"', '"macOS"', '"Linux"', '"Android"', '"iOS"']);
    }

    return headers;
  }

  private generateRobloxCookies(): Record<string, string> {
    const now = Date.now();
    const daysAgo = Math.floor(this.random(1, 7));
    const timestamp = now - (daysAgo * 24 * 60 * 60 * 1000);

    const cookies: Record<string, string> = {
      "_rdt_uuid": this.generateUUID(),
      [`rbx_ip_${Math.floor(this.random(100000, 999999))}`]: `192.168.${Math.floor(this.random(1, 255))}.${Math.floor(this.random(1, 255))}`,
      "RBXSource": `rbx_acquisition_time:${Math.floor(timestamp / 1000)},rbx_acquisition_referrer:https://www.google.com/,rbx_medium:Direct,rbx_source:Direct`,
      "RBXEventTrackerV2": `createDate:${Math.floor(timestamp / 1000)}&rbxid=&browserid=${this.generateUUID()}`,
    };

    // Add additional cookies (30% chance)
    if (Math.random() < 0.3) {
      cookies["RBXSessionTracker"] = this.generateUUID();
      cookies["RBXImageCache"] = Math.floor(this.random(1000000, 9999999)).toString();
      cookies["RBXLocale"] = "en_us";
      cookies["RBXMarketing"] = Math.floor(now / 1000).toString();
    }

    return cookies;
  }

  private initializeSessions(): void {
    // Create 8 different browser sessions
    for (let i = 0; i < 8; i++) {
      this.sessions.push({
        headers: this.generateBrowserFingerprint(),
        cookies: this.generateRobloxCookies(),
        lastUsed: 0,
      });
    }
  }

  private async initializeCache(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }

  private rotateSession(): BrowserSession {
    // Rotate to next session
    this.currentSessionIndex = (this.currentSessionIndex + 1) % this.sessions.length;
    const session = this.sessions[this.currentSessionIndex];
    
    // Refresh fingerprint
    session.headers = this.generateBrowserFingerprint();
    
    // Refresh cookies occasionally (20% chance)
    if (Math.random() < 0.2) {
      session.cookies = this.generateRobloxCookies();
    }
    
    session.lastUsed = Date.now();
    return session;
  }

  private getCacheKey(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  private async getFromCache(url: string, maxAge: number): Promise<any | null> {
    const key = this.getCacheKey(url);
    const cached = this.cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) <= maxAge * 1000) {
      this.cachedRequests++;
      return cached.data;
    }
    
    // Try file cache
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const fileCache = JSON.parse(content);
      
      if (fileCache && (Date.now() - fileCache.timestamp) <= maxAge * 1000) {
        this.cache.set(key, fileCache);
        this.cachedRequests++;
        return fileCache.data;
      }
    } catch {
      // File cache miss
    }
    
    return null;
  }

  private async saveToCache(url: string, data: any): Promise<void> {
    const key = this.getCacheKey(url);
    const entry: CacheEntry = { data, timestamp: Date.now() };
    
    this.cache.set(key, entry);
    
    // Also save to file
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
    } catch (error) {
      console.error('Failed to save cache to file:', error);
    }
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  private async randomizeTimingDelay(): Promise<void> {
    // Basic human-like pause (1-2.5 seconds)
    const baseDelay = this.random(1000, 2500);
    await new Promise(resolve => setTimeout(resolve, baseDelay));
    
    // Occasionally add longer pause (15% chance for 3-7 seconds)
    if (Math.random() < 0.15) {
      const longerDelay = this.random(3000, 7000);
      await new Promise(resolve => setTimeout(resolve, longerDelay));
    }
    
    // Very rarely add very long pause (2% chance for 15-30 seconds)
    if (Math.random() < 0.02) {
      const veryLongDelay = this.random(15000, 30000);
      await new Promise(resolve => setTimeout(resolve, veryLongDelay));
    }
  }

  private getDomainStats(domain: string): DomainStats {
    if (!this.domainStats.has(domain)) {
      this.domainStats.set(domain, {
        lastRequest: 0,
        backoffLevel: 0,
        requestCount: 0,
        rateLimitCount: 0,
      });
    }
    return this.domainStats.get(domain)!;
  }

  private async applyDomainRateLimit(domain: string): Promise<void> {
    const stats = this.getDomainStats(domain);
    const now = Date.now();
    const timeSinceLastRequest = now - stats.lastRequest;
    
    // Base delay for Roblox domains (2-3 seconds)
    let delay = domain.includes('roblox.com') || domain.includes('rbxcdn.com') 
      ? this.random(2000, 3000) 
      : this.random(500, 1500);
    
    // Apply backoff multiplier
    delay *= (1 + stats.backoffLevel);
    
    // Add jitter (10% variance)
    const jitter = delay * 0.1;
    delay += this.random(-jitter, jitter);
    
    // Ensure minimum time between requests
    if (timeSinceLastRequest < delay) {
      const waitTime = delay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    stats.lastRequest = Date.now();
    stats.requestCount++;
  }

  async get(url: string, options: { useCache?: boolean; cacheTTL?: number; maxRetries?: number } = {}): Promise<any> {
    const { useCache = true, cacheTTL = 3600, maxRetries = 5 } = options;
    
    this.totalRequests++;
    
    // Check cache first
    if (useCache) {
      const cached = await this.getFromCache(url, cacheTTL);
      if (cached !== null) {
        return cached;
      }
    }
    
    const domain = this.extractDomain(url);
    
    // Apply human-like timing
    await this.randomizeTimingDelay();
    
    // Apply domain-specific rate limiting
    await this.applyDomainRateLimit(domain);
    
    // Retry loop with exponential backoff
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const session = this.rotateSession();
      
      // Add jitter between retries
      if (attempt > 0) {
        const retryJitter = this.random(500, 2000);
        await new Promise(resolve => setTimeout(resolve, retryJitter));
      }
      
      try {
        // Build headers with session fingerprint
        const headers = { ...session.headers };
        
        // Add cookies as Cookie header
        const cookieStr = Object.entries(session.cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
        if (cookieStr) {
          headers['Cookie'] = cookieStr;
        }
        
        // Set appropriate Referer based on domain
        if (domain.includes('catalog.roblox.com')) {
          headers['Referer'] = 'https://www.roblox.com/catalog';
        } else if (domain.includes('thumbnails.roblox.com')) {
          headers['Referer'] = 'https://www.roblox.com/games';
        } else if (domain.includes('roblox.com')) {
          headers['Referer'] = 'https://www.roblox.com/';
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(15000),
        });
        
        const stats = this.getDomainStats(domain);
        
        // Handle rate limiting (429)
        if (response.status === 429) {
          this.rateLimitedRequests++;
          stats.rateLimitCount++;
          stats.backoffLevel = Math.min(stats.backoffLevel + 1, 5);
          
          const backoffTime = 2000 * Math.pow(2, attempt) + this.random(2000, 5000);
          console.warn(`Rate limited on ${domain}. Backing off for ${(backoffTime/1000).toFixed(1)}s...`);
          
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        
        // Handle other errors
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) {
            // Client error - don't retry most
            if ([400, 403, 404].includes(response.status)) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          }
          
          if (response.status >= 500) {
            // Server error - retry with backoff
            const serverBackoff = 5000 * Math.pow(2, attempt) + this.random(0, 5000);
            await new Promise(resolve => setTimeout(resolve, serverBackoff));
            continue;
          }
        }
        
        // Success!
        if (response.ok) {
          this.successfulRequests++;
          
          // Gradually reduce backoff on success
          if (stats.backoffLevel > 0) {
            stats.backoffLevel = Math.max(0, stats.backoffLevel - 0.5);
          }
          
          let data: any;
          const contentType = response.headers.get('content-type');
          
          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }
          
          // Cache successful response
          await this.saveToCache(url, data);
          
          return data;
        }
        
      } catch (error: any) {
        console.error(`Request error (attempt ${attempt + 1}/${maxRetries}):`, error.message);
        
        const errorBackoff = 2000 * Math.pow(2, attempt) + this.random(0, 2000);
        await new Promise(resolve => setTimeout(resolve, errorBackoff));
      }
    }
    
    throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
  }

  getStats() {
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      cachedRequests: this.cachedRequests,
      rateLimitedRequests: this.rateLimitedRequests,
      successRate: this.totalRequests > 0 
        ? ((this.successfulRequests / this.totalRequests) * 100).toFixed(1) + '%'
        : '0%',
      activeSessions: this.sessions.length,
      cachedUrls: this.cache.size,
    };
  }
}

// Export singleton instance
export const robloxProxy = new RobloxBypassProxy();
