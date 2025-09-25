/**
 * Custom error classes for Lambda Service operations
 */

/**
 * Base Lambda Service Error
 */
class LambdaServiceError extends Error {
  constructor(message, code = 'LAMBDA_SERVICE_ERROR', details = {}) {
    super(message);
    this.name = 'LambdaServiceError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LambdaServiceError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Lambda Function Invocation Error
 */
class LambdaInvocationError extends LambdaServiceError {
  constructor(functionName, message, awsError = null) {
    super(
      `Lambda invocation failed for function '${functionName}': ${message}`,
      'LAMBDA_INVOCATION_ERROR',
      {
        functionName,
        awsError: awsError ? {
          code: awsError.code,
          message: awsError.message,
          statusCode: awsError.statusCode,
          requestId: awsError.requestId
        } : null
      }
    );
    this.name = 'LambdaInvocationError';
    this.functionName = functionName;
  }
}

/**
 * Lambda Configuration Error
 */
class LambdaConfigurationError extends LambdaServiceError {
  constructor(message, missingConfig = []) {
    super(
      `Lambda configuration error: ${message}`,
      'LAMBDA_CONFIGURATION_ERROR',
      { missingConfig }
    );
    this.name = 'LambdaConfigurationError';
    this.missingConfig = missingConfig;
  }
}

/**
 * Lambda Timeout Error
 */
class LambdaTimeoutError extends LambdaServiceError {
  constructor(functionName, timeout) {
    super(
      `Lambda function '${functionName}' timed out after ${timeout}ms`,
      'LAMBDA_TIMEOUT_ERROR',
      { functionName, timeout }
    );
    this.name = 'LambdaTimeoutError';
    this.functionName = functionName;
    this.timeout = timeout;
  }
}

/**
 * Lambda Function Error (errors returned by the function itself)
 */
class LambdaFunctionError extends LambdaServiceError {
  constructor(functionName, functionError, payload) {
    super(
      `Lambda function '${functionName}' returned an error: ${functionError}`,
      'LAMBDA_FUNCTION_ERROR',
      { functionName, functionError, payload }
    );
    this.name = 'LambdaFunctionError';
    this.functionName = functionName;
    this.functionError = functionError;
  }
}

/**
 * Enhanced Logger for Lambda Service
 */
class LambdaLogger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.enableColors = options.enableColors !== false;
    this.prefix = options.prefix || '[LambdaService]';
    this.enableTimestamp = options.enableTimestamp !== false;
    
    // Log levels in order of severity
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    this.colors = {
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      info: '\x1b[36m',    // Cyan
      debug: '\x1b[32m',   // Green
      trace: '\x1b[35m',   // Magenta
      reset: '\x1b[0m'     // Reset
    };
  }

  /**
   * Check if a log level should be output
   * @param {string} level - Log level to check
   * @returns {boolean} - Whether to log
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Additional data
   * @returns {string} - Formatted message
   */
  formatMessage(level, message, data) {
    let formatted = '';
    
    // Add timestamp
    if (this.enableTimestamp) {
      formatted += `[${new Date().toISOString()}] `;
    }
    
    // Add color and level
    if (this.enableColors) {
      formatted += `${this.colors[level]}${level.toUpperCase()}${this.colors.reset} `;
    } else {
      formatted += `${level.toUpperCase()} `;
    }
    
    // Add prefix
    formatted += `${this.prefix} ${message}`;
    
    return formatted;
  }

  /**
   * Log at specified level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Additional data to log
   */
  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = this.formatMessage(level, message);
    console.log(formattedMessage);
    
