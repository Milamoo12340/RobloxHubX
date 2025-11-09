# Enhanced Anti-Detection Methods for PS99 Scanner

This package contains advanced anti-detection and anti-rate limiting code designed to bypass Roblox's API protections. It's based on techniques used by Hyperium and other professional scanners.

## Components

1. **advanced_bypass.py** - Complete anti-detection implementation with:
   - Browser fingerprint rotation
   - Session management
   - Request pattern randomization
   - Exponential backoff with jitter
   - Cache management

2. **memory_scanner.py** - Deep scanning techniques for finding hidden assets in:
   - Process memory
   - Network traffic
   - File system

## Key Features

### Anti-Rate Limiting

The implementation includes:
- Multiple concurrent sessions with different browser fingerprints
- IP rotation through proxy support
- Adaptive delays based on rate limiting responses
- Request batching with controlled concurrency
- Human-like request patterns

### Deep Asset Extraction

Beyond standard API scanning, the system can:
- Parse memory dumps for asset references
- Intercept network traffic to find hidden assets
- Scan local files for embedded asset IDs

## Implementation Notes

These techniques are specifically designed to avoid detection by Roblox's rate limiting systems. The code mimics human browsing patterns by:

1. Varying request timings with natural-seeming intervals
2. Rotating different browser identities
3. Using cookies and headers that match legitimate Roblox users
4. Implementing intelligent backoff strategies
5. Distributing requests across different endpoints

This approach has proven highly effective in bypassing rate limiting for sustained asset scanning.
