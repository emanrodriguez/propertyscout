import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { format_number } from '../../lib/generic_functions'

const BrokersDirectory = () => {
  const [brokers, setBrokers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name') // name, agents_count, leads_count

  useEffect(() => {
    loadBrokers()
  }, [])

  const loadBrokers = async () => {
    setLoading(true)
    setError('')

    try {
      // Get brokers with their agents and lead counts
      const { data, error } = await supabase
        .from('brokers')
        .select(`
          id,
          name,
          phone_number,
          agents!agents_new_broker_id_fkey (
            license_number,
            first_name,
            last_name,
            image_url,
            listings!listings_temp_agent_id_fkey (
              zpid,
              property_leads (
                id,
                status,
                created_at
              )
            )
          )
        `)
        .order('name', { ascending: true })

      if (error) {
        throw error
      }

      // Process the data to calculate agent and lead counts
      const processedBrokers = data.map(broker => {
        // Get unique property leads count across all agents
        const propertyLeads = new Set()
        let lastActivity = null

        broker.agents?.forEach(agent => {
          agent.listings?.forEach(listing => {
            listing.property_leads?.forEach(lead => {
              propertyLeads.add(lead.id)
              const leadDate = new Date(lead.created_at)
              if (!lastActivity || leadDate > lastActivity) {
                lastActivity = leadDate
              }
            })
          })
        })

        // Count total listings
        const totalListings = broker.agents?.reduce((sum, agent) =>
          sum + (agent.listings?.length || 0), 0) || 0

        return {
          ...broker,
          agents_count: broker.agents?.length || 0,
          leads_count: propertyLeads.size,
          listings_count: totalListings,
          last_activity: lastActivity,
          agents: broker.agents || []
        }
      })

      setBrokers(processedBrokers)
    } catch (err) {
      console.error('Error loading brokers:', err)
      setError('Failed to load brokers directory')
    } finally {
      setLoading(false)
    }
  }

  const filteredBrokers = brokers.filter(broker => {
    const searchLower = searchTerm.toLowerCase()
    return (
      broker.name?.toLowerCase().includes(searchLower) ||
      broker.phone_number?.includes(searchTerm)
    )
  })

  const sortedBrokers = [...filteredBrokers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'agents_count':
        return b.agents_count - a.agents_count
      case 'leads_count':
        return b.leads_count - a.leads_count
      default:
        return 0
    }
  })

  const formatDate = (date) => {
    if (!date) return 'No activity'
    const now = new Date()
    const activityDate = new Date(date)
    const diffInDays = Math.floor((now - activityDate) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
    return activityDate.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading brokers directory...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={loadBrokers} className="retry-btn">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="brokers-directory">
      <div className="directory-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search brokers by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
        </div>

        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="name">Name</option>
            <option value="agents_count">Agent Count</option>
            <option value="leads_count">Lead Count</option>
          </select>
        </div>
      </div>

      <div className="brokers-stats">
        <div className="stat-card">
          <div className="stat-value">{brokers.length}</div>
          <div className="stat-label">Total Brokers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {brokers.reduce((sum, broker) => sum + broker.agents_count, 0)}
          </div>
          <div className="stat-label">Total Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {brokers.reduce((sum, broker) => sum + broker.leads_count, 0)}
          </div>
          <div className="stat-label">Total Leads</div>
        </div>
      </div>

      <div className="brokers-list">
        {sortedBrokers.length === 0 ? (
          <div className="no-results">
            <p>No brokers found matching your search.</p>
          </div>
        ) : (
          <div className="brokers-grid">
            {sortedBrokers.map((broker) => (
              <div key={broker.id} className="broker-card">
                <div className="broker-header">
                  <div className="broker-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="broker-info">
                    <h3 className="broker-name">{broker.name}</h3>
                    <p className="broker-phone">
                      <a href={`tel:${broker.phone_number}`} className="phone-link">
                        {format_number(broker.phone_number)}
                      </a>
                    </p>
                  </div>
                </div>

                <div className="broker-stats-row">
                  <div className="stat">
                    <span className="stat-number">{broker.agents_count}</span>
                    <span className="stat-label">Agents</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{broker.leads_count}</span>
                    <span className="stat-label">Leads</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{broker.listings_count}</span>
                    <span className="stat-label">Listings</span>
                  </div>
                </div>

                {broker.agents_count > 0 && (
                  <div className="broker-agents">
                    <h4>Top Agents:</h4>
                    <div className="agents-list">
                      {broker.agents.slice(0, 3).map((agent) => (
                        <div key={agent.license_number} className="mini-agent">
                          <span className="agent-name">
                            {`${agent.first_name || ''} ${agent.last_name || ''}`.trim()}
                          </span>
                          <span className="agent-leads">
                            {agent.listings?.reduce((sum, listing) =>
                              sum + (listing.property_leads?.length || 0), 0) || 0} leads
                          </span>
                        </div>
                      ))}
                      {broker.agents_count > 3 && (
                        <div className="more-agents">
                          +{broker.agents_count - 3} more agents
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="broker-activity">
                  <span className="activity-label">Last Activity:</span>
                  <span className="activity-value">{formatDate(broker.last_activity)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BrokersDirectory