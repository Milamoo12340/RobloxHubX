# Research on Roblox API rate limiting bypass techniques
## Common techniques found in Hyperium scanner files:
1. Browser fingerprint rotation
2. Request throttling with jitter
3. IP rotation via proxy
4. User-agent cycling
5. Referrer spoofing
6. Session cookie management
7. Request pattern diversification
8. Exponential backoff for rate limits
## Known effective anti-detection methods:
1. **Dynamic delays between requests** - Varying the time between requests to avoid patterns
2. **Request distribution** - Dividing requests among multiple identities
3. **Browser simulation** - Using headless browsers for certain requests
4. **Cloudflare bypass techniques** - Special headers and behaviors to bypass Cloudflare protection
5. **Request batching** - Grouping requests with natural intervals
6. **Cache utilization** - Reducing duplicate requests with intelligent caching
7. **Proxy rotation** - Using different IP addresses for requests
8. **Authentication token handling** - Proper cookie and session management
## Integration plan for PS99 Leak Detector:
1. Extract and integrate the browser fingerprint rotation code from Hyperium scanner
2. Implement the exponential backoff strategy with jitter for 429 responses
3. Add request distribution across multiple simulated identities
4. Incorporate the advanced cookie and session management system
5. Add intelligent request batching with varied intervals
6. Implement request throttling based on response patterns
7. Add proper HTTP header normalization to appear legitimate
8. Create a unified scan coordinator to manage all scanning resources
