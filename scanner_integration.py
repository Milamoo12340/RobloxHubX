"""
PS99 Scanner Integration Module

This module integrates the advanced bypass techniques with the existing scanner.
It replaces the standard request methods with our advanced bypass methods.
"""

import os
import sys
import logging
import threading
import importlib
import types
from typing import Any, Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import the bypass module
try:
    from advanced_bypass import bypass
    BYPASS_AVAILABLE = True
    logger.info("Advanced bypass module loaded successfully")
except ImportError as e:
    BYPASS_AVAILABLE = False
    logger.error(f"Failed to load advanced bypass module: {e}")

def patch_scanner_module(module_name: str = "comprehensive_roblox_scanner"):
    """
    Patch the scanner module to use our advanced bypass techniques.
    
    Args:
        module_name: The name of the module to patch
    """
    if not BYPASS_AVAILABLE:
        logger.error("Advanced bypass module not available, cannot patch scanner")
        return False
    
    try:
        # Import or reload the module
        if module_name in sys.modules:
            module = importlib.reload(sys.modules[module_name])
        else:
            module = importlib.import_module(module_name)
        
        # Look for request-making methods in the module and patch them
        patched_count = 0
        
        # Find all classes in the module
        for class_name in dir(module):
            if class_name.startswith('_'):
                continue
                
            attr = getattr(module, class_name)
            if not isinstance(attr, type):
                continue
                
            # Look for methods in the class
            for method_name in dir(attr):
                if method_name.startswith('_make_request') or method_name == 'make_request':
                    # Get original method
                    original_method = getattr(attr, method_name)
                    
                    # Create patched method
                    def patched_make_request(self, url, method="GET", data=None, json_data=None, **kwargs):
                        # Log what we're doing
                        logger.debug(f"Using advanced bypass for request to {url}")
                        
                        # Use our bypass
                        success, response_data, content_type = bypass.make_request(
                            url=url,
                            method=method,
                            data=data,
                            json_data=json_data,
                            **kwargs
                        )
                        
                        # Convert to the format expected by the original method
                        return success, response_data
                    
                    # Set docstring and name
                    patched_make_request.__doc__ = original_method.__doc__
                    patched_make_request.__name__ = original_method.__name__
                    
                    # Replace the method
                    setattr(attr, method_name, patched_make_request)
                    patched_count += 1
                    logger.info(f"Patched {class_name}.{method_name} with advanced bypass")
        
        if patched_count == 0:
            logger.warning(f"No request methods found to patch in {module_name}")
            return False
        
        logger.info(f"Successfully patched {patched_count} methods in {module_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error patching scanner module: {e}")
        return False

def disable_auto_scanning():
    """
    Disable automatic scanning in the application.
    """
    try:
        # Try to find app.py and disable auto-scanning
        if 'app' in sys.modules:
            app_module = sys.modules['app']
            
            # Look for auto-scan settings
            if hasattr(app_module, 'auto_scan_enabled'):
                setattr(app_module, 'auto_scan_enabled', False)
                logger.info("Disabled auto-scanning through app module variable")
                
            # Look for scan interval and set it very high
            if hasattr(app_module, 'SCAN_INTERVAL'):
                setattr(app_module, 'SCAN_INTERVAL', 31536000)  # 1 year in seconds
                logger.info("Set scan interval to 1 year")
                
            # Look for background scanner thread
            thread_attrs = ['scan_thread', 'background_thread', 'auto_scan_thread', 'scheduler_thread']
            for attr in thread_attrs:
                if hasattr(app_module, attr):
                    thread = getattr(app_module, attr)
                    if isinstance(thread, threading.Thread) and thread.is_alive():
                        # We can't actually stop the thread, but we can flag it to stop
                        if hasattr(thread, 'stop'):
                            thread.stop = True
                            logger.info(f"Flagged {attr} to stop")
                        
                        # Set to None to prevent reuse
                        setattr(app_module, attr, None)
                        logger.info(f"Cleared {attr} thread reference")
            
        # Try to find settings in database
        from disable_auto_scan import disable_auto_scan
        if disable_auto_scan():
            logger.info("Successfully disabled auto-scanning through database settings")
        
        return True
    except Exception as e:
        logger.error(f"Error disabling auto-scanning: {e}")
        return False

def integrate():
    """
    Integrate the advanced bypass and disable auto-scanning.
    """
    # Check if we're already integrated
    if getattr(sys, '_scanner_integrated', False):
        logger.info("Scanner integration already completed")
        return True
    
    success = False
    
    # Patch scanner modules
    scanner_modules = ['comprehensive_roblox_scanner', 'advanced_roblox_scanner', 'collection_roblox_scanner']
    for module_name in scanner_modules:
        try:
            if patch_scanner_module(module_name):
                success = True
        except Exception as e:
            logger.error(f"Error patching {module_name}: {e}")
    
    # Disable auto-scanning
    try:
        if disable_auto_scanning():
            success = True
    except Exception as e:
        logger.error(f"Error disabling auto-scanning: {e}")
    
    # Mark as integrated
    setattr(sys, '_scanner_integrated', True)
    
    return success

# Auto-integrate when imported
if __name__ != "__main__":
    integrate()

# For testing
if __name__ == "__main__":
    logger.info("Testing scanner integration...")
    success = integrate()
    logger.info(f"Integration {'successful' if success else 'failed'}")
    
    # Test a request
    if BYPASS_AVAILABLE:
        logger.info("Testing request bypass...")
        success, response, content_type = bypass.make_request("https://www.roblox.com/games/8737899170/Pet-Simulator-99")
        logger.info(f"Request success: {success}")
        logger.info(f"Content type: {content_type}")
        if success:
            logger.info(f"Response length: {len(str(response))}")
    else:
        logger.info("Bypass module not available, skipping request test")