    if (data !== null) {
      console.log(data);
    }
  }

  /**
   * Log error level messages
   * @param {string} message - Log message
   * @param {*} data - Additional data
   */
  error(message, data = null) {
    this.log('error', message, data);
  }

  /**
   * Log warning level messages
   * @param {string} message - Log message
   * @param {*} data - Additional data
   */
  warn(message, data = null) {
    this.log('warn', message, data);
  }

  /**
   * Log info level messages
   * @param {string} message - Log message
   * @param {*} data - Additional data
   */
  info(message, data = null) {
    this.log('info', message, data);
  }

  /**
   * Log debug level messages
   * @param {string} message - Log message
   * @param {*} data - Additional data
   */
  debug(message, data = null) {
    this.log('debug', message, data);
  }

  /**
   * Log trace level messages
   * @param {string} message - Log message
   * @param {*} data - Additional data
   */
  trace(message, data = null) {
    this.log('trace', message, data);
  }

  /**
   * Log Lambda function invocation
   * @param {string} functionName - Function name
   * @param {Object} payload - Invocation payload
   * @param {Object} options - Invocation options
   */
  logInvocation(functionName, payload, options = {}) {
    this.info(`Invoking Lambda function: ${functionName}`);
    this.debug('Invocation payload:', payload);
    this.debug('Invocation options:', options);
  }

  /**
   * Log Lambda function response
   * @param {string} functionName - Function name
   * @param {Object} response - Function response
   * @param {number} duration - Execution duration in ms
   */
  logResponse(functionName, response, duration = null) {
    const durationText = duration ? ` (${duration}ms)` : '';
    this.info(`Lambda function completed: ${functionName}${durationText}`);
    this.debug('Response:', response);
  }

  /**
   * Log Lambda service errors
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  logError(error, context = {}) {
    this.error(`Lambda service error: ${error.message}`, {
      error: error.toJSON ? error.toJSON() : {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    });
  }

  /**
   * Create a child logger with additional context
   * @param {string} childPrefix - Additional prefix for child logger
   * @param {Object} options - Additional options
   * @returns {LambdaLogger} - Child logger instance
   */
  child(childPrefix, options = {}) {
    return new LambdaLogger({
      ...options,
      logLevel: this.logLevel,
      enableColors: this.enableColors,
      enableTimestamp: this.enableTimestamp,
      prefix: `${this.prefix}:${childPrefix}`
    });
  }
}

/**
 * Error Handler utility functions
 */
class ErrorHandler {
  /**
   * Wrap AWS SDK errors into Lambda service errors
   * @param {Error} awsError - AWS SDK error
   * @param {string} functionName - Lambda function name
   * @returns {LambdaServiceError} - Wrapped error
   */
  static wrapAwsError(awsError, functionName = null) {
    if (awsError.code === 'TimeoutError' || awsError.code === 'NetworkingError') {
      return new LambdaTimeoutError(functionName, 30000);
    }
    
    if (awsError.code === 'InvalidParameterValueException') {
      return new LambdaConfigurationError(
        `Invalid parameter: ${awsError.message}`,
        [awsError.parameterName]
      );
    }
    
    if (functionName) {
      return new LambdaInvocationError(functionName, awsError.message, awsError);
    }
    
    return new LambdaServiceError(awsError.message, awsError.code, {
      awsError: {
        code: awsError.code,
        message: awsError.message,
        statusCode: awsError.statusCode
      }
    });
  }

  /**
   * Handle Lambda function errors from response
   * @param {Object} response - Lambda response object
   * @param {string} functionName - Function name
   * @returns {LambdaFunctionError|null} - Function error or null
   */
  static handleFunctionError(response, functionName) {
    if (response.FunctionError) {
      return new LambdaFunctionError(
        functionName,
        response.FunctionError,
        response.Payload
      );
    }
    return null;
  }

  /**
   * Create a retry handler for Lambda operations
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} baseDelay - Base delay between retries in ms
   * @returns {Function} - Retry handler function
   */
  static createRetryHandler(maxRetries = 3, baseDelay = 1000) {
    return async (operation, logger = console) => {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries) {
            logger.error(`Operation failed after ${maxRetries} attempts:`, error);
            throw error;
          }
          
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError;
    };
  }
}

module.exports = {
  LambdaServiceError,
  LambdaInvocationError,
  LambdaConfigurationError,
  LambdaTimeoutError,
  LambdaFunctionError,
  LambdaLogger,
  ErrorHandler
};