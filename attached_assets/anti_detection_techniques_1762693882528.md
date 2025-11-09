# Anti-Detection Techniques for Roblox API Access

## Overview
This document summarizes our research and techniques for avoiding rate limits and detection when accessing Roblox APIs to scan for PS99 assets.

## HTTP Request Enhancement Techniques

### Basic Techniques (Already Implemented)
1. **Custom User-Agent Headers**
   - Use legitimate browser User-Agent strings
   - Rotate between different browsers and versions
   - Example: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36`

2. **Proper Referer Headers**
   - Use matching referer headers based on the target domain
   - For asset thumbnails: `https://www.roblox.com/catalog`
   - For user profiles: `https://www.roblox.com/users`

3. **Rate Limiting with Jitter**
   - Base delay between requests (2-3 seconds for Roblox domains)
   - Add random jitter to avoid pattern detection
   - Calculate domain-specific delays based on response success/failure

4. **Exponential Backoff for Rate Limiting**
   - Start with small delay after failure
   - Exponentially increase delay after each failure
   - Add randomness to backoff period
   - Reset gradually after successes

### Advanced Techniques (PS99_Leak_Detector_Ultra)
1. **Browser Fingerprint Randomization**
   - Randomize Accept headers
   - Vary Connection and Content-Type headers
   - Randomize Accept-Language order
   - Vary Accept-Encoding options

2. **Request Pattern Diversification**
   - Random ordering of certain requests
   - Variable time delays between related requests 
   - Mix asset types in scanning sequences
   - Occasional requests to non-target assets

3. **Session Cookie Management**
   - Store and reuse cookies from successful sessions
   - Update cookies regularly to match normal browser behavior
   - Send appropriate cookie headers for different Roblox domains

4. **Header Order Randomization**
   - Vary the order of HTTP headers
   - Add optional browser-like headers occasionally
   - Remove certain headers randomly

## Library-Based Bypassing

### CloudScraper (Recommended)
- **Purpose**: Automatically bypass Cloudflare protection
- **Features**:
  - Browser emulation 
  - Automatic challenge solving
  - Cookie management
  - JavaScript execution
- **Implementation**: See `scanner_research/cloudscraper_implementation_guide.md`

### Selenium/Playwright (Alternative)
- **Purpose**: Full browser automation
- **Features**:
  - Complete browser environment
  - JavaScript execution
  - Real browser fingerprint
  - Automation of CAPTCHAs
- **Drawbacks**:
  - Slower performance
  - Higher resource usage
  - Requires browser installation

## Synapse-Level Anti-Detection

### Anti-Fingerprinting (Advanced)
- **TLS Fingerprint Randomization**
  - Customize TLS client hello messages
  - Vary cipher suites offered
  - Randomize TLS extensions
  - Alter signature algorithms

- **TCP/IP Fingerprinting Evasion**
  - Vary TCP window size
  - Randomize initial TTL values
  - Adjust TCP options order
  - Change IP ID generation

- **HTTP/2 Fingerprint Randomization**
  - Vary SETTINGS frame parameters
  - Randomize stream priorities
  - Adjust window update frequency
  - Customize HPACK dynamic table settings

### Network-Level Protection

- **IP Rotation**
  - Use multiple IP addresses for requests
  - Rotate on specific error codes
  - Implement residential proxy network connections
  - Distribute requests across IP ranges

- **Domain Fronting**
  - Route requests through CDNs
  - Use allowed domains as fronts
  - Leverage domain reputation differences

## Detection Avoidance Patterns

### Request Timing Patterns
- **Natural Browsing Patterns**
  - Variable delays between requests
  - Occasional long pauses
  - Bursts of activity followed by inactivity
  - Time-of-day appropriate behavior

- **Request Volume Control**
  - Limit requests per minute/hour
  - Implement daily scanning quotas
  - Use incremental scanning approaches
  - Prioritize high-value targets

### Defensive Measures
- **Response Analysis**
  - Track success/failure rates per domain
  - Monitor for pattern changes in responses
  - Detect signature changes in error formats
  - Adjust behavior based on response headers

- **Failure Handling**
  - Smart retries with increasing complexity
  - Graceful degradation when detecting increased security
  - Alternative data sources when primary sources block
  - Session abandonment when detection likely

## Implementation Status
- ✅ Basic User-Agent and Referer headers
- ✅ Basic rate limiting with jitter
- ✅ Exponential backoff for failures
- ✅ Socket timeout handling
- ✅ Enhanced error handling
- ⏳ CloudScraper integration (ready but not implemented)
- ❌ Advanced browser fingerprint randomization
- ❌ IP rotation
- ❌ Session cookie management