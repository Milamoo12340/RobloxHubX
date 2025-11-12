"""
Enhanced Scanner Configuration for PS99 Developer Tracker

This module contains the configuration for the comprehensive Roblox asset scanner,
including the list of monitored sources, keyword patterns, and scanner settings.
"""

import random
import os

# Core scanner configuration
SCAN_INTERVAL = 43200  # 12 hours in seconds

# User's web domain for pulling user IDs and handling internet functions
USER_WEB_DOMAIN = os.environ.get("USER_WEB_DOMAIN", "https://ps99-asset-tracker.replit.app")
USE_WEB_DOMAIN_FALLBACK = True  # Use web domain as fallback when Roblox links throw errors

# Key BIG Games and PS99 developers to monitor
DEVELOPER_IDS = [
    689004,  # lala00 (Moderator)
    1210210,  # ForeverDev (Developer)
    1533791,  # CLANKBOT (Tester in BIG Games Pets)
    3132860,  # tornadotube (Tester in BIG Games Pets)
    5955626,  # goliate200 (Moderator)
    7707349,  # JamienChee (Developer)
    9290799,  # mariodylan (Tester in BIG Games Pets)
    13365322,  # chickenputty (Developer)
    19717956,  # BuildIntoGames (Owner)
    30236088,  # CaptnChillie (Admin)
    35626336,  # Vrylx (Tester in BIG Games Pets)
    40222641,  # Coylist (Community Manager)
    51579833,  # Vhankii (Moderator)
    55856182,  # CutiePhoenixx (Moderator)
    63844404,  # Aspernator (Developer)
    88000021,  # Cheena_Cheena (Moderator)
    97533948,  # tasdanop (Moderator)
    97577763,  # HeyDudeWheresTheFood (Moderator)
    100984526,  # alessaarules (Developer)
    106492189,  # SSSpencer413 (Tester in BIG Games Pets)
    108274275,  # VeroFiedOnRBLX (Moderator)
    158564108,  # StayingCosy (Admin)
    163214036,  # SunnyRain13 (Admin)
    173184370,  # Semwichh (Moderator)
    204796674,  # JSteezy_80 (Moderator)
    263277049,  # Seebass404 (Tester in BIG Games Pets)
    306054023,  # Tehh_Snipe (Moderator)
    322878855,  # ArcticWolf2409 (Tester in BIG Games Pets)
    338264673,  # zliec (Moderator)
    343002125,  # vAIaraz (Moderator)
    377960069,  # Turtlepla (Tester in BIG Games Pets)
    381467201,  # xl_BILAL (Moderator)
    384512989,  # Dwiz181 (Moderator)
    408110089,  # PapaReload (Moderator)
    438824244,  # JStevens688 (Moderator)
    509200510,  # WildPhoenixx (Admin)
    525956098,  # TheRealNixxiex3 (Community Manager)
    552292750,  # slendergad (Moderator)
    569066313,  # Lady_Vythika (Moderator)
    597663806,  # 0xabcdef1234 (Roblox QA in BIG Games Pets)
    609666938,  # cjwunder12345 (Moderator)
    653248807,  # BuildIntoGamesDuo (Tester in BIG Games Pets)
    660900011,  # BuildIntoGamesTrio (Tester in BIG Games Pets)
    665342225,  # cutesquishylove (Admin)
    720991157,  # forthyse (Moderator)
    924758496,  # nvllvoid (Moderator)
    1235478980,  # ForeverDevAlt (Tester in BIG Games Pets)
    1339524447,  # SCHIZELpops_Official (Moderator)
    1427578558,  # XsoutherncityX (Moderator)
    1469707573,  # londonabbysworld (Moderator)
    1569334068,  # DevelopmentDeadline (Roblox QA in BIG Games Pets)
    1628829780,  # MintyUltra (Roblox QA in BIG Games Pets)
    1657957717,  # Pusheenkitty327 (Moderator)
    1692690604,  # now_bat (Moderator)
    1719926901,  # KarmaKlubPSX (Moderator)
    1744502396,  # MayorJRay (Tester in BIG Games Pets)
    1784060946,  # ZambieTheBoolean (Developer)
    1909623504,  # YoExile (Developer)
    1934497922,  # DerpyMcDerpz (Tester in BIG Games Pets)
    2024206579,  # WheretIB (Roblox QA in BIG Games Pets)
    2024717530,  # admack_attack (Moderator)
    2213470865,  # CoderConner (Developer)
    2222470178,  # CharlieGordonnn (Roblox QA in BIG Games Pets)
    2431980881,  # BloxOnNatty (Tester in BIG Games Pets)
    2435772479,  # StaceFace1220 (Moderator)
    2704477372,  # TheHeroUnsung (Tester in BIG Games Pets)
    2833994663,  # bat2tech (Moderator)
    2856041991,  # unxied (Moderator)
    2878290231,  # CoderMitchell (Developer)
    2880286252,  # spiffyproe (Admin)
    2882755487,  # CoderJoey (Developer)
    2905008042,  # SuperDave6502 (Roblox QA in BIG Games Pets)
    2917461919,  # NotCoderMitchell (Tester in BIG Games Pets)
    2936917022,  # svyosh1 (Admin)
    2979263683,  # kaightx (Moderator)
    3080839660,  # DawnCorleone53 (Moderator)
    3248605108,  # TylorOnRBLX (Moderator)
    3349906104,  # Silvah_CHUD (Tester in BIG Games Pets)
    3358961185,  # z1xzaxz1x (Roblox QA in BIG Games Pets)
    3381323695,  # FoxxOnRobloxx (Moderator)
    3679632298,  # FuzzyPumpkinRat (Tester in BIG Games Pets)
    3687735502,  # apricottoasterr (Developer)
    3808531078,  # DoughnutLordAlt (Tester in BIG Games Pets)
    3856278446,  # Synchiron1 (Moderator)
    3983340648,  # CoderTony (Developer)
    3986724533,  # Haru_Kida (Moderator)
    4036284588,  # VeroFied_ALT (Tester in BIG Games Pets)
    4099964409,  # Irishkerr (Moderator)
    4136009433,  # 11VertigoXo (Moderator)
    4225037968,  # swimmingmonkeycat (Tester in BIG Games Pets)
    4249670056,  # rigtoni09 (Tester in BIG Games Pets)
    4296407906,  # Rwinrox2 (Tester in BIG Games Pets)
    4327419461,  # VeroFiedTrades (Moderator)
    4391694536,  # CoderTonyAlt (Tester in BIG Games Pets)
    4441146554,  # Zeion97 (Moderator)
    4458730567,  # Thereal_kitty88 (Moderator)
    4485322343,  # SuperSkilledWolf (Moderator)
    4671090285,  # Pyr0fanat1c (Manager)
    4682698602,  # stargofaln4 (Tester in BIG Games Pets)
    4783898398,  # BIGTestDev1 (Tester in BIG Games Pets)
    4783901035,  # BIGTestDev2 (Tester in BIG Games Pets)
    4783905969,  # BIGTestDev3 (Tester in BIG Games Pets)
    4783911052,  # BIGTestDev4 (Tester in BIG Games Pets)
    4783917166,  # BIGTestDev5 (Tester in BIG Games Pets)
    4783917429,  # BIGTestDev6 (Tester in BIG Games Pets)
    4783922283,  # BIGTestDev7 (Tester in BIG Games Pets)
    4783925444,  # BIGTestDev8 (Tester in BIG Games Pets)
    4783934990,  # BIGTestDev9 (Tester in BIG Games Pets)
    4783963666,  # BIGTestDev10 (Tester in BIG Games Pets)
    4853463602,  # Not_Cheena (Moderator)
    4901423253,  # darkcoconutty (Moderator)
    5132764076,  # CN_Lioness (Tester in BIG Games Pets)
    5199941972,  # AriiStarlex (Tester in BIG Games Pets)
    5247510953,  # tony_compilex (Developer in BIG Games Pets)
    5263549932,  # ForeverDevGf (Tester in BIG Games Pets)
    5328749184,  # Officer_Billynoob (Admin)
    5337788472,  # LovingOneAnother (Tester in BIG Games Pets)
    5475866834,  # thebeansburrito (Tester in BIG Games Pets)
    5484790244,  # CONSOLEISREALFUN (Tester in BIG Games Pets)
    5630173987,  # ExcessSlayer2 (Tester in BIG Games Pets)
    7033855884,  # Some1GetHer (Tester in BIG Games Pets)
    7078420815,  # gatorade0077 (Tester in BIG Games Pets)
    7096243673,  # zeion97fuzzyalt (Moderator)
    7354770883,  # Swiftyfive0 (Tester in BIG Games Pets)
    7363836747,  # MrcompetitivePlays (Moderator)
    7364659264,  # ReloadTrades (Tester in BIG Games Pets)
    7444174954,  # happyorange1812 (Tester in BIG Games Pets)
    7687206585,  # SemwichhAlt (Moderator)
    7687226821,  # DefNotWildPhoenixx (Moderator)
    7841769174,  # NoPartyThisTimeAlt (Tester in BIG Games Pets)
    7842393931,  # not_jsteezy80 (Tester in BIG Games Pets)
    7900977804,  # iincxypoo (Tester in BIG Games Pets)
    8019040622,  # washboardannoyance (Tester in BIG Games Pets)
    8019042575,  # videkoga (Tester in BIG Games Pets)
    8019054076,  # FunnelPies (Tester in BIG Games Pets)
    8019070609,  # brokepufferfish (Tester in BIG Games Pets)
    8019079087,  # TwoCrowsWalkIntoABar (Tester in BIG Games Pets)
    8023369079,  # ElizabethEh_Tester (Tester in BIG Games Pets)
    8026220958,  # ConstructionMan187 (Tester in BIG Games Pets)
    8038398625,  # BigSkyNomad (Tester in BIG Games Pets)
    8070153482,  # nullbein (Tester in BIG Games Pets)
    8070266484,  # DidNotLoseGymShorts (Tester in BIG Games Pets)
    8071013906,  # PotatoLegChair (Tester in BIG Games Pets)
    8132573809,  # vcybTH6AMNv (Roblox QA in BIG Games Pets)
    8310962419,  # Aus_Adamm (Tester in BIG Games Pets)
]

