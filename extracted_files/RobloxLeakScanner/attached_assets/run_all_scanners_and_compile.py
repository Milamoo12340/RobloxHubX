"""
PS99 Leaks Scanner Runner

This script runs all scanners sequentially, then compiles the results into a comprehensive report.
"""

import os
import sys
import time
import logging
import subprocess
import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ps99_scanners.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("PS99LeaksScannerRunner")

def run_scanner(script_path, name):
    """Run a scanner script and log its output"""
    logger.info(f"Starting {name} scanner...")
    
    try:
        # Run the scanner script
        start_time = time.time()
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            check=False  # Don't raise exception on non-zero exit
        )
        duration = time.time() - start_time
        
        if result.returncode == 0:
            logger.info(f"{name} scanner completed successfully in {duration:.2f} seconds")
            with open(f"{name.lower().replace(' ', '_')}_output.log", "w") as f:
                f.write(result.stdout)
            return True
        else:
            logger.error(f"{name} scanner failed with exit code {result.returncode}")
            logger.error(f"Error output: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error running {name} scanner: {e}")
        return False

def run_all_scanners():
    """Run all scanners sequentially"""
    # List of scanners to run
    scanners = [
        ("ps99_comprehensive_leaks_scanner.py", "Comprehensive Leaks Scanner"),
        ("ps99_hybrid_advanced_scanner.py", "Hybrid Advanced Scanner"),
        ("./Jacquie_Leaks_Scanner_2025/focused_easter_patchwork_scan.py", "Focused Easter Patchwork Scanner")
    ]
    
    results = []
    
    # Run each scanner
    for script_path, name in scanners:
        if os.path.exists(script_path):
            success = run_scanner(script_path, name)
            results.append((name, success))
        else:
            logger.warning(f"Scanner script {script_path} not found, skipping")
            results.append((name, False))
    
    # Log summary
    logger.info("Scanner runs completed")
    for name, success in results:
        status = "Successful" if success else "Failed"
        logger.info(f"{name}: {status}")
    
    # Try to compile the results
    try:
        logger.info("Compiling leak results...")
        if os.path.exists("compile_ps99_leaks.py"):
            import compile_ps99_leaks
            assets, categories = compile_ps99_leaks.compile_leaks()
            logger.info(f"Compilation complete - found {len(assets)} assets across {len(categories)} categories")
            
            # Extra logs for keys categories
            for category in ["EASTER", "PATCHWORK", "EGYPT", "SUMMER"]:
                if category in categories:
                    logger.info(f"{category} assets: {len(categories[category])}")
            
            return True
        else:
            logger.error("compile_ps99_leaks.py not found, cannot compile results")
            return False
    except Exception as e:
        logger.error(f"Error compiling leak results: {e}")
        return False

if __name__ == "__main__":
    start_time = time.time()
    logger.info("Starting PS99 Leaks Scanner Runner...")
    
    success = run_all_scanners()
    
    duration = time.time() - start_time
    if success:
        logger.info(f"All scanners and compilation completed successfully in {duration:.2f} seconds")
    else:
        logger.warning(f"Scanner run completed with some errors in {duration:.2f} seconds")
    
    # Create a timestamp file to mark the last scan time
    with open("last_scan_time.txt", "w") as f:
        f.write(f"Last scan completed at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Scan duration: {duration:.2f} seconds\n")
        f.write(f"Scan status: {'Successful' if success else 'Partial success or errors'}\n")
    
    print("\nScan complete! Check the 'compiled_leaks' directory for the comprehensive report.")