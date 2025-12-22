/**
 * Roblox API Proxy Service
 * 
 * Configurable proxy service with optional anti-detection features.
 * WARNING: Advanced bypass features may violate Roblox ToS. Use at your own risk.
 */

import crypto from 'crypto';

// Feature flags for bypass techniques
export interface ProxyConfig {
  enableBypass: boolean;           // Master toggle for all bypass features
  enableSessionRotation: boolean;  // Rotate browser sessions
  enableFakeCookies: boolean;      // Generate fake Roblox cookies
  enableHumanTiming: boolean;      // Add human-like delays
  enableCaching: boolean;          // Cache responses
  cacheTTL: number;               // Cache time-to-live (seconds)
  baseDelay: number;              // Base delay between requests (ms)
  maxRetries: number;             // Maximum retry attempts
  enableAuditLog: boolean;        // Log all requests for compliance
}

const DEFAULT_CONFIG: ProxyConfig = {
  enableBypass: false,             // DISABLED BY DEFAULT for legal safety
  enableSessionRotation: false,
  enableFakeCookies: false,
  enableHumanTiming: false,
  enableCaching: true,
  cacheTTL: 3600,
  baseDelay: 1000,
  maxRetries: 3,
  enableAuditLog: true,
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
];

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface BrowserSession {
  headers: Record<string, string>;
  cookies: Record<string, string>;
  lastUsed: number;
}

interface AuditLogEntry {
  timestamp: number;
  url: string;
  method: string;
  status: number | null;
  cached: boolean;
  sessionIndex: number;
  error?: string;
}

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recent)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    this.cache.delete(key);
    this.cache.set(key, value);

    // Remove oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