# BIG Games group IDs to monitor
GROUP_IDS = [
    3959677,   # BIG Games Official Group
    2703304,   # Big Games Testing
    5060810,   # BIG Games Staff
    35517943,  # Unbreakables™
    4981455,   # Egg Simulator Games
    10026748,  # Big Games Fangroup
    9950771,   # Project 99
    4625640,   # World // Zero
    8287292,   # Maple Studios  
    7209850,   # BIG Games Development
    14078260,  # Pet Simulator X
    15038815,  # Pet Simulator 99
    16284024,  # PS99 Community
    14398517,  # Slime Tycoon Community
    11396125,  # Big Games Alpha Testers
    10425923,  # BG Dev Team
]

# PS99 related game IDs to monitor
GAME_IDS = [
    8737899170,  # Pet Simulator 99
    15125223110, # Slime Tycoon
    8660488891,  # Mining Simulator 2
    9380307809,  # Pet Simulator X 2 Testing
    7232099788,  # PS4 Testing
    9238340920,  # PS99 Alpha
    15023681514, # Slime Tycoon [DEV]
    14503047254, # PS99 Development
    13775113583, # PS99 Internal Testing
    15487625518, # BIG Games Update Test
    14684933503, # PS99 Events Test
    15874362087, # PS99 Next Update
    12659100044, # PS99 Feature Test
    13968487203, # PS99 Anubis Test
    16048572313, # Secret Testing Place
    15687349250, # Pet Development Grounds
    12986468140, # Hidden Assets Testing
    14579264570, # BG Upcoming Features
    13458761920, # Slime Factory Development
    8139241721,  # Big Games // Testing Site
]

