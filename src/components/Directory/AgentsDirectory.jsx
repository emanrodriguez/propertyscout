import { useState, useEffect } from 'react'
import { searchAgents, getAgentStats } from '../../api/agents'
import { format_number, format_dre } from '../../lib/generic_functions'

const AgentsDirectory = () => {
  const [agents, setAgents] = useState([])
  const [agentStats, setAgentStats] = useState({
    totalAgents: 0,
    totalLeads: 0,
    totalListings: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name') // name, leads_count, last_activity

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setLoading(true)
    setError('')

    try {
      // Load both agents and statistics
      const [agentsResult, statsResult] = await Promise.all([
        searchAgents({ query: '', sortBy: 'name' }),
        getAgentStats()
      ])

      if (!agentsResult.success) {
        throw new Error(agentsResult.error.message)
      }

      if (!statsResult.success) {
        throw new Error(statsResult.error.message)
      }

      setAgents(agentsResult.data)
      setAgentStats(statsResult.data)
    } catch (err) {
      console.error('Error loading agents:', err)
      setError('Failed to load agents directory')
    } finally {
      setLoading(false)
    }
  }

  // Use the API for filtering and sorting instead of client-side processing
  const [filteredAgents, setFilteredAgents] = useState([])

  // Update agents when search term or sort changes
  useEffect(() => {
    const updateAgents = async () => {
      if (!loading) {
        setLoading(true)
        try {
          const result = await searchAgents({ query: searchTerm, sortBy })
          if (result.success) {
            setFilteredAgents(result.data)
          }
        } catch (err) {
          console.error('Error filtering agents:', err)
        } finally {
          setLoading(false)
        }
      }
    }

    const timeoutId = setTimeout(updateAgents, 300) // Debounce search
    return () => clearTimeout(timeoutId)
  }, [searchTerm, sortBy])

  // Set initial filtered agents when agents load
  useEffect(() => {
    setFilteredAgents(agents)
  }, [agents])

  const sortedAgents = filteredAgents

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
        <p>Loading agents directory...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={loadAgents} className="retry-btn">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="agents-directory">
      <div className="directory-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search agents by name, email, phone, or license..."
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
            <option value="leads_count">Lead Count</option>
            <option value="last_activity">Last Activity</option>
          </select>
        </div>
      </div>

      <div className="agents-stats">
        <div className="stat-card">
          <div className="stat-value">{agentStats.totalAgents}</div>
          <div className="stat-label">Total Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{agentStats.totalLeads}</div>
          <div className="stat-label">Total Leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{agentStats.totalListings}</div>
          <div className="stat-label">Total Listings</div>
        </div>
      </div>

      <div className="agents-list">
        {sortedAgents.length === 0 ? (
          <div className="no-results">
            <p>No agents found matching your search.</p>
          </div>
        ) : (
          <div className="agents-grid">
            {sortedAgents.map((agent) => (
              <div key={agent.license_number} className="agent-card">
                <div className="agent-header">
                  <div className="agent-avatar">
                    {agent.image_url ? <img src={agent.image_url} alt={agent.full_name} /> :
                     agent.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="agent-info">
                    <h3 className="agent-name">{agent.full_name}</h3>
                    <p className="agent-license">{format_dre(agent.license_number)}</p>
                  </div>
                </div>

                <div className="agent-details">
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <a href={`mailto:${agent.email}`} className="detail-value email-link">
                      {agent.email}
                    </a>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Phone:</span>
                    <a href={`tel:${agent.phone_number}`} className="detail-value phone-link">
                      {format_number(agent.phone_number)}
                    </a>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Broker:</span>
                    <span className="detail-value">{agent.broker_name}</span>
                  </div>

                  <div className="agent-stats">
                    <div className="stat">
                      <span className="stat-number">{agent.leads_count}</span>
                      <span className="stat-label">Leads</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{agent.listings_count}</span>
                      <span className="stat-label">Listings</span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Last Activity:</span>
                    <span className="detail-value">{formatDate(agent.last_activity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AgentsDirectory