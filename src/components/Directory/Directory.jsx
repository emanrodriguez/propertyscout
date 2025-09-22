import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AgentsDirectory from './AgentsDirectory'
import BrokersDirectory from './BrokersDirectory'

const Directory = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('agents')

  // Handle URL-based routing
  useEffect(() => {
    const path = location.pathname
    if (path === '/directory/agents') {
      setActiveTab('agents')
    } else if (path === '/directory/brokers') {
      setActiveTab('brokers')
    } else {
      // Default to agents if just /directory
      navigate('/directory/agents', { replace: true })
    }
  }, [location.pathname, navigate])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    navigate(`/directory/${tab}`)
  }

  return (
    <div className="directory-container">
      <div className="directory-header">
        <h2>Directory</h2>
        <div className="directory-tabs">
          <button
            className={`tab-button ${activeTab === 'agents' ? 'active' : ''}`}
            onClick={() => handleTabChange('agents')}
          >
            Agents
          </button>
          <button
            className={`tab-button ${activeTab === 'brokers' ? 'active' : ''}`}
            onClick={() => handleTabChange('brokers')}
          >
            Brokers
          </button>
        </div>
      </div>

      <div className="directory-content">
        {activeTab === 'agents' ? <AgentsDirectory /> : <BrokersDirectory />}
      </div>
    </div>
  )
}

export default Directory