# Roblox Studio sources to monitor
STUDIO_SOURCES = [
    "Published Assets",
    "Marketplace",
    "Creator Hub",
    "Toolbox",
    "Library",
    "Creator Store",
    "Featured Items",
    "Best Selling",
    "Recently Updated",
    "New Releases"
]

# Asset types to monitor (both singular and plural forms)
ASSET_TYPES = [
    "pet", "pets",
    "egg", "eggs", 
    "hat", "hats",
    "update", "updates",
    "weapon", "weapons",
    "treasure", "treasures",
    "tool", "tools",
    "animation", "animations",
    "furniture", "accessories",
    "area", "areas",
    "gamepass", "gamepasses",
    "gem", "gems",
    "coin", "coins",
    "enchant", "enchants", "enchantment", "enchantments",
    "slime", "slimes",
    "trophy", "trophies",
    "chest", "chests",
    "pickaxe", "pickaxes",
    "rock", "rocks",
    "shell", "shells",
    "crystal", "crystals",
    "backpack", "backpacks",
    "potion", "potions",
    "boost", "boosts",
    "event", "events",
    "bubble", "bubbles",
    "aura", "auras",
]

# Keywords that indicate hidden/upcoming content
SPECIAL_KEYWORDS = [
    "new", "upcoming", "beta", "test", "unreleased", "vip", 
    "exclusive", "dev", "future", "leaked", "secret", "hidden",
    "alpha", "coming", "soon", "reveal", "preview", "sneak", "peek",
    "update", "patch", "next", "planning", "roadmap", "experimental",
    "testing", "insider", "advance", "custom", "unique", "prestige",
    "private", "closed", "internal", "classified", "confidential",
    "prototype", "pre-release", "showcase", "development", "wip",
    "sample", "concept", "blueprint", "foundation", "core", "build",
    "rig", "model", "rough", "unfinished", "primitive", "initial",
    "early", "access", "temp", "temporary", "place", "holder", "skeleton",
    "framework", "template", "mock", "placeholder", "dummy", "fake",
    "example", "abstract", "bare", "bones", "baseline", "minimal",
    "stripped", "down", "vanilla", "raw", "blank", "empty", "shell",
    "stub", "v0", "version0", "ver0", "phase0", "stage0", "iteration0",
    "draft", "sketch", "outline", "rough", "draft", "scratch", "preview",
    "demo", "demonstration", "sample", "trial", "evaluation", "assessment",
    "review", "inspection", "examination", "analysis", "study", "investigation",
    "research", "exploration", "discovery", "finding", "learning", "knowledge",
    "understanding", "comprehension", "insight", "awareness", "recognition",
    "realization", "epiphany", "revelation", "illumination", "enlightenment",
    "awakening", "breakthrough", "finding", "disclosure"
]

