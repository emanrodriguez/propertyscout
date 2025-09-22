import { createContext, useContext, useState, useCallback } from 'react'
import { getLeadTransitionsBatch } from '../api/properties'
import { safeAPICall } from '../api/index'

const StatusTransitionsContext = createContext()

export const useStatusTransitions = () => {
  const context = useContext(StatusTransitionsContext)
  if (!context) {
    throw new Error('useStatusTransitions must be used within a StatusTransitionsProvider')
  }
  return context
}

export const StatusTransitionsProvider = ({ children }) => {
  const [transitionsCache, setTransitionsCache] = useState(new Map())
  const [loadingBatch, setLoadingBatch] = useState(false)
  const [loadingLeadIds, setLoadingLeadIds] = useState(new Set())

  const loadTransitionsForLeads = useCallback(async (leadIds) => {
    if (!leadIds || leadIds.length === 0) {
      return
    }

    // Filter out lead IDs that are already in cache or currently loading
    const uncachedLeadIds = leadIds.filter(id => !transitionsCache.has(id) && !loadingLeadIds.has(id))

    if (uncachedLeadIds.length === 0) {
      return // All requested transitions are already cached or loading
    }

    console.log('StatusTransitionsContext: Loading batch for', uncachedLeadIds.length, 'leads')

    // Mark these lead IDs as loading
    setLoadingLeadIds(prev => {
      const newSet = new Set(prev)
      uncachedLeadIds.forEach(id => newSet.add(id))
      return newSet
    })

    setLoadingBatch(true)
    try {
      const secureGetTransitions = safeAPICall(getLeadTransitionsBatch, 'StatusTransitions.loadBatch')
      const result = await secureGetTransitions(uncachedLeadIds)

      if (result.success) {
        const newTransitions = new Map(transitionsCache)

        // Add each lead's transitions to the cache
        Object.entries(result.data).forEach(([leadId, transitions]) => {
          console.log('StatusTransitionsContext: Mapping lead', leadId, 'to', transitions.length, 'transitions')
          newTransitions.set(leadId, transitions)
        })

        setTransitionsCache(newTransitions)
        console.log('StatusTransitionsContext: Loaded transitions for', Object.keys(result.data).length, 'leads')
        console.log('StatusTransitionsContext: Total cache size now:', newTransitions.size)
      } else {
        console.error('Failed to load status transitions batch:', result.error)
      }
    } catch (error) {
      console.error('Error loading status transitions batch:', error)
    } finally {
      // Remove the lead IDs from loading set
      setLoadingLeadIds(prev => {
        const newSet = new Set(prev)
        uncachedLeadIds.forEach(id => newSet.delete(id))
        return newSet
      })
      setLoadingBatch(false)
    }
  }, [transitionsCache, loadingLeadIds])

  const getTransitionsForLead = useCallback((leadId) => {
    const transitions = transitionsCache.get(leadId) || null
    console.log('StatusTransitionsContext: Getting transitions for lead', leadId, 'found:', transitions ? transitions.length : 'none')
    return transitions
  }, [transitionsCache])

  const isLeadLoading = useCallback((leadId) => {
    return loadingLeadIds.has(leadId)
  }, [loadingLeadIds])

  const clearCache = useCallback(() => {
    setTransitionsCache(new Map())
    setLoadingLeadIds(new Set())
  }, [])

  const value = {
    loadTransitionsForLeads,
    getTransitionsForLead,
    isLeadLoading,
    clearCache,
    loadingBatch
  }

  return (
    <StatusTransitionsContext.Provider value={value}>
      {children}
    </StatusTransitionsContext.Provider>
  )
}