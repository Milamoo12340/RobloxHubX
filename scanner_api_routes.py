"""
API Routes for Enhanced PS99 Asset Scanner

This module provides the API endpoints to interact with the enhanced scanning capabilities
for the PS99 Developer Tracker. It connects the web UI to the enhanced scanner modules.
"""

import logging
import json
from datetime import datetime
from flask import Blueprint, jsonify, request

# Import our enhanced scanner components
from scanner_bypass_integration import (
    start_background_scanner, 
    run_quick_scan,
    search_for_anubis,
    search_for_developer_testing,
    check_specific_assets,
    get_scan_stats,
    get_recent_discoveries,
    reset_stats
)

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for API routes
scanner_api = Blueprint('scanner_api', __name__)

@scanner_api.route('/api/scan/stats', methods=['GET'])
def api_scan_stats():
    """Get current scanner statistics"""
    try:
        stats = get_scan_stats()
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting scanner stats: {e}")
        return jsonify({"error": str(e)}), 500

@scanner_api.route('/api/scan/stats/reset', methods=['POST'])
def api_reset_stats():
    """Reset scanner statistics"""
    try:
        result = reset_stats()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error resetting scanner stats: {e}")
        return jsonify({"error": str(e)}), 500

@scanner_api.route('/api/scan/discoveries', methods=['GET'])
def api_recent_discoveries():
    """Get recent asset discoveries"""
    try:
        # Get limit from request parameters, default to 50
        limit = request.args.get('limit', 50, type=int)
        discoveries = get_recent_discoveries(limit=limit)
        
        return jsonify({
            "discoveries": discoveries,
            "count": len(discoveries),
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting recent discoveries: {e}")
        return jsonify({"error": str(e)}), 500

@scanner_api.route('/api/scan/quick', methods=['GET'])
def api_quick_scan():
    """Run a quick scan"""
    try:
        results = run_quick_scan()
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error running quick scan: {e}")
        return jsonify({"error": str(e)}), 500

@scanner_api.route('/api/scan/anubis', methods=['GET'])
def api_anubis_scan():
    """Run a targeted scan for Anubis update content"""
    try:
        results = search_for_anubis()
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error scanning for Anubis update: {e}")
        return jsonify({"error": str(e)}), 500

@scanner_api.route('/api/scan/developer-testing', methods=['GET'])
def api_developer_testing_scan():
    """Run a targeted scan for developer testing areas"""
    try:
        results = search_for_developer_testing()
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error scanning for developer testing areas: {e}")
        return jsonify({"error": str(e)}), 500

@scanner_api.route('/api/scan/background/start', methods=['POST'])
def api_start_background_scanner():
    """Start the background scanner"""
    try:
        # Get interval from request parameters, default to 24 hours
        interval_hours = request.json.get('interval_hours', 24)
        result = start_background_scanner(interval_hours=interval_hours)
        
        if result:
            return jsonify({
                "success": True,
                "message": f"Background scanner started with {interval_hours} hour interval"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Background scanner is already running"
            })
    except Exception as e:
        logger.error(f"Error starting background scanner: {e}")
        return jsonify({"error": str(e)}), 500

@scanner_api.route('/api/scan/assets', methods=['POST'])
def api_check_specific_assets():
    """Check specific asset IDs"""
    try:
        # Get asset IDs from request body
        data = request.json
        asset_ids = data.get('asset_ids', [])
        
        if not asset_ids:
            return jsonify({"error": "No asset IDs provided"}), 400
        
        results = check_specific_assets(asset_ids)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error checking specific assets: {e}")
        return jsonify({"error": str(e)}), 500

# Import this blueprint in your main app file
# from scanner_api_routes import scanner_api
# app.register_blueprint(scanner_api)