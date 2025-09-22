/**
 * Agents API functions
 * Handles all agent-related data fetching and processing
 */

import { supabase } from '../lib/supabase'

/**
 * Wrapper function for API calls with consistent error handling
 * @param {Function} apiFunction - API function to call
 * @param {string} context - Context description
 * @returns {Function} Wrapped function
 */
const safeAPICall = (apiFunction, context) => {
  return async (...args) => {
    try {
      const result = await apiFunction(...args)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      const errorMessage = error?.message || 'An unexpected error occurred'
      const errorCode = error?.code || 'UNKNOWN_ERROR'

      console.error(`API Error in ${context}:`, {
        message: errorMessage,
        code: errorCode,
        stack: error?.stack,
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        error: {
          message: errorMessage,
          code: errorCode,
          context
        }
      }
    }
  }
}

/**
 * Fetches all agents with their lead counts and statistics
 * @returns {Promise<Array>} Array of agent objects with statistics
 */
export const fetchAgentsWithStats = safeAPICall(async () => {
  // Get agents with their lead counts
  const { data, error } = await supabase
    .from('agents')
    .select(`
      license_number,
      first_name,
      last_name,
      email,
      phone_number,
      broker_id,
      created_at,
      updated_at,
      image_url,
      brokers (
        name
      ),
      listings!listings_temp_agent_id_fkey (
        zpid,
        property_leads (
          id,
          status,
          created_at
        )
      )
    `)
    .order('last_name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch agents: ${error.message}`)
  }

  // Process the data to calculate lead counts and format names
  const processedAgents = data.map(agent => {
    const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.trim()

    // Get unique property leads count
    const propertyLeads = new Set()
    agent.listings?.forEach(listing => {
      listing.property_leads?.forEach(lead => {
        propertyLeads.add(lead.id)
      })
    })

    // Get the most recent activity
    let lastActivity = null
    agent.listings?.forEach(listing => {
      listing.property_leads?.forEach(lead => {
        const leadDate = new Date(lead.created_at)
        if (!lastActivity || leadDate > lastActivity) {
          lastActivity = leadDate
        }
      })
    })

    return {
      ...agent,
      full_name: fullName,
      leads_count: propertyLeads.size,
      listings_count: agent.listings?.length || 0,
      last_activity: lastActivity,
      broker_name: agent.brokers?.name || 'Independent'
    }
  })

  return processedAgents
}, 'fetchAgentsWithStats')

/**
 * Fetches agents by search criteria
 * @param {Object} searchParams - Search parameters
 * @param {string} searchParams.query - Search query string
 * @param {string} searchParams.sortBy - Sort field (name, leads_count, last_activity)
 * @returns {Promise<Array>} Filtered and sorted agents
 */
export const searchAgents = safeAPICall(async ({ query = '', sortBy = 'name' }) => {
  // First get all agents with stats
  const result = await fetchAgentsWithStats()
  if (!result.success) {
    throw new Error(result.error.message)
  }

  let agents = result.data

  // Apply search filter if query provided
  if (query) {
    const searchLower = query.toLowerCase()
    agents = agents.filter(agent => {
      return (
        agent.full_name.toLowerCase().includes(searchLower) ||
        agent.email?.toLowerCase().includes(searchLower) ||
        agent.phone_number?.includes(query) ||
        agent.license_number?.toString().includes(query) ||
        agent.broker_name?.toLowerCase().includes(searchLower)
      )
    })
  }

  // Apply sorting
  agents.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.full_name.localeCompare(b.full_name)
      case 'leads_count':
        return b.leads_count - a.leads_count
      case 'last_activity':
        if (!a.last_activity) return 1
        if (!b.last_activity) return -1
        return b.last_activity - a.last_activity
      default:
        return 0
    }
  })

  return agents
}, 'searchAgents')

/**
 * Fetches a single agent by license number
 * @param {string} licenseNumber - Agent's license number
 * @returns {Promise<Object>} Agent object with statistics
 */
export const fetchAgentByLicense = safeAPICall(async (licenseNumber) => {
  const { data, error } = await supabase
    .from('agents')
    .select(`
      license_number,
      first_name,
      last_name,
      email,
      phone_number,
      broker_id,
      created_at,
      updated_at,
      image_url,
      brokers (
        name
      ),
      listings!listings_temp_agent_id_fkey (
        zpid,
        property_leads (
          id,
          status,
          created_at
        )
      )
    `)
    .eq('license_number', licenseNumber)
    .single()

  if (error) {
    throw new Error(`Failed to fetch agent: ${error.message}`)
  }

  // Process the data similar to fetchAgentsWithStats
  const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim()

  const propertyLeads = new Set()
  data.listings?.forEach(listing => {
    listing.property_leads?.forEach(lead => {
      propertyLeads.add(lead.id)
    })
  })

  let lastActivity = null
  data.listings?.forEach(listing => {
    listing.property_leads?.forEach(lead => {
      const leadDate = new Date(lead.created_at)
      if (!lastActivity || leadDate > lastActivity) {
        lastActivity = leadDate
      }
    })
  })

  return {
    ...data,
    full_name: fullName,
    leads_count: propertyLeads.size,
    listings_count: data.listings?.length || 0,
    last_activity: lastActivity,
    broker_name: data.brokers?.name || 'Independent'
  }
}, 'fetchAgentByLicense')

/**
 * Gets agent statistics summary
 * @returns {Promise<Object>} Summary statistics for all agents
 */
export const getAgentStats = safeAPICall(async () => {
  const result = await fetchAgentsWithStats()
  if (!result.success) {
    throw new Error(result.error.message)
  }

  const agents = result.data

  return {
    totalAgents: agents.length,
    totalLeads: agents.reduce((sum, agent) => sum + agent.leads_count, 0),
    totalListings: agents.reduce((sum, agent) => sum + agent.listings_count, 0),
    activeAgents: agents.filter(agent => agent.leads_count > 0).length,
    averageLeadsPerAgent: agents.length > 0
      ? Math.round(agents.reduce((sum, agent) => sum + agent.leads_count, 0) / agents.length * 10) / 10
      : 0
  }
}, 'getAgentStats')