# PS99 specific item types
PS99_ITEM_TYPES = [
    "huge", "titanic", "exclusive", "rainbow", "golden", "emerald", "shiny",
    "normal", "rare", "epic", "legendary", "mythical", "godly", "secret",
    "limited", "exotic", "ancient", "magical", "divine", "celestial", "cosmic",
    "prismatic", "astral", "ethereal", "transcendent", "empyrean", "radiant",
    "incandescent", "luminous", "gleaming", "iridescent", "glowing", "shimmering",
    "sparkling", "twinkling", "dazzling", "brilliant", "vibrant", "vivid",
    "colorful", "chromatic", "spectral", "fantastic", "marvelous", "stunning",
    "spectacular", "magnificent", "splendid", "grand", "majestic", "royal",
    "imperial", "sovereign", "supreme", "ultimate", "absolute", "infinite",
    "bottomless", "endless", "timeless", "eternal", "immortal", "undying",
    "deathless", "imperishable", "everlasting", "permanent", "enduring",
    "abiding", "lasting", "durable", "robust", "sturdy", "solid", "substantial",
    "significant", "important", "essential", "critical", "vital", "crucial",
    "indispensable", "necessary", "required", "mandatory", "compulsory",
    "obligatory", "needed", "wanted", "desired", "coveted", "sought", "after"
]

