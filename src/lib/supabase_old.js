import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Re-export secure API functions
export {
  getPropertyLeads,
  updatePropertyLead,
  getPropertyDetails
} from '../api/properties'

export {
  getMessageTemplates,
  getSMSDetails,
  getAllSMSDetails,
  sendSMSMessage,
  getSMSHistory
} from '../api/messaging'

export {
  getCurrentUser,
  validateAuth,
  safeAPICall,
  handleAPIError
} from '../api/index'

// Legacy wrapper - keeping for backward compatibility but redirecting to secure API
export const getPropertyLeadsLegacy = async (status = 'active') => {
  // This would normally call your Supabase function
  // For now, returning mock data based on the example you provided

  // Try to call the Supabase function
  try {
    const { data, error } = await supabase.rpc('get_property_leads', {
      p_status: status
    })

    if (error) {
      console.error('Supabase function error:', error)
      return getMockPropertyLeads(status)
    }

    return data || []
  } catch (error) {
    console.error('Error calling get_property_leads:', error)
    return getMockPropertyLeads(status)
  }
}

// SMS-related functions
export const getMessageTemplates = async () => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('User not authenticated for template access')
      return []
    }

    const { data, error } = await supabase.rpc('get_templates', {
      p_template_type: 'message'
    })

    if (error) {
      console.error('Error fetching templates:', error)
      // Return mock templates for development if RPC fails
      return getMockTemplates()
    }

    console.log('Raw template data from RPC:', data) // Debug log

    // Convert cloud format to local format
    const messageTemplates = []
    if (data && data.message) {
      Object.entries(data.message).forEach(([key, value]) => {
        const template = {
          id: value.id || key, // Use the UUID if available, otherwise fallback to key
          name: value.name,
          content: value.content,
          template_id: value.id || key // Use the UUID for template_id
        }
        console.log('Processed template:', template) // Debug log
        messageTemplates.push(template)
      })
    }

    // If no templates found, return mock templates for development
    if (messageTemplates.length === 0) {
      return getMockTemplates()
    }

    return messageTemplates
  } catch (error) {
    console.error('Error loading message templates:', error)
    // Return mock templates for development
    return getMockTemplates()
  }
}

// Mock templates for development
const getMockTemplates = () => {
  return [
    {
      id: '0b6d1eff-8086-445a-acbe-4042a1d18c2a',
      name: 'Morning Text',
      content: 'Happy {dayOfWeek} {agentFirstname}! I\'m Emmanuel with OC Property Photos and I noticed your listing at {streetAddress} and thought it\'d be perfect for our first-time client promo. Let me know if you\'re interested!',
      template_id: '0b6d1eff-8086-445a-acbe-4042a1d18c2a'
    },
    {
      id: '51120eac-d095-4561-9d8a-e2b6ce653158',
      name: 'After 11AM',
      content: 'Hey {agentFirstname}! I\'m Emmanuel with OC Property Photos and I noticed your listing at {streetAddress} and thought it\'d be perfect for our first-time client promo. Let me know if you\'re interested!',
      template_id: '51120eac-d095-4561-9d8a-e2b6ce653158'
    },
    {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      name: 'Afternoon Follow Up',
      content: 'Good afternoon {agentFirstname}! Just wanted to follow up about your listing at {streetAddress}. Our photography package could really make this property shine. Would you like to hear more?',
      template_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    }
  ]
}

// Get SMS details for all templates at once
export const getAllSMSDetails = async (leadId) => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('User not authenticated for SMS details')
      return getMockAllSMSDetails(leadId)
    }

    const { data, error } = await supabase.rpc('get_all_sms_details', {
      p_lead_id: leadId
    })

    if (error) {
      console.error('Error getting all SMS details:', error)
      // Return mock SMS details for development
      return getMockAllSMSDetails(leadId)
    }

    console.log('All SMS details from RPC:', data)
    return data || getMockAllSMSDetails(leadId)
  } catch (error) {
    console.error('Error processing all SMS templates:', error)
    // Return mock SMS details for development
    return getMockAllSMSDetails(leadId)
  }
}

