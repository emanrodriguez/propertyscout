import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from './Sidebar'
import PropertyLeads from './PropertyLeads'
import Directory from './Directory/Directory'

const Dashboard = ({ user, onSignOut }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Collapsed by default on mobile

  // Handle URL-based routing
  useEffect(() => {
    const path = location.pathname
    if (path === '/listings/leads') {
      setActiveSection('listings/leads')
    } else if (path.startsWith('/directory')) {
      setActiveSection('directory')
    } else if (path === '/dashboard') {
      setActiveSection('dashboard')
    }
  }, [location.pathname])

  // Handle section changes and update URL
  const handleSectionChange = (section) => {
    setActiveSection(section)
    if (section === 'listings/leads') {
      navigate('/listings/leads')
    } else if (section === 'directory') {
      navigate('/directory/agents')
    } else if (section === 'dashboard') {
      navigate('/dashboard')
    }
  }

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) {
        setIsSidebarOpen(true) // Always open on desktop
      } else {
        setIsSidebarOpen(false) // Collapsed on mobile
      }
    }

    handleResize() // Set initial state
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      onSignOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div>
            <h2 className="page-title">Welcome to PropertyScout!</h2>
            <p>You have successfully signed in. This is your dashboard where you can manage your property scouting activities.</p>
          </div>
        )
      case 'listings/leads':
        return <PropertyLeads />
      case 'directory':
        return <Directory />
      default:
        return (
          <div>
            <h2 className="page-title">Welcome to PropertyScout!</h2>
            <p>You have successfully signed in. This is your dashboard where you can manage your property scouting activities.</p>
          </div>
        )
    }
  }

  const getPageTitle = () => {
    switch (activeSection) {
      case 'dashboard':
        return 'Dashboard'
      case 'listings/leads':
        return 'Property Leads'
      case 'directory':
        return 'Directory'
      default:
        return 'Dashboard'
    }
  }

  const getBreadcrumb = () => {
    const path = location.pathname
    switch (activeSection) {
      case 'dashboard':
        return 'Dashboard'
      case 'listings/leads':
        return 'Listings / Leads'
      case 'directory':
        if (path === '/directory/agents') return 'Directory / Agents'
        if (path === '/directory/brokers') return 'Directory / Brokers'
        return 'Directory'
      default:
        return 'Dashboard'
    }
  }

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'PS'
  }

  return (
    <div className="dashboard-container">
      {/* Top Header - spans full width */}
      <div className="top-header">
        <div className="top-header-left">
          {/* Hamburger Menu - Mobile Only */}
          {isMobile && (
            <button
              className="hamburger-btn"
              onClick={toggleSidebar}
              aria-label="Toggle menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          )}

          <div className="app-logo">
            <div className="app-logo-icon">PS</div>
            {!isMobile && <span className="app-name">PropertyScout</span>}
          </div>

          {!isMobile && (
            <div className="breadcrumb">
              <span className="breadcrumb-separator">•</span>
              <span>{getBreadcrumb()}</span>
            </div>
          )}
        </div>

        <div className="top-header-right">
          {!isMobile && (
            <div className="search-box">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Go to..."
              />
            </div>
          )}

          <div className="user-menu">
            <div className="user-avatar" title={user?.email}>
              {getUserInitials()}
            </div>
            {!isMobile && (
              <button className="sign-out-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout - sidebar and content */}
      <div className="main-layout">
        {/* Mobile Sidebar Overlay */}
        {isMobile && isSidebarOpen && (
          <div className="sidebar-overlay" onClick={toggleSidebar}></div>
        )}

        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isOpen={isSidebarOpen}
          isMobile={isMobile}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="main-content">

          <div className="content">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard