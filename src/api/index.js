/**
 * Centralized API exports with consistent error handling and logging
 */

// Re-export all API functions
export * from './auth'
export * from './properties'
export * from './messaging'

/**
 * Global error handler for API calls
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @returns {Object} Formatted error response
 */
export const handleAPIError = (error, context = 'Unknown') => {
  const errorMessage = error?.message || 'An unexpected error occurred'
  const errorCode = error?.code || 'UNKNOWN_ERROR'

  console.error(`API Error in ${context}:`, {
    message: errorMessage,
    code: errorCode,
    stack: error?.stack,
    timestamp: new Date().toISOString()
  })

  // Return user-friendly error object
  return {
    success: false,
    error: {
      message: errorMessage,
      code: errorCode,
      context
    }
  }
}

/**
 * Wrapper function for API calls with consistent error handling
 * @param {Function} apiFunction - API function to call
 * @param {string} context - Context description
 * @returns {Function} Wrapped function
 */
export const safeAPICall = (apiFunction, context) => {
  return async (...args) => {
    try {
      const result = await apiFunction(...args)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      return handleAPIError(error, context)
    }
  }
}

/**
 * API configuration and constants
 */
export const API_CONFIG = {
  // Rate limiting defaults
  DEFAULT_RATE_LIMIT: {
    maxRequests: 100,
    windowMs: 60000 // 1 minute
  },

  // Strict rate limits for sensitive operations
  STRICT_RATE_LIMIT: {
    maxRequests: 10,
    windowMs: 60000 // 1 minute
  },

  // Request timeouts
  TIMEOUT: {
    DEFAULT: 30000, // 30 seconds
    UPLOAD: 60000,  // 1 minute for uploads
    DOWNLOAD: 120000 // 2 minutes for downloads
  },

  // Retry configuration
  RETRY: {
    attempts: 3,
    delay: 1000, // 1 second
    backoffMultiplier: 2
  }
}

/**
 * Retry wrapper for API calls
 * @param {Function} apiFunction - Function to retry
 * @param {Object} retryConfig - Retry configuration
 * @returns {Function} Wrapped function with retry logic
 */
export const withRetry = (apiFunction, retryConfig = API_CONFIG.RETRY) => {
  return async (...args) => {
    let lastError = null

    for (let attempt = 1; attempt <= retryConfig.attempts; attempt++) {
      try {
        return await apiFunction(...args)
      } catch (error) {
        lastError = error

        // Don't retry on authentication or validation errors
        if (error.message?.includes('Authentication') ||
            error.message?.includes('Invalid') ||
            error.message?.includes('Rate limit')) {
          throw error
        }

        // If not the last attempt, wait before retrying
        if (attempt < retryConfig.attempts) {
          const delay = retryConfig.delay * Math.pow(retryConfig.backoffMultiplier, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }
}

/**
 * Development mode helpers
 */
export const DEV_UTILS = {
  /**
   * Logs API call for debugging
   * @param {string} functionName - Name of the API function
   * @param {Array} args - Arguments passed to function
   * @param {any} result - Result from function
   */
  logAPICall: (functionName, args, result) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 API Call: ${functionName}`)
      console.log('Arguments:', args)
      console.log('Result:', result)
      console.groupEnd()
    }
  },

  /**
   * Simulates network delay for testing
   * @param {number} ms - Delay in milliseconds
   */
  simulateDelay: async (ms = 500) => {
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, ms))
    }
  }
}