// Mock all SMS details for development
const getMockAllSMSDetails = (leadId) => {
  const mockLeads = getMockPropertyLeads('active')
  const lead = mockLeads.find(l => l.id === leadId)

  if (!lead) {
    return {}
  }

  const templates = getMockTemplates()
  const allDetails = {}

  templates.forEach(template => {
    let message = template.content
      .replace('{agentFirstname}', lead.agent.first_name)
      .replace('{streetAddress}', lead.property.street_address)
      .replace('{dayOfWeek}', new Date().toLocaleDateString('en-US', { weekday: 'long' }))

    let phoneNumber = lead.agent.phone_number
    if (phoneNumber && !phoneNumber.startsWith('1') && phoneNumber.length === 10) {
      phoneNumber = '1' + phoneNumber
    }

    allDetails[template.id] = {
      phoneNumber: phoneNumber,
      message: message,
      agentName: lead.agent.full_name,
      templateName: template.name,
      templateId: template.id
    }
  })

  return allDetails
}

export const getSMSDetails = async (leadId, templateId) => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('User not authenticated for SMS details')
      throw new Error('Authentication required')
    }

    const { data, error } = await supabase.rpc('get_sms_details', {
      p_lead_id: leadId,
      p_template_id: templateId
    })

    if (error) {
      console.error('Error getting SMS details:', error)
      // Return mock SMS details for development
      return getMockSMSDetails(leadId, templateId)
    }

    return data || getMockSMSDetails(leadId, templateId)
  } catch (error) {
    console.error('Error processing SMS template:', error)
    // Return mock SMS details for development
    return getMockSMSDetails(leadId, templateId)
  }
}

// Mock SMS details for development
const getMockSMSDetails = (leadId, templateId) => {
  // Find the lead from mock data to get agent info
  const mockLeads = getMockPropertyLeads('active')
  const lead = mockLeads.find(l => l.id === leadId)

  if (!lead) {
    throw new Error('Lead not found')
  }

  // Find the template
  const templates = getMockTemplates()
  const template = templates.find(t => t.template_id === templateId)

  if (!template) {
    throw new Error('Template not found')
  }

  // Replace template variables with actual data
  let message = template.content
    .replace('{agentFirstname}', lead.agent.first_name)
    .replace('{streetAddress}', lead.property.street_address)
    .replace('{dayOfWeek}', new Date().toLocaleDateString('en-US', { weekday: 'long' }))

  // Format phone number for SMS (ensure it starts with 1)
  let phoneNumber = lead.agent.phone_number
  if (phoneNumber && !phoneNumber.startsWith('1') && phoneNumber.length === 10) {
    phoneNumber = '1' + phoneNumber
  }

  return {
    phoneNumber: phoneNumber,
    message: message,
    agentName: lead.agent.full_name,
    templateUsed: template.name
  }
}