export class RobloxProxyService {
  private config: ProxyConfig;
  private cache = new LRUCache<string, CacheEntry>(1000);
  private sessions: BrowserSession[] = [];
  private currentSessionIndex = 0;
  private auditLog: AuditLogEntry[] = [];
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    cachedRequests: 0,
    rateLimitedRequests: 0,
    errors: 0,
  };

  constructor(config: Partial<ProxyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableBypass) {
      console.warn('⚠️  ROBLOX PROXY BYPASS ENABLED - This may violate Roblox ToS');
    }

    if (this.config.enableSessionRotation) {
      this.initializeSessions(8);
    }
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
    return {
      "User-Agent": this.randomChoice(USER_AGENTS),
      "Accept": "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "DNT": "1",
    };
  }

  private generateRobloxCookies(): Record<string, string> {
    if (!this.config.enableFakeCookies) {
      return {};
    }

    const now = Date.now();
    const daysAgo = Math.floor(this.random(1, 7));
    const timestamp = now - (daysAgo * 24 * 60 * 60 * 1000);

    return {
      "_rdt_uuid": this.generateUUID(),
      "RBXSource": `rbx_acquisition_time:${Math.floor(timestamp / 1000)},rbx_acquisition_referrer:https://www.google.com/,rbx_medium:Direct,rbx_source:Direct`,
      "RBXEventTrackerV2": `createDate:${Math.floor(timestamp / 1000)}&rbxid=&browserid=${this.generateUUID()}`,
    };
  }

  private initializeSessions(count: number): void {
    for (let i = 0; i < count; i++) {
      this.sessions.push({
        headers: this.generateBrowserFingerprint(),
        cookies: this.generateRobloxCookies(),
        lastUsed: 0,
      });
    }
  }

  private rotateSession(): BrowserSession {
    if (!this.config.enableSessionRotation || this.sessions.length === 0) {
      return {
        headers: { "User-Agent": USER_AGENTS[0] },
        cookies: {},
        lastUsed: Date.now(),
      };
    }

    this.currentSessionIndex = (this.currentSessionIndex + 1) % this.sessions.length;
    const session = this.sessions[this.currentSessionIndex];

    // Refresh fingerprint
    session.headers = this.generateBrowserFingerprint();

    // Refresh cookies occasionally
    if (Math.random() < 0.2) {
      session.cookies = this.generateRobloxCookies();
    }

    session.lastUsed = Date.now();
    return session;
  }

  private getCacheKey(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  private getFromCache(url: string): any | null {
    if (!this.config.enableCaching) {
      return null;
    }

    const key = this.getCacheKey(url);
    const cached = this.cache.get(key);

    if (cached && (Date.now() - cached.timestamp) <= this.config.cacheTTL * 1000) {
      this.stats.cachedRequests++;
      return cached.data;
    }

    return null;
  }

  private saveToCache(url: string, data: any): void {
    if (!this.config.enableCaching) {
      return;
    }

    const key = this.getCacheKey(url);
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async applyHumanTiming(): Promise<void> {
    if (!this.config.enableHumanTiming) {
      return;
    }

    // Base delay with jitter
    const delay = this.config.baseDelay + this.random(0, 500);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Occasionally add longer pause (10% chance)
    if (Math.random() < 0.10) {
      const longerDelay = this.random(2000, 4000);
      await new Promise(resolve => setTimeout(resolve, longerDelay));
    }
  }

  private logRequest(entry: AuditLogEntry): void {
    if (!this.config.enableAuditLog) {
      return;
    }

    this.auditLog.push(entry);

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
  }

  async get(url: string, _options: { cacheTTL?: number } = {}): Promise<any> {
    this.stats.totalRequests++;

    const cacheTTL = _options.cacheTTL ?? this.config.cacheTTL;
    console.log(`[Proxy] GET ${url} (TTL: ${cacheTTL}s)`);

    // Check cache
    const cached = this.getFromCache(url);
    if (cached !== null) {
      this.logRequest({
        timestamp: Date.now(),
        url,
        method: 'GET',
        status: 200,
        cached: true,
        sessionIndex: this.currentSessionIndex,
      });
      return cached;
    }

    // Apply timing delay
    await this.applyHumanTiming();

    // Get session
    const session = this.rotateSession();

    // Retry loop
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const headers = { ...session.headers };

        // Add cookies if enabled
        if (this.config.enableFakeCookies) {
          const cookieStr = Object.entries(session.cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ');
          if (cookieStr) {
            headers['Cookie'] = cookieStr;
          }
        }

        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(15000),
        });

        // Handle rate limiting
        if (response.status === 429) {
          this.stats.rateLimitedRequests++;

          const backoff = 2000 * Math.pow(2, attempt) + this.random(1000, 3000);
          console.warn(`Rate limited. Backing off for ${(backoff/1000).toFixed(1)}s...`);

          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }

        // Handle errors
        if (!response.ok) {
          if ([400, 403, 404].includes(response.status)) {
            this.stats.errors++;
            this.logRequest({
              timestamp: Date.now(),
              url,
              method: 'GET',
              status: response.status,
              cached: false,
              sessionIndex: this.currentSessionIndex,
              error: `HTTP ${response.status}`,
            });
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Retry server errors
          if (response.status >= 500) {
            const serverBackoff = 3000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, serverBackoff));
            continue;
          }
        }

        // Success
        if (response.ok) {
          this.stats.successfulRequests++;

          let data: any;
          const contentType = response.headers.get('content-type');

          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }

          this.saveToCache(url, data);

          this.logRequest({
            timestamp: Date.now(),
            url,
            method: 'GET',
            status: response.status,
            cached: false,
            sessionIndex: this.currentSessionIndex,
          });

          return data;
        }

      } catch (error: any) {
        this.stats.errors++;
        console.error(`Request error (attempt ${attempt + 1}/${this.config.maxRetries}):`, error.message);

        if (attempt === this.config.maxRetries - 1) {
          this.logRequest({
            timestamp: Date.now(),
            url,
            method: 'GET',
            status: null,
            cached: false,
            sessionIndex: this.currentSessionIndex,
            error: error.message,
          });
          throw error;
        }

        const errorBackoff = 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, errorBackoff));
      }
    }

    throw new Error(`Failed to fetch ${url} after ${this.config.maxRetries} attempts`);
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : '0%',
      cacheHitRate: this.stats.totalRequests > 0
        ? ((this.stats.cachedRequests / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : '0%',
      activeSessions: this.sessions.length,
      cacheSize: this.cache.size,
      config: this.config,
    };
  }

  getAuditLog(): AuditLogEntry[] {
    return [...this.auditLog];
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton with FULL BYPASS ENABLED