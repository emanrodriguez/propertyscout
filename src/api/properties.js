import { supabase } from '../lib/supabase'
import { withAuth, withRateLimit, validateInput } from './auth'

// Constants for lead status validation
const LEAD_STATUS_VALUES = [
  'prospect_found', 'contacted', 'responded', 'proposal_sent',
  'booked', 'shoot_completed', 'delivered', 'paid',
  'closed_won', 'closed_lost'
]

const ACTIVE_STATUS_VALUES = [
  'prospect_found', 'contacted', 'responded', 'proposal_sent',
  'booked', 'shoot_completed', 'delivered', 'paid'
]

/**
 * Property-related API functions with authentication and validation
 */

/**
 * Internal function to get property leads (requires authenticated user)
 * @param {Object} user - Authenticated user object
 * @param {Object} options - Query options
 * @param {string} options.status - Lead status filter (optional)
 * @param {boolean} options.isActive - Active status filter (optional)
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Results per page (default: 20)
 * @returns {Promise<Object>} Object with leads array and pagination info
 */
const _getPropertyLeads = async (user, options = {}) => {
  const {
    status = null,
    isActive = null,
    page = 1,
    limit = 20
  } = options

  // Validate inputs
  const validStatus = status ? validateInput.enum(status, LEAD_STATUS_VALUES, false) : null
  const validIsActive = isActive !== null ? Boolean(isActive) : null
  const validPage = Math.max(1, parseInt(page) || 1)
  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)) // Max 100 per page
  const offset = (validPage - 1) * validLimit

  try {
    // Get the paginated and filtered lead IDs with count
    const { data: result, error: leadsError } = await supabase.rpc('get_property_leads_paginated', {
      p_status: validStatus,
      p_is_active: validIsActive,
      p_limit: validLimit,
      p_offset: offset
    })

    if (leadsError) {
      console.error('Supabase RPC error in getPropertyLeads:', leadsError)
      throw new Error(`Failed to fetch property leads: ${leadsError.message}`)
    }

    if (!result || !result.leads || result.leads.length === 0) {
      return {
        leads: [],
        pagination: {
          page: validPage,
          limit: validLimit,
          total: result?.total || 0,
          totalPages: Math.ceil((result?.total || 0) / validLimit),
          hasNextPage: false,
          hasPrevPage: validPage > 1
        }
      }
    }

    // The RPC now returns full lead data, no need for additional calls
    return {
      leads: result.leads,
      pagination: {
        page: validPage,
        limit: validLimit,
        total: result.total,
        totalPages: Math.ceil(result.total / validLimit),
        hasNextPage: validPage < Math.ceil(result.total / validLimit),
        hasPrevPage: validPage > 1
      }
    }
  } catch (error) {
    console.error('Error in _getPropertyLeads:', error)

    // For development, return mock data on error
    if (process.env.NODE_ENV === 'development') {
      console.warn('Returning mock data due to error in development')
      const mockLeads = getMockPropertyLeads(validStatus || 'active')
      return {
        leads: mockLeads,
        pagination: {
          page: validPage,
          limit: validLimit,
          total: mockLeads.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    }

    throw error
  }
}

/**
 * Internal function to update property lead status
 * @param {Object} user - Authenticated user object
 * @param {string} leadId - Lead ID to update
 * @param {string} status - New status
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Update result
 */
const _updatePropertyLead = async (user, leadId, status, metadata = {}) => {
  // Validate inputs
  const validLeadId = validateInput.uuid(leadId, true)
  const validStatus = validateInput.enum(status, LEAD_STATUS_VALUES, true)

  try {
    const { data, error } = await supabase.rpc('set_property_lead', {
      p_lead_id: validLeadId,
      p_status: validStatus,
      p_metadata: metadata,
      p_user_id: user.id
    })

    if (error) {
      console.error('Supabase RPC error in updatePropertyLead:', error)
      throw new Error(`Failed to update property lead: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in _updatePropertyLead:', error)
    throw error
  }
}

/**
 * Internal function to get property details
 * @param {Object} user - Authenticated user object
 * @param {string} propertyId - Property ID to fetch
 * @returns {Promise<Object>} Property details
 */
const _getPropertyDetails = async (user, propertyId) => {
  const validPropertyId = validateInput.uuid(propertyId, true)

  try {
    const { data, error } = await supabase.rpc('get_property_details', {
      p_property_id: validPropertyId,
      p_user_id: user.id
    })

    if (error) {
      throw new Error(`Failed to fetch property details: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in _getPropertyDetails:', error)
    throw error
  }
}

/**
 * Internal function to update property lead metadata only
 * @param {Object} user - Authenticated user object
 * @param {string} leadId - Lead ID to update
 * @param {Object} metadata - Metadata to update
 * @returns {Promise<Object>} Update result
 */
const _updatePropertyLeadMetadata = async (user, leadId, metadata = {}) => {
  // Validate inputs
  const validLeadId = validateInput.uuid(leadId, true)

  try {
    const { data, error } = await supabase.rpc('set_property_lead', {
      p_lead_id: validLeadId,
      p_metadata: metadata,
      p_user_id: user.id
    })

    if (error) {
      console.error('Supabase RPC error in updatePropertyLeadMetadata:', error)
      throw new Error(`Failed to update property lead metadata: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in _updatePropertyLeadMetadata:', error)
    throw error
  }
}

/**
 * Internal function to get leads with suggested next status
 * @param {Object} user - Authenticated user object
 * @param {string} statusFilter - Status filter (optional)
 * @param {boolean} isActiveFilter - Active status filter (optional)
 * @returns {Promise<Array>} Array of leads with suggestions
 */
const _getLeadsWithSuggestions = async (user, statusFilter = null, isActiveFilter = null) => {
  // Validate inputs
  const validStatusFilter = statusFilter ? validateInput.enum(statusFilter, LEAD_STATUS_VALUES, false) : null
  const validIsActiveFilter = isActiveFilter !== null ? Boolean(isActiveFilter) : null

  try {
    const { data, error } = await supabase.rpc('get_leads_with_suggestions', {
      p_user_id: user.id,
      p_status_filter: validStatusFilter,
      p_is_active_filter: validIsActiveFilter
    })

    if (error) {
      throw new Error(`Failed to fetch leads with suggestions: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in _getLeadsWithSuggestions:', error)
    throw error
  }
}

/**
 * Internal function to get valid transitions for a status
 * @param {Object} user - Authenticated user object
 * @param {string} fromStatus - Current status to get transitions from
 * @returns {Promise<Array>} Array of valid transitions
 */
const _getValidTransitions = async (user, fromStatus) => {
  const validFromStatus = validateInput.enum(fromStatus, LEAD_STATUS_VALUES, true)

  try {
    const { data, error } = await supabase
      .from('lead_transitions')
      .select('to_status, weight, description')
      .eq('from_status', validFromStatus)
      .order('weight', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch valid transitions: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in _getValidTransitions:', error)
    throw error
  }
}

/**
 * Internal function to update property lead status using the new RPC
 * @param {Object} user - Authenticated user object
 * @param {string} leadId - Lead ID to update
 * @param {string} status - New status
 * @returns {Promise<Object>} Update result
 */
const _setPropertyLeadStatus = async (user, leadId, status) => {
  // Validate inputs
  const validLeadId = validateInput.uuid(leadId, true)
  const validStatus = validateInput.enum(status, LEAD_STATUS_VALUES, true)

  try {
    const { data, error } = await supabase.rpc('set_property_lead_status', {
      p_lead_id: validLeadId,
      p_new_status: validStatus
    })

    if (error) {
      console.error('Supabase RPC error in setPropertyLeadStatus:', error)
      throw new Error(`Failed to update property lead status: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in _setPropertyLeadStatus:', error)
    throw error
  }
}

/**
 * Internal function to get all possible status values with current transitions
 * @param {Object} user - Authenticated user object
 * @param {string} currentStatus - Current status to get transitions from
 * @returns {Promise<Array>} Array of all statuses with transition weights
 */
const _getAllStatusOptions = async (user, currentStatus) => {
  console.log('getAllStatusOptions called with currentStatus:', currentStatus)
  console.log('Available LEAD_STATUS_VALUES:', LEAD_STATUS_VALUES)

  const validCurrentStatus = validateInput.enum(currentStatus, LEAD_STATUS_VALUES, true)

  try {
    // Get valid transitions for current status
    const { data: transitions, error } = await supabase
      .from('lead_transitions')
      .select('to_status, weight, description')
      .eq('from_status', validCurrentStatus)
      .order('weight', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch transitions: ${error.message}`)
    }

    // Create a map of transitions with weights
    const transitionMap = new Map()
    if (transitions) {
      transitions.forEach(t => {
        transitionMap.set(t.to_status, {
          weight: t.weight,
          description: t.description,
          isValid: true
        })
      })
    }

    // Get all possible status values and add them with 0% if not in transitions
    const allStatuses = LEAD_STATUS_VALUES.filter(status => status !== validCurrentStatus)

    const allOptions = allStatuses.map(status => {
      const transition = transitionMap.get(status)
      return {
        to_status: status,
        weight: transition?.weight || 0,
        description: transition?.description || 'Manual status change',
        isValid: transition?.isValid || false
      }
    })

    // Sort by weight (valid transitions first, then invalid ones)
    return allOptions.sort((a, b) => {
      if (a.isValid && !b.isValid) return -1
      if (!a.isValid && b.isValid) return 1
      return b.weight - a.weight
    })

  } catch (error) {
    console.error('Error in _getAllStatusOptions:', error)
    throw error
  }
}

/**
 * Internal function to get status transitions for multiple leads in a single call
 * @param {Object} user - Authenticated user object
 * @param {Array<string>} leadIds - Array of lead IDs to get transitions for
 * @returns {Promise<Object>} Object with lead IDs as keys and transition arrays as values
 */
const _getLeadTransitionsBatch = async (user, leadIds) => {
  // Validate inputs
  const validLeadIds = leadIds.map(id => validateInput.uuid(id, true))

  try {
    const { data, error } = await supabase.rpc('get_lead_transitions_batch', {
      p_lead_ids: validLeadIds
    })

    if (error) {
      throw new Error(`Failed to fetch lead transitions batch: ${error.message}`)
    }

    return data || {}
  } catch (error) {
    console.error('Error in _getLeadTransitionsBatch:', error)
    throw error
  }
}

// Mock data for development
const getMockPropertyLeads = (status) => {
  const mockLeads = [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "status": status,
      "created_at": "2025-09-19T20:18:02.325914+00:00",
      "property": {
        "id": "456e7890-e89b-12d3-a456-426614174001",
        "street_address": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zipcode": "94105",
        "bedrooms": 3,
        "bathrooms": 2,
        "home_type": "SINGLE_FAMILY",
        "year_built": 1950,
        "image_url": "https://example.com/image1.jpg",
        "image_urls": [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg"
        ]
      },
      "listing": {
        "price": 850000
      },
      "agent": {
        "full_name": "John Smith",
        "phone_number": "4155551234",
        "email": "john@example.com",
        "license_number": "12345678"
      },
      "broker": {
        "name": "ABC Realty",
        "phone_number": "4155559999"
      }
    }
  ]

  return status === 'archived' ? [] : mockLeads
}

/**
 * Internal function to delete a property lead
 * @param {Object} user - Authenticated user object
 * @param {string} leadId - Lead ID to delete
 * @returns {Promise<Object>} Success/error response
 */
const _deletePropertyLead = async (user, leadId) => {
  const validLeadId = validateInput.uuid(leadId, true)

  try {
    const { data, error } = await supabase.rpc('delete_property_lead', {
      p_lead_id: validLeadId
    })

    if (error) {
      console.error('Supabase RPC error in deletePropertyLead:', error)
      throw new Error(`Failed to delete property lead: ${error.message}`)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in _deletePropertyLead:', error)
    throw error
  }
}

/**
 * Internal function to archive a property lead (set is_active to false)
 * @param {Object} user - Authenticated user object
 * @param {string} leadId - Lead ID to archive
 * @returns {Promise<Object>} Success/error response
 */
const _archivePropertyLead = async (user, leadId) => {
  const validLeadId = validateInput.uuid(leadId, true)

  try {
    const { data, error } = await supabase
      .from('property_leads')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', validLeadId)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Supabase error in archivePropertyLead:', error)
      throw new Error(`Failed to archive property lead: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error('Property lead not found or you do not have permission to archive it')
    }

    return { success: true, data: data[0] }
  } catch (error) {
    console.error('Error in _archivePropertyLead:', error)
    throw error
  }
}

// Export public API functions with authentication and rate limiting
export const getPropertyLeads = withAuth(withRateLimit(_getPropertyLeads, { maxRequests: 50, windowMs: 60000 }))
export const updatePropertyLead = withAuth(withRateLimit(_updatePropertyLead, { maxRequests: 20, windowMs: 60000 }))
export const updatePropertyLeadMetadata = withAuth(withRateLimit(_updatePropertyLeadMetadata, { maxRequests: 20, windowMs: 60000 }))
export const getPropertyDetails = withAuth(withRateLimit(_getPropertyDetails, { maxRequests: 100, windowMs: 60000 }))
export const getLeadsWithSuggestions = withAuth(withRateLimit(_getLeadsWithSuggestions, { maxRequests: 50, windowMs: 60000 }))
export const getValidTransitions = withAuth(withRateLimit(_getValidTransitions, { maxRequests: 100, windowMs: 60000 }))
export const setPropertyLeadStatus = withAuth(withRateLimit(_setPropertyLeadStatus, { maxRequests: 30, windowMs: 60000 }))
export const getAllStatusOptions = withAuth(withRateLimit(_getAllStatusOptions, { maxRequests: 100, windowMs: 60000 }))
export const getLeadTransitionsBatch = withAuth(withRateLimit(_getLeadTransitionsBatch, { maxRequests: 50, windowMs: 60000 }))
export const deletePropertyLead = withAuth(withRateLimit(_deletePropertyLead, { maxRequests: 10, windowMs: 60000 }))
export const archivePropertyLead = withAuth(withRateLimit(_archivePropertyLead, { maxRequests: 20, windowMs: 60000 }))

// Export constants for use in components
export { LEAD_STATUS_VALUES, ACTIVE_STATUS_VALUES }