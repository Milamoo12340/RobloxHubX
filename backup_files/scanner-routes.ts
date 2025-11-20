import { Router } from 'express';
import { scannerService } from '../services/scanner-service';
import { workingScanner } from '../services/working-scanner';
import { comprehensiveScanner } from '../services/comprehensive-scanner';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

/**
 * @route GET /api/scanner/status
 * @desc Get the current status of the scanner
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      scanner: scannerService.getStatus(),
      workingScanner: workingScanner.getStatus(),
      comprehensiveScanner: comprehensiveScanner.getStatus()
    };
    
    res.json({
      status: 'success',
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * @route POST /api/scanner/start
 * @desc Manually start a scan
 */
router.post('/start', async (req, res) => {
  try {
    // Start the scan process
    scannerService.runScan();
    
    res.json({
      status: 'success',
      message: 'Scan started successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error'
    });
  }
});

// Schema for setting interval
const setIntervalSchema = z.object({
  intervalMinutes: z.number().int().min(5).max(1440) // 5 minutes to 24 hours
});

/**
 * @route POST /api/scanner/set-interval
 * @desc Set the scan interval in minutes
 */
router.post('/set-interval', async (req, res) => {
  try {
    const validation = setIntervalSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid interval. Must be between 5 and 1440 minutes (24 hours).'
      });
    }
    
    const { intervalMinutes } = validation.data;
    
    // Set the interval
    scannerService.startScanner(intervalMinutes);
    
    res.json({
      status: 'success',
      message: `Scan interval set to ${intervalMinutes} minutes`
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * @route POST /api/scanner/stop
 * @desc Stop the scheduled scanner
 */
router.post('/stop', async (req, res) => {
  try {
    // Stop the scanner
    scannerService.stopScanner();
    
    res.json({
      status: 'success',
      message: 'Scanner stopped successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * @route GET /api/scanner/endpoints
 * @desc Get a list of all available endpoints
 */
router.get('/endpoints', async (req, res) => {
  try {
    // Import the endpoint registry
    const endpointRegistry = await import('../services/endpoint-registry');
    const { ACCESSIBLE_ENDPOINTS, PROTECTED_ENDPOINTS } = endpointRegistry;
    
    res.json({
      status: 'success',
      data: {
        working: Object.keys(ACCESSIBLE_ENDPOINTS),
        needsAuthentication: Object.keys(PROTECTED_ENDPOINTS)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * @route GET /api/scanner/assets
 * @desc Get assets discovered by the scanner with optional filtering
 */
router.get('/assets', async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { type, game, creator, status, limit } = req.query;
    
    // Get all assets
    const assets = await storage.getAssets();
    
    // Apply filters if provided
    let filteredAssets = assets;
    
    if (type) {
      filteredAssets = filteredAssets.filter(asset => 
        asset.type.toLowerCase() === String(type).toLowerCase()
      );
    }
    
    if (game) {
      filteredAssets = filteredAssets.filter(asset => 
        asset.game && asset.game.toLowerCase().includes(String(game).toLowerCase())
      );
    }
    
    if (creator) {
      filteredAssets = filteredAssets.filter(asset => 
        asset.creator && asset.creator.toLowerCase().includes(String(creator).toLowerCase())
      );
    }
    
    if (status) {
      filteredAssets = filteredAssets.filter(asset => 
        asset.status.toLowerCase() === String(status).toLowerCase()
      );
    }
    
    // Apply limit if provided
    const limitNum = limit ? parseInt(String(limit)) : undefined;
    if (limitNum && !isNaN(limitNum)) {
      filteredAssets = filteredAssets.slice(0, limitNum);
    }
    
    res.json({
      status: 'success',
      data: {
        total: filteredAssets.length,
        assets: filteredAssets
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * @route GET /api/scanner/assets/count
 * @desc Get count of assets by type discovered by the scanner
 */
router.get('/assets/count', async (req, res) => {
  try {
    // Get all assets
    const assets = await storage.getAssets();
    
    // Count by type
    const typeCount: Record<string, number> = {};
    assets.forEach(asset => {
      if (asset.type) {
        if (!typeCount[asset.type]) {
          typeCount[asset.type] = 0;
        }
        typeCount[asset.type]++;
      }
    });
    
    // Count by game
    const gameCount: Record<string, number> = {};
    assets.forEach(asset => {
      if (asset.game) {
        if (!gameCount[asset.game]) {
          gameCount[asset.game] = 0;
        }
        gameCount[asset.game]++;
      }
    });
    
    // Count by status
    const statusCount: Record<string, number> = {};
    assets.forEach(asset => {
      if (asset.status) {
        if (!statusCount[asset.status]) {
          statusCount[asset.status] = 0;
        }
        statusCount[asset.status]++;
      }
    });
    
    res.json({
      status: 'success',
      data: {
        total: assets.length,
        byType: typeCount,
        byGame: gameCount,
        byStatus: statusCount
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * @route GET /api/scanner/activities
 * @desc Get recent scanner activities
 */
router.get('/activities', async (req, res) => {
  try {
    // Get limit from query params or default to 10
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 10;
    
    // Get activities
    const activities = await storage.getActivities();
    
    // Sort by most recent
    const sortedActivities = activities
      .sort((a, b) => {
        // If we have dates, sort by date
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // Otherwise, just return the most recently added
        return 0;
      })
      .slice(0, limit);
    
    res.json({
      status: 'success',
      data: sortedActivities
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * @route POST /api/scanner/comprehensive
 * @desc Start a comprehensive scan using all possible endpoints
 */
router.post('/comprehensive', async (req, res) => {
  try {
    console.log('Starting comprehensive scan of all Roblox endpoints...');
    const result = await comprehensiveScanner.runFullScan();
    res.json({ 
      status: 'success', 
      data: result 
    });
  } catch (error: any) {
    console.error('Error starting comprehensive scan:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Failed to start comprehensive scan' 
    });
  }
});

/**
 * @route POST /api/scanner/manual-endpoint
 * @desc Run a manual scan of specific endpoint(s)
 */
router.post('/manual-endpoint', async (req, res) => {
  try {
    const { endpoints } = req.body;
    
    // Validate the endpoints array
    const validatedEndpoints = z.array(z.string()).parse(endpoints);
    
    if (validatedEndpoints.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No endpoints specified for scanning'
      });
    }
    
    console.log(`Manual scan requested for endpoints: ${validatedEndpoints.join(', ')}`);
    
    // Import the endpoint registry
    const endpointRegistry = await import('../services/endpoint-registry');
    const { ACCESSIBLE_ENDPOINTS, PROTECTED_ENDPOINTS } = endpointRegistry;
    
    const results = {
      success: [] as string[],
      failed: [] as string[],
      notFound: [] as string[]
    };
    
    // Check if the specified endpoints exist
    for (const endpointKey of validatedEndpoints) {
      if (ACCESSIBLE_ENDPOINTS[endpointKey as any]) {
        try {
          // Call the specific endpoint scanner method in workingScanner
          const methodName = `scan${endpointKey.charAt(0).toUpperCase() + endpointKey.slice(1)}`;
          if (typeof workingScanner[methodName as keyof typeof workingScanner] === 'function') {
            await (workingScanner[methodName as keyof typeof workingScanner] as Function)();
            results.success.push(endpointKey);
          } else {
            results.failed.push(`${endpointKey} (method not found: ${methodName})`);
          }
        } catch (error) {
          results.failed.push(`${endpointKey} (error: ${(error as Error).message})`);
        }
      } else if (PROTECTED_ENDPOINTS[endpointKey as keyof typeof PROTECTED_ENDPOINTS]) {
        results.failed.push(`${endpointKey} (protected endpoint, requires authentication)`);
      } else {
        results.notFound.push(endpointKey);
      }
    }
    
    res.json({
      status: 'success',
      message: 'Manual endpoint scan completed',
      data: results
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error'
    });
  }
});

export default router;