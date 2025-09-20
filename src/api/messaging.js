import { supabase } from '../lib/supabase'
import { withAuth, withRateLimit, validateInput } from './auth'

/**
 * SMS and messaging API functions with authentication and validation
 */

/**
 * Internal function to get message templates
 * @param {Object} user - Authenticated user object
 * @param {string} templateType - Type of template to fetch
 * @returns {Promise<Array>} Array of message templates
 */
const _getMessageTemplates = async (user, templateType = 'message') => {
  const validType = validateInput.enum(templateType, ['message', 'email', 'sms'], false) || 'message'

  try {
    const { data, error } = await supabase.rpc('get_templates', {
      p_template_type: validType
    })

    if (error) {
      console.error('Supabase RPC error in getMessageTemplates:', error)
      throw new Error(`Failed to fetch templates: ${error.message}`)
    }

    // Transform the nested object structure to an array
    if (data && data.message) {
      const templatesArray = Object.entries(data.message).map(([key, template]) => ({
        id: template.id,
        name: template.name,
        content: template.content,
        type: template.type || validType,
        updated_at: template.updated_at
      }))
      return templatesArray
    }

    return data || []
  } catch (error) {
    console.error('Error in _getMessageTemplates:', error)

    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      return getMockTemplates()
    }

    throw error
  }
}

/**
 * Internal function to get SMS details for a lead
 * @param {Object} user - Authenticated user object
 * @param {string} leadId - Lead ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} SMS details
 */
const _getSMSDetails = async (user, leadId, templateId) => {
  const validLeadId = validateInput.uuid(leadId, true)
  const validTemplateId = validateInput.uuid(templateId, true)

  try {
    const { data, error } = await supabase.rpc('get_sms_details', {
      p_lead_id: validLeadId,
      p_template_id: validTemplateId
    })

    if (error) {
      console.error('Supabase RPC error in getSMSDetails:', error)
      throw new Error(`Failed to fetch SMS details: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in _getSMSDetails:', error)

    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      return getMockSMSDetails(validLeadId, validTemplateId)
    }

    throw error
  }
}

/**
 * Internal function to get all SMS details for templates
 * @param {Object} user - Authenticated user object
 * @param {Array} templateIds - Array of template IDs
 * @param {string} leadId - Lead ID
 * @returns {Promise<Object>} SMS details for all templates
 */
const _getAllSMSDetails = async (user, templateIds, leadId) => {
  const validLeadId = validateInput.uuid(leadId, true)

  // Validate template IDs
  const validTemplateIds = templateIds.map(id => validateInput.uuid(id, true))

  try {
    // The database function only accepts p_lead_id according to the error message
    const { data, error } = await supabase.rpc('get_all_sms_details', {
      p_lead_id: validLeadId
    })

    if (error) {
      console.error('Supabase RPC error in getAllSMSDetails:', error)
      throw new Error(`Failed to fetch SMS details: ${error.message}`)
    }

    // Filter the returned data by template IDs if needed
    let result = data || {}
    if (validTemplateIds && validTemplateIds.length > 0) {
      const filteredResult = {}
      validTemplateIds.forEach(templateId => {
        if (result[templateId]) {
          filteredResult[templateId] = result[templateId]
        }
      })
      result = filteredResult
    }

    return result
  } catch (error) {
    console.error('Error in _getAllSMSDetails:', error)

    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      return getMockAllSMSDetails(validTemplateIds, validLeadId)
    }

    throw error
  }
}

/**
 * Internal function to send SMS message
 * @param {Object} user - Authenticated user object
 * @param {Object} smsData - SMS data to send
 * @returns {Promise<Object>} Send result
 */
const _sendSMSMessage = async (user, smsData) => {
  // Validate SMS data
  const {
    to: rawTo,
    message: rawMessage,
    leadId: rawLeadId,
    templateId: rawTemplateId
  } = smsData

  const to = validateInput.string(rawTo, { required: true, pattern: /^\+?[\d\s\-\(\)]+$/ })
  const message = validateInput.string(rawMessage, { required: true, minLength: 1, maxLength: 1600 })
  const leadId = validateInput.uuid(rawLeadId, true)
  const templateId = validateInput.uuid(rawTemplateId, false)

  try {
    const { data, error } = await supabase.rpc('send_sms_message', {
      p_to: to,
      p_message: message,
      p_lead_id: leadId,
      p_template_id: templateId,
      p_user_id: user.id
    })

    if (error) {
      console.error('Supabase RPC error in sendSMSMessage:', error)
      throw new Error(`Failed to send SMS: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in _sendSMSMessage:', error)
    throw error
  }
}

/**
 * Internal function to get SMS history for a lead
 * @param {Object} user - Authenticated user object
 * @param {string} leadId - Lead ID
 * @returns {Promise<Array>} SMS history
 */
const _getSMSHistory = async (user, leadId) => {
  const validLeadId = validateInput.uuid(leadId, true)

  try {
    const { data, error } = await supabase.rpc('get_sms_history', {
      p_lead_id: validLeadId,
      p_user_id: user.id
    })

    if (error) {
      throw new Error(`Failed to fetch SMS history: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in _getSMSHistory:', error)
    throw error
  }
}

// Mock data functions for development
const getMockTemplates = () => [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Initial Contact",
    content: "Hi {agent_name}, I'm interested in the property at {property_address}. Could we schedule a showing?",
    type: "message"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Follow Up",
    content: "Hi {agent_name}, following up on the property at {property_address}. Is it still available?",
    type: "message"
  }
]

const getMockSMSDetails = (leadId, templateId) => ({
  leadId,
  templateId,
  to: "+14155551234",
  message: "Hi John Smith, I'm interested in the property at 123 Main St. Could we schedule a showing?",
  agentName: "John Smith",
  propertyAddress: "123 Main St"
})

const getMockAllSMSDetails = (templateIds, leadId) => {
  const result = {}
  templateIds.forEach((templateId, index) => {
    result[templateId] = getMockSMSDetails(leadId, templateId)
  })
  return result
}

// Export public API functions with authentication and rate limiting
export const getMessageTemplates = withAuth(withRateLimit(_getMessageTemplates, { maxRequests: 50, windowMs: 60000 }))
export const getSMSDetails = withAuth(withRateLimit(_getSMSDetails, { maxRequests: 100, windowMs: 60000 }))
export const getAllSMSDetails = withAuth(withRateLimit(_getAllSMSDetails, { maxRequests: 50, windowMs: 60000 }))
export const sendSMSMessage = withAuth(withRateLimit(_sendSMSMessage, { maxRequests: 10, windowMs: 60000 }))
export const getSMSHistory = withAuth(withRateLimit(_getSMSHistory, { maxRequests: 30, windowMs: 60000 }))