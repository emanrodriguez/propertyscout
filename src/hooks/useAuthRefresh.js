import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { proactiveRefresh, checkSessionStatus } from '../lib/auth-refresh'

/**
 * Custom hook to handle automatic JWT refresh
 * Proactively refreshes tokens before they expire
 */
export const useAuthRefresh = (options = {}) => {
  const {
    enabled = true,
    checkInterval = 60000, // Check every minute
    refreshThreshold = 300, // Refresh if expiring within 5 minutes
  } = options

  const intervalRef = useRef(null)
  const isCheckingRef = useRef(false)

  const checkAndRefresh = useCallback(async () => {
    if (isCheckingRef.current || !enabled) return

    isCheckingRef.current = true

    try {
      const status = await checkSessionStatus()

      if (status.needsRefresh && status.isValid) {
        console.log('[useAuthRefresh] Proactively refreshing session')
        await proactiveRefresh()
      }
    } catch (error) {
      console.error('[useAuthRefresh] Error during session check:', error)
    } finally {
      isCheckingRef.current = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial check
    checkAndRefresh()

    // Set up periodic checking
    intervalRef.current = setInterval(checkAndRefresh, checkInterval)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('[useAuthRefresh] Token refreshed automatically by Supabase')
      } else if (event === 'SIGNED_OUT') {
        console.log('[useAuthRefresh] User signed out, stopping refresh checks')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else if (event === 'SIGNED_IN') {
        console.log('[useAuthRefresh] User signed in, starting refresh checks')
        checkAndRefresh()
      }
    })

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      subscription.unsubscribe()
    }
  }, [enabled, checkInterval, checkAndRefresh])

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    try {
      const result = await proactiveRefresh()
      return result
    } catch (error) {
      console.error('[useAuthRefresh] Manual refresh failed:', error)
      throw error
    }
  }, [])

  return {
    manualRefresh,
    checkAndRefresh
  }
}

/**
 * Hook specifically for monitoring JWT expiration and showing warnings
 */
export const useJWTMonitor = (options = {}) => {
  const {
    warningThreshold = 600, // Warn if expiring within 10 minutes
    onWarning = () => {},
    onExpired = () => {},
  } = options

  useEffect(() => {
    const checkExpiration = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) return

        const now = Math.floor(Date.now() / 1000)
        const expiresAt = session.expires_at || 0
        const timeUntilExpiry = expiresAt - now

        if (timeUntilExpiry <= 0) {
          onExpired()
        } else if (timeUntilExpiry <= warningThreshold) {
          onWarning(timeUntilExpiry)
        }
      } catch (error) {
        console.error('[useJWTMonitor] Error checking JWT expiration:', error)
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkExpiration, 30000)
    checkExpiration() // Initial check

    return () => clearInterval(interval)
  }, [warningThreshold, onWarning, onExpired])
}