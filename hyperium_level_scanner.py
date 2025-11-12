"""
Hyperium-Level Advanced Asset Scanner for Roblox

This module implements extreme anti-detection technologies inspired by the
Hyperium scanner to significantly improve our ability to discover hidden 
assets and bypass security measures.

Key features:
1. Browser identity rotation with device simulation
2. Multi-layered request patterns to mimic human behavior
3. Traffic distribution through multiple paths
4. Request timing randomization with human-like patterns
5. Network identity masking and IP rotation
6. Gradual scanning to avoid detection patterns
7. DOM-based scraping with browser simulation
8. Hidden asset detection using bytecode analysis
"""

import os
import json
import time
import random
import base64
import secrets
import hashlib
import logging
import string
import re
import socket
import struct
import ssl
import zlib
import threading
import queue
from urllib.parse import urlencode, urlparse, parse_qs, quote_plus, urlunparse
from urllib.request import Request, urlopen, build_opener, HTTPCookieProcessor
from urllib.error import HTTPError, URLError
from http.cookiejar import CookieJar, LWPCookieJar, MozillaCookieJar
from collections import deque, defaultdict, Counter
import uuid
import datetime

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class HyperiumLevelScanner:
    """
    Implements advanced scanning techniques with extreme stealth capabilities
    to detect Roblox assets while avoiding anti-bot measures.
    """
    
    def __init__(self, config=None):
        """Initialize the advanced scanner with stealth configuration"""
        self.config = config or {}
        
        # Identity management - reduced number of identities to minimize rate limiting
        self.identities = self._generate_identities(5)  # Reduced from 10 to 5 browser identities
        self.current_identity_index = 0
        
        # Request state management
        self.cookie_jars = {identity['id']: LWPCookieJar() for identity in self.identities}
        self.session_tokens = {identity['id']: self._generate_session_token() for identity in self.identities}
        self.request_timestamps = {identity['id']: [] for identity in self.identities}
        
        # Browsing simulation
        self.visited_pages = {identity['id']: deque(maxlen=50) for identity in self.identities}
        self.interaction_history = {identity['id']: [] for identity in self.identities}
        
        # Distribution management
        self.request_queue = queue.Queue()
        self.response_cache = {}
        self.failed_requests = set()
        
        # Browser simulation data
        self.browser_plugins = self._generate_browser_plugins()
        self.canvas_fingerprints = self._generate_canvas_fingerprints()
        self.webgl_data = self._generate_webgl_data()
        self.font_data = self._generate_font_data()
        
        # Anti-detection patterns
        self.request_distribution = {
            'morning': (0.4, 0.7),  # Slower in morning
            'afternoon': (1.0, 1.5),  # Fast in afternoon
            'evening': (0.7, 1.2),  # Medium in evening
            'night': (0.3, 0.6),  # Slower at night
        }
        
        # Advanced scanning capabilities
        self.bytecode_patterns = self._load_bytecode_patterns()
        self.hidden_asset_signatures = self._load_hidden_asset_signatures()
        
    def _generate_identities(self, count):
        """Generate realistic browser identities for rotation"""
        identities = []
        
        platforms = [
            {
                'name': 'Windows',
                'versions': ['10.0', '11.0'],
                'browsers': [
                    {'name': 'Chrome', 'versions': ['108.0.0.0', '109.0.0.0', '110.0.0.0']},
                    {'name': 'Firefox', 'versions': ['108.0', '109.0']},
                    {'name': 'Edge', 'versions': ['108.0.1462.54', '109.0.1518.78']}
                ]
            },
            {
                'name': 'MacOS',
                'versions': ['10.15.7', '11.6.5', '12.3.1'],
                'browsers': [
                    {'name': 'Chrome', 'versions': ['108.0.0.0', '109.0.0.0', '110.0.0.0']},
                    {'name': 'Firefox', 'versions': ['108.0', '109.0']},
                    {'name': 'Safari', 'versions': ['15.6', '16.0', '16.2']}
                ]
            },
            {
                'name': 'Linux',
                'versions': ['Ubuntu 20.04', 'Ubuntu 22.04', 'Fedora 36'],
                'browsers': [
                    {'name': 'Chrome', 'versions': ['108.0.0.0', '109.0.0.0', '110.0.0.0']},
                    {'name': 'Firefox', 'versions': ['108.0', '109.0']}
                ]
            }
        ]
        
        for i in range(count):
            platform = random.choice(platforms)
            platform_version = random.choice(platform['versions'])
            browser = random.choice(platform['browsers'])
            browser_version = random.choice(browser['versions'])
            
            # Generate screen resolution
            if platform['name'] == 'Windows':
                screen_res = random.choice([(1920, 1080), (2560, 1440), (3840, 2160), (1366, 768)])
            elif platform['name'] == 'MacOS':
                screen_res = random.choice([(2560, 1600), (2880, 1800), (1440, 900)])
            else:  # Linux
                screen_res = random.choice([(1920, 1080), (2560, 1440), (1366, 768)])
                
            # Generate a user agent
            if browser['name'] == 'Chrome':
                user_agent = f"Mozilla/5.0 ({self._get_platform_string(platform['name'], platform_version)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{browser_version} Safari/537.36"
            elif browser['name'] == 'Firefox':
                user_agent = f"Mozilla/5.0 ({self._get_platform_string(platform['name'], platform_version)}; rv:{browser_version}) Gecko/20100101 Firefox/{browser_version}"
            elif browser['name'] == 'Edge':
                user_agent = f"Mozilla/5.0 ({self._get_platform_string(platform['name'], platform_version)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{browser_version.split('.')[0]}.0.0.0 Safari/537.36 Edg/{browser_version}"
            else:  # Safari
                webkit_version = "605.1.15"
                user_agent = f"Mozilla/5.0 (Macintosh; Intel Mac OS X {platform_version.replace('.', '_')}) AppleWebKit/{webkit_version} (KHTML, like Gecko) Version/{browser_version} Safari/{webkit_version}"
            
            # Create the identity with unique fingerprint
            identity = {
                'id': str(uuid.uuid4()),
                'platform': platform['name'],
                'platform_version': platform_version,
                'browser': browser['name'],
                'browser_version': browser_version,
                'user_agent': user_agent,
                'screen_resolution': screen_res,
                'color_depth': 24,
                'timezone_offset': random.choice([-8, -7, -6, -5, -4, 0, 1, 2]),
                'language': random.choice(['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE']),
                'do_not_track': random.choice(['1', None]),
                'canvas_fingerprint': hashlib.sha256(os.urandom(16)).hexdigest(),
                'webgl_vendor': 'Google Inc.' if browser['name'] != 'Safari' else 'Apple Inc.',
                'webgl_renderer': 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0)' if platform['name'] == 'Windows' else 'Intel Iris Pro OpenGL Engine',
                'device_memory': random.choice([4, 8, 16]),
                'hardware_concurrency': random.choice([4, 8, 12, 16]),
                'creation_time': datetime.datetime.now().isoformat()
            }
            
            identities.append(identity)
            
        return identities
    
    def _get_platform_string(self, platform_name, platform_version):
        """Generate the platform part of the user agent string"""
        if platform_name == 'Windows':
            return f"Windows NT {platform_version}; Win64; x64"
        elif platform_name == 'MacOS':
            # Convert version format if needed (10.15.7 -> 10_15_7)
            normalized_version = platform_version.replace('.', '_')
            return f"Macintosh; Intel Mac OS X {normalized_version}"
        else:  # Linux
            return f"X11; Linux x86_64; {platform_version}"
    
    def _generate_browser_plugins(self):
        """Generate realistic browser plugin data"""
        common_plugins = [
            {"name": "Chrome PDF Plugin", "description": "Portable Document Format"},
            {"name": "Chrome PDF Viewer", "description": ""},
            {"name": "Native Client", "description": ""},
            {"name": "Adobe Acrobat", "description": "Handles PDF documents"},
            {"name": "QuickTime Plug-in", "description": "Handles media files"}
        ]
        
        plugins_per_identity = {}
        for identity in self.identities:
            if identity['browser'] == 'Chrome':
                plugins = common_plugins[:3]
            elif identity['browser'] == 'Firefox':
                plugins = [common_plugins[3]]
            elif identity['browser'] == 'Edge':
                plugins = common_plugins[:2]
            else:  # Safari
                plugins = [common_plugins[3], common_plugins[4]]
                
            # Add random variation
            if random.random() > 0.7 and identity['browser'] != 'Safari':
                plugins.append(common_plugins[3])
                
            plugins_per_identity[identity['id']] = plugins
            
        return plugins_per_identity
    
    def _generate_canvas_fingerprints(self):
        """Generate canvas fingerprinting data that looks realistic but unique per identity"""
        fingerprints = {}
        
        for identity in self.identities:
            # Create a deterministic but unique fingerprint based on the identity
            fp_seed = hashlib.md5(identity['id'].encode()).digest()
            fingerprint = {
                'hash': hashlib.sha256(fp_seed).hexdigest(),
                'winding': random.choice([True, False]),  # Canvas winding setting
                'data': base64.b64encode(fp_seed).decode('utf-8')[:40]
            }
            fingerprints[identity['id']] = fingerprint
            
        return fingerprints
        
    def _generate_webgl_data(self):
        """Generate WebGL data that varies by browser and platform"""
        webgl_data = {}
        
        for identity in self.identities:
            # Generate vendor and renderer values that match the platform
            if identity['platform'] == 'Windows':
                vendor = "Google Inc." if identity['browser'] != 'Firefox' else "Mozilla"
                renderers = [
                    "ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0)",
                    "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)",
                    "ANGLE (AMD, AMD Radeon RX 6800 Direct3D11 vs_5_0 ps_5_0)"
                ]
            elif identity['platform'] == 'MacOS':
                vendor = "Apple Inc."
                renderers = [
                    "Apple M1 Pro",
                    "Apple M1 Max",
                    "Intel Iris Pro OpenGL Engine",
                    "AMD Radeon Pro 5500M OpenGL Engine"
                ]
            else:  # Linux
                vendor = "Mesa/X.org" if identity['browser'] == 'Firefox' else "Google Inc."
                renderers = [
                    "Mesa Intel(R) UHD Graphics 630 (CFL GT2)",
                    "Mesa DRI Intel(R) HD Graphics 5500 (BDW GT2)",
                    "NVIDIA GeForce RTX 3070/PCIe/SSE2"
                ]
                
            extensions = [
                "ANGLE_instanced_arrays",
                "EXT_blend_minmax",
                "EXT_color_buffer_half_float",
                "EXT_float_blend",
                "EXT_frag_depth",
                "EXT_shader_texture_lod",
                "EXT_texture_compression_bptc",
                "EXT_texture_compression_rgtc",
                "EXT_texture_filter_anisotropic",
                "OES_element_index_uint",
                "OES_fbo_render_mipmap",
                "OES_standard_derivatives",
                "OES_texture_float",
                "OES_texture_float_linear",
                "OES_texture_half_float",
                "OES_texture_half_float_linear",
                "OES_vertex_array_object",
                "WEBGL_color_buffer_float",
                "WEBGL_compressed_texture_s3tc",
                "WEBGL_compressed_texture_s3tc_srgb",
                "WEBGL_debug_renderer_info",
                "WEBGL_debug_shaders",
                "WEBGL_depth_texture",
                "WEBGL_draw_buffers",
                "WEBGL_lose_context",
                "WEBGL_multi_draw"
            ]
            
            # Filter extensions based on browser
            if identity['browser'] == 'Safari':
                # Safari has fewer extensions
                selected_extensions = random.sample(extensions, k=random.randint(10, 15))
            else:
                selected_extensions = random.sample(extensions, k=random.randint(18, len(extensions)))
                
            # Generate parameters
            parameters = {
                "ALIASED_LINE_WIDTH_RANGE": [1, random.choice([1, 8, 10, 16])],
                "ALIASED_POINT_SIZE_RANGE": [1, random.choice([1024, 2048, 8192])],
                "MAX_VIEWPORT_DIMS": [
                    identity['screen_resolution'][0],
                    identity['screen_resolution'][1]
                ],
                "MAX_TEXTURE_SIZE": random.choice([8192, 16384, 32768]),
                "MAX_CUBE_MAP_TEXTURE_SIZE": random.choice([8192, 16384, 32768]),
                "MAX_RENDERBUFFER_SIZE": random.choice([8192, 16384, 32768]),
                "MAX_VERTEX_ATTRIBS": random.choice([16, 32]),
                "MAX_VERTEX_UNIFORM_VECTORS": random.choice([4096, 8192, 16384]),
                "MAX_VERTEX_TEXTURE_IMAGE_UNITS": random.choice([16, 32]),
                "MAX_VARYING_VECTORS": random.choice([32, 64, 128]),
                "MAX_FRAGMENT_UNIFORM_VECTORS": random.choice([1024, 2048, 4096]),
                "MAX_TEXTURE_IMAGE_UNITS": random.choice([16, 32]),
                "RED_BITS": 8,
                "GREEN_BITS": 8,
                "BLUE_BITS": 8,
                "ALPHA_BITS": 8,
                "DEPTH_BITS": random.choice([24, 32]),
                "STENCIL_BITS": random.choice([0, 8]),
                "MAX_SAMPLES": random.choice([4, 8, 16])
            }
            
            webgl_data[identity['id']] = {
                "vendor": vendor,
                "renderer": random.choice(renderers),
                "extensions": selected_extensions,
                "parameters": parameters
            }
            
        return webgl_data
    
    def _generate_font_data(self):
        """Generate font fingerprint data"""
        # Core fonts available in most systems
        core_fonts = [
            "Arial", "Arial Black", "Calibri", "Cambria", "Cambria Math", 
            "Comic Sans MS", "Courier", "Courier New", "Georgia", "Helvetica",
            "Impact", "Lucida Console", "Lucida Sans Unicode", "Microsoft Sans Serif",
            "Palatino Linotype", "Segoe UI", "Tahoma", "Times", "Times New Roman",
            "Trebuchet MS", "Verdana", "Webdings", "Wingdings"
        ]
        
        # Fonts more common on specific platforms
        windows_fonts = [
            "Consolas", "Constantia", "Corbel", "Ebrima", "Franklin Gothic", 
            "Gabriola", "Gadugi", "Leelawadee", "Malgun Gothic", "MS Gothic",
            "MS PGothic", "MS Sans Serif", "MS Serif", "Segoe Print", "Segoe Script",
            "Sylfaen", "Symbol"
        ]
        
        mac_fonts = [
            "American Typewriter", "Andale Mono", "Apple Chancery", "Apple Color Emoji",
            "Apple SD Gothic Neo", "AppleGothic", "AppleMyungjo", "Avenir",
            "Avenir Next", "Bangla Sangam MN", "Baskerville", "Big Caslon", "Chalkboard",
            "Cochin", "Copperplate", "Didot", "Futura", "Geneva", "Gill Sans",
            "Helvetica Neue", "Herculanum", "Hoefler Text", "Marker Felt", "Menlo",
            "Monaco", "Noteworthy", "Optima", "Papyrus", "Skia", "Snell Roundhand",
            "Zapfino"
        ]
        
        linux_fonts = [
            "Bitstream Vera Sans", "DejaVu Sans", "DejaVu Sans Mono", "DejaVu Serif",
            "Droid Sans", "Droid Sans Mono", "Droid Serif", "FreeMono", "FreeSans",
            "FreeSerif", "Liberation Mono", "Liberation Sans", "Liberation Serif",
            "Nimbus Mono L", "Nimbus Roman No9 L", "Nimbus Sans L", "Ubuntu",
            "Ubuntu Condensed", "Ubuntu Mono"
        ]
        
        fonts_per_identity = {}
        for identity in self.identities:
            # Start with core fonts
            available_fonts = core_fonts.copy()
            
            # Add platform-specific fonts
            if identity['platform'] == 'Windows':
                available_fonts.extend(windows_fonts)
            elif identity['platform'] == 'MacOS':
                available_fonts.extend(mac_fonts)
            else:  # Linux
                available_fonts.extend(linux_fonts)
                
            # Add some randomization (some fonts might be missing)
            num_fonts = int(len(available_fonts) * random.uniform(0.85, 0.95))
            fonts = random.sample(available_fonts, num_fonts)
            
            # Sort for realistic behavior
            fonts.sort()
            
            fonts_per_identity[identity['id']] = fonts
            
        return fonts_per_identity
    
    def _generate_session_token(self):
        """Generate a session token that looks legitimate"""
        token_bytes = secrets.token_bytes(32)
        return base64.urlsafe_b64encode(token_bytes).decode('utf-8').rstrip('=')
    
    def _load_bytecode_patterns(self):
        """Load patterns for identifying interesting bytecode sequences"""
        return [
            # Asset references in Luau bytecode
            rb'\x01[\x00-\xFF]{4}\x01Asset\x00',
            rb'\x01[\x00-\xFF]{4}\x01RBX\x00Asset\x00',
            rb'ID[\x00-\xFF]{2}(\d{3,})',
            rb'asset[\x00-\xFF]{1}(\d{3,})',
            rb'rbxassetid[\x00-\xFF]{1,5}(\d{3,})',
            
            # Module/package references that might contain assets
            rb'Module[\x00-\xFF]{1,5}Pet',
            rb'Module[\x00-\xFF]{1,5}Egg',
            rb'Module[\x00-\xFF]{1,5}Item',
            rb'Module[\x00-\xFF]{1,5}Player',
            rb'Module[\x00-\xFF]{1,5}Shop',
            
            # PS99 specific patterns
            rb'PS99[\x00-\xFF]{1,10}Asset',
            rb'Pet[\x00-\xFF]{1,10}Simulator',
            rb'Egg[\x00-\xFF]{1,5}Table',
            rb'Update[\x00-\xFF]{1,5}(5\d)', # Updates 50-59
            
            # Hidden asset loading patterns
            rb'LoadAsset[\x00-\xFF]{1,10}(\d{4,})',
            rb'GetAsset[\x00-\xFF]{1,10}(\d{4,})',
            rb'PreloadAsync[\x00-\xFF]{1,15}(\d{4,})',
        ]
    
    def _load_hidden_asset_signatures(self):
        """Load signatures for identifying hidden assets"""
        return {
            'pet': [
                rb'\x01Pet\x00[\x00-\xFF]{1,50}Model',
                rb'StandardPet[\x00-\xFF]{1,20}',
                rb'Huge[\x00-\xFF]{1,20}Pet',
                rb'Titanic[\x00-\xFF]{1,20}Pet',
            ],
            'egg': [
                rb'\x01Egg\x00[\x00-\xFF]{1,50}Model',
                rb'EggData[\x00-\xFF]{1,20}',
                rb'Rare[\x00-\xFF]{1,20}Egg',
                rb'Event[\x00-\xFF]{1,20}Egg',
            ],
            'update': [
                rb'Update[\x00-\xFF]{1,5}(\d\d)',
                rb'Version[\x00-\xFF]{1,5}(\d\d\.\d)',
            ],
            'area': [
                rb'New[\x00-\xFF]{1,10}Area',
                rb'Map[\x00-\xFF]{1,10}Version',
                rb'Zone[\x00-\xFF]{1,5}(\d+)',
            ],
            'event': [
                rb'Event[\x00-\xFF]{1,10}Data',
                rb'(Halloween|Christmas|Easter|Summer)[\x00-\xFF]{1,20}Event',
                rb'(Limited|Special|Exclusive)[\x00-\xFF]{1,20}Event',
            ]
        }
    
    def get_current_identity(self):
        """Get the current browser identity"""
        return self.identities[self.current_identity_index]
    
    def rotate_identity(self):
        """Rotate to the next browser identity"""
        self.current_identity_index = (self.current_identity_index + 1) % len(self.identities)
        return self.get_current_identity()
    
    def add_realistic_delay(self, identity_id=None):
        """Add realistic timing between requests to avoid detection"""
        if identity_id is None:
            identity_id = self.get_current_identity()['id']
            
        # Calculate time since last request for this identity
        now = time.time()
        timestamps = self.request_timestamps[identity_id]
        time_since_last = now - timestamps[-1] if timestamps else 60.0  # Default to 60s if first request
        
        # Determine the time of day for realistic patterns
        hour = datetime.datetime.now().hour
        if 5 <= hour < 12:
            time_period = 'morning'
        elif 12 <= hour < 17:
            time_period = 'afternoon'
        elif 17 <= hour < 22:
            time_period = 'evening'
        else:
            time_period = 'night'
        
        # Get the delay range for this time period
        delay_range = self.request_distribution[time_period]
        
        # Adjust delay based on request history (more requests = more delay)
        recent_count = sum(1 for t in timestamps if now - t < 60)  # Requests in last minute
        intensity_factor = min(2.0, 1.0 + (recent_count / 10))  # Up to 2x slower with many requests
        
        # Calculate delay with jitter
        min_delay, max_delay = delay_range
        min_delay *= intensity_factor
        max_delay *= intensity_factor
        
        # Add human behavior patterns
        if random.random() < 0.1:  # 10% chance of a longer "thinking" delay
            base_delay = random.uniform(min_delay, max_delay) * random.uniform(2.0, 5.0)
        else:
            base_delay = random.uniform(min_delay, max_delay)
        
        # Ensure we don't request too quickly
        actual_delay = max(0, base_delay - time_since_last)
        
        if actual_delay > 0:
            time.sleep(actual_delay)
            
        # Update timestamps
        self.request_timestamps[identity_id].append(time.time())
        
        # Keep only recent timestamps (last 100)
        if len(self.request_timestamps[identity_id]) > 100:
            self.request_timestamps[identity_id] = self.request_timestamps[identity_id][-100:]
    
    def make_stealth_request(self, url, method="GET", params=None, data=None, 
                            headers=None, use_identity_rotation=True, advanced_spoofing=True):
        """
        Make a request with advanced anti-detection techniques
        """
        # Get current identity or rotate if needed
        if use_identity_rotation and random.random() < 0.3:  # 30% chance to rotate on each request
            identity = self.rotate_identity()
        else:
            identity = self.get_current_identity()
            
        identity_id = identity['id']
            
        # Apply realistic timing
        self.add_realistic_delay(identity_id)
        
        # Build the full URL with parameters
        full_url = url
        if params:
            if isinstance(params, dict):
                query_string = urlencode(params)
                separator = '&' if '?' in url else '?'
                full_url = f"{url}{separator}{query_string}"
            else:
                # String parameters are assumed to be pre-encoded
                separator = '&' if '?' in url else '?'
                full_url = f"{url}{separator}{params}"
        
        # Generate headers that mimic a real browser
        request_headers = self._generate_realistic_headers(identity, full_url)
        if headers:
            request_headers.update(headers)
            
        # Set a realistic referrer if we have browsing history
        if self.visited_pages[identity_id] and "Referer" not in request_headers:
            request_headers["Referer"] = random.choice(list(self.visited_pages[identity_id]))
            
        # Prepare request body
        request_data = None
        if data:
            if isinstance(data, dict):
                request_data = urlencode(data).encode('utf-8')
                request_headers["Content-Type"] = "application/x-www-form-urlencoded"
            elif isinstance(data, str):
                request_data = data.encode('utf-8')
            else:
                request_data = data
                
        # Create the request
        request = Request(full_url, data=request_data, headers=request_headers, method=method)
            
        # Set up cookie handling
        opener = build_opener(HTTPCookieProcessor(self.cookie_jars[identity_id]))
        
        # Implement advanced browser fingerprinting if requested
        if advanced_spoofing:
            self._apply_advanced_spoofing(request, identity)
        
        # Make the request with retries
        response = None
        retries = 0
        max_retries = 3
        
        while retries <= max_retries:
            try:
                response = opener.open(request, timeout=15)
                
                # Handle redirects
                if response.status in (301, 302, 303, 307, 308):
                    redirect_url = response.headers.get('Location')
                    if redirect_url:
                        # Handle relative redirects
                        if not redirect_url.startswith('http'):
                            parsed = urlparse(url)
                            base_url = f"{parsed.scheme}://{parsed.netloc}"
                            redirect_url = f"{base_url}{redirect_url if redirect_url.startswith('/') else '/' + redirect_url}"
                            
                        # Follow the redirect with a GET request
                        self._record_navigation(identity_id, full_url, redirect_url)
                        
                        # Add a small delay before following the redirect (browsers do this)
                        time.sleep(random.uniform(0.1, 0.5))
                        
                        return self.make_stealth_request(
                            redirect_url, "GET", None, None, 
                            {"Referer": full_url}, 
                            use_identity_rotation=False,  # Keep same identity
                            advanced_spoofing=advanced_spoofing
                        )
                
                # Update browsing history
                self._record_navigation(identity_id, None, full_url)
                
                # Return the response
                return response
                
            except HTTPError as e:
                # Specific handling for common HTTP errors
                if e.code == 429:  # Too Many Requests
                    retry_after = e.headers.get('Retry-After')
                    if retry_after:
                        try:
                            sleep_time = int(retry_after)
                        except ValueError:
                            # If Retry-After is a date, wait 60 seconds
                            sleep_time = 60
                    else:
                        sleep_time = 5 * (retries + 1)  # Exponential backoff
                    
                    logger.warning(f"Rate limited (429). Waiting {sleep_time} seconds before retry.")
                    time.sleep(sleep_time)
                    
                    # After rate limiting, always rotate identity
                    if use_identity_rotation:
                        identity = self.rotate_identity()
                        identity_id = identity['id']
                        
                    retries += 1
                    continue
                    
                elif e.code in (500, 502, 503, 504):  # Server errors
                    sleep_time = 2 * (retries + 1)  # Backoff for server errors
                    logger.warning(f"Server error ({e.code}). Retrying in {sleep_time} seconds.")
                    time.sleep(sleep_time)
                    retries += 1
                    continue
                    
                else:  # Other HTTP errors
                    logger.error(f"HTTP Error: {e.code} - {e.reason} for URL: {url}")
                    raise
                    
            except URLError as e:
                logger.error(f"URL Error: {e.reason} for URL: {url}")
                
                if "timeout" in str(e.reason).lower():
                    if retries < max_retries:
                        sleep_time = 2 * (retries + 1)
                        logger.warning(f"Request timed out. Retrying in {sleep_time} seconds.")
                        time.sleep(sleep_time)
                        retries += 1
                        continue
                raise
                
            except Exception as e:
                logger.error(f"Unexpected error: {str(e)} for URL: {url}")
                retries += 1
                if retries <= max_retries:
                    time.sleep(2 * retries)
                    continue
                raise
        
        # If we reached here, all retries failed
        logger.error(f"Failed to fetch {url} after {max_retries} retries")
        return None
    
    def _generate_realistic_headers(self, identity, url):
        """Generate browser-like request headers based on identity"""
        
        parsed_url = urlparse(url)
        hostname = parsed_url.netloc
        
        headers = {
            "User-Agent": identity['user_agent'],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": f"{identity['language']};q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate", 
            "Sec-Fetch-Site": "none",
            "Host": hostname,
            "Cache-Control": random.choice(["max-age=0", "no-cache"]),
        }
        
        # Add Do Not Track header if specified in identity
        if identity['do_not_track']:
            headers["DNT"] = identity['do_not_track']
        
        # Add browser-specific headers
        if identity['browser'] == 'Chrome' or identity['browser'] == 'Edge':
            headers["sec-ch-ua"] = f'"Not A(Brand";v="24", "{identity["browser"]}";v="{identity["browser_version"].split(".")[0]}"'
            headers["sec-ch-ua-mobile"] = "?0"
            headers["sec-ch-ua-platform"] = f'"{identity["platform"]}"'
            
        # Add realistic variation
        if random.random() < 0.3:  # 30% chance for priority header
            headers["Priority"] = random.choice(["u=1", "u=0"])
            
        # Using the visited pages to create a more realistic fetch site
        has_visited_before = any(hostname in page for page in self.visited_pages[identity['id']])
        if has_visited_before:
            headers["Sec-Fetch-Site"] = "same-origin"
            
        # Add cookie header if we have cookies
        cookie_jar = self.cookie_jars[identity['id']]
        if cookie_jar:
            # This is simplified - in a real implementation you'd extract cookies for this domain
            headers["Cookie"] = f"session={self.session_tokens[identity['id']]}; lastVisit={int(time.time())}; preferences=default"
        
        return headers
    
    def _apply_advanced_spoofing(self, request, identity):
        """Apply advanced browser fingerprinting techniques to avoid detection"""
        # This would modify the request or add extra data at a lower level
        # In a real implementation, this might involve:
        # 1. Adding browser-specific TLS fingerprinting
        # 2. Modifying TCP/IP packet characteristics 
        # 3. Implementing HTTP/2 specific fingerprinting
        # 4. Custom certificate verification
        
        # In our case, we'll use a trick to add custom data to the request object
        # that gets used when establishing the connection
        
        # Note: This is a simplified implementation - in a real scenario, this
        # would use much more complex techniques to modify network traffic 
        # at a lower level than what Python's urllib allows
        
        # Add HTTP/2 support indication (modern browsers use this)
        # This is just a placeholder - real implementation would be much more complex
        request.add_header('Connection', 'keep-alive, Upgrade')
        request.add_header('Upgrade', 'h2c')
            
    def _record_navigation(self, identity_id, from_url, to_url):
        """Record browser navigation for more realistic behavior"""
        if to_url:
            self.visited_pages[identity_id].append(to_url)
            
        # Record the navigation action
        if from_url and to_url:
            action = {
                'type': 'navigation',
                'from': from_url,
                'to': to_url,
                'timestamp': time.time()
            }
            self.interaction_history[identity_id].append(action)
    
    def extract_data_from_response(self, response, look_for_hidden=True):
        """
        Parse the response data to extract asset information using advanced techniques
        """
        if not response:
            return None
            
        try:
            # Read and decode the response
            response_data = response.read()
            content_type = response.getheader('Content-Type', '')
            
            # Handle different content types
            if 'application/json' in content_type:
                try:
                    # Try to parse as JSON
                    data = json.loads(response_data.decode('utf-8'))
                    assets = self._extract_from_json(data)
                except json.JSONDecodeError:
                    # If it's not valid JSON, try other extraction methods
                    assets = None
                    
            elif 'text/html' in content_type:
                # Extract from HTML content using regex patterns
                html_content = response_data.decode('utf-8', errors='ignore')
                assets = self._extract_from_html(html_content)
                
            elif 'application/xml' in content_type or 'text/xml' in content_type:
                # Extract from XML content
                xml_content = response_data.decode('utf-8', errors='ignore')
                assets = self._extract_from_xml(xml_content)
                
            elif 'text/plain' in content_type:
                # Try to parse as text
                text_content = response_data.decode('utf-8', errors='ignore')
                assets = self._extract_from_text(text_content)
                
            # If it's binary data and we want to look for hidden assets
            elif look_for_hidden:
                assets = self._extract_from_binary(response_data, content_type)
                
            else:
                assets = None
                
            return assets
                
        except Exception as e:
            logger.error(f"Error extracting data from response: {str(e)}")
            return None
    
    def _extract_from_json(self, data):
        """Extract asset data from JSON response with advanced detection"""
        assets = []
        
        def process_item(item, path=''):
            """Recursively process JSON data to find asset information"""
            if isinstance(item, dict):
                # Check if this item might be an asset
                if self._is_likely_asset(item):
                    asset_data = self._normalize_asset_data(item, path)
                    if asset_data:
                        assets.append(asset_data)
                
                # Process all values in the dictionary
                for key, value in item.items():
                    process_item(value, f"{path}.{key}" if path else key)
                    
            elif isinstance(item, list):
                # Process all items in the list
                for i, value in enumerate(item):
                    process_item(value, f"{path}[{i}]")
        
        process_item(data)
        return assets if assets else None
    
    def _is_likely_asset(self, item):
        """Determine if an item is likely to be an asset based on its fields"""
        if not isinstance(item, dict):
            return False
            
        # Check for common asset ID fields
        id_keys = ['id', 'assetId', 'Id', 'asset_id', 'AssetId', 'ID']
        has_id = any(key in item for key in id_keys)
        
        if not has_id:
            return False
            
        # Look for other asset-related fields
        asset_related_keys = [
            'name', 'Name', 'title', 'Title', 'description', 'Description',
            'type', 'Type', 'assetType', 'AssetType', 'asset_type',
            'created', 'Created', 'updated', 'Updated',
            'creator', 'Creator', 'creatorId', 'CreatorId',
            'price', 'Price', 'sales', 'Sales',
            'thumbnail', 'Thumbnail', 'image', 'Image',
            'model', 'Model', 'mesh', 'Mesh',
            'rarity', 'Rarity'
        ]
        
        # Count how many asset-related keys are present
        asset_key_count = sum(1 for key in asset_related_keys if key in item)
        
        # It's likely an asset if it has an ID and several asset-related fields
        return has_id and asset_key_count >= 2
    
    def _normalize_asset_data(self, data, data_path=''):
        """Convert various asset data formats to a standardized format with deep inspection"""
        normalized = {'data_path': data_path}  # Include the path for debugging
        
        # Extract ID first - if we can't get an ID, it's not an asset
        for id_key in ['id', 'assetId', 'Id', 'asset_id', 'AssetId', 'ID']:
            if id_key in data:
                try:
                    # Ensure ID is a string and looks like a valid Roblox asset ID
                    id_value = str(data[id_key])
                    if id_value.isdigit() and len(id_value) >= 5:
                        normalized['id'] = id_value
                        break
                except:
                    pass
        
        if 'id' not in normalized:
            return None  # Not a valid asset without ID
            
        # Extract name/title
        for name_key in ['name', 'Name', 'title', 'Title']:
            if name_key in data and data[name_key]:
                normalized['name'] = str(data[name_key])
                break
        if 'name' not in normalized:
            normalized['name'] = f"Asset {normalized['id']}"
            
        # Extract type
        for type_key in ['type', 'Type', 'assetType', 'AssetType', 'asset_type', 'category', 'Category']:
            if type_key in data and data[type_key]:
                normalized['type'] = str(data[type_key])
                break
        if 'type' not in normalized:
            # Try to guess type from other fields or from the data path
            type_hints = {
                'pet': ['pet', 'animal', 'creature'],
                'egg': ['egg', 'hatch'],
                'area': ['area', 'zone', 'map'],
                'hat': ['hat', 'accessory', 'wear'],
                'tool': ['tool', 'item', 'gear'],
                'gamepass': ['pass', 'gamepass'],
                'face': ['face', 'expression'],
                'animation': ['animation', 'anim'],
                'mesh': ['mesh', 'model', '3d'],
                'decal': ['decal', 'texture', 'image'],
                'audio': ['audio', 'sound', 'music'],
                'badge': ['badge', 'achievement'],
                'font': ['font', 'text'],
                'shirt': ['shirt', 'clothing'],
                'pants': ['pants', 'clothing'],
                'tshirt': ['tshirt', 'clothing']
            }
            
            # Check data_path and all values in the data for type hints
            potential_type = None
            search_text = data_path.lower() + ' ' + ' '.join(str(v).lower() for v in data.values() if isinstance(v, (str, int)))
            
            for type_name, hints in type_hints.items():
                if any(hint in search_text for hint in hints):
                    potential_type = type_name
                    break
                    
            normalized['type'] = potential_type or "Unknown"
            
        # Extract description
        for desc_key in ['description', 'Description', 'desc', 'Desc']:
            if desc_key in data and data[desc_key]:
                normalized['description'] = str(data[desc_key])
                break
        if 'description' not in normalized:
            normalized['description'] = f"Asset ID: {normalized['id']}"
                
        # Extract creator information
        for creator_key in ['creatorName', 'CreatorName', 'creator', 'Creator', 'author', 'Author']:
            if creator_key in data and data[creator_key]:
                if isinstance(data[creator_key], dict) and 'name' in data[creator_key]:
                    normalized['creator_name'] = str(data[creator_key]['name'])
                else:
                    normalized['creator_name'] = str(data[creator_key])
                break
                
        # Extract creator ID
        for creator_id_key in ['creatorId', 'CreatorId', 'creator_id', 'authorId']:
            if creator_id_key in data and data[creator_id_key]:
                normalized['creator_id'] = str(data[creator_id_key])
                break
                
        # Extract thumbnail URL
        for thumb_key in ['thumbnailUrl', 'ThumbnailUrl', 'thumbnail', 'Thumbnail', 'imageUrl', 'ImageUrl', 'image', 'Image']:
            if thumb_key in data and data[thumb_key]:
                thumbnail = str(data[thumb_key])
                # Handle relative URLs
                if thumbnail.startswith('/'):
                    thumbnail = f"https://www.roblox.com{thumbnail}"
                normalized['thumbnail_url'] = thumbnail
                break
                
        # If no thumbnail found, generate a predictable one for this asset
        if 'thumbnail_url' not in normalized:
            normalized['thumbnail_url'] = f"https://assetdelivery.roblox.com/v1/asset/?id={normalized['id']}"
            
        # Extract created date
        for created_key in ['created', 'Created', 'createdAt', 'CreatedAt', 'creation_date']:
            if created_key in data and data[created_key]:
                normalized['created_at'] = str(data[created_key])
                break
                
        # Extract updated date
        for updated_key in ['updated', 'Updated', 'updatedAt', 'UpdatedAt', 'last_updated']:
            if updated_key in data and data[updated_key]:
                normalized['updated_at'] = str(data[updated_key])
                break
                
        # Extract price information
        for price_key in ['price', 'Price', 'cost', 'Cost']:
            if price_key in data and data[price_key] is not None:
                try:
                    normalized['price'] = int(data[price_key])
                except:
                    normalized['price'] = str(data[price_key])
                break
                
        # Extract sales information
        for sales_key in ['sales', 'Sales', 'sold', 'Sold', 'purchases', 'Purchases']:
            if sales_key in data and data[sales_key] is not None:
                try:
                    normalized['sales'] = int(data[sales_key])
                except:
                    normalized['sales'] = str(data[sales_key])
                break
                
        # Extract any special flags or properties
        is_limited = False
        is_limited_unique = False
        
        # Check for limited or exclusive indicators
        for limited_key in ['isLimited', 'IsLimited', 'limited', 'Limited']:
            if limited_key in data:
                is_limited = bool(data[limited_key])
                break
                
        for unique_key in ['isLimitedUnique', 'IsLimitedUnique', 'limited_unique', 'LimitedUnique']:
            if unique_key in data:
                is_limited_unique = bool(data[unique_key])
                break
        
        if is_limited or is_limited_unique:
            normalized['limited_type'] = 'LimitedUnique' if is_limited_unique else 'Limited'
            
        # Check if this is a new/special asset
        is_new = False
        
        for new_key in ['isNew', 'IsNew', 'new', 'New']:
            if new_key in data:
                is_new = bool(data[new_key])
                break
                
        if is_new:
            normalized['is_new'] = True
            
        # Add timestamp of when we found this
        normalized['found_at'] = datetime.datetime.now().isoformat()
            
        return normalized
        
    def _extract_from_html(self, html_content):
        """Extract asset data from HTML content with advanced pattern recognition"""
        assets = []
        
        # Look for asset IDs in various formats
        # This is a simplified version - the real implementation would use more complex
        # pattern matching and DOM parsing for better accuracy
        
        # Common asset ID patterns
        patterns = [
            # Asset ID in URLs
            r'(?:assetid=|asset-id=|assetId=|id=)(\d{6,})',
            # Asset links
            r'(?:roblox\.com/(?:catalog|library|asset|item)/)(\d{6,})',
            # Embedded asset IDs
            r'(?:data-asset-id=|data-id=|data-assetid=)"(\d{6,})"',
            # Asset paths
            r'(?:/Asset/GetImage\?assetId=)(\d{6,})',
            # JavaScript asset refs
            r'(?:Asset\s*:\s*|assetId\s*:\s*|rbxassetid\s*=)(?:\'|\")(\d{6,})',
            # Meta tags
            r'<meta\s+(?:name|property)=["\'](og:image|twitter:image)["\'][^>]*content=["\'](.*?)(?:["\'])',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, html_content)
            if matches:
                for match in matches:
                    # Some patterns return tuples, handle that case
                    asset_id = match[0] if isinstance(match, tuple) else match
                    
                    # Make sure it's a valid asset ID
                    if asset_id.isdigit() and len(asset_id) >= 6:
                        # Try to find asset name near this ID
                        asset_name = self._find_asset_name_in_html_context(html_content, asset_id)
                        
                        # Try to determine asset type
                        asset_type = self._guess_asset_type_from_html(html_content, asset_id)
                        
                        asset_data = {
                            'id': asset_id,
                            'name': asset_name or f"Unknown Asset {asset_id}",
                            'type': asset_type or "Unknown",
                            'description': f"Found in HTML content",
                            'found_at': datetime.datetime.now().isoformat(),
                            'source': 'html_scan'
                        }
                        
                        # Avoid duplicates
                        if not any(a.get('id') == asset_id for a in assets):
                            assets.append(asset_data)
        
        # Look for JSON data embedded in the HTML
        json_data_pattern = r'<script[^>]*type=["\'](application/json|text/json)["\'][^>]*>(.*?)</script>'
        json_matches = re.findall(json_data_pattern, html_content, re.DOTALL)
        
        for _, json_content in json_matches:
            try:
                data = json.loads(json_content)
                json_assets = self._extract_from_json(data)
                if json_assets:
                    for asset in json_assets:
                        # Mark the source
                        asset['source'] = 'embedded_json'
                        # Avoid duplicates
                        if not any(a.get('id') == asset.get('id') for a in assets):
                            assets.append(asset)
            except:
                pass
                
        # Look for data attributes that might contain asset info
        data_attrs_pattern = r'data-item="([^"]*)"'
        data_attr_matches = re.findall(data_attrs_pattern, html_content)
        
        for data_attr in data_attr_matches:
            try:
                # Some sites encode the JSON in HTML attributes
                decoded = data_attr.replace('&quot;', '"').replace('&amp;', '&')
                data = json.loads(decoded)
                attr_assets = self._extract_from_json(data)
                if attr_assets:
                    for asset in attr_assets:
                        # Mark the source
                        asset['source'] = 'data_attribute'
                        # Avoid duplicates
                        if not any(a.get('id') == asset.get('id') for a in assets):
                            assets.append(asset)
            except:
                pass
                
        return assets if assets else None
    
    def _find_asset_name_in_html_context(self, html_content, asset_id):
        """Try to find the asset name in the HTML content near an asset ID"""
        # Look for the asset ID
        id_pos = html_content.find(asset_id)
        if id_pos == -1:
            return None
            
        # Get a chunk of text around the ID to search for a name
        chunk_start = max(0, id_pos - 200)
        chunk_end = min(len(html_content), id_pos + 200)
        chunk = html_content[chunk_start:chunk_end]
        
        # Look for common name patterns
        name_patterns = [
            # Various ways asset names are represented in HTML
            r'(?:<title>)(.*?)(?:</title>)',
            r'(?:title=|alt=|aria-label=)[\'"]([^\'"]{3,50})[\'"]',
            r'(?:name=|data-name=)[\'"]([^\'"]{3,50})[\'"]',
            r'(?:<h\d[^>]*>)(.*?)(?:</h\d>)',
            r'(?:class=[\'"](?:name|title|asset-name)[\'"][^>]*>)(.*?)(?:<)',
            r'(?:name[\'"]?\s*:\s*[\'"])([^\'"]{3,50})[\'"]',
            r'(?:title[\'"]?\s*:\s*[\'"])([^\'"]{3,50})[\'"]',
        ]
        
        for pattern in name_patterns:
            matches = re.findall(pattern, chunk)
            if matches:
                # Clean up the potential name
                name = matches[0]
                if isinstance(name, tuple):
                    name = name[0]
                    
                # Remove HTML tags if present
                name = re.sub(r'<[^>]*>', '', name).strip()
                
                # If the name is reasonable length and not just an ID or generic text
                if 3 <= len(name) <= 100 and not name.isdigit() and name.lower() not in ['undefined', 'null', 'asset', 'item', 'roblox']:
                    return name
                    
        return None
    
    def _guess_asset_type_from_html(self, html_content, asset_id):
        """Try to determine asset type from surrounding HTML"""
        # Look for the asset ID
        id_pos = html_content.find(asset_id)
        if id_pos == -1:
            return None
            
        # Get a larger chunk of text around the ID
        chunk_start = max(0, id_pos - 500)
        chunk_end = min(len(html_content), id_pos + 500)
        chunk = html_content[chunk_start:chunk_end].lower()
        
        # Check for type indicators in surrounding text
        type_indicators = {
            'hat': ['hat', 'headgear', 'helmet', 'crown', 'accessory'],
            'face': ['face', 'expression', 'emoji'],
            'gear': ['gear', 'tool', 'weapon'],
            'shirt': ['shirt', 'top', 'clothing'],
            'pants': ['pants', 'trousers', 'bottoms'],
            'decal': ['decal', 'sticker', 'texture', 'image'],
            'model': ['model', '3d', 'mesh', 'character'],
            'plugin': ['plugin', 'extension', 'module'],
            'animation': ['animation', 'emote', 'dance'],
            'badge': ['badge', 'achievement', 'award'],
            'gamepass': ['gamepass', 'pass', 'subscription'],
            'audio': ['audio', 'sound', 'music', 'song'],
            'place': ['place', 'world', 'game', 'experience'],
            'pet': ['pet', 'companion', 'creature', 'animal'],
            'egg': ['egg', 'hatch', 'hatching'],
            'potion': ['potion', 'elixir', 'brew'],
            'area': ['area', 'zone', 'map', 'location'],
            'pickaxe': ['pickaxe', 'shovel', 'mining'],
            'backpack': ['backpack', 'bag', 'storage'],
        }
        
        # Check each type indicator against the chunk
        for asset_type, indicators in type_indicators.items():
            for indicator in indicators:
                if indicator in chunk:
                    return asset_type
        
        # If no specific type detected, look for general category
        if 'asset' in chunk:
            return 'asset'
        if 'item' in chunk:
            return 'item'
        if 'limited' in chunk:
            return 'limited_item'
            
        # Check URL path components that might indicate type
        if 'catalog' in html_content.lower():
            return 'catalog_item'
            
        return None
    
    def _extract_from_xml(self, xml_content):
        """Extract asset data from XML content"""
        assets = []
        
        # Pattern for asset tags
        asset_tag_pattern = r'<(\w+)>.*?<id>(\d{5,})</id>.*?<name>(.*?)</name>.*?</\1>'
        asset_matches = re.findall(asset_tag_pattern, xml_content, re.DOTALL)
        
        for match in asset_matches:
            tag_type, asset_id, name = match
            asset_data = {
                'id': asset_id,
                'name': name,
                'type': tag_type,
                'description': f"XML asset of type {tag_type}",
                'found_at': datetime.datetime.now().isoformat(),
                'source': 'xml_scan'
            }
            assets.append(asset_data)
        
        # If no matches with full tags, try simpler patterns
        if not assets:
            id_pattern = r'<id>(\d{5,})</id>'
            name_pattern = r'<name>(.*?)</name>'
            type_pattern = r'<type>(.*?)</type>'
            
            ids = re.findall(id_pattern, xml_content)
            names = re.findall(name_pattern, xml_content)
            types = re.findall(type_pattern, xml_content)
            
            # Match up by position if possible
            for i in range(len(ids)):
                asset_data = {
                    'id': ids[i],
                    'name': names[i] if i < len(names) else f"Unknown Asset {ids[i]}",
                    'type': types[i] if i < len(types) else "Unknown",
                    'description': "XML asset",
                    'found_at': datetime.datetime.now().isoformat(),
                    'source': 'xml_scan'
                }
                assets.append(asset_data)
        
        return assets if assets else None
    
    def _extract_from_text(self, text_content):
        """Extract asset data from plain text with enhanced pattern matching"""
        assets = []
        
        # Asset ID patterns
        id_patterns = [
            # Standalone IDs are risky but worth checking in some contexts
            r'\b(\d{6,})\b',
            # Better with context
            r'(?:id|assetid|asset).*?(\d{6,})',
            r'(?:model|mesh).*?(\d{6,})',
            r'(?:gamepass|badge).*?(\d{6,})',
            r'(?:roblox\.com/catalog/|roblox\.com/library/)(\d{6,})',
        ]
        
        # Check for JSON-like structures first
        if '{' in text_content and '}' in text_content:
            # Try to extract JSON-like sections
            json_pattern = r'(\{[^{}]*\})'
            json_matches = re.findall(json_pattern, text_content)
            
            for json_str in json_matches:
                try:
                    data = json.loads(json_str)
                    json_assets = self._extract_from_json(data)
                    if json_assets:
                        for asset in json_assets:
                            asset['source'] = 'text_json'
                            assets.append(asset)
                except:
                    pass
        
        # Then check line by line for asset references
        lines = text_content.splitlines()
        for line in lines:
            # Skip lines that look like code/logs
            if line.strip().startswith(('#', '//', '/*', '*', 'print', 'console.', 'log')):
                continue
                
            # Look for ID patterns
            for pattern in id_patterns:
                matches = re.findall(pattern, line)
                if matches:
                    for asset_id in matches:
                        # Skip if likely to be a false positive
                        if self._is_likely_false_positive(asset_id, line):
                            continue
                            
                        # Try to find name on the same line
                        name_match = re.search(r'(?:name|title)[: =][\'"]?([\w\s\-\.]+)[\'"]?', line, re.IGNORECASE)
                        name = name_match.group(1) if name_match else f"Unknown Asset {asset_id}"
                        
                        # Try to determine type
                        type_match = re.search(r'(?:type|category)[: =][\'"]?([\w\s]+)[\'"]?', line, re.IGNORECASE)
                        asset_type = type_match.group(1) if type_match else self._guess_asset_type_from_text(line)
                        
                        asset_data = {
                            'id': asset_id,
                            'name': name,
                            'type': asset_type or "Unknown",
                            'description': line[:100] + ('...' if len(line) > 100 else ''),
                            'found_at': datetime.datetime.now().isoformat(),
                            'source': 'text_scan'
                        }
                        
                        # Avoid duplicates
                        if not any(a.get('id') == asset_id for a in assets):
                            assets.append(asset_data)
        
        return assets if assets else None
    
    def _is_likely_false_positive(self, asset_id, context):
        """Check if an asset ID is likely a false positive based on context"""
        # Very large or small numbers are often not asset IDs
        if len(asset_id) > 12 or len(asset_id) < 6:
            return True
            
        # Check context for indicators that this is not an asset ID
        false_positive_indicators = [
            'timestamp', 'unix', 'epoch', 'date', 'time',
            'user', 'account', 'phone', 'mobile', 'cell',
            'price', 'cost', 'money', 'currency',
            'version', 'build', 'release',
            'latitude', 'longitude', 'gps', 'coordinates',
            'filesize', 'size', 'bytes', 'kb', 'mb',
            'width', 'height', 'resolution', 'dimension',
            'rgb', 'rgba', 'color', 'hex'
        ]
        
        context_lower = context.lower()
        if any(indicator in context_lower for indicator in false_positive_indicators):
            # Check if the context specifically indicates this is an ID
            asset_indicators = ['asset', 'id', 'model', 'mesh', 'rbx', 'roblox']
            return not any(indicator in context_lower for indicator in asset_indicators)
            
        return False
    
    def _guess_asset_type_from_text(self, text):
        """Try to determine asset type from text"""
        text_lower = text.lower()
        
        # Check for type indicators
        type_mapping = {
            'hat': ['hat', 'accessory', 'headgear'],
            'face': ['face', 'expression'],
            'gear': ['gear', 'tool', 'weapon'],
            'shirt': ['shirt', 'top', 'clothing'],
            'pants': ['pants', 'trousers'],
            'model': ['model', 'mesh', '3d'],
            'decal': ['decal', 'texture', 'image'],
            'plugin': ['plugin', 'extension'],
            'animation': ['animation', 'emote', 'dance'],
            'badge': ['badge', 'achievement'],
            'gamepass': ['gamepass', 'pass'],
            'audio': ['audio', 'sound', 'music'],
            'place': ['place', 'map', 'game'],
            'package': ['package', 'bundle'],
            'pet': ['pet', 'animal', 'creature'],
            'egg': ['egg', 'hatch'],
            'area': ['area', 'zone', 'location']
        }
        
        for asset_type, indicators in type_mapping.items():
            if any(indicator in text_lower for indicator in indicators):
                return asset_type
                
        # Special cases
        if 'robux' in text_lower or 'purchase' in text_lower or 'buy' in text_lower:
            return 'purchasable_item'
            
        if 'limited' in text_lower or 'rare' in text_lower or 'exclusive' in text_lower:
            return 'limited_item'
            
        return None
    
    def _extract_from_binary(self, binary_data, content_type):
        """Extract asset information from binary data with focus on hidden content"""
        assets = []
        
        # First, try to find text content in the binary data
        try:
            # Check for plain text content
            text_content = binary_data.decode('utf-8', errors='ignore')
            text_assets = self._extract_from_text(text_content)
            if text_assets:
                for asset in text_assets:
                    asset['source'] = 'binary_text'
                    assets.extend(text_assets)
        except:
            pass
            
        # Check for compressed data
        try:
            # Try deflate decompression
            if binary_data[:2] == b'\x78\x9c':  # zlib header
                decompressed = zlib.decompress(binary_data)
                try:
                    decompressed_text = decompressed.decode('utf-8', errors='ignore')
                    decomp_assets = self._extract_from_text(decompressed_text)
                    if decomp_assets:
                        for asset in decomp_assets:
                            asset['source'] = 'compressed_data'
                            assets.extend(decomp_assets)
                except:
                    pass
        except:
            pass
            
        # Apply bytecode pattern matching for hidden assets
        for pattern in self.bytecode_patterns:
            matches = re.findall(pattern, binary_data)
            if matches:
                for match in matches:
                    # Some patterns return the ID as part of a tuple
                    asset_id = match[0] if isinstance(match, tuple) else match
                    
                    # Ensure it's a string and valid looking ID
                    if not isinstance(asset_id, str):
                        try:
                            asset_id = asset_id.decode('utf-8', errors='ignore')
                        except:
                            asset_id = str(asset_id)
                    
                    if asset_id.isdigit() and len(asset_id) >= 6:
                        asset_data = {
                            'id': asset_id,
                            'name': f"Hidden Asset {asset_id}",
                            'type': "Hidden",
                            'description': "Found through bytecode analysis",
                            'found_at': datetime.datetime.now().isoformat(),
                            'source': 'bytecode_analysis'
                        }
                        
                        if not any(a.get('id') == asset_id for a in assets):
                            assets.append(asset_data)
                            
        # Apply hidden asset signatures
        for asset_type, signatures in self.hidden_asset_signatures.items():
            for signature in signatures:
                if re.search(signature, binary_data):
                    # We found a signature match, but need an ID
                    # Look for nearby ID patterns
                    id_pattern = rb'(\d{6,})'
                    id_matches = re.findall(id_pattern, binary_data)
                    
                    if id_matches:
                        # Take the 3 closest IDs to avoid false positives
                        for asset_id in id_matches[:3]:
                            try:
                                asset_id = asset_id.decode('utf-8', errors='ignore')
                            except:
                                asset_id = str(asset_id)
                                
                            asset_data = {
                                'id': asset_id,
                                'name': f"Hidden {asset_type.title()} {asset_id}",
                                'type': asset_type.title(),
                                'description': f"Found using signature analysis for {asset_type}",
                                'found_at': datetime.datetime.now().isoformat(),
                                'source': 'signature_analysis'
                            }
                            
                            if not any(a.get('id') == asset_id for a in assets):
                                assets.append(asset_data)
        
        return assets if assets else None
    
    def scan_asset(self, asset_id, deep_scan=False):
        """Scan a specific asset ID using all available techniques"""
        results = []
        
        # Define endpoints to scan for this asset
        endpoints = [
            f"https://assetdelivery.roblox.com/v1/asset/?id={asset_id}",
            f"https://economy.roblox.com/v2/assets/{asset_id}/details",
            f"https://inventory.roblox.com/v2/assets/{asset_id}/owners",
            f"https://thumbnails.roblox.com/v1/assets?assetIds={asset_id}&size=420x420&format=Png",
        ]
        
        if deep_scan:
            # Add more intensive endpoints for deep scanning
            endpoints.extend([
                f"https://catalog.roblox.com/v1/catalog/items/details",  # POST request
                f"https://apis.roblox.com/asset-permissions-api/v1/assets/{asset_id}/permissions",
                f"https://develop.roblox.com/v1/assets/{asset_id}",
            ])
        
        # Scan each endpoint with identity rotation for stealth
        for endpoint in endpoints:
            try:
                # Rotate identity for each request to avoid rate limiting
                response = self.make_stealth_request(endpoint)
                if response:
                    assets = self.extract_data_from_response(response, deep_scan)
                    if assets:
                        results.extend(assets)
            except Exception as e:
                logger.error(f"Error scanning endpoint {endpoint} for asset {asset_id}: {str(e)}")
        
        # Deduplicate results by asset ID
        unique_results = []
        seen_ids = set()
        
        for asset in results:
            if asset.get('id') not in seen_ids:
                seen_ids.add(asset.get('id'))
                unique_results.append(asset)
        
        return unique_results
    
    def scan_developer(self, developer_id, deep_scan=False):
        """Scan assets from a specific developer"""
        results = []
        
        # Define endpoints
        endpoints = [
            f"https://inventory.roblox.com/v2/users/{developer_id}/inventory/Asset?limit=100",
            f"https://games.roblox.com/v2/users/{developer_id}/games?limit=50",
        ]
        
        if deep_scan:
            # Add deep scan endpoints
            endpoints.extend([
                f"https://inventory.roblox.com/v2/users/{developer_id}/inventory/Badge?limit=100",
                f"https://develop.roblox.com/v2/user/{developer_id}/creations",
            ])
        
        # Scan each endpoint
        for endpoint in endpoints:
            try:
                response = self.make_stealth_request(
                    endpoint,
                    headers={"Referer": "https://www.roblox.com/develop"},
                    advanced_spoofing=True
                )
                
                if response:
                    assets = self.extract_data_from_response(response)
                    if assets:
                        results.extend(assets)
            except Exception as e:
                logger.error(f"Error scanning developer {developer_id} at endpoint {endpoint}: {str(e)}")
        
        # Optionally scan the developer's profile page
        try:
            profile_url = f"https://www.roblox.com/users/{developer_id}/profile"
            response = self.make_stealth_request(
                profile_url,
                headers={"Referer": "https://www.roblox.com/discover"},
                advanced_spoofing=True
            )
            
            if response:
                assets = self.extract_data_from_response(response)
                if assets:
                    results.extend(assets)
        except Exception as e:
            logger.error(f"Error scanning developer profile {developer_id}: {str(e)}")
        
        # Deduplicate results
        unique_results = []
        seen_ids = set()
        
        for asset in results:
            if asset.get('id') not in seen_ids:
                seen_ids.add(asset.get('id'))
                unique_results.append(asset)
        
        return unique_results
    
    def scan_universe(self, universe_id, deep_scan=False):
        """Scan assets from a specific universe/game"""
        results = []
        
        # Define endpoints
        endpoints = [
            f"https://develop.roblox.com/v1/universes/{universe_id}/assets?limit=100&assetType=All",
            f"https://games.roblox.com/v1/games?universeIds={universe_id}",
            f"https://games.roblox.com/v1/games/{universe_id}/game-passes?limit=100",
            f"https://games.roblox.com/v1/games/{universe_id}/badges?limit=100",
            f"https://develop.roblox.com/v1/universes/{universe_id}/configuration",
        ]
        
        if deep_scan:
            # Add deep scan endpoints
            endpoints.extend([
                f"https://develop.roblox.com/v1/universes/{universe_id}/places",
                f"https://develop.roblox.com/v1/universes/{universe_id}/developer-products?limit=100",
                f"https://games.roblox.com/v1/games/{universe_id}/social-links/list",
            ])
        
        # Scan each endpoint
        for endpoint in endpoints:
            try:
                # Different referrers for different endpoints to look more natural
                if 'develop.roblox.com' in endpoint:
                    referrer = "https://create.roblox.com/dashboard/creations"
                else:
                    referrer = f"https://www.roblox.com/games/{universe_id}/"
                    
                response = self.make_stealth_request(
                    endpoint,
                    headers={"Referer": referrer},
                    advanced_spoofing=True
                )
                
                if response:
                    assets = self.extract_data_from_response(response)
                    if assets:
                        for asset in assets:
                            asset['universe_id'] = universe_id
                        results.extend(assets)
            except Exception as e:
                logger.error(f"Error scanning universe {universe_id} at endpoint {endpoint}: {str(e)}")
        
        # Optionally scan the game's page
        try:
            game_url = f"https://www.roblox.com/games/{universe_id}/"
            response = self.make_stealth_request(
                game_url,
                headers={"Referer": "https://www.roblox.com/discover"},
                advanced_spoofing=True
            )
            
            if response:
                assets = self.extract_data_from_response(response)
                if assets:
                    for asset in assets:
                        asset['universe_id'] = universe_id
                    results.extend(assets)
        except Exception as e:
            logger.error(f"Error scanning game page {universe_id}: {str(e)}")
        
        # Deduplicate results
        unique_results = []
        seen_ids = set()
        
        for asset in results:
            if asset.get('id') not in seen_ids:
                seen_ids.add(asset.get('id'))
                unique_results.append(asset)
        
        return unique_results
    
    def check_catalog_keywords(self, keywords, category=None, deep_scan=False):
        """Search the catalog for specific keywords"""
        results = []
        
        # Catalog search endpoint
        base_url = "https://catalog.roblox.com/v1/search/items"
        
        for keyword in keywords:
            try:
                # Define search parameters - properly encode keyword with spaces
                encoded_keyword = quote_plus(keyword)
                
                params = {
                    "keyword": encoded_keyword,
                    "category": category or "All",
                    "limit": 120,
                    "sortType": 0  # RelevanceDesc
                }
                
                # Make the request with a search-like referrer
                response = self.make_stealth_request(
                    base_url,
                    params=params,
                    headers={
                        "Referer": "https://www.roblox.com/catalog",
                        "x-csrf-token": self._generate_csrf_token()  # Custom method
                    },
                    advanced_spoofing=True
                )
                
                if response:
                    assets = self.extract_data_from_response(response)
                    if assets:
                        for asset in assets:
                            asset['keyword'] = keyword
                        results.extend(assets)
                
                # For deep scanning, check multiple pages and subcategories
                if deep_scan:
                    # Check 2nd page
                    params["cursor"] = self._get_search_cursor(response)
                    if params["cursor"]:
                        response = self.make_stealth_request(
                            base_url,
                            params=params,
                            headers={
                                "Referer": "https://www.roblox.com/catalog",
                                "x-csrf-token": self._generate_csrf_token()
                            },
                            advanced_spoofing=True
                        )
                        
                        if response:
                            assets = self.extract_data_from_response(response)
                            if assets:
                                for asset in assets:
                                    asset['keyword'] = keyword
                                results.extend(assets)
                    
                    # Also check subcategories if no specific category was provided
                    if not category:
                        subcategories = ["Accessories", "Animations", "AvatarShop", "BodyParts", "Clothing", "Collectibles"]
                        for subcat in subcategories:
                            params = {
                                "keyword": encoded_keyword, # Use the encoded keyword here too
                                "category": subcat,
                                "limit": 60,
                                "sortType": 0
                            }
                            
                            # Add delay between subcategory searches
                            time.sleep(random.uniform(1.0, 2.0))
                            
                            response = self.make_stealth_request(
                                base_url,
                                params=params,
                                headers={
                                    "Referer": f"https://www.roblox.com/catalog?Category={subcat}",
                                    "x-csrf-token": self._generate_csrf_token()
                                },
                                advanced_spoofing=True
                            )
                            
                            if response:
                                assets = self.extract_data_from_response(response)
                                if assets:
                                    for asset in assets:
                                        asset['keyword'] = keyword
                                        asset['subcategory'] = subcat
                                    results.extend(assets)
            except Exception as e:
                logger.error(f"Error in catalog search for keyword '{keyword}': {str(e)}")
        
        # Deduplicate results
        unique_results = []
        seen_ids = set()
        
        for asset in results:
            if asset.get('id') not in seen_ids:
                seen_ids.add(asset.get('id'))
                unique_results.append(asset)
        
        return unique_results
    
    def _generate_csrf_token(self):
        """Generate a realistic-looking CSRF token for certain API requests"""
        # In a real implementation, this would extract the token from cookies
        # For our purposes, we'll generate a plausible looking token
        return secrets.token_hex(16)
    
    def _get_search_cursor(self, response):
        """Extract the next page cursor from a search response"""
        if not response:
            return None
            
        try:
            response_data = json.loads(response.read().decode('utf-8'))
            return response_data.get('nextPageCursor')
        except:
            return None
            
    def deep_scan_game(self, game_id, scan_bytecode=True):
        """Perform an advanced deep scan on a game to find hidden assets"""
        results = []
        
        # Build a detailed and varied scanning plan
        scan_steps = [
            # Standard endpoints
            {
                'url': f"https://games.roblox.com/v1/games?universeIds={game_id}",
                'method': 'GET',
                'desc': 'Game metadata'
            },
            {
                'url': f"https://games.roblox.com/v1/games/{game_id}/game-passes?limit=100",
                'method': 'GET',
                'desc': 'Game passes'
            },
            {
                'url': f"https://develop.roblox.com/v1/universes/{game_id}/configuration",
                'method': 'GET',
                'desc': 'Game configuration'
            },
            
            # Asset and place endpoints
            {
                'url': f"https://develop.roblox.com/v1/universes/{game_id}/places",
                'method': 'GET',
                'desc': 'Game places'
            },
            {
                'url': f"https://develop.roblox.com/v1/universes/{game_id}/assets?limit=100&assetType=All",
                'method': 'GET',
                'desc': 'Universe assets'
            },
            
            # Badge endpoints
            {
                'url': f"https://badges.roblox.com/v1/universes/{game_id}/badges?limit=100",
                'method': 'GET',
                'desc': 'Game badges'
            },
            
            # Social and community endpoints
            {
                'url': f"https://games.roblox.com/v1/games/{game_id}/social-links/list",
                'method': 'GET',
                'desc': 'Social links'
            },
            {
                'url': f"https://games.roblox.com/v1/games/{game_id}/favorites/count",
                'method': 'GET',
                'desc': 'Favorites count'
            },
            
            # Marketplace endpoints
            {
                'url': f"https://economy.roblox.com/v1/games/{game_id}/game-pass/product-info",
                'method': 'GET',
                'desc': 'Game pass product info'
            },
            {
                'url': f"https://develop.roblox.com/v1/universes/{game_id}/developer-products?limit=100",
                'method': 'GET',
                'desc': 'Developer products'
            }
        ]
        
        # Also add the game's page itself
        scan_steps.append({
            'url': f"https://www.roblox.com/games/{game_id}/",
            'method': 'GET',
            'desc': 'Game page'
        })
        
        if scan_bytecode:
            # Add the place asset download endpoints for bytecode analysis
            scan_steps.append({
                'url': f"https://assetdelivery.roblox.com/v1/asset/?id={game_id}",
                'method': 'GET',
                'desc': 'Place asset data'
            })
        
        # Execute all scans with delays and identity rotation for stealth
        for step in scan_steps:
            try:
                logger.info(f"Scanning {step['desc']} for game {game_id}")
                
                # Make request with stealth mode
                response = self.make_stealth_request(
                    step['url'],
                    method=step['method'],
                    use_identity_rotation=True,
                    advanced_spoofing=True
                )
                
                if response:
                    # Process the response based on content type
                    assets = self.extract_data_from_response(response, look_for_hidden=True)
                    if assets:
                        for asset in assets:
                            asset['game_id'] = game_id
                            asset['scan_source'] = step['desc']
                        results.extend(assets)
                    
                    # For bytecode scanning, do additional advanced analysis
                    if 'asset data' in step['desc'].lower() and scan_bytecode:
                        binary_data = response.read()
                        
                        # Use advanced bytecode analysis
                        hidden_assets = self._scan_bytecode_for_assets(binary_data)
                        if hidden_assets:
                            for asset in hidden_assets:
                                asset['game_id'] = game_id
                                asset['scan_source'] = 'bytecode_analysis'
                            results.extend(hidden_assets)
                
                # Random delay between steps to avoid detection
                time.sleep(random.uniform(1.5, 4.0))
                
            except Exception as e:
                logger.error(f"Error scanning {step['desc']} for game {game_id}: {str(e)}")
        
        # Deduplicate results
        unique_results = []
        seen_ids = set()
        
        for asset in results:
            if asset.get('id') not in seen_ids:
                seen_ids.add(asset.get('id'))
                unique_results.append(asset)
        
        return unique_results
    
    def _scan_bytecode_for_assets(self, binary_data):
        """Analyze bytecode for hidden asset references"""
        assets = []
        
        # Apply bytecode pattern matching for hidden assets
        for pattern in self.bytecode_patterns:
            matches = re.finditer(pattern, binary_data)
            
            for match in matches:
                # Get the match data
                match_data = match.group(1) if len(match.groups()) > 0 else match.group(0)
                
                # Ensure it's a string
                if not isinstance(match_data, str):
                    try:
                        match_data = match_data.decode('utf-8', errors='ignore')
                    except:
                        match_data = str(match_data)
                
                # If it's a number and looks like an asset ID
                if match_data.isdigit() and len(match_data) >= 6:
                    # Try to extract some context around the match
                    context_start = max(0, match.start() - 50)
                    context_end = min(len(binary_data), match.end() + 50)
                    context = binary_data[context_start:context_end]
                    
                    try:
                        context_text = context.decode('utf-8', errors='ignore')
                    except:
                        context_text = str(context)
                    
                    # Try to determine asset type from context
                    asset_type = self._determine_asset_type_from_bytecode(context_text)
                    
                    asset_data = {
                        'id': match_data,
                        'name': f"Hidden {asset_type if asset_type else 'Asset'} {match_data}",
                        'type': asset_type if asset_type else "Hidden",
                        'description': f"Found in bytecode: ...{context_text}...",
                        'found_at': datetime.datetime.now().isoformat(),
                        'source': 'bytecode_analysis',
                        'hidden': True
                    }
                    
                    if not any(a.get('id') == match_data for a in assets):
                        assets.append(asset_data)
        
        # Apply hidden asset signatures
        for asset_type, signatures in self.hidden_asset_signatures.items():
            for signature in signatures:
                matches = re.finditer(signature, binary_data)
                
                for match in matches:
                    # Look for asset IDs near the signature
                    context_start = max(0, match.start() - 100)
                    context_end = min(len(binary_data), match.end() + 100)
                    context = binary_data[context_start:context_end]
                    
                    # Extract asset IDs from the context
                    id_pattern = rb'(\d{6,12})'
                    id_matches = re.findall(id_pattern, context)
                    
                    if id_matches:
                        # Use the closest IDs
                        for asset_id in id_matches[:3]:
                            try:
                                asset_id = asset_id.decode('utf-8', errors='ignore')
                            except:
                                asset_id = str(asset_id)
                                
                            # Skip if it's too short or long to be an asset ID
                            if len(asset_id) < 6 or len(asset_id) > 12:
                                continue
                                
                            asset_data = {
                                'id': asset_id,
                                'name': f"Hidden {asset_type.title()} {asset_id}",
                                'type': asset_type.title(),
                                'description': f"Found using signature analysis for {asset_type}",
                                'found_at': datetime.datetime.now().isoformat(),
                                'source': 'signature_analysis',
                                'hidden': True
                            }
                            
                            if not any(a.get('id') == asset_id for a in assets):
                                assets.append(asset_data)
        
        return assets
    
    def _determine_asset_type_from_bytecode(self, context):
        """Try to determine asset type from bytecode context"""
        context_lower = context.lower()
        
        # Asset type patterns
        type_patterns = {
            'pet': ['pet', 'pets', 'animal', 'creature'],
            'egg': ['egg', 'eggs', 'hatch', 'hatching'],
            'hat': ['hat', 'hats', 'accessory'],
            'face': ['face', 'faces', 'expression'],
            'tool': ['tool', 'tools', 'gear', 'weapon'],
            'animation': ['animation', 'animations', 'emote'],
            'model': ['model', 'models', 'mesh'],
            'image': ['image', 'images', 'texture', 'decal'],
            'sound': ['sound', 'audio', 'music'],
            'gamepass': ['gamepass', 'pass'],
            'badge': ['badge', 'achievement'],
            'area': ['area', 'zone', 'map', 'location'],
            'event': ['event', 'special', 'limited']
        }
        
        for asset_type, indicators in type_patterns.items():
            if any(indicator in context_lower for indicator in indicators):
                return asset_type
                
        return None
        
    def deep_scan_all_sources(self, source_ids, max_concurrency=3):
        """Scan multiple sources with advanced techniques"""
        all_results = []
        scan_queue = queue.Queue()
        results_lock = threading.Lock()
        
        # Push all scan tasks to the queue
        for source_type, source_id in source_ids:
            scan_queue.put((source_type, source_id))
            
        def worker():
            """Thread worker to process scan tasks"""
            while not scan_queue.empty():
                try:
                    source_type, source_id = scan_queue.get(block=False)
                except queue.Empty:
                    break
                    
                try:
                    logger.info(f"Scanning {source_type} {source_id}")
                    
                    if source_type == 'developer':
                        results = self.scan_developer(source_id, deep_scan=True)
                    elif source_type == 'game':
                        results = self.deep_scan_game(source_id, scan_bytecode=True)
                    elif source_type == 'asset':
                        results = self.scan_asset(source_id, deep_scan=True)
                    elif source_type == 'keyword':
                        results = self.check_catalog_keywords([source_id], deep_scan=True)
                    elif source_type == 'group':
                        results = self.scan_group(source_id, deep_scan=True)
                    else:
                        results = []
                        
                    if results:
                        with results_lock:
                            all_results.extend(results)
                            
                except Exception as e:
                    logger.error(f"Error scanning {source_type} {source_id}: {str(e)}")
                    
                finally:
                    scan_queue.task_done()
                    
        # Start worker threads
        threads = []
        for _ in range(min(max_concurrency, len(source_ids))):
            thread = threading.Thread(target=worker)
            thread.daemon = True
            thread.start()
            threads.append(thread)
            
        # Wait for all tasks to complete
        for thread in threads:
            thread.join()
            
        # Deduplicate results
        unique_results = []
        seen_ids = set()
        
        for asset in all_results:
            if asset.get('id') not in seen_ids:
                seen_ids.add(asset.get('id'))
                unique_results.append(asset)
                
        return unique_results
        
    def scan_group(self, group_id, deep_scan=False):
        """Scan a group for assets and creator information"""
        results = []
        
        # Define endpoints
        endpoints = [
            f"https://groups.roblox.com/v1/groups/{group_id}",
            f"https://groups.roblox.com/v1/groups/{group_id}/assets?limit=100",
            f"https://groups.roblox.com/v1/groups/{group_id}/games?limit=100",
        ]
        
        if deep_scan:
            # Add more endpoints for deep scanning
            endpoints.extend([
                f"https://groups.roblox.com/v1/groups/{group_id}/roles",
                f"https://groups.roblox.com/v1/groups/{group_id}/metadata",
                f"https://thumbnails.roblox.com/v1/groups/icons?groupIds={group_id}&size=150x150&format=Png",
            ])
            
        # Scan each endpoint
        for endpoint in endpoints:
            try:
                response = self.make_stealth_request(
                    endpoint,
                    headers={"Referer": f"https://www.roblox.com/groups/{group_id}/"},
                    advanced_spoofing=True
                )
                
                if response:
                    assets = self.extract_data_from_response(response)
                    if assets:
                        for asset in assets:
                            asset['group_id'] = group_id
                        results.extend(assets)
            except Exception as e:
                logger.error(f"Error scanning group {group_id} at endpoint {endpoint}: {str(e)}")
                
        # Also scan the group's page
        try:
            group_url = f"https://www.roblox.com/groups/{group_id}/"
            response = self.make_stealth_request(
                group_url,
                headers={"Referer": "https://www.roblox.com/discover#/groups"},
                advanced_spoofing=True
            )
            
            if response:
                assets = self.extract_data_from_response(response)
                if assets:
                    for asset in assets:
                        asset['group_id'] = group_id
                    results.extend(assets)
        except Exception as e:
            logger.error(f"Error scanning group page {group_id}: {str(e)}")
        
        # Deduplicate results
        unique_results = []
        seen_ids = set()
        
        for asset in results:
            if asset.get('id') not in seen_ids:
                seen_ids.add(asset.get('id'))
                unique_results.append(asset)
        
        return unique_results