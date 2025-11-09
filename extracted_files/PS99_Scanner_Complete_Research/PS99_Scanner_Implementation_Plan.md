# PS99 Scanner Implementation Plan
## Phase 1: Developer/Group ID Cleanup

### Changes to Make:
1. **Update developer ID list** to include ONLY verified BIG Games developers:
   ```python
   DEVELOPER_IDS = [
       1547685,  # Preston (Founder)
       1493409,  # Isaac (BuildIntoGames)
       31370263, # ChickenEngineer
       13365322, # THUNDERBOLT
       27902978, # Scriptmatic
       27743246, # Dukki
       124094,   # Telanthric
       18665593, # Cutlass
       116559,   # iWasAMellon
   ]
   ```

2. **Update group ID list** to include ONLY verified BIG Games groups:
   ```python
   GROUP_IDS = [
       2703304,  # BIG Games
       5060810,  # BIG Games Pets
       4981455,  # BIG Testing
       15038815, # BIG Games Super Fun
   ]
   ```

3. **Update game ID list** to focus on Pet Simulator 99 and related games:
   ```python
   GAME_IDS = [
       8737899170,  # Pet Simulator 99
       # Add other confirmed BIG Games games here
   ]
   ```

## Phase 2: Anti-Rate Limiting Implementation

### Techniques to Integrate from Hyperium:
1. **Browser Fingerprint Rotation**:
   - Extract and use Hyperium's fingerprint rotation code
   - Implement user-agent cycling
   - Add proper header management

2. **Request Timing Optimization**:
   - Add exponential backoff for 429 errors
   - Implement randomized delays between requests
   - Create dynamic jitter to avoid patterns

3. **Session Management**:
   - Implement proper cookie handling
   - Add session rotation
   - Manage authentication tokens

## Phase 3: Asset Display Enhancement

### Improvements:
1. **Create standardized asset display format**:
   ```python
   def display_asset(asset_data):
       """
       Display an asset with comprehensive information.
       """
       asset_info = f"""
       ★★★ POTENTIAL UPDATE ASSET FOUND ★★★
       Name: {asset_data['name']}
       ID: {asset_data['id']}
       Created by: {asset_data['creator_name']} (ID: {asset_data['creator_id']})
       Created on: {asset_data['created']}
       Asset URL: https://www.roblox.com/catalog/{asset_data['id']}
       Preview URL: {asset_data['thumbnail_url']}
       Keywords matched: {', '.join(asset_data['matched_keywords'])}
       """
       logger.info(asset_info)
       
       # Save asset image locally
       save_asset_image(asset_data['id'], asset_data['thumbnail_url'])
       
       # Add to discovered assets database
       add_to_discovered_assets(asset_data)
   ```

2. **Improve asset verification**:
   - Implement the verification process documented in PS99_Asset_Verification_Process.md
   - Add metadata extraction
   - Create proper asset image handling

## Phase 4: Implementation of Hyperium-level Anti-Detection

### Code Integration:
1. **Extract and adapt the following techniques**:
   - Browser fingerprint rotation code
   - Dynamic request timing
   - Header normalization
   - Cookie management
   
2. **Add coordinated scanning**:
   - Implement smart batch request handling
   - Create scanning coordinator to manage resources
   - Add proper error handling and recovery

## Testing and Deployment Plan

1. Test each phase separately before integration
2. Verify proper developer tracking is working
3. Confirm rate limiting has been significantly reduced
4. Test asset discovery and verification process
5. Create test reports for your review
