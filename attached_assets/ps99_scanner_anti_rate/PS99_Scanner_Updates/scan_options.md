# PS99 Scanner Options

## Scan Settings to Reduce Rate Limiting

The following scan settings can be adjusted to reduce rate limiting issues:

### Initial Settings
```python
# Current settings
SCAN_INTERVAL = 12 * 60 * 60  # 12 hours
REQUEST_DELAY = 0.5  # 0.5 seconds between requests
MAX_RETRIES = 3  # Number of retries for failed requests
```

### Recommended Settings
```python
# Recommended settings to reduce rate limiting
SCAN_INTERVAL = 12 * 60 * 60  # Keep 12 hours interval
REQUEST_DELAY = 2.0  # Increase to 2 seconds between requests
REQUEST_JITTER = 1.0  # Add random jitter up to 1 second
MAX_RETRIES = 5  # Increase retries
BATCH_SIZE = 5  # Process requests in batches of 5
BATCH_DELAY = 10  # Wait 10 seconds between batches
MAX_CONCURRENT = 2  # Maximum concurrent requests
```

## Scan Modes

Adding different scan modes can help control resource usage and avoid rate limiting:

```python
# Scan modes
SCAN_MODE_FULL = "full"        # Scan all developers, groups, and games
SCAN_MODE_LIMITED = "limited"  # Scan only high-priority developers (Preston, ChickenEngineer)
SCAN_MODE_GROUPS = "groups"    # Scan only groups
SCAN_MODE_GAMES = "games"      # Scan only games
SCAN_MODE_MANUAL = "manual"    # Manual scan of specific IDs
SCAN_MODE_RECENT = "recent"    # Focus on assets created in the past 48 hours
```

## Developer Prioritization

Not all developers update assets at the same frequency. We can prioritize scanning:

```python
# High-priority developers (scanned first and more frequently)
HIGH_PRIORITY_DEVELOPERS = [
    1547685,   # Preston (Founder)
    1493409,   # Isaac (BuildIntoGames)
    31370263,  # ChickenEngineer
    13365322,  # THUNDERBOLT
]

# Medium-priority developers (scanned regularly)
MEDIUM_PRIORITY_DEVELOPERS = [
    27902978,  # Scriptmatic
    27743246,  # Dukki
    124094,    # Telanthric
    18665593,  # Cutlass
    116559,    # iWasAMellon
    2033432,   # Merely
]

# Low-priority developers (scanned less frequently)
LOW_PRIORITY_DEVELOPERS = [
    # Rest of the developers
]
```

## Group Prioritization

```python
# High-priority groups
HIGH_PRIORITY_GROUPS = [
    2703304,   # BIG Games (Main group)
    5060810,   # BIG Games Pets
    4981455,   # BIG Testing
]

# Medium-priority groups
MEDIUM_PRIORITY_GROUPS = [
    15038815,  # BIG Games Super Fun
    14078260,  # BIG Games Magic Forest
    16284024,  # BIG Games Fishing
]
```

## Implementation Recommendations

1. Implement tiered scanning with different priorities
2. Add proper delays between requests and batches
3. Use exponential backoff for rate limited requests
4. Implement multiple scanning sessions with different identities
5. Focus on detecting and handling rate limiting early
