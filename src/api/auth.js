import { supabase } from '../lib/supabase'

/**
 * Authentication middleware and utilities
 */

/**
 * Gets the current authenticated user
 * @returns {Promise<{user: Object|null, error: Error|null}>}
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('Error getting current user:', error)
      return { user: null, error }
    }

    return { user, error: null }
  } catch (error) {
    console.error('Exception getting current user:', error)
    return { user: null, error }
  }
}

/**
 * Validates that a user is authenticated
 * @returns {Promise<{isValid: boolean, user: Object|null, error: Error|null}>}
 */
export const validateAuth = async () => {
  const { user, error } = await getCurrentUser()

  if (error) {
    return { isValid: false, user: null, error }
  }

  if (!user) {
    const authError = new Error('User not authenticated')
    return { isValid: false, user: null, error: authError }
  }

  return { isValid: true, user, error: null }
}

/**
 * Middleware function to ensure user is authenticated before proceeding
 * @param {Function} apiFunction - The API function to execute
 * @returns {Function} Wrapped function with auth validation
 */
export const withAuth = (apiFunction) => {
  return async (...args) => {
    const { isValid, user, error } = await validateAuth()

    if (!isValid) {
      throw new Error(`Authentication required: ${error?.message || 'Unknown auth error'}`)
    }

    // Pass user as first argument to the API function
    return apiFunction(user, ...args)
  }
}

/**
 * Rate limiting storage (in-memory for this implementation)
 */
const rateLimitStore = new Map()

/**
 * Simple rate limiting function
 * @param {string} key - Unique identifier for rate limiting
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} True if request is allowed
 */
export const checkRateLimit = (key, maxRequests = 100, windowMs = 60000) => {
  const now = Date.now()
  const windowStart = now - windowMs

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, [])
  }

  const requests = rateLimitStore.get(key)

  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => timestamp > windowStart)

  if (validRequests.length >= maxRequests) {
    return false
  }

  // Add current request
  validRequests.push(now)
  rateLimitStore.set(key, validRequests)

  return true
}

/**
 * Rate limiting middleware
 * @param {Function} apiFunction - The API function to execute
 * @param {Object} options - Rate limiting options
 * @returns {Function} Wrapped function with rate limiting
 */
export const withRateLimit = (apiFunction, options = {}) => {
  const { maxRequests = 100, windowMs = 60000 } = options

  return async (user, ...args) => {
    const rateLimitKey = `${user.id}_${apiFunction.name}`

    if (!checkRateLimit(rateLimitKey, maxRequests, windowMs)) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }

    return apiFunction(user, ...args)
  }
}

/**
 * Input validation utilities
 */
export const validateInput = {
  /**
   * Validates string input
   * @param {any} value - Value to validate
   * @param {Object} options - Validation options
   * @returns {string} Sanitized string
   */
  string: (value, options = {}) => {
    const { required = false, minLength = 0, maxLength = 1000, pattern = null } = options

    if (value === null || value === undefined) {
      if (required) {
        throw new Error('String value is required')
      }
      return ''
    }

    const strValue = String(value).trim()

    if (required && !strValue) {
      throw new Error('String value cannot be empty')
    }

    if (strValue.length < minLength) {
      throw new Error(`String must be at least ${minLength} characters`)
    }

    if (strValue.length > maxLength) {
      throw new Error(`String cannot exceed ${maxLength} characters`)
    }

    if (pattern && !pattern.test(strValue)) {
      throw new Error('String format is invalid')
    }

    return strValue
  },

  /**
   * Validates enum values
   * @param {any} value - Value to validate
   * @param {Array} allowedValues - Array of allowed values
   * @param {boolean} required - Whether value is required
   * @returns {string} Validated enum value
   */
  enum: (value, allowedValues, required = true) => {
    if (!value && !required) {
      return null
    }

    if (!allowedValues.includes(value)) {
      throw new Error(`Value must be one of: ${allowedValues.join(', ')}`)
    }

    return value
  },

  /**
   * Validates UUID format
   * @param {string} value - UUID string to validate
   * @param {boolean} required - Whether UUID is required
   * @returns {string} Validated UUID
   */
  uuid: (value, required = true) => {
    if (!value && !required) {
      return null
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (!uuidPattern.test(value)) {
      throw new Error('Invalid UUID format')
    }

    return value
  }
}