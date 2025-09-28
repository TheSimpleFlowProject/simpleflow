/**
 * Configuration management for AWS Lambda Service
 * Handles environment variables and service configuration
 */
class LambdaConfig {
  constructor() {
    // Load environment variables with defaults
    this.config = {
      // AWS Credentials
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      
      // Lambda Service Settings
      defaultTimeout: parseInt(process.env.LAMBDA_DEFAULT_TIMEOUT) || 30000,
      logLevel: process.env.LAMBDA_LOG_LEVEL || 'info',
      
      // API Gateway Configuration
      apiGateway: {
        root: process.env.SF_API_GTW_ROOT,
        apiToken: process.env.SF_API_GTW_API_TOKEN,
        endpoints: {
          fileAnalysis: process.env.SF_API_FILE_ANALYSIS,
          summary: process.env.SF_API_SUMMARY,
          documentation: process.env.SF_API_DOCUMENTATION,
          issueCreation: process.env.SF_API_ISSUE_CREATION,
          issueUpdate: process.env.SF_API_ISSUE_UPDATE
        }
      },
      
      // S3 Configuration
      s3BucketName: process.env.S3_BUCKET_NAME || 'simpleflowdata'
    };
  }

  /**
   * Get AWS configuration for Lambda service
   * @returns {Object} AWS configuration object
   */
  getAwsConfig() {
    return {
      accessKeyId: this.config.awsAccessKeyId,
      secretAccessKey: this.config.awsSecretAccessKey,
      region: this.config.awsRegion,
      timeout: this.config.defaultTimeout
    };
  }

  /**
   * Get API Gateway configuration
   * @returns {Object} API Gateway configuration object
   */
  getApiGatewayConfig() {
    return {
      root: this.config.apiGateway.root,
      apiToken: this.config.apiGateway.apiToken,
      endpoints: { ...this.config.apiGateway.endpoints }
    };
  }

  /**
   * Get full API Gateway URL for a specific endpoint
   * @param {string} functionType - Function Type
   * @returns {string} Full API Gateway URL
   */
  getApiGatewayUrl(functionType) {
    const root = this.config.apiGateway.root;
    const endpoint = this.config.apiGateway.endpoints[functionType];
    
    if (!root || !endpoint) {
      throw new Error(`API Gateway configuration missing for ${functionType}. Check SF_API_GTW_ROOT and SF_API_${functionType.toUpperCase()}`);
    }
    
    const baseUrl = root.endsWith('/') ? root.slice(0, -1) : root;
    const endpointPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${baseUrl}${endpointPath}`;
  }

  /**
   * Get API Gateway token for x-api-key header
   * @returns {string} API token
   */
  getApiGatewayToken() {
    return this.config.apiGateway.apiToken;
  }

  /**
   * Get S3 bucket name
   * @returns {string} S3 bucket name
   */
  getS3BucketName() {
    return this.config.s3BucketName;
  }

  /**
   * Get logging configuration
   * @returns {Object} Logging configuration
   */
  getLogConfig() {
    return {
      level: this.config.logLevel,
      enableDebug: this.config.logLevel === 'debug' || this.config.logLevel === 'trace'
    };
  }

  /**
   * Validate configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    // Check required AWS credentials
    if (!this.config.awsAccessKeyId) {
      errors.push('AWS_ACCESS_KEY_ID is not set');
    }
    
    if (!this.config.awsSecretAccessKey) {
      errors.push('AWS_SECRET_ACCESS_KEY is not set');
    }

    // Check required API Gateway configuration
    if (!this.config.apiGateway.root) {
      errors.push('API Gateway root URL (SF_API_GTW_ROOT) must be configured');
    }
    
    if (!this.config.apiGateway.apiToken) {
      errors.push('API Gateway token (SF_API_GTW_API_TOKEN) must be configured');
    }
    
    const requiredFunctions = ['fileAnalysis', 'summary', 'documentation', 'issueCreation', 'issueUpdate'];
    requiredFunctions.forEach(funcType => {
      const hasEndpoint = this.config.apiGateway.endpoints[funcType];
      
      if (!hasEndpoint) {
        const envVarName = `SF_API_${funcType.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        errors.push(`API Gateway endpoint for ${funcType} must be configured (${envVarName})`);
      }
    });

    if (!this.config.s3BucketName) {
      warnings.push('S3_BUCKET_NAME is not set, using default');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasWarnings: warnings.length > 0
    };
  }

  /**
   * Get complete configuration object
   * @returns {Object} Complete configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   */
  setConfig(key, value) {
    this.config[key] = value;
  }



  /**
   * Get environment-specific configuration
   * @param {string} environment - Environment name
   * @returns {Object} Environment-specific configuration
   */
  getEnvironmentConfig(environment = 'development') {
    const baseConfig = this.getConfig();
    
    const environmentOverrides = {
      development: {
        logLevel: 'debug',
        defaultTimeout: 60000
      },
      production: {
        logLevel: 'info',
        defaultTimeout: 30000
      },
      test: {
        logLevel: 'error',
        defaultTimeout: 10000
      }
    };

    return {
      ...baseConfig,
      ...(environmentOverrides[environment] || {})
    };
  }
}

// Export a singleton instance
module.exports = new LambdaConfig();