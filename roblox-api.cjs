/**
 * Roblox API Service
 * Centralizes interactions with various Roblox API endpoints
 */

const https = require('https');
const { ACCESSIBLE_ENDPOINTS, formatUrl } = require('./roblox-api-endpoints.cjs');

// Rate limiting state
const rateLimits = {
  GENERAL: { lastRequest: 0, limit: 1000, interval: 60000 }, // 1000 requests per minute
  ASSETS: { lastRequest: 0, limit: 100, interval: 60000 },   // 100 requests per minute
  THUMBNAILS: { lastRequest: 0, limit: 500, interval: 60000 }, // 500 requests per minute
  CATALOG: { lastRequest: 0, limit: 100, interval: 60000 },  // 100 requests per minute
  USERS: { lastRequest: 0, limit: 100, interval: 60000 },    // 100 requests per minute
  GROUPS: { lastRequest: 0, limit: 100, interval: 60000 }    // 100 requests per minute
};

class RobloxAPIService {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
  }

  /**
   * Set an API key for authentication
   * @param {string} apiKey - Roblox API key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Create request headers with API key if available
   * @returns {Object} Headers object
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'PetSimulator99Bot/1.0'
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Check and update rate limits before making a request
   * @param {string} category - API category (ASSETS, DATASTORES, etc.)
   * @returns {boolean} Whether the request can proceed
   */
  checkRateLimit(category) {
    const now = Date.now();
    const limit = rateLimits[category] || rateLimits.GENERAL;

    // Calculate time since last request and requests per interval
    const timeSinceLastRequest = now - limit.lastRequest;
    
    // If we've waited longer than the interval, reset the counter
    if (timeSinceLastRequest >= limit.interval) {
      limit.lastRequest = now;
      limit.count = 1;
      return true;
    }
    
    // If we've made too many requests in this interval, delay
    if (limit.count >= limit.limit) {
      console.log(`Rate limit reached for ${category}, delaying request`);
      return false;
    }
    
    // Update the counter and proceed with the request
    limit.count = (limit.count || 0) + 1;
    limit.lastRequest = now;
    return true;
  }

  /**
   * Make a request to a Roblox API endpoint
   * @param {string} url - Full API URL
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {Object} data - Request body data
   * @param {string} category - API category for rate limiting
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(url, method = 'GET', data = null, category = 'GENERAL') {
    // Check rate limits before making the request
    if (!this.checkRateLimit(category)) {
      // If rate limited, wait 1 second and try again (recursive)
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.makeRequest(url, method, data, category);
    }

    return new Promise((resolve, reject) => {
      const options = {
        method: method,
        headers: this.getHeaders()
      };

      const req = https.request(url, options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          // Detect rate limiting response
          if (res.statusCode === 429) {
            console.log(`Rate limited by Roblox API (429): ${url}`);
            // Wait for 2 seconds and try again
            setTimeout(() => {
              this.makeRequest(url, method, data, category)
                .then(resolve)
                .catch(reject);
            }, 2000);
            return;
          }

          if (res.statusCode >= 400) {
            reject(new Error(`HTTP Error ${res.statusCode}: ${responseData}`));
            return;
          }

          try {
            const jsonResponse = JSON.parse(responseData);
            resolve(jsonResponse);
          } catch (error) {
            // Might be non-JSON response
            resolve(responseData);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Search for assets in the Roblox toolbox
   * @param {string} query - Search query
   * @param {string} categoryType - Asset type (Model, Decal, etc.)
   * @param {Object} options - Additional search options
   * @returns {Promise<Object>} Search results
   */
  async searchToolboxAssets(query, categoryType = 'Model', options = {}) {
    const url = formatUrl(ACCESSIBLE_ENDPOINTS.CREATOR_STORE_SEARCH, {
      category: categoryType,
      query,
      maxPageSize: options.limit || 50
    });

    return this.makeRequest(url, 'GET', null, 'CATALOG');
  }

  /**
   * Get asset details by asset ID
   * @param {string} assetId - Roblox asset ID
   * @returns {Promise<Object>} Asset details
   */
  async getAsset(assetId) {
    const url = formatUrl(ACCESSIBLE_ENDPOINTS.ASSET_INFO, { assetId });
    return this.makeRequest(url, 'GET', null, 'ASSETS');
  }

  /**
   * Get asset thumbnails by asset IDs
   * @param {Array<string>} assetIds - Array of asset IDs
   * @param {string} size - Thumbnail size (e.g., '420x420')
   * @param {string} format - Image format (e.g., 'Png')
   * @returns {Promise<Object>} Thumbnail data
   */
  async getAssetThumbnails(assetIds, size = '420x420', format = 'Png') {
    // If we have a single ID, wrap it in an array
    const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
    
    // Format the assetIds as a comma-separated list
    const idsParam = ids.join(',');
    
    const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${idsParam}&size=${size}&format=${format}`;
    return this.makeRequest(url, 'GET', null, 'THUMBNAILS');
  }

  /**
   * Check if a Roblox developer exists by their ID
   * @param {string} developerId - Roblox user ID
   * @returns {Promise<boolean>} Whether the developer exists
   */
  async checkDeveloperExists(developerId) {
    try {
      const url = `https://users.roblox.com/v1/users/${developerId}`;
      const userData = await this.makeRequest(url, 'GET', null, 'USERS');
      return Boolean(userData && userData.id);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get assets created by a developer
   * @param {string} developerId - Roblox user ID
   * @param {number} limit - Number of assets to retrieve
   * @returns {Promise<Array>} List of assets
   */
  async getDeveloperAssets(developerId, limit = 100) {
    // Build URL for creator assets
    const url = formatUrl(ACCESSIBLE_ENDPOINTS.CATALOG_BY_CREATOR, {
      creatorId: developerId
    });

    try {
      const response = await this.makeRequest(url, 'GET', null, 'CATALOG');
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching developer assets for ${developerId}:`, error);
      return [];
    }
  }

  /**
   * Get group assets by group ID
   * @param {string} groupId - Roblox group ID
   * @param {number} limit - Number of assets to retrieve
   * @returns {Promise<Array>} List of assets
   */
  async getGroupAssets(groupId, limit = 100) {
    // Build URL for group assets
    const url = formatUrl(ACCESSIBLE_ENDPOINTS.CATALOG_BY_CREATOR, {
      creatorId: groupId
    });

    try {
      const response = await this.makeRequest(url, 'GET', null, 'CATALOG');
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching group assets for ${groupId}:`, error);
      return [];
    }
  }
}

// Export the RobloxAPIService class
module.exports = { RobloxAPIService };