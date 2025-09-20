import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Re-export secure API functions for properties
export {
  getPropertyLeads,
  updatePropertyLead,
  updatePropertyLeadMetadata,
  getPropertyDetails,
  getLeadsWithSuggestions,
  getValidTransitions,
  setPropertyLeadStatus,
  getAllStatusOptions,
  deletePropertyLead,
  LEAD_STATUS_VALUES,
  ACTIVE_STATUS_VALUES
} from '../api/properties'

// Re-export secure API functions for messaging
export {
  getMessageTemplates,
  getSMSDetails,
  getAllSMSDetails,
  sendSMSMessage,
  getSMSHistory
} from '../api/messaging'

// Re-export auth and utility functions
export {
  getCurrentUser,
  validateAuth,
  safeAPICall,
  handleAPIError
} from '../api/index'