# PS99 specific keywords to detect
PS99_KEYWORDS = [
    "pet simulator 99", "ps99", "pet sim 99", "slime tycoon", "slime factory",
    "mining simulator", "gem frenzy", "lucky block", "golden egg",
    "huge pet", "titanic pet", "mythical pet", "enchant", "potion", "break all",
    "triple coins", "triple damage", "triple gems", "VIP server", "merchant",
    "egg collection", "neon pet", "rainbow pet", "treasure chest", "diamond chest",
    "update 53", "update 54", "update 55", "update 56", "coming soon", "big games", "preston",
    "secret pet", "legendary pet", "rare pet", "exclusive pet", "limited edition", 
    "worldcup egg", "worldcup pet", "special event", "event pet", "power boost",
    "boost potion", "super lucky", "ultra lucky", "gem boost", "coin boost",
    "triple boost", "pickaxe", "backpack", "end mine", "chest breaker", "fishing",
    "teleport", "hoverboard", "air vehicle", "gamepass", "vip", "pet index",
    "pet collection", "super rebirth", "gargantuan pet", "enormous pet",
    "colossal pet", "special offer", "special deal", "limited time", "double xp",
    "anubis", "egyptian", "pharaoh", "pyramid", "sphinx", "desert", "mummy",
    "ancient egypt", "sarcophagus", "scarab", "hieroglyph", "obelisk", "ankh",
    "nile", "jackal", "tomb", "curse", "excavation", "archaeology", "artifact",
    "treasure hunter", "sacred", "mystical", "golden mask", "undiscovered",
    "hidden treasure", "lost city", "ancient relic", "sandstorm", "ruins",
    "excavator", "fossil", "digsite", "expedition", "exploration",
    "slime upgrade", "slime tier", "slime capacity", "slime damage", "slime speed",
    "factory upgrade", "production boost", "automation", "processing", "machinery"
]

# Rotation of user agents to mimic real browsers
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:96.0) Gecko/20100101 Firefox/96.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:96.0) Gecko/20100101 Firefox/96.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36 Edg/96.0.1054.29",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 OPR/82.0.4227.43",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.55",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36"
]

# Get a random user agent for each request
def get_random_user_agent():
    return random.choice(USER_AGENTS)

# Default request headers that mimic a real browser
def get_browser_headers(referrer=None):
    headers = {
        "User-Agent": get_random_user_agent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "DNT": "1",
        "Cache-Control": "max-age=0",
    }
    
    # Add a referrer if provided
    if referrer:
        headers["Referer"] = referrer
    
    return headers

# API endpoints
ENDPOINTS = {
    "asset_delivery": "https://assetdelivery.roblox.com/v1/asset/",
    "catalog_items": "https://catalog.roblox.com/v1/catalog/items/",
    "inventory": "https://inventory.roblox.com/v2/assets/{}/owners",
    "thumbnail": "https://thumbnails.roblox.com/v1/assets",
    "game_passes": "https://games.roblox.com/v1/games/{}/game-passes",
    "dev_products": "https://games.roblox.com/v1/games/{}/developer-products",
    "marketplace": "https://economy.roblox.com/v2/assets/{}/details",
    "creator_assets": "https://inventory.roblox.com/v2/users/{}/inventory",
    "group_assets": "https://groups.roblox.com/v1/groups/{}/assets",
    "game_details": "https://games.roblox.com/v1/games?universeIds={}",
    "game_assets": "https://develop.roblox.com/v1/universes/{}/assets"
}

# Scanner settings
SCANNER_CONFIG = {
    "cache_dir": os.path.join("static", "images", "assets"),
    "request_delay": (1.5, 3.5),  # Random delay between requests (min, max) in seconds
    "max_retries": 3,             # Maximum number of retries for failed requests
    "backoff_factor": 2,          # Exponential backoff factor for retries
    "timeout": 10,                # Request timeout in seconds
    "rotate_user_agent": True,    # Rotate user agents for each request
    "use_proxies": False,         # Use proxies to distribute requests
    "deep_scan": False,           # Deep scan analyzes scripts and bytecode (slow)
    "token_analysis": True,       # Look for tokens in HTML/JS that might reference hidden assets
    "pattern_matching": True,     # Use regex patterns to find asset IDs
    "auto_categorize": True,      # Automatically categorize found assets
    "parse_js": True,             # Parse JavaScript for hidden asset references
}

