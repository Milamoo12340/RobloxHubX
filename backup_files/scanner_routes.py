"""
PS99 Scanner Routes

This module provides routes for managing and visualizing the PS99 Scanner system.
It integrates with the main Flask application.
"""

import os
import json
import time
import sqlite3
import datetime
import subprocess
import logging
from flask import Blueprint, render_template, request, redirect, url_for, jsonify, Response, send_from_directory

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
scanner_bp = Blueprint('scanner', __name__, url_prefix='/scanner')

# Scanner status
scanner_running = False
last_scan_time = None
scan_log = []

# Database paths
MAIN_DB_PATH = "ps99_leaks.db"
HYBRID_DB_PATH = "ps99_hybrid_leaks.db"
REPORT_DIR = "compiled_leaks"

def get_scanner_status():
    """Get the current status of scanners"""
    global scanner_running, last_scan_time
    
    # Check if we have a last scan time file
    if os.path.exists("last_scan_time.txt"):
        with open("last_scan_time.txt", "r") as f:
            last_scan_txt = f.read()
            for line in last_scan_txt.split("\n"):
                if "Last scan completed at:" in line:
                    time_str = line.replace("Last scan completed at:", "").strip()
                    try:
                        last_scan_time = datetime.datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
                    except:
                        pass
    
    # Count total assets
    asset_count = 0
    if os.path.exists(MAIN_DB_PATH):
        try:
            conn = sqlite3.connect(MAIN_DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM assets")
            asset_count = cursor.fetchone()[0]
            conn.close()
        except Exception as e:
            logger.error(f"Error counting assets: {e}")
    
    # Count assets in hybrid db
    hybrid_asset_count = 0
    if os.path.exists(HYBRID_DB_PATH):
        try:
            conn = sqlite3.connect(HYBRID_DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM leaked_assets")
            hybrid_asset_count = cursor.fetchone()[0]
            conn.close()
        except Exception as e:
            logger.error(f"Error counting hybrid assets: {e}")
        
    return {
        "running": scanner_running,
        "last_scan_time": last_scan_time,
        "asset_count": asset_count,
        "hybrid_asset_count": hybrid_asset_count,
        "scan_log": scan_log
    }

def get_recent_assets(limit=100, include_hidden=False):
    """Get recent assets from the database"""
    assets = []
    
    if os.path.exists(MAIN_DB_PATH):
        try:
            conn = sqlite3.connect(MAIN_DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Check if verified column exists
            cursor.execute("PRAGMA table_info(assets)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            has_verified = "verified" in column_names
            has_category = "category" in column_names
            has_timestamp = "timestamp" in column_names
            
            # Use discovered_date if timestamp is not available
            order_by = "timestamp" if has_timestamp else "discovered_date"
            
            if has_category and not include_hidden:
                cursor.execute(f"SELECT * FROM assets WHERE category != 'UNKNOWN' ORDER BY {order_by} DESC LIMIT ?", (limit,))
            else:
                cursor.execute(f"SELECT * FROM assets ORDER BY {order_by} DESC LIMIT ?", (limit,))
            
            assets = [dict(row) for row in cursor.fetchall()]
            
            # Add verified status if missing
            if not has_verified:
                for asset in assets:
                    asset["verified"] = 0
            
            conn.close()
        except Exception as e:
            logger.error(f"Error getting recent assets: {e}")
    
    return assets

def get_assets_by_category(category, limit=50):
    """Get assets by category"""
    assets = []
    
    if os.path.exists(MAIN_DB_PATH):
        try:
            conn = sqlite3.connect(MAIN_DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Check if category column exists
            cursor.execute("PRAGMA table_info(assets)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            has_category = "category" in column_names
            has_timestamp = "timestamp" in column_names
            
            # Use discovered_date if timestamp is not available
            order_by = "timestamp" if has_timestamp else "discovered_date"
            
            if has_category:
                cursor.execute(f"SELECT * FROM assets WHERE category = ? ORDER BY {order_by} DESC LIMIT ?", 
                            (category, limit))
                assets = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
        except Exception as e:
            logger.error(f"Error getting assets by category: {e}")
    
    return assets

def run_scan_async(scan_type, max_devs=None, max_groups=None):
    """Run a scan process asynchronously"""
    global scanner_running, scan_log
    
    if scanner_running:
        return False, "Scanner is already running"
    
    try:
        scanner_running = True
        scan_log.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Starting {scan_type} scan...")
        
        # Build command based on scan type
        if scan_type == "comprehensive":
            cmd = ["python", "ps99_comprehensive_leaks_scanner.py"]
            if max_devs:
                cmd = ["python", "-c", f"import ps99_comprehensive_leaks_scanner; ps99_comprehensive_leaks_scanner.run_comprehensive_scan(max_devs={max_devs}, max_groups={max_groups})"]
        elif scan_type == "hybrid":
            cmd = ["python", "ps99_hybrid_advanced_scanner.py"]
        elif scan_type == "all":
            cmd = ["python", "run_all_scanners_and_compile.py"]
        else:
            scanner_running = False
            return False, f"Unknown scan type: {scan_type}"
        
        # Run the process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        
        # Process the output asynchronously
        def process_output():
            for line in process.stdout:
                line = line.strip()
                if line:
                    scan_log.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {line}")
                    if len(scan_log) > 100:  # Keep log to reasonable size
                        scan_log.pop(0)
                        
            # Process finished
            process.wait()
            global scanner_running
            scanner_running = False
            
            # Record the scan time
            now = datetime.datetime.now()
            scan_log.append(f"[{now.strftime('%H:%M:%S')}] Scan completed")
            with open("last_scan_time.txt", "w") as f:
                f.write(f"Last scan completed at: {now.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Scan type: {scan_type}\n")
        
        # Start processing in a separate thread
        import threading
        threading.Thread(target=process_output, daemon=True).start()
        
        return True, f"Started {scan_type} scan"
    except Exception as e:
        scanner_running = False
        return False, str(e)

# Routes

@scanner_bp.route('/')
def index():
    """Main page with scanner status and controls"""
    status = get_scanner_status()
    assets = get_recent_assets(limit=10)
    
    # Get category counts
    category_counts = {}
    if os.path.exists(MAIN_DB_PATH):
        try:
            conn = sqlite3.connect(MAIN_DB_PATH)
            cursor = conn.cursor()
            
            # Check if category column exists
            cursor.execute("PRAGMA table_info(assets)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            if "category" in column_names:
                cursor.execute("SELECT category, COUNT(*) FROM assets GROUP BY category")
                for category, count in cursor.fetchall():
                    if category and category != "UNKNOWN":
                        category_counts[category] = count
            
            conn.close()
        except Exception as e:
            logger.error(f"Error getting category counts: {e}")
    
    return render_template(
        'scanner_index.html', 
        status=status, 
        assets=assets,
        category_counts=category_counts
    )

@scanner_bp.route('/assets')
def view_assets():
    """View asset list"""
    category = request.args.get('category', None)
    include_hidden = request.args.get('include_hidden', '0') == '1'
    
    if category:
        assets = get_assets_by_category(category)
        return render_template('asset_list.html', assets=assets, category=category)
    else:
        assets = get_recent_assets(include_hidden=include_hidden)
        return render_template('asset_list.html', assets=assets, category=None)

@scanner_bp.route('/asset/<int:asset_id>')
def view_asset(asset_id):
    """View a specific asset"""
    if os.path.exists(MAIN_DB_PATH):
        try:
            conn = sqlite3.connect(MAIN_DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
            asset = cursor.fetchone()
            
            if asset:
                asset = dict(asset)
                
                # Check if we have an image or thumbnail data
                image_path = os.path.join("static/images/assets", f"{asset_id}.png")
                asset['has_image'] = os.path.exists(image_path) or asset.get('thumbnail_data') is not None
                
                # Use thumbnail data if available
                if asset.get('thumbnail_data') is not None and not os.path.exists(image_path):
                    # Save thumbnail data to file
                    with open(image_path, 'wb') as f:
                        f.write(asset['thumbnail_data'])
                
                asset['image_url'] = f"/static/images/assets/{asset_id}.png" if asset['has_image'] else None
                
                # Map database fields to display fields
                if asset.get('asset_type'):
                    asset['type'] = asset.get('asset_type')
                    
                if asset.get('discovered_date'):
                    import datetime
                    asset['timestamp'] = datetime.datetime.fromtimestamp(asset.get('discovered_date')).strftime('%Y-%m-%d %H:%M:%S')
                
                return render_template('asset_detail.html', asset=asset)
        except Exception as e:
            logger.error(f"Error viewing asset: {e}")
    
    return "Asset not found", 404

@scanner_bp.route('/start_scan', methods=['POST'])
def start_scan():
    """Start a new scan process"""
    scan_type = request.form.get('scan_type', 'comprehensive')
    max_devs = request.form.get('max_devs', None)
    max_groups = request.form.get('max_groups', None)
    
    # Convert to integers if provided
    if max_devs and max_devs.isdigit():
        max_devs = int(max_devs)
    elif max_devs == "all":
        max_devs = None  # Scan all developers 
    else:
        max_devs = 3  # Default to 3 developers for focused scans
        
    if max_groups and max_groups.isdigit():
        max_groups = int(max_groups)
    elif max_groups == "all":
        max_groups = None  # Scan all groups
    else:
        max_groups = 1  # Default to 1 group for focused scans
    
    success, message = run_scan_async(scan_type, max_devs, max_groups)
    
    if success:
        return redirect(url_for('scanner.scan_status'))
    else:
        return f"Error: {message}", 500

@scanner_bp.route('/scan_status')
def scan_status():
    """View the current scan status"""
    status = get_scanner_status()
    return render_template('scan_status.html', status=status)

@scanner_bp.route('/api/status')
def api_status():
    """Return status as JSON for AJAX updates"""
    status = get_scanner_status()
    return jsonify(status)

@scanner_bp.route('/log_stream')
def log_stream():
    """Server-sent events stream for scan logs"""
    def generate():
        # Send current log first
        global scan_log
        yield f"data: {json.dumps(scan_log)}\n\n"
        
        # Send updates
        last_size = len(scan_log)
        while True:
            time.sleep(1)
            if len(scan_log) != last_size:
                yield f"data: {json.dumps(scan_log)}\n\n"
                last_size = len(scan_log)
    
    return Response(generate(), mimetype='text/event-stream')

@scanner_bp.route('/reports/<path:filename>')
def reports(filename):
    """Serve scanner reports"""
    return send_from_directory(REPORT_DIR, filename)

# Initialize templates
def initialize_templates():
    """Initialize template files if they don't exist"""
    
    # Ensure templates directory exists
    os.makedirs('templates', exist_ok=True)
    
    # Create a placeholder image
    os.makedirs('static/images', exist_ok=True)
    placeholder_path = 'static/images/placeholder.png'
    if not os.path.exists(placeholder_path):
        # Base64 encoded small placeholder image (1x1 pixel)
        import base64
        placeholder = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==')
        with open(placeholder_path, 'wb') as f:
            f.write(placeholder)
    
    # Index template
    template_path = 'templates/scanner_index.html'
    if not os.path.exists(template_path):
        with open(template_path, 'w') as f:
            f.write('''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PS99 Leak Scanner</title>
    <link href="https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css" rel="stylesheet">
    <style>
        body {
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
        }
        .asset-image {
            max-width: 100px;
            height: 100px;
            object-fit: contain;
            background-color: #333;
            border-radius: 4px;
        }
        .status-card {
            border-left: 4px solid #0d6efd;
        }
        .status-card.running {
            border-left-color: #28a745;
        }
        .asset-box {
            transition: all 0.2s ease;
        }
        .asset-box:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .category-badge {
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            margin-right: 0.3rem;
        }
        .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 5px;
        }
        .status-dot.idle {
            background-color: #6c757d;
        }
        .status-dot.running {
            background-color: #28a745;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
            100% {
                opacity: 1;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="py-3 mb-4 border-bottom">
            <h1 class="display-6">PS99 Leak Scanner</h1>
            <p class="lead text-muted">Monitor and track upcoming PS99 features and assets from verified BIG Games sources</p>
        </div>

        <div class="row mb-4">
            <div class="col-md-6">
                <div class="card status-card {% if status.running %}running{% endif %}">
                    <div class="card-body">
                        <h5 class="card-title">
                            <span class="status-dot {% if status.running %}running{% else %}idle{% endif %}"></span>
                            Scanner Status
                        </h5>
                        <p class="card-text">
                            Status: <strong>{% if status.running %}Running{% else %}Idle{% endif %}</strong><br>
                            Last Scan: <strong>{{ status.last_scan_time or "Never" }}</strong><br>
                            Assets: <strong>{{ status.asset_count }}</strong> (+ {{ status.hybrid_asset_count }} hybrid scanner)<br>
                        </p>
                        <a href="{{ url_for('scanner.scan_status') }}" class="btn btn-primary">View Detailed Status</a>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Start New Scan</h5>
                        <form method="post" action="{{ url_for('scanner.start_scan') }}">
                            <div class="mb-3">
                                <label for="scan_type" class="form-label">Scan Type</label>
                                <select class="form-select" id="scan_type" name="scan_type">
                                    <option value="comprehensive">Comprehensive (Rate-Limited)</option>
                                    <option value="hybrid">Hybrid Advanced (Selenium)</option>
                                    <option value="all">All Scanners + Compile</option>
                                </select>
                            </div>
                            <div class="row mb-3">
                                <div class="col">
                                    <label for="max_devs" class="form-label">Max Developers</label>
                                    <input type="number" class="form-control" id="max_devs" name="max_devs" min="1" max="17" value="3">
                                </div>
                                <div class="col">
                                    <label for="max_groups" class="form-label">Max Groups</label>
                                    <input type="number" class="form-control" id="max_groups" name="max_groups" min="1" max="3" value="1">
                                </div>
                            </div>
                            <button type="submit" class="btn btn-success" {% if status.running %}disabled{% endif %}>
                                Start Scan
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Categories</h5>
                        <a href="{{ url_for('scanner.view_assets') }}" class="btn btn-sm btn-outline-primary">View All Assets</a>
                    </div>
                    <div class="card-body">
                        <div class="d-flex flex-wrap gap-2">
                            {% for category, count in category_counts.items() %}
                                <a href="{{ url_for('scanner.view_assets', category=category) }}" class="btn btn-outline-info">
                                    {{ category }} <span class="badge bg-info">{{ count }}</span>
                                </a>
                            {% else %}
                                <p>No categories found</p>
                            {% endfor %}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Recent Assets</h5>
                        <a href="{{ url_for('scanner.view_assets') }}" class="btn btn-sm btn-outline-primary">View All</a>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            {% for asset in assets %}
                                <div class="col-md-6 mb-3">
                                    <div class="card asset-box">
                                        <div class="card-body p-3">
                                            <div class="d-flex">
                                                <div class="me-3">
                                                    <img src="/static/images/assets/{{ asset.id }}.png" class="asset-image" onerror="this.src='/static/images/placeholder.png'" alt="{{ asset.name }}">
                                                </div>
                                                <div>
                                                    <h6 class="card-title mb-1">
                                                        <a href="{{ url_for('scanner.view_asset', asset_id=asset.id) }}">{{ asset.name }}</a>
                                                    </h6>
                                                    <p class="card-text mb-1 text-muted small">{{ asset.creator }}</p>
                                                    {% if asset.category and asset.category != "UNKNOWN" %}
                                                        <span class="badge bg-info category-badge">{{ asset.category }}</span>
                                                    {% endif %}
                                                    {% if asset.verified == 1 %}
                                                        <span class="badge bg-success category-badge">Verified</span>
                                                    {% endif %}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {% else %}
                                <div class="col-12">
                                    <p>No assets found. Run a scan to discover new assets.</p>
                                </div>
                            {% endfor %}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Auto-refresh status every 10 seconds
        setInterval(function() {
            fetch('{{ url_for("scanner.api_status") }}')
                .then(response => response.json())
                .then(data => {
                    const statusDot = document.querySelector('.status-dot');
                    const statusCard = document.querySelector('.status-card');
                    
                    if (data.running) {
                        statusDot.classList.remove('idle');
                        statusDot.classList.add('running');
                        statusCard.classList.add('running');
                        document.querySelector('button[type="submit"]').disabled = true;
                    } else {
                        statusDot.classList.remove('running');
                        statusDot.classList.add('idle');
                        statusCard.classList.remove('running');
                        document.querySelector('button[type="submit"]').disabled = false;
                    }
                });
        }, 10000);
    </script>
</body>
</html>''')
    
    # Asset list template
    template_path = 'templates/asset_list.html'
    if not os.path.exists(template_path):
        with open(template_path, 'w') as f:
            f.write('''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PS99 Assets{% if category %} - {{ category }}{% endif %}</title>
    <link href="https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css" rel="stylesheet">
    <style>
        body {
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
        }
        .asset-image {
            width: 80px;
            height: 80px;
            object-fit: contain;
            background-color: #333;
            border-radius: 4px;
        }
        .asset-row:hover {
            background-color: rgba(255, 255, 255, 0.05);
        }
        .category-badge {
            font-size: 0.75rem;
            padding: 0.2rem 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="py-3 mb-4 border-bottom d-flex justify-content-between align-items-center">
            <div>
                <h1 class="display-6">PS99 Assets</h1>
                {% if category %}
                <p class="lead text-muted">Category: {{ category }}</p>
                {% endif %}
            </div>
            <div>
                <a href="{{ url_for('scanner.index') }}" class="btn btn-outline-primary">Back to Dashboard</a>
            </div>
        </div>

        <div class="card">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Name</th>
                                <th>Creator</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for asset in assets %}
                                <tr class="asset-row">
                                    <td>
                                        <img src="/static/images/assets/{{ asset.id }}.png" class="asset-image" onerror="this.src='/static/images/placeholder.png'" alt="{{ asset.name }}">
                                    </td>
                                    <td>
                                        {{ asset.name }}
                                        {% if asset.verified == 1 %}
                                            <span class="badge bg-success category-badge">Verified</span>
                                        {% endif %}
                                    </td>
                                    <td>{{ asset.creator }}</td>
                                    <td>{{ asset.type }}</td>
                                    <td>
                                        {% if asset.category and asset.category != "UNKNOWN" %}
                                            <span class="badge bg-info">{{ asset.category }}</span>
                                        {% else %}
                                            <span class="badge bg-secondary">Unknown</span>
                                        {% endif %}
                                    </td>
                                    <td>{{ asset.created }}</td>
                                    <td>
                                        <a href="{{ url_for('scanner.view_asset', asset_id=asset.id) }}" class="btn btn-sm btn-primary">View</a>
                                    </td>
                                </tr>
                            {% else %}
                                <tr>
                                    <td colspan="7" class="text-center py-4">No assets found</td>
                                </tr>
                            {% endfor %}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</body>
</html>''')
    
    # Asset detail template
    template_path = 'templates/asset_detail.html'
    if not os.path.exists(template_path):
        with open(template_path, 'w') as f:
            f.write('''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PS99 Asset - {{ asset.name }}</title>
    <link href="https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css" rel="stylesheet">
    <style>
        body {
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
        }
        .asset-image-lg {
            max-width: 100%;
            max-height: 400px;
            object-fit: contain;
            background-color: #333;
            border-radius: 8px;
        }
        .category-badge {
            font-size: 0.8rem;
            padding: 0.25rem 0.75rem;
        }
        .metadata-label {
            font-weight: bold;
            color: #adb5bd;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="py-3 mb-4 border-bottom d-flex justify-content-between align-items-center">
            <h1 class="h3">{{ asset.name }}</h1>
            <div>
                <a href="{{ url_for('scanner.view_assets') }}" class="btn btn-outline-primary">Back to Assets</a>
                <a href="{{ url_for('scanner.index') }}" class="btn btn-outline-secondary">Dashboard</a>
            </div>
        </div>

        <div class="row">
            <div class="col-md-6">
                {% if asset.has_image %}
                    <img src="{{ asset.image_url }}" class="asset-image-lg mb-4" alt="{{ asset.name }}">
                {% else %}
                    <div class="bg-dark p-5 d-flex justify-content-center align-items-center mb-4 rounded">
                        <p class="text-muted">No image available</p>
                    </div>
                {% endif %}
                
                <div class="d-flex gap-2 mb-4">
                    {% if asset.category and asset.category != "UNKNOWN" %}
                        <span class="badge bg-info category-badge">{{ asset.category }}</span>
                    {% endif %}
                    {% if asset.verified == 1 %}
                        <span class="badge bg-success category-badge">Verified</span>
                    {% endif %}
                    {% if asset.type %}
                        <span class="badge bg-secondary category-badge">{{ asset.type }}</span>
                    {% endif %}
                </div>
                
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="card-title mb-0">Description</h5>
                    </div>
                    <div class="card-body">
                        {% if asset.description %}
                            <p>{{ asset.description }}</p>
                        {% else %}
                            <p class="text-muted">No description available</p>
                        {% endif %}
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h5 class="card-title mb-0">External Links</h5>
                    </div>
                    <div class="card-body">
                        <a href="https://www.roblox.com/library/{{ asset.id }}" class="btn btn-primary" target="_blank">
                            View on Roblox
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="card-title mb-0">Asset Information</h5>
                    </div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span class="metadata-label">Asset ID</span>
                                <span>{{ asset.id }}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span class="metadata-label">Creator</span>
                                <span>{{ asset.creator }}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span class="metadata-label">Creator ID</span>
                                <span>{{ asset.creator_id }}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span class="metadata-label">Created</span>
                                <span>{{ asset.created }}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span class="metadata-label">Last Updated</span>
                                <span>{{ asset.updated }}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span class="metadata-label">Scanned At</span>
                                <span>{{ asset.timestamp }}</span>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h5 class="card-title mb-0">Scanner Information</h5>
                    </div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span class="metadata-label">Source</span>
                                <span>{{ asset.source }}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span class="metadata-label">Verification Status</span>
                                <span>
                                    {% if asset.verified == 1 %}
                                        <span class="badge bg-success">Verified</span>
                                    {% else %}
                                        <span class="badge bg-warning">Unverified</span>
                                    {% endif %}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>''')
    
    # Scan status template
    template_path = 'templates/scan_status.html'
    if not os.path.exists(template_path):
        with open(template_path, 'w') as f:
            f.write('''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PS99 Scanner Status</title>
    <link href="https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css" rel="stylesheet">
    <style>
        body {
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
        }
        .status-card {
            border-left: 4px solid #0d6efd;
        }
        .status-card.running {
            border-left-color: #28a745;
        }
        .status-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }
        .status-dot.idle {
            background-color: #6c757d;
        }
        .status-dot.running {
            background-color: #28a745;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
            100% {
                opacity: 1;
            }
        }
        .log-container {
            height: 400px;
            overflow-y: auto;
            background-color: #212529;
            border-radius: 4px;
            padding: 1rem;
            font-family: monospace;
            font-size: 0.9rem;
        }
        .log-container p {
            margin: 0;
            padding: 2px 0;
        }
        .log-timestamp {
            color: #6c757d;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="py-3 mb-4 border-bottom d-flex justify-content-between align-items-center">
            <h1 class="display-6">Scanner Status</h1>
            <div>
                <a href="{{ url_for('scanner.index') }}" class="btn btn-outline-primary">Back to Dashboard</a>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-md-6">
                <div class="card status-card {% if status.running %}running{% endif %}">
                    <div class="card-body">
                        <h5 class="card-title">
                            <span class="status-dot {% if status.running %}running{% else %}idle{% endif %}"></span>
                            Current Status
                        </h5>
                        <p class="card-text">
                            Status: <strong>{% if status.running %}Running{% else %}Idle{% endif %}</strong><br>
                            Last Scan: <strong>{{ status.last_scan_time or "Never" }}</strong><br>
                            Assets: <strong>{{ status.asset_count }}</strong> (+ {{ status.hybrid_asset_count }} hybrid scanner)<br>
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Start New Scan</h5>
                        <form method="post" action="{{ url_for('scanner.start_scan') }}">
                            <div class="mb-3">
                                <label for="scan_type" class="form-label">Scan Type</label>
                                <select class="form-select" id="scan_type" name="scan_type">
                                    <option value="comprehensive">Comprehensive (Rate-Limited)</option>
                                    <option value="hybrid">Hybrid Advanced (Selenium)</option>
                                    <option value="all">All Scanners + Compile</option>
                                </select>
                            </div>
                            <div class="row mb-3">
                                <div class="col">
                                    <label for="max_devs" class="form-label">Max Developers</label>
                                    <input type="number" class="form-control" id="max_devs" name="max_devs" min="1" max="17" value="3">
                                </div>
                                <div class="col">
                                    <label for="max_groups" class="form-label">Max Groups</label>
                                    <input type="number" class="form-control" id="max_groups" name="max_groups" min="1" max="3" value="1">
                                </div>
                            </div>
                            <button type="submit" class="btn btn-success" {% if status.running %}disabled{% endif %}>
                                Start Scan
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">Scan Log</h5>
            </div>
            <div class="card-body">
                <div class="log-container" id="logContainer">
                    {% for log_entry in status.scan_log %}
                        <p>{{ log_entry }}</p>
                    {% else %}
                        <p class="text-muted">No log entries yet</p>
                    {% endfor %}
                </div>
            </div>
        </div>
    </div>

    <script>
        // Auto-scroll to bottom of log
        const logContainer = document.getElementById('logContainer');
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // Set up SSE for log updates
        const evtSource = new EventSource("{{ url_for('scanner.log_stream') }}");
        evtSource.onmessage = function(event) {
            const logs = JSON.parse(event.data);
            let logHtml = '';
            
            logs.forEach(log => {
                logHtml += `<p>${log}</p>`;
            });
            
            logContainer.innerHTML = logHtml;
            logContainer.scrollTop = logContainer.scrollHeight;
        };
        
        // Auto-refresh status every 3 seconds
        setInterval(function() {
            fetch('{{ url_for("scanner.api_status") }}')
                .then(response => response.json())
                .then(data => {
                    const statusDot = document.querySelector('.status-dot');
                    const statusCard = document.querySelector('.status-card');
                    const runButton = document.querySelector('button[type="submit"]');
                    
                    if (data.running) {
                        statusDot.classList.remove('idle');
                        statusDot.classList.add('running');
                        statusCard.classList.add('running');
                        runButton.disabled = true;
                    } else {
                        statusDot.classList.remove('running');
                        statusDot.classList.add('idle');
                        statusCard.classList.remove('running');
                        runButton.disabled = false;
                    }
                });
        }, 3000);
    </script>
</body>
</html>''')

# Initialize templates
initialize_templates()

# Add more template initialization if needed
def initialize_more_templates():
    """Initialize additional template files if they don't exist"""
    
    # Asset list template
    template_path = 'templates/asset_list.html'
    if not os.path.exists(template_path):
        with open(template_path, 'w') as f:
            f.write('''{% extends 'layout.html' %}

{% block title %}PS99 Asset List{% endblock %}

{% block content %}
<div class="container mt-4">
    <div class="card">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
            <h4 class="mb-0">{% if category %}{{ category }} Assets{% else %}Recent Assets{% endif %}</h4>
            <a href="{{ url_for('scanner.index') }}" class="btn btn-outline-light btn-sm">Back to Scanner</a>
        </div>
        <div class="card-body">
            {% if assets %}
                <div class="row">
                    {% for asset in assets %}
                        <div class="col-md-4 mb-4">
                            <div class="card h-100 asset-box">
                                <div class="card-header {% if asset.verified %}bg-success text-white{% else %}bg-secondary text-white{% endif %}">
                                    <h5 class="card-title mb-0 text-truncate">{{ asset.name }}</h5>
                                </div>
                                <div class="card-body">
                                    <div class="text-center mb-3">
                                        <img src="/static/images/assets/{{ asset.id }}.png" 
                                             onerror="this.src='/static/images/placeholder.png'"
                                             class="asset-image mb-2" alt="Asset Thumbnail">
                                    </div>
                                    <p><strong>ID:</strong> {{ asset.id }}</p>
                                    <p><strong>Type:</strong> {{ asset.type }}</p>
                                    <a href="{{ url_for('scanner.view_asset', asset_id=asset.id) }}" class="btn btn-primary btn-sm w-100">View Details</a>
                                </div>
                            </div>
                        </div>
                    {% endfor %}
                </div>
            {% else %}
                <div class="alert alert-info">
                    No assets found. Try running a scan first.
                </div>
            {% endif %}
        </div>
    </div>
</div>
{% endblock %}

{% block styles %}
<style>
    .asset-image {
        max-width: 100%;
        height: 150px;
        object-fit: contain;
        background-color: #333;
        border-radius: 4px;
    }
    .asset-box {
        transition: all 0.2s ease;
    }
    .asset-box:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
</style>
{% endblock %}''')
            
    # Asset detail template
    template_path = 'templates/asset_detail.html'
    if not os.path.exists(template_path):
        with open(template_path, 'w') as f:
            f.write('''{% extends 'layout.html' %}

{% block title %}PS99 Asset Details: {{ asset.name }}{% endblock %}

{% block content %}
<div class="container mt-4">
    <div class="card">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
            <h4 class="mb-0">Asset Details</h4>
            <div>
                <a href="{{ url_for('scanner.view_assets') }}" class="btn btn-outline-light btn-sm me-2">Back to Assets</a>
                <a href="{{ url_for('scanner.index') }}" class="btn btn-outline-light btn-sm">Back to Scanner</a>
            </div>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header {% if asset.verified %}bg-success text-white{% else %}bg-secondary text-white{% endif %}">
                            <h5 class="card-title mb-0">{{ asset.name }}</h5>
                        </div>
                        <div class="card-body">
                            <div class="text-center mb-4">
                                {% if asset.has_image %}
                                <img src="{{ asset.image_url }}" class="img-fluid asset-image" alt="Asset Image">
                                {% else %}
                                <div class="placeholder-image">
                                    <span>No image available</span>
                                </div>
                                {% endif %}
                            </div>
                            <table class="table table-bordered">
                                <tr>
                                    <th>Asset ID</th>
                                    <td>{{ asset.id }}</td>
                                </tr>
                                <tr>
                                    <th>Type</th>
                                    <td>{{ asset.type }}</td>
                                </tr>
                                <tr>
                                    <th>Verified</th>
                                    <td>
                                        {% if asset.verified %}
                                        <span class="badge bg-success">Yes</span>
                                        {% else %}
                                        <span class="badge bg-secondary">No</span>
                                        {% endif %}
                                    </td>
                                </tr>
                                {% if asset.category %}
                                <tr>
                                    <th>Category</th>
                                    <td>{{ asset.category }}</td>
                                </tr>
                                {% endif %}
                                {% if asset.source %}
                                <tr>
                                    <th>Source</th>
                                    <td>{{ asset.source }}</td>
                                </tr>
                                {% endif %}
                                {% if asset.description %}
                                <tr>
                                    <th>Description</th>
                                    <td>{{ asset.description }}</td>
                                </tr>
                                {% endif %}
                                {% if asset.timestamp %}
                                <tr>
                                    <th>Discovered</th>
                                    <td>{{ asset.timestamp }}</td>
                                </tr>
                                {% endif %}
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-dark text-white">
                            <h5 class="card-title mb-0">Additional Information</h5>
                        </div>
                        <div class="card-body">
                            <p class="mb-4">This asset was discovered by the PS99 Asset Scanner as a potential upcoming feature or content for Pet Simulator 99.</p>
                            
                            <h6>Direct View on Roblox:</h6>
                            <p>
                                <a href="https://www.roblox.com/catalog/{{ asset.id }}" target="_blank" class="btn btn-sm btn-outline-primary me-2">
                                    View in Catalog
                                </a>
                                <a href="https://www.roblox.com/library/{{ asset.id }}" target="_blank" class="btn btn-sm btn-outline-primary">
                                    View in Creator Marketplace
                                </a>
                            </p>
                            
                            {% if asset.creator_id %}
                            <h6 class="mt-4">Creator Information:</h6>
                            <p>
                                <a href="https://www.roblox.com/users/{{ asset.creator_id }}/profile" target="_blank" class="btn btn-sm btn-outline-secondary">
                                    View Creator Profile
                                </a>
                            </p>
                            {% endif %}
                            
                            <h6 class="mt-4">Similar Assets:</h6>
                            <div id="similar-assets">
                                <p class="text-muted">Loading similar assets...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
{% endblock %}

{% block styles %}
<style>
    .asset-image {
        max-width: 100%;
        height: auto;
        max-height: 300px;
        object-fit: contain;
        background-color: #2a2a2a;
        border-radius: 4px;
        padding: 10px;
    }
    .placeholder-image {
        width: 100%;
        height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #2a2a2a;
        color: #6c757d;
        border-radius: 4px;
    }
</style>
{% endblock %}''')
    
    # Scan status template
    template_path = 'templates/scan_status.html'
    if not os.path.exists(template_path):
        with open(template_path, 'w') as f:
            f.write('''{% extends 'layout.html' %}

{% block title %}PS99 Scanner Status{% endblock %}

{% block content %}
<div class="container mt-4">
    <div class="card">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
            <h4 class="mb-0">Scanner Status</h4>
            <a href="{{ url_for('scanner.index') }}" class="btn btn-outline-light btn-sm">Back to Scanner</a>
        </div>
        <div class="card-body">
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card status-card {% if status.running %}running{% endif %}">
                        <div class="card-body">
                            <h5 class="card-title">
                                <span class="status-dot {% if status.running %}running{% else %}idle{% endif %}"></span>
                                Current Status
                            </h5>
                            <p class="card-text">
                                Status: <strong>{% if status.running %}Running{% else %}Idle{% endif %}</strong><br>
                                Last Scan: <strong>{{ status.last_scan_time or "Never" }}</strong><br>
                                Assets: <strong>{{ status.asset_count }}</strong> (+ {{ status.hybrid_asset_count }} hybrid scanner)<br>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Start New Scan</h5>
                            <form method="post" action="{{ url_for('scanner.start_scan') }}">
                                <div class="mb-3">
                                    <label for="scan_type" class="form-label">Scan Type</label>
                                    <select class="form-select" id="scan_type" name="scan_type">
                                        <option value="comprehensive">Comprehensive Scan (All PS99 Devs)</option>
                                        <option value="hybrid">Hybrid Advanced Scan (CloudScraper + Selenium)</option>
                                        <option value="all">Run All Scanners and Compile Results</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="max_devs" class="form-label">Max Developers to Scan (Recommended: 3-5)</label>
                                    <input type="number" class="form-control" id="max_devs" name="max_devs" value="3" min="1" max="10">
                                    <div class="form-text">Higher values may trigger rate limits</div>
                                </div>
                                <div class="mb-3">
                                    <label for="max_groups" class="form-label">Max Groups to Scan</label>
                                    <input type="number" class="form-control" id="max_groups" name="max_groups" value="1" min="1" max="3">
                                </div>
                                <button type="submit" class="btn btn-primary" {% if status.running %}disabled{% endif %}>
                                    Start Scan
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header bg-dark text-white">
                    <h5 class="mb-0">Scan Log</h5>
                </div>
                <div class="card-body">
                    <div id="scan-log" class="log-container p-3">
                        {% if status.scan_log %}
                            {% for log_entry in status.scan_log %}
                                <div class="log-entry">{{ log_entry }}</div>
                            {% endfor %}
                        {% else %}
                            <div class="text-muted">No log entries yet.</div>
                        {% endif %}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
{% endblock %}

{% block scripts %}
<script>
    // Set up SSE connection for real-time log updates
    const eventSource = new EventSource("{{ url_for('scanner.log_stream') }}");
    const logContainer = document.getElementById('scan-log');
    
    eventSource.onmessage = function(event) {
        const logEntries = JSON.parse(event.data);
        logContainer.innerHTML = '';
        
        if (logEntries.length === 0) {
            logContainer.innerHTML = '<div class="text-muted">No log entries yet.</div>';
        } else {
            logEntries.forEach(entry => {
                const logElement = document.createElement('div');
                logElement.className = 'log-entry';
                logElement.textContent = entry;
                logContainer.appendChild(logElement);
            });
        }
        
        // Auto-scroll to bottom
        logContainer.scrollTop = logContainer.scrollHeight;
    };
    
    // Check status every 3 seconds
    setInterval(function() {
        fetch("{{ url_for('scanner.api_status') }}")
            .then(response => response.json())
            .then(data => {
                const statusDot = document.querySelector('.status-dot');
                const statusCard = document.querySelector('.status-card');
                const runButton = document.querySelector('button[type="submit"]');
                
                if (data.running) {
                    statusDot.classList.remove('idle');
                    statusDot.classList.add('running');
                    statusCard.classList.add('running');
                    runButton.disabled = true;
                } else {
                    statusDot.classList.remove('running');
                    statusDot.classList.add('idle');
                    statusCard.classList.remove('running');
                    runButton.disabled = false;
                }
            });
    }, 3000);
</script>
{% endblock %}

{% block styles %}
<style>
    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 5px;
    }
    .status-dot.idle {
        background-color: #6c757d;
    }
    .status-dot.running {
        background-color: #28a745;
        animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
    .status-card {
        border-left: 4px solid #6c757d;
    }
    .status-card.running {
        border-left-color: #28a745;
    }
    .log-container {
        max-height: 400px;
        overflow-y: auto;
        background-color: #212529;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9rem;
    }
    .log-entry {
        padding: 2px 0;
        border-bottom: 1px solid #2c3136;
    }
</style>
{% endblock %}''')

# Initialize additional templates
initialize_more_templates()