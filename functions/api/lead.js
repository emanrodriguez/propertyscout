import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'

const app = new Hono()

// Enable CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Initialize Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key'

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Validate UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// PATCH /api/lead/:lead_id/archive
app.patch('/api/lead/:lead_id/archive', async (c) => {
  try {
    const leadId = c.req.param('lead_id')

    // Validate lead_id parameter
    if (!leadId || !isValidUUID(leadId)) {
      return c.json({
        success: false,
        error: 'Invalid or missing lead_id parameter'
      }, 400)
    }

    // Get authorization header
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Missing or invalid authorization header'
      }, 401)
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const supabase = getSupabaseClient()

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return c.json({
        success: false,
        error: 'Invalid or expired token'
      }, 401)
    }

    // Create a client with the user's session for RLS
    const userSupabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
      process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Update the lead to set is_active = false (archive)
    const { data, error } = await userSupabase
      .from('property_leads')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Supabase error in archive lead:', error)
      return c.json({
        success: false,
        error: `Failed to archive property lead: ${error.message}`
      }, 500)
    }

    if (!data || data.length === 0) {
      return c.json({
        success: false,
        error: 'Property lead not found or you do not have permission to archive it'
      }, 404)
    }

    // Return success response
    return c.json({
      success: true,
      message: 'Lead archived successfully',
      data: data[0]
    })

  } catch (error) {
    console.error('Error in PATCH /api/lead/archive:', error)
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500)
  }
})

// DELETE /api/lead/:lead_id
app.delete('/api/lead/:lead_id', async (c) => {
  try {
    const leadId = c.req.param('lead_id')

    // Validate lead_id parameter
    if (!leadId || !isValidUUID(leadId)) {
      return c.json({
        success: false,
        error: 'Invalid or missing lead_id parameter'
      }, 400)
    }

    // Get authorization header
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Missing or invalid authorization header'
      }, 401)
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const supabase = getSupabaseClient()

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return c.json({
        success: false,
        error: 'Invalid or expired token'
      }, 401)
    }

    // Call the RPC function to delete the lead
    const { data, error } = await supabase.rpc('delete_property_lead', {
      p_lead_id: leadId
    })

    if (error) {
      console.error('Supabase RPC error in delete lead:', error)
      return c.json({
        success: false,
        error: `Failed to delete property lead: ${error.message}`
      }, 500)
    }

    // Return success response
    return c.json({
      success: true,
      message: 'Lead deleted successfully',
      data
    })

  } catch (error) {
    console.error('Error in DELETE /api/lead:', error)
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500)
  }
})

// Handle other methods
app.all('/api/lead/*', (c) => {
  return c.json({
    success: false,
    error: 'Method not allowed'
  }, 405)
})

export default app