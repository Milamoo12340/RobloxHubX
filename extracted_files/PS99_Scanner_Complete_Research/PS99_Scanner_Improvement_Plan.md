# PS99 Scanner Improvement Plan
## Current Scanner Issues

1. **Incorrect Developer IDs**: Many of the developer IDs being tracked are not verified BIG Games developers
2. **Rate Limiting Problems**: Scanner is experiencing constant HTTP 429 (Too Many Requests) errors
3. **403/400 Errors**: Many requests are being blocked with Forbidden (403) or Bad Request (400) errors
4. **Web Domain Integration Errors**: Attempts to fetch IDs from web domain are failing with 404 errors
5. **Anti-Detection Issues**: Current anti-detection methods are not effective against Roblox API rate limiting

## Confirmed BIG Games Developers

The following developers are actually associated with BIG Games/Pet Simulator 99:

1. 1547685 - Preston (Founder of BIG Games)
2. 1493409 - Isaac/BuildIntoGames (Lead Developer)
3. 31370263 - ChickenEngineer (Developer)
4. 13365322 - THUNDERBOLT (Developer)
5. 27902978 - Scriptmatic (Developer)
6. 27743246 - Dukki (Developer) 
7. 124094 - Telanthric (Developer)
8. 18665593 - Cutlass (Developer)
9. 116559 - iWasAMellon (Developer)

## Confirmed BIG Games Groups

The following groups are actually associated with BIG Games/Pet Simulator 99:

1. 2703304 - BIG Games (Main developer group)
2. 5060810 - BIG Games Pets (Pet-focused content)
3. 4981455 - BIG Testing (Test builds and beta content)
4. 15038815 - BIG Games Super Fun (Additional content)

## Proposed Scanner Improvements

1. **Developer/Group ID Cleanup**:
   - Remove unverified developer IDs that aren't actually BIG Games staff
   - Focus scanning on confirmed BIG Games developers and groups
   
2. **Anti-Rate Limiting Improvements**:
   - Implement browser fingerprint rotation from Hyperium scanner
   - Add exponential backoff with jitter for 429 responses
   - Create randomized request delays to avoid detection patterns
   
3. **Asset Display Enhancements**:
   - Improve how assets are displayed and organized
   - Add developer name, creation date, and asset ID to each leak
   - Include direct image preview for found assets
   - Organize by keyword categories (Egypt, Anubis, etc.)
   
4. **Scanning Optimization**:
   - Batch requests with intelligent timing
   - Implement proper session management
   - Add browser identity rotation
   - Include proper request headers to appear legitimate

## Keywords for Update 55 (Egypt/Anubis)

- Primary: Anubis, Egypt, Pyramid, Pharaoh, Desert, Sarcophagus, Mummy, Sphinx
- Secondary: Ancient, Egyptian, Tomb, Treasure, Gold, Scarab, Ankh
