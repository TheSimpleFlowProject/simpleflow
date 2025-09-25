const axios = require('axios');
const { LambdaLogger } = require('../utils/lambdaErrors');

/**
 * URL-based Lambda Service
 * Uses Lambda function URLs for invocation (simpler setup)
 */
class UrlLambdaService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger || new LambdaLogger({ prefix: '[UrlLambda]' });
    this.defaultTimeout = config.timeout || 60000;
  }

  /**
   * Invoke Lambda function using URL
   * @param {string} url - Lambda function URL
   * @param {Object} payload - Function payload
   * @param {Object} options - Request options
   * @returns {Promise} - Function response
   */
  async invokeByUrl(url, payload, options = {}) {
    if (!url) {
      throw new Error('Lambda function URL not provided');
    }

    try {
      const requestConfig = {
        timeout: options.timeout || this.defaultTimeout,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      this.logger.info(`Invoking Lambda function at: ${this.maskUrl(url)}`);
      this.logger.debug('Request payload:', payload);

      const startTime = Date.now();
      const response = await axios.post(url, payload, requestConfig);
      const duration = Date.now() - startTime;

      this.logger.info(`Lambda function completed in ${duration}ms`);
      this.logger.debug('Response data:', response.data);

      return response.data;

    } catch (error) {
      this.logger.error(`Lambda URL invocation failed:`, {
        url: this.maskUrl(url),
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      // Enhance error message
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Lambda function timeout after ${this.defaultTimeout}ms`);
      } else if (error.response) {
        throw new Error(`Lambda function returned ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error(`Network error: Unable to reach Lambda function`);
      } else {
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  /**
   * Create a function invoker for a specific URL
   * @param {string} url - Lambda function URL
   * @param {Object} defaultOptions - Default request options
   * @returns {Function} - Invoker function
   */
  createUrlInvoker(url, defaultOptions = {}) {
    return async (payload, options = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      return this.invokeByUrl(url, payload, mergedOptions);
    };
  }

  /**
   * Test connectivity to a Lambda function URL
   * @param {string} url - Lambda function URL to test
   * @returns {Promise<boolean>} - Test result
   */
  async testUrl(url) {
    try {
      this.logger.info(`Testing connectivity to: ${this.maskUrl(url)}`);
      
      // Try a simple HEAD request first
      await axios.head(url, { timeout: 5000 });
      
      this.logger.info(`Connectivity test passed for: ${this.maskUrl(url)}`);
      return true;
    } catch (error) {
      this.logger.warn(`Connectivity test failed for: ${this.maskUrl(url)} - ${error.message}`);
      return false;
    }
  }

  /**
   * Batch invoke multiple Lambda functions
   * @param {Array} invocations - Array of {url, payload, options} objects
   * @returns {Promise<Array>} - Array of results
   */
  async batchInvokeUrls(invocations) {
    this.logger.info(`Starting batch invocation of ${invocations.length} Lambda functions`);

    const promises = invocations.map(async (invocation, index) => {
      try {
        const result = await this.invokeByUrl(
          invocation.url,
          invocation.payload || {},
          invocation.options || {}
        );
        return { index, success: true, result };
      } catch (error) {
        this.logger.error(`Batch invocation ${index} failed:`, error.message);
        return { index, success: false, error: error.message, url: this.maskUrl(invocation.url) };
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
      type: 'url-based',
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
          
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError;
    };
  }
}

module.exports = UrlLambdaService;