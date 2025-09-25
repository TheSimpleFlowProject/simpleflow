const AWS = require('aws-sdk');

/**
 * AWS Lambda Service
 * Provides a comprehensive interface for interacting with AWS Lambda functions
 */
class LambdaService {
  constructor(options = {}) {
    // Initialize AWS Lambda client with configuration
    this.lambda = new AWS.Lambda({
      accessKeyId: options.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: options.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
      region: options.region || process.env.AWS_REGION || 'us-east-1',
      apiVersion: '2015-03-31'
    });

    this.defaultTimeout = options.timeout || 30000; // 30 seconds
    this.logger = options.logger || console;
  }

  /**
   * Invoke a Lambda function synchronously
   * @param {string} functionName - Name or ARN of the Lambda function
   * @param {Object} payload - Payload to send to the function
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Function response
   */
  async invoke(functionName, payload = {}, options = {}) {
    try {
      const params = {
        FunctionName: functionName,
        Payload: JSON.stringify(payload),
        InvocationType: options.invocationType || 'RequestResponse', // RequestResponse, Event, DryRun
        LogType: options.logType || 'None', // None, Tail
        ClientContext: options.clientContext || undefined,
        Qualifier: options.qualifier || '$LATEST'
      };

      this.logger.info(`Invoking Lambda function: ${functionName}`);
      this.logger.debug('Payload:', payload);

      const result = await this.lambda.invoke(params).promise();
      
      // Parse the response payload
      let responsePayload = null;
      if (result.Payload) {
        try {
          responsePayload = JSON.parse(result.Payload);
        } catch (parseError) {
          this.logger.warn('Failed to parse Lambda response payload:', parseError.message);
          responsePayload = result.Payload;
        }
      }

      const response = {
        statusCode: result.StatusCode,
        payload: responsePayload,
        executedVersion: result.ExecutedVersion,
        logResult: result.LogResult ? Buffer.from(result.LogResult, 'base64').toString() : null,
        functionError: result.FunctionError || null
      };

      if (result.FunctionError) {
        this.logger.error(`Lambda function error: ${result.FunctionError}`, response);
        throw new Error(`Lambda function error: ${result.FunctionError}`);
      }

      this.logger.info(`Lambda function invoked successfully: ${functionName}`);
      return response;

    } catch (error) {
      this.logger.error(`Failed to invoke Lambda function ${functionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Invoke a Lambda function asynchronously (fire-and-forget)
   * @param {string} functionName - Name or ARN of the Lambda function
   * @param {Object} payload - Payload to send to the function
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Invocation response
   */
  async invokeAsync(functionName, payload = {}, options = {}) {
    const asyncOptions = {
      ...options,
      invocationType: 'Event'
    };
    
    return this.invoke(functionName, payload, asyncOptions);
  }

  /**
   * Get information about a Lambda function
   * @param {string} functionName - Name or ARN of the Lambda function
   * @param {string} qualifier - Version or alias (optional)
   * @returns {Promise<Object>} - Function configuration
   */
  async getFunctionInfo(functionName, qualifier = '$LATEST') {
    try {
      this.logger.info(`Getting function info for: ${functionName}`);
      
      const params = {
        FunctionName: functionName,
        Qualifier: qualifier
      };

      const result = await this.lambda.getFunction(params).promise();
      return {
        configuration: result.Configuration,
        code: result.Code,
        tags: result.Tags
      };

    } catch (error) {
      this.logger.error(`Failed to get function info for ${functionName}:`, error.message);
      throw error;
    }
  }

  /**
   * List all Lambda functions in the account
   * @param {Object} options - Listing options
   * @returns {Promise<Array>} - Array of function configurations
   */
  async listFunctions(options = {}) {
    try {
      this.logger.info('Listing Lambda functions');
      
      const params = {
        MaxItems: options.maxItems || 50,
        Marker: options.marker || undefined,
        MasterRegion: options.masterRegion || undefined,
        FunctionVersion: options.functionVersion || 'ALL'
      };

      const result = await this.lambda.listFunctions(params).promise();
      
      this.logger.info(`Found ${result.Functions.length} Lambda functions`);
      return {
        functions: result.Functions,
        nextMarker: result.NextMarker
      };

    } catch (error) {
      this.logger.error('Failed to list Lambda functions:', error.message);
      throw error;
    }
  }

  /**
   * Create or update a Lambda function alias
   * @param {string} functionName - Name of the Lambda function
   * @param {string} aliasName - Name of the alias
   * @param {string} functionVersion - Version to point the alias to
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Alias information
   */
  async createAlias(functionName, aliasName, functionVersion, options = {}) {
    try {
      this.logger.info(`Creating alias ${aliasName} for function ${functionName}`);
      
      const params = {
        FunctionName: functionName,
        Name: aliasName,
        FunctionVersion: functionVersion,
        Description: options.description || `Alias ${aliasName} for ${functionName}`
      };

      const result = await this.lambda.createAlias(params).promise();
      this.logger.info(`Alias created successfully: ${aliasName}`);
      return result;

    } catch (error) {
      if (error.code === 'ResourceConflictException') {
        // Alias already exists, try to update it
        this.logger.info(`Alias ${aliasName} already exists, updating...`);
        return this.updateAlias(functionName, aliasName, functionVersion, options);
      }
      this.logger.error(`Failed to create alias ${aliasName}:`, error.message);
      throw error;
    }
  }

  /**
   * Update an existing Lambda function alias
   * @param {string} functionName - Name of the Lambda function
   * @param {string} aliasName - Name of the alias
   * @param {string} functionVersion - Version to point the alias to
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Updated alias information
   */
  async updateAlias(functionName, aliasName, functionVersion, options = {}) {
    try {
      this.logger.info(`Updating alias ${aliasName} for function ${functionName}`);
      
      const params = {
        FunctionName: functionName,
        Name: aliasName,
        FunctionVersion: functionVersion,
        Description: options.description || undefined
      };

      const result = await this.lambda.updateAlias(params).promise();
      this.logger.info(`Alias updated successfully: ${aliasName}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to update alias ${aliasName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get Lambda function metrics (requires CloudWatch permissions)
   * @param {string} functionName - Name of the Lambda function
   * @param {Date} startTime - Start time for metrics
   * @param {Date} endTime - End time for metrics
   * @returns {Promise<Object>} - Function metrics
   */
  async getFunctionMetrics(functionName, startTime, endTime) {
    try {
      // This would typically use CloudWatch API
      // For now, we'll return basic invocation info from the function itself
      const functionInfo = await this.getFunctionInfo(functionName);
      
      return {
        functionName,
        runtime: functionInfo.configuration.Runtime,
        timeout: functionInfo.configuration.Timeout,
        memorySize: functionInfo.configuration.MemorySize,
        codeSize: functionInfo.configuration.CodeSize,
        lastModified: functionInfo.configuration.LastModified,
        // Note: For detailed metrics, integrate with CloudWatch API
        note: 'For detailed metrics (invocations, duration, errors), integrate with CloudWatch API'
      };

    } catch (error) {
      this.logger.error(`Failed to get metrics for ${functionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Test Lambda function connectivity
   * @param {string} functionName - Name of the Lambda function
   * @returns {Promise<boolean>} - Connection test result
   */
  async testConnection(functionName) {
    try {
      this.logger.info(`Testing connection to Lambda function: ${functionName}`);
      
      // Use DryRun invocation to test without executing
      await this.invoke(functionName, {}, { invocationType: 'DryRun' });
      
      this.logger.info(`Connection test successful: ${functionName}`);
      return true;

    } catch (error) {
      this.logger.error(`Connection test failed for ${functionName}:`, error.message);
      return false;
    }
  }

  /**
   * Batch invoke multiple Lambda functions
   * @param {Array} invocations - Array of invocation configurations
   * @returns {Promise<Array>} - Array of results
   */
  async batchInvoke(invocations) {
    try {
      this.logger.info(`Batch invoking ${invocations.length} Lambda functions`);
      
      const promises = invocations.map(async (invocation, index) => {
        try {
          const result = await this.invoke(
            invocation.functionName,
            invocation.payload || {},
            invocation.options || {}
          );
          return { index, success: true, result };
        } catch (error) {
          this.logger.error(`Batch invocation ${index} failed:`, error.message);
          return { index, success: false, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      this.logger.info(`Batch invocation completed: ${successful} successful, ${failed} failed`);
      return results;

    } catch (error) {
      this.logger.error('Batch invocation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a wrapper for invoking a specific function with predefined configuration
   * @param {string} functionName - Name of the Lambda function
   * @param {Object} defaultOptions - Default options for invocations
   * @returns {Function} - Wrapper function
   */
  createFunctionInvoker(functionName, defaultOptions = {}) {
    return async (payload, options = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      return this.invoke(functionName, payload, mergedOptions);
    };
  }

  /**
   * Get the current AWS configuration
   * @returns {Object} - Current configuration
   */
  getConfig() {
    return {
      region: this.lambda.config.region,
      accessKeyId: this.lambda.config.credentials?.accessKeyId || 'Not set',
      defaultTimeout: this.defaultTimeout
    };
  }
}

module.exports = LambdaService;