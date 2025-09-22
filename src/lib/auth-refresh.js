import { supabase } from './supabase'

/**
 * JWT Refresh and Retry Utility for Supabase
 * Handles automatic token refresh and API call retries
 */

let refreshPromise = null
let isRefreshing = false

/**
 * Checks if an error indicates an expired JWT
 * @param {Error|Object} error - Error object or Supabase error response
 * @returns {boolean} True if error is JWT-related
 */
export const isJWTExpiredError = (error) => {
  if (!error) return false

  const errorMessage = error.message || error.details || JSON.stringify(error)
  const errorCode = error.code || error.error_code

  return (
    errorCode === 'PGRST301' || // JWT expired
    errorCode === 'PGRST302' || // JWT invalid
    errorCode === 'PGRST303' || // JWT malformed
    errorMessage.includes('JWT expired') ||
    errorMessage.includes('jwt expired') ||
    errorMessage.includes('invalid JWT') ||
    errorMessage.includes('JWT malformed') ||
    error.status === 401
  )
}

/**
 * Refreshes the current session token
 * @returns {Promise<{success: boolean, session: Object|null, error: Error|null}>}
 */
export const refreshSession = async () => {
  // Prevent multiple concurrent refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = performRefresh()

  try {
    const result = await refreshPromise
    return result
  } finally {
    isRefreshing = false
    refreshPromise = null
  }
}

/**
 * Internal function to perform the actual session refresh
 * @private
 */
const performRefresh = async () => {
  try {
    console.log('[AuthRefresh] Attempting to refresh session...')

    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error('[AuthRefresh] Session refresh failed:', error)
      return {
        success: false,
        session: null,
        error
      }
    }

    if (!data.session) {
      console.warn('[AuthRefresh] No session returned from refresh')
      return {
        success: false,
        session: null,
        error: new Error('No session returned from refresh')
      }
    }

    console.log('[AuthRefresh] Session refreshed successfully')
    return {
      success: true,
      session: data.session,
      error: null
    }
  } catch (error) {
    console.error('[AuthRefresh] Exception during session refresh:', error)
    return {
      success: false,
      session: null,
      error
    }
  }
}

/**
 * Wrapper function that automatically handles JWT refresh and retry
 * @param {Function} apiFunction - Function that makes API calls
 * @param {number} maxRetries - Maximum number of retry attempts (default: 1)
 * @returns {Function} Wrapped function with auto-retry
 */
export const withJWTRefresh = (apiFunction, maxRetries = 1) => {
  return async (...args) => {
    let lastError = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiFunction(...args)
      } catch (error) {
        lastError = error

        // Only retry on JWT-related errors and if we have attempts left
        if (isJWTExpiredError(error) && attempt < maxRetries) {
          console.log(`[AuthRefresh] JWT expired, attempting refresh (attempt ${attempt + 1}/${maxRetries + 1})`)

          const refreshResult = await refreshSession()

          if (!refreshResult.success) {
            console.error('[AuthRefresh] Session refresh failed, cannot retry')
            // If refresh fails, throw the refresh error instead of the original API error
            throw refreshResult.error || new Error('Session refresh failed')
          }

          console.log('[AuthRefresh] Session refreshed, retrying API call...')
          // Continue to next iteration to retry the API call
          continue
        }

        // If it's not a JWT error or we've exhausted retries, throw the error
        throw error
      }
    }

    // This should never be reached, but just in case
    throw lastError
  }
}

/**
 * Creates a Supabase client wrapper with automatic JWT refresh
 * @param {Object} client - Supabase client instance
 * @returns {Object} Enhanced client with auto-refresh capabilities
 */
export const createAutoRefreshClient = (client) => {
  const enhancedClient = { ...client }

  // Wrap RPC calls
  const originalRpc = client.rpc.bind(client)
  enhancedClient.rpc = withJWTRefresh(originalRpc)

  // Wrap table operations
  const originalFrom = client.from.bind(client)
  enhancedClient.from = (table) => {
    const query = originalFrom(table)

    // Wrap query execution methods
    const wrapQueryMethod = (method) => {
      const original = query[method].bind(query)
      return withJWTRefresh(original)
    }

    return {
      ...query,
      select: wrapQueryMethod('select'),
      insert: wrapQueryMethod('insert'),
      update: wrapQueryMethod('update'),
      upsert: wrapQueryMethod('upsert'),
      delete: wrapQueryMethod('delete')
    }
  }

  return enhancedClient
}

/**
 * Utility to check current session status
 * @returns {Promise<{isValid: boolean, session: Object|null, needsRefresh: boolean}>}
 */
export const checkSessionStatus = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return {
        isValid: false,
        session: null,
        needsRefresh: false
      }
    }

    // Check if token is close to expiry (within 5 minutes)
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at || 0
    const timeUntilExpiry = expiresAt - now
    const needsRefresh = timeUntilExpiry < 300 // 5 minutes

    return {
      isValid: true,
      session,
      needsRefresh
    }
  } catch (error) {
    console.error('[AuthRefresh] Error checking session status:', error)
    return {
      isValid: false,
      session: null,
      needsRefresh: false
    }
  }
}

/**
 * Proactively refresh session if it's close to expiry
 * Call this periodically in your app
 */
export const proactiveRefresh = async () => {
  const status = await checkSessionStatus()

  if (status.needsRefresh && status.isValid) {
    console.log('[AuthRefresh] Proactively refreshing session')
    return await refreshSession()
  }

  return { success: true, session: status.session, error: null }
}