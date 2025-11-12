"""
PS99 Scanner Frontend

This module provides a simple Flask web interface to manage scanning operations
and view the results from our various scanners.
"""

import os
import json
import time
import sqlite3
import datetime
import subprocess
from flask import Flask, render_template, request, redirect, url_for, jsonify, Response

app = Flask(__name__)

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
        conn = sqlite3.connect(MAIN_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM assets")
        asset_count = cursor.fetchone()[0]
        conn.close()
    
    # Count assets in hybrid db
    hybrid_asset_count = 0
    if os.path.exists(HYBRID_DB_PATH):
        conn = sqlite3.connect(HYBRID_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM leaked_assets")
        hybrid_asset_count = cursor.fetchone()[0]
        conn.close()
        
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
        conn = sqlite3.connect(MAIN_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if include_hidden:
            cursor.execute("SELECT * FROM assets ORDER BY timestamp DESC LIMIT ?", (limit,))
        else:
            cursor.execute("SELECT * FROM assets WHERE category != 'UNKNOWN' ORDER BY timestamp DESC LIMIT ?", (limit,))
        
        assets = [dict(row) for row in cursor.fetchall()]
        conn.close()
    
    return assets

def get_assets_by_category(category, limit=50):
    """Get assets by category"""
    assets = []
    
    if os.path.exists(MAIN_DB_PATH):
        conn = sqlite3.connect(MAIN_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM assets WHERE category = ? ORDER BY timestamp DESC LIMIT ?", 
                     (category, limit))
        
        assets = [dict(row) for row in cursor.fetchall()]
        conn.close()
    
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

@app.route('/')
def index():
    """Main page with scanner status and controls"""
    status = get_scanner_status()
    assets = get_recent_assets(limit=10)
    
    # Get category counts
    category_counts = {}
    if os.path.exists(MAIN_DB_PATH):
        conn = sqlite3.connect(MAIN_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT category, COUNT(*) FROM assets GROUP BY category")
        for category, count in cursor.fetchall():
            if category and category != "UNKNOWN":
                category_counts[category] = count
        conn.close()
    
    return render_template(
        'scanner_index.html', 
        status=status, 
        assets=assets,
        category_counts=category_counts
    )

@app.route('/assets')
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

@app.route('/asset/<int:asset_id>')
def view_asset(asset_id):
    """View a specific asset"""
    if os.path.exists(MAIN_DB_PATH):
        conn = sqlite3.connect(MAIN_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
        asset = cursor.fetchone()
        
        if asset:
            asset = dict(asset)
            
            # Check if we have an image
            image_path = os.path.join("static/images/assets", f"{asset_id}.png")
            asset['has_image'] = os.path.exists(image_path)
            asset['image_url'] = f"/static/images/assets/{asset_id}.png" if asset['has_image'] else None
            
            return render_template('asset_detail.html', asset=asset)
    
    return "Asset not found", 404

@app.route('/start_scan', methods=['POST'])
def start_scan():
    """Start a new scan process"""
    scan_type = request.form.get('scan_type', 'comprehensive')
    max_devs = request.form.get('max_devs', None)
    max_groups = request.form.get('max_groups', None)
    
    # Convert to integers if provided
    if max_devs and max_devs.isdigit():
        max_devs = int(max_devs)
    else:
        max_devs = 3  # Default to 3 developers for focused scans
        
    if max_groups and max_groups.isdigit():
        max_groups = int(max_groups)
    else:
        max_groups = 1  # Default to 1 group for focused scans
    
    success, message = run_scan_async(scan_type, max_devs, max_groups)
    
    if success:
        return redirect(url_for('scan_status'))
    else:
        return f"Error: {message}", 500

@app.route('/scan_status')
def scan_status():
    """View the current scan status"""
    status = get_scanner_status()
    return render_template('scan_status.html', status=status)

@app.route('/api/status')
def api_status():
    """Return status as JSON for AJAX updates"""
    status = get_scanner_status()
    return jsonify(status)

@app.route('/log_stream')
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

if __name__ == '__main__':
    # Ensure templates and static directories exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/images', exist_ok=True)
    
    # Create template files
    template_dir = 'templates'
    
    # Index template
    with open(os.path.join(template_dir, 'scanner_index.html'), 'w') as f:
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
                        <a href="{{ url_for('scan_status') }}" class="btn btn-primary">View Detailed Status</a>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Start New Scan</h5>
                        <form method="post" action="{{ url_for('start_scan') }}">
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
                        <a href="{{ url_for('view_assets') }}" class="btn btn-sm btn-outline-primary">View All Assets</a>
                    </div>
                    <div class="card-body">
                        <div class="d-flex flex-wrap gap-2">
                            {% for category, count in category_counts.items() %}
                                <a href="{{ url_for('view_assets', category=category) }}" class="btn btn-outline-info">
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
                        <a href="{{ url_for('view_assets') }}" class="btn btn-sm btn-outline-primary">View All</a>
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
                                                        <a href="{{ url_for('view_asset', asset_id=asset.id) }}">{{ asset.name }}</a>
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
            fetch('/api/status')
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
    with open(os.path.join(template_dir, 'asset_list.html'), 'w') as f:
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
                <a href="{{ url_for('index') }}" class="btn btn-outline-primary">Back to Dashboard</a>
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
                                        <a href="{{ url_for('view_asset', asset_id=asset.id) }}" class="btn btn-sm btn-primary">View</a>
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
    with open(os.path.join(template_dir, 'asset_detail.html'), 'w') as f:
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
                <a href="{{ url_for('view_assets') }}" class="btn btn-outline-primary">Back to Assets</a>
                <a href="{{ url_for('index') }}" class="btn btn-outline-secondary">Dashboard</a>
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
    with open(os.path.join(template_dir, 'scan_status.html'), 'w') as f:
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
                <a href="{{ url_for('index') }}" class="btn btn-outline-primary">Back to Dashboard</a>
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
                        <form method="post" action="{{ url_for('start_scan') }}">
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
        const evtSource = new EventSource("{{ url_for('log_stream') }}");
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
            fetch('/api/status')
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
    
    # Create a placeholder image
    os.makedirs('static/images', exist_ok=True)
    with open('static/images/placeholder.png', 'wb') as f:
        # Base64 encoded small placeholder image (1x1 pixel)
        import base64
        placeholder = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==')
        f.write(placeholder)
    
    # Start the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)