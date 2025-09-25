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
      
      // Lambda Function URLs 
      lambdaUrls: {
        fileAnalysis: process.env.LAMBDA_URL_FILE_ANALYSIS,
        summary: process.env.LAMBDA_URL_SUMMARY,
        documentation: process.env.LAMBDA_URL_DOCUMENTATION,
        issueCreation: process.env.LAMBDA_URL_ISSUE_CREATION,
        issueUpdate: process.env.LAMBDA_URL_ISSUE_UPDATE
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
   * Get Lambda function URL by type
   * @param {string} functionType - Type of function (fileAnalysis, summary, etc.)
   * @returns {string} Lambda function URL
   */
  getLambdaUrl(functionType) {
    return this.config.lambdaUrls[functionType];
  }

  /**
   * Get all Lambda URLs
   * @returns {Object} Object containing all Lambda URLs
   */
  getAllLambdaUrls() {
    return { ...this.config.lambdaUrls };
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

    // Check Lambda URLs
    const requiredFunctions = ['fileAnalysis', 'summary', 'documentation'];
    requiredFunctions.forEach(funcType => {
      const hasUrl = this.config.lambdaUrls[funcType];
      
      if (!hasUrl) {
        errors.push(`Lambda URL for ${funcType} must be configured`);
      }
    });

    // Check S3 bucket name
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
   * @param {string} environment - Environment name (development, production, etc.)
   * @returns {Object} Environment-specific configuration
   */
  getEnvironmentConfig(environment = 'development') {
    const baseConfig = this.getConfig();
    
    // Environment-specific overrides
    const environmentOverrides = {
      development: {
        logLevel: 'debug',
        defaultTimeout: 60000 // Longer timeout for development
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