# Additional constants for comprehensive scanner
HISTORY_DAYS = 4  # Number of days to keep history
RESULTS_PER_PAGE = 20  # Number of results per page
THUMBNAIL_CACHE_DIR = os.path.join("static", "images", "assets")  # Directory to cache thumbnails
NOTIFICATION_SOUND = os.path.join("static", "sounds", "notification.mp3")  # Sound for notifications
ENABLE_DESKTOP_NOTIFICATIONS = True  # Enable desktop notifications
ENABLE_SOUND_NOTIFICATIONS = True  # Enable sound notifications
ENABLE_VISUAL_HIGHLIGHTS = True  # Enable visual highlights for new assets
ENABLE_AUTO_CATEGORIZATION = True  # Enable automatic categorization

# Categorization rules for different asset types
CATEGORIZATION_RULES = {
    "pet": ["pet", "pets", "animal", "creature", "companion"],
    "egg": ["egg", "eggs", "hatch", "incubator"],
    "hat": ["hat", "hats", "accessory", "head", "wear"],
    "weapon": ["weapon", "weapons", "sword", "gun", "blaster", "knife"],
    "tool": ["tool", "tools", "utility", "hammer", "screwdriver"],
    "furniture": ["furniture", "chair", "table", "bed", "sofa", "decor"],
    "area": ["area", "zone", "location", "place", "map", "region"],
    "gamepass": ["gamepass", "pass", "vip", "access"],
    "gem": ["gem", "gems", "diamond", "ruby", "emerald", "jewel"],
    "coin": ["coin", "coins", "currency", "money", "gold"],
    "enchant": ["enchant", "enchants", "enchantment", "enchantments", "magic", "spell"],
    "pickaxe": ["pickaxe", "pickaxes", "mining", "mine", "dig", "excavate"],
    "backpack": ["backpack", "backpacks", "bag", "sack", "inventory"],
    "potion": ["potion", "potions", "elixir", "brew", "concoction"],
    "boost": ["boost", "boosts", "power", "enhancement", "buff", "upgrade"],
    "event": ["event", "events", "special", "limited", "exclusive", "seasonal"],
    "misc": []  # Default category
}

# Default settings for the scanner
DEFAULT_SETTINGS = {
    "auto_scan": True,
    "scan_interval": 120,  # 2 minutes
    "history_days": HISTORY_DAYS,
    "enable_notifications": ENABLE_DESKTOP_NOTIFICATIONS,
    "enable_sounds": ENABLE_SOUND_NOTIFICATIONS,
    "enable_highlights": ENABLE_VISUAL_HIGHLIGHTS,
    "auto_categorize": ENABLE_AUTO_CATEGORIZATION,
    "show_thumbnails": True,
    "results_per_page": RESULTS_PER_PAGE
}

# Constants used by advanced_scanning_techniques.py
MAX_RETRY_ATTEMPTS = 3
REQUEST_TIMEOUT = 10
ENABLE_STEALTH_MODE = True

# Default HTTP headers for requests
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "DNT": "1",
    "Cache-Control": "max-age=0",
}

# Special API endpoints for deep scanning
SPECIAL_API_ENDPOINTS = {
    "asset_data": "https://assetdelivery.roblox.com/v1/asset/?id={}",
    "asset_info": "https://economy.roblox.com/v2/assets/{}/details",
    "asset_owners": "https://inventory.roblox.com/v2/assets/{}/owners",
    "catalog_search": "https://catalog.roblox.com/v1/search/items",
    "developer_products": "https://apis.roblox.com/developer-products/v1/products/{}",
    "game_passes": "https://apis.roblox.com/game-passes/v1/game-passes/{}",
    "inventory": "https://inventory.roblox.com/v2/users/{}/inventory/{}",
    "marketplace": "https://apis.roblox.com/marketplace/v1/assets/{}",
    "universes": "https://develop.roblox.com/v1/universes/{}",
    "badges": "https://badges.roblox.com/v1/badges/{}",
    "thumbnails": "https://thumbnails.roblox.com/v1/assets?assetIds={}&size=420x420&format=Png",
}