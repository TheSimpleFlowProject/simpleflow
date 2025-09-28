const axios = require('axios');
const { LambdaLogger } = require('../utils/lambdaErrors');

/**
 * API Gateway Service
 * Handles HTTP requests to AWS API Gateway endpoints with x-api-key authentication
 */
class ApiGatewayService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger || new LambdaLogger({ prefix: '[ApiGateway]' });
    this.defaultTimeout = config.timeout || 60000;
    
    // Validate required configuration
    if (!config.root) {
      throw new Error('API Gateway root URL (SF_API_GTW_ROOT) is required');
    }
    
    if (!config.apiToken) {
      throw new Error('API Gateway token (SF_API_GTW_API_TOKEN) is required');
    }
  }

  /**
   * Invoke API Gateway endpoint
   * @param {string} endpoint - Endpoint path
   * @param {Object} payload - Request payload
   * @param {Object} options - Request options
   * @returns {Promise} - API response
   */
  async invokeEndpoint(endpoint, payload, options = {}) {
    if (!endpoint) {
      throw new Error('API Gateway endpoint path is required');
    }

    const url = this.buildUrl(endpoint);
    
    try {
      const requestConfig = {
        timeout: options.timeout || this.defaultTimeout,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiToken,
          ...options.headers
        }
      };

      this.logger.info(`Invoking API Gateway endpoint: ${this.maskUrl(url)}`);
      this.logger.debug('Request payload:', payload);

      const startTime = Date.now();
      const response = await axios.post(url, payload, requestConfig);
      const duration = Date.now() - startTime;

      this.logger.info(`API Gateway request completed in ${duration}ms`);
      this.logger.debug('Response data:', response.data);

      return response.data;

    } catch (error) {
      this.logger.error(`API Gateway request failed:`, {
        url: this.maskUrl(url),
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      });

      if (error.code === 'ECONNABORTED') {
        throw new Error(`API Gateway request timeout after ${this.defaultTimeout}ms`);
      } else if (error.response?.status === 401) {
        throw new Error(`API Gateway authentication failed: Invalid or missing x-api-key`);
      } else if (error.response?.status === 403) {
        throw new Error(`API Gateway access forbidden: Check API key permissions`);
      } else if (error.response?.status === 404) {
        throw new Error(`API Gateway endpoint not found: ${endpoint}`);
      } else if (error.response?.status >= 500) {
        throw new Error(`API Gateway server error (${error.response.status}): ${error.response.statusText}`);
      } else if (error.response) {
        throw new Error(`API Gateway error (${error.response.status}): ${error.response.statusText || error.message}`);
      } else if (error.request) {
        throw new Error(`Network error: Unable to reach API Gateway at ${this.maskUrl(url)}`);
      } else {
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  /**
   * Build full URL from endpoint path
   * @param {string} endpoint - Endpoint path
   * @returns {string} - Full URL
   */
  buildUrl(endpoint) {
    const baseUrl = this.config.root.endsWith('/') ? this.config.root.slice(0, -1) : this.config.root;
    const endpointPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${endpointPath}`;
  }

  /**
   * Create a function invoker for a specific endpoint
   * @param {string} endpoint - API Gateway endpoint path
   * @param {Object} defaultOptions - Default request options
   * @returns {Function} - Invoker function
   */
  createEndpointInvoker(endpoint, defaultOptions = {}) {
    return async (payload, options = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      return this.invokeEndpoint(endpoint, payload, mergedOptions);
    };
  }

  /**
   * Test connectivity to an API Gateway endpoint
   * @param {string} endpoint - Endpoint path to test
   * @returns {Promise<boolean>} - Test result
   */
  async testEndpoint(endpoint) {
    try {
      this.logger.info(`Testing connectivity to endpoint: ${endpoint}`);
      
      const url = this.buildUrl(endpoint);
      
      await axios.get(url, {
        timeout: 5000,
        headers: {
          'x-api-key': this.config.apiToken
        }
      });
      
      this.logger.info(`Connectivity test passed for endpoint: ${endpoint}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 405) {
        this.logger.info(`Endpoint ${endpoint} exists but doesn't support GET (normal for POST-only endpoints)`);
        return true;
      }
      
      this.logger.warn(`Connectivity test failed for endpoint: ${endpoint} - ${error.message}`);
      return false;
    }
  }

  /**
   * Batch invoke multiple API Gateway endpoints
   * @param {Array} invocations - Array of objects
   * @returns {Promise<Array>} - Array of results
   */
  async batchInvokeEndpoints(invocations) {
    this.logger.info(`Starting batch invocation of ${invocations.length} API Gateway endpoints`);

    const promises = invocations.map(async (invocation, index) => {
      try {
        const result = await this.invokeEndpoint(
          invocation.endpoint,
          invocation.payload || {},
          invocation.options || {}
        );
        return { index, success: true, result };
      } catch (error) {
        this.logger.error(`Batch invocation ${index} failed:`, error.message);
        return { 
          index, 
          success: false, 
          error: error.message, 
          endpoint: invocation.endpoint 
        };
      }
    });

    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    this.logger.info(`Batch invocation completed: ${successful} successful, ${failed} failed`);
    
    return results;
  }

  /**
   * Get service status and configuration
   * @returns {Object} - Service status
   */
  getStatus() {
    return {
      type: 'api-gateway',
      root: this.maskUrl(this.config.root),
      hasApiToken: !!this.config.apiToken,
      defaultTimeout: this.defaultTimeout,
      ready: true
    };
  }

  /**
   * Mask URL for logging (hide sensitive parts)
   * @param {string} url - URL to mask
   * @returns {string} - Masked URL
   */
  maskUrl(url) {
    if (!url) return 'undefined';
    
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname;
      const maskedHost = host.length > 10 ? 
        host.substring(0, 8) + '***' + host.substring(host.length - 3) : 
        host;
      return `${urlObj.protocol}//${maskedHost}${urlObj.pathname}`;
    } catch {
      return 'invalid-url';
    }
  }

  /**
   * Create error handler with retry logic
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} baseDelay - Base delay between retries (ms)
   * @returns {Function} - Retry handler
   */
  createRetryHandler(maxRetries = 3, baseDelay = 1000) {
    return async (operation) => {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries) {
            this.logger.error(`Operation failed after ${maxRetries} attempts:`, error.message);
            throw error;
          }
          
          // Don't retry on authentication or client errors (4xx)
          if (error.message.includes('authentication') || 
              error.message.includes('forbidden') ||
              error.message.includes('not found')) {
            this.logger.error('Non-retryable error encountered:', error.message);
            throw error;
          }
          
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError;
    };
  }

  /**
   * Validate API Gateway configuration
   * @returns {Object} - Validation result
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    if (!this.config.root) {
      errors.push('API Gateway root URL is required');
    } else {
      try {
        new URL(this.config.root);
      } catch {
        errors.push('API Gateway root URL is not a valid URL');
      }
    }

    if (!this.config.apiToken) {
      errors.push('API Gateway API token is required');
    } else if (this.config.apiToken.length < 10) {
      warnings.push('API Gateway token seems too short (possible security risk)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasWarnings: warnings.length > 0
    };
  }
}

module.exports = ApiGatewayService;