"""
PS99 Scanner Main Entry Point

This is the main entry point for the PS99 Scanner application. It starts the Flask
web interface for managing and viewing scan results.
"""

import os
import logging
from ps99_scanner_frontend import app

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Ensure directories exist
os.makedirs('static/images/assets', exist_ok=True)
os.makedirs('templates', exist_ok=True)
os.makedirs('compiled_leaks', exist_ok=True)

if __name__ == "__main__":
    logger.info("Starting PS99 Scanner web interface...")
    # Basic database check
    if not os.path.exists('ps99_leaks.db'):
        logger.info("No scanner database found. Run a scan to create one.")
    else:
        import sqlite3
        conn = sqlite3.connect('ps99_leaks.db')
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM assets")
        count = cursor.fetchone()[0]
        logger.info(f"Found {count} assets in the database")
        conn.close()
    
    # Start the Flask app on port 8080 to avoid conflicts
    app.run(host='0.0.0.0', port=8080, debug=True)