export const updatePropertyLeadMetadata = async (leadId, metadata) => {
  try {
    const { data, error } = await supabase.rpc('set_property_lead', {
      p_lead_id: leadId,
      p_metadata: metadata
    })

    if (error) {
      console.error('Error updating property lead metadata:', error)
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    console.error('Error updating lead metadata:', error)
    throw error
  }
}

// Mock data for development
const getMockPropertyLeads = (status) => {
  const mockData = [
    {
      "id": "4f644ff2-5380-494b-ac57-d2fadcab4f98",
      "zpid": 20602442,
      "agent": {
        "email": "",
        "full_name": "Jane Lee",
        "last_name": "Lee",
        "first_name": "Jane",
        "phone_number": "4155338377",
        "license_number": 1992166
      },
      "broker": {
        "id": "12bc1321-3285-40be-86c9-2a40b958e39c",
        "name": "Highland Premiere Real Estate",
        "phone_number": "8449975292"
      },
      "status": status,
      "metadata": {
        "messaged": false,
        "message_count": 0,
        "last_message_date": null
      },
      "listing": {
        "zpid": 20602442,
        "price": 1299000,
        "metadata": {
          "zpid": 20602442,
          "price": 1299000,
          "address": {
            "city": "Los Angeles",
            "state": "CA",
            "zipcode": "90019",
            "streetAddress": "1654 5th Ave"
          },
          "bedrooms": 3,
          "homeType": "SINGLE_FAMILY",
          "bathrooms": 2,
          "yearBuilt": 1911,
          "homeStatus": "FOR_SALE",
          "coordinates": {
            "latitude": 34.0421,
            "longitude": -118.32213
          },
          "livingAreaValue": 1846
        },
        "created_at": "2025-09-19T20:18:02.325914+00:00",
        "image_urls": [
          "https://public-assets.propertyscout.app/properties/20602442/main_photo_1758313080592.webp",
          "https://public-assets.propertyscout.app/properties/20602442/kitchen_photo_1758313080593.webp",
          "https://public-assets.propertyscout.app/properties/20602442/bedroom_photo_1758313080594.webp",
          "https://public-assets.propertyscout.app/properties/20602442/bathroom_photo_1758313080595.webp",
          "https://public-assets.propertyscout.app/properties/20602442/backyard_photo_1758313080596.webp"
        ],
        "updated_at": "2025-09-19T20:18:02.325914+00:00",
        "home_status": "FOR_SALE"
      },
      "property": {
        "id": "63f03c231bbcd0ef9e2dfcfebc4752586b95fb9d924409267d2a582bbcd72a8d",
        "city": "Los Angeles",
        "state": "CA",
        "zipcode": "90019",
        "bedrooms": 3,
        "bathrooms": 2.0,
        "community": null,
        "home_type": "SINGLE_FAMILY",
        "image_url": "https://public-assets.propertyscout.app/properties/20602442/main_photo_1758313080592.webp",
        "year_built": 1911,
        "coordinates": {
          "lat": 34.0421,
          "lon": -118.32213
        },
        "subdivision": null,
        "neighborhood": null,
        "street_address": "1654 5th Ave"
      },
      "created_at": "2025-09-19T20:18:02.325914+00:00",
      "updated_at": "2025-09-19T20:18:02.325914+00:00"
    },
    {
      "id": "5g755ff3-6491-594c-bd68-e3gdedc5g99",
      "zpid": 20603551,
      "agent": {
        "email": "john.doe@realty.com",
        "full_name": "John Doe",
        "last_name": "Doe",
        "first_name": "John",
        "phone_number": "4158889999",
        "license_number": 2001234
      },
      "broker": {
        "id": "23cd2432-4396-51cf-97da-3b51c969f40d",
        "name": "Sunset Realty Group",
        "phone_number": "8449876543"
      },
      "status": status,
      "metadata": {
        "messaged": true,
        "message_count": 2,
        "last_message_date": "2025-09-18T14:30:00.000Z"
      },
      "listing": {
        "zpid": 20603551,
        "price": 899000,
        "metadata": {
          "zpid": 20603551,
          "price": 899000,
          "address": {
            "city": "San Francisco",
            "state": "CA",
            "zipcode": "94102",
            "streetAddress": "123 Market St"
          },
          "bedrooms": 2,
          "homeType": "CONDO",
          "bathrooms": 2,
          "yearBuilt": 2010,
          "homeStatus": "FOR_SALE",
          "coordinates": {
            "latitude": 37.7749,
            "longitude": -122.4194
          },
          "livingAreaValue": 1200
        },
        "created_at": "2025-09-19T20:18:02.325914+00:00",
        "image_urls": [
          "https://public-assets.propertyscout.app/properties/20603551/main_photo_1758313080593.webp",
          "https://public-assets.propertyscout.app/properties/20603551/living_room_photo_1758313080594.webp",
          "https://public-assets.propertyscout.app/properties/20603551/master_bedroom_photo_1758313080595.webp",
          "https://public-assets.propertyscout.app/properties/20603551/kitchen_photo_1758313080596.webp",
          "https://public-assets.propertyscout.app/properties/20603551/balcony_photo_1758313080597.webp"
        ],
        "updated_at": "2025-09-19T20:18:02.325914+00:00",
        "home_status": "FOR_SALE"
      },
      "property": {
        "id": "74g14d342cced1fg0f3egdgfcd5863697c06gc0d035510378e3b693cce83b9f",
        "city": "San Francisco",
        "state": "CA",
        "zipcode": "94102",
        "bedrooms": 2,
        "bathrooms": 2.0,
        "community": null,
        "home_type": "CONDO",
        "image_url": "https://public-assets.propertyscout.app/properties/20603551/main_photo_1758313080593.webp",
        "year_built": 2010,
        "coordinates": {
          "lat": 37.7749,
          "lon": -122.4194
        },
        "subdivision": null,
        "neighborhood": null,
        "street_address": "123 Market St"
      },
      "created_at": "2025-09-19T20:18:02.325914+00:00",
      "updated_at": "2025-09-19T20:18:02.325914+00:00"
    }
  ]

  return mockData
}