import { useState, useEffect } from 'react'
import { getPropertyLeads, LEAD_STATUS_VALUES } from '../api/properties'
import { safeAPICall } from '../api/index'
import SMSHandler from './SMS/SMSHandler'
import PendingSMSModal from './SMS/PendingSMSModal'
import SMSButton from './SMS/SMSButton'
import ImageCarousel from './ImageCarousel'
import StatusDropdown from './StatusDropdown'
import ListingsGrid from './ListingsGrid'
import { format_number, createPhoneCallLink, createSMSLink, isValidPhoneNumber, format_dre } from '../lib/generic_functions'
import { StatusTransitionsProvider, useStatusTransitions } from '../contexts/StatusTransitionsContext'

const PropertyLeadsContent = () => {
  const [activeTab, setActiveTab] = useState('active')
  const [leads, setLeads] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [statusFilter, setStatusFilter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [currentLead, setCurrentLead] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const { loadTransitionsForLeads } = useStatusTransitions()

  useEffect(() => {
    loadLeads(activeTab, 1, statusFilter) // Reset to page 1 when tab or filter changes
  }, [activeTab, statusFilter])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadLeads = async (tabStatus, page = pagination.page, filterStatus = statusFilter) => {
    setLoading(true)
    setError('')

    try {
      const secureGetLeads = safeAPICall(getPropertyLeads, 'PropertyLeads.loadLeads')
      let result

      const options = {
        page,
        limit: 20
      }

      if (tabStatus === 'active') {
        // For active tab: get all leads where is_active = true (with optional status filter)
        options.isActive = true
        if (filterStatus) {
          options.status = filterStatus
        }
      } else if (tabStatus === 'archived') {
        // For archived tab: get all leads where is_active = false (with optional status filter)
        options.isActive = false
        if (filterStatus) {
          options.status = filterStatus
        }
      } else {
        // For any specific status filter
        options.status = tabStatus
      }

      result = await secureGetLeads(options)

      if (result.success) {
        const leadsData = result.data.leads || result.data // Handle both new and old response formats
        setLeads(leadsData)
        if (result.data.pagination) {
          setPagination(result.data.pagination)
        }

        // Load status transitions for all leads in batch
        if (leadsData && leadsData.length > 0) {
          const leadIds = leadsData.map(lead => lead.id)
          console.log('PropertyLeads: Loading transitions for', leadIds.length, 'leads:', leadIds)
          loadTransitionsForLeads(leadIds)
        }
      } else {
        const errorMessage = result.error?.message || 'Failed to load property leads'
        setError(errorMessage)
        console.error('API Error loading leads:', result.error)
      }
    } catch (err) {
      // Fallback error handling for unexpected errors
      setError('An unexpected error occurred. Please try again.')
      console.error('Unexpected error loading leads:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (status) => {
    setActiveTab(status)
    setStatusFilter(null) // Reset status filter when changing tabs
  }

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadLeads(activeTab, newPage, statusFilter)
    }
  }

  const formatStatusLabel = (status) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getPlaceholderImage = () => {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA4MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0zMiAyNEwyNCAzMkgzMlYzNkg0OFYzMkg1NkwzMiAyNFoiIGZpbGw9IiM2QzdTN0QiLz4KPC9zdmc+Cg=='
  }

  const handleSMSClick = (lead) => {
    setCurrentLead(lead)
    setIsTemplateModalOpen(true)
  }

  const handleCloseTemplateModal = () => {
    setIsTemplateModalOpen(false)
    setCurrentLead(null)
  }

  const handleClosePreviewModal = () => {
    setCurrentLead(null)
  }

  const handleSMSComplete = () => {
    // Only reload if we haven't already updated the status via onStatusUpdate
    // This prevents unnecessary refetches when status was successfully updated
    console.log('PropertyLeads: SMS complete - status should already be updated via onStatusUpdate callback')
  }

  const handleStatusUpdate = (leadId, newStatus) => {
    console.log('PropertyLeads: handleStatusUpdate called for lead', leadId, 'new status:', newStatus)

    // Update the local state to reflect the status change
    setLeads(prevLeads => {
      const updatedLeads = prevLeads.map(lead =>
        lead.id === leadId
          ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
          : lead
      )
      console.log('PropertyLeads: Lead status updated in local state')
      return updatedLeads
    })

    // No need to reload - the status has been updated locally
  }

  const handleArchiveLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to archive this lead?')) {
      return
    }

    try {
      const { archivePropertyLead } = await import('../api/properties')
      const secureArchiveLead = safeAPICall(archivePropertyLead, 'PropertyLeads.handleArchiveLead')
      const result = await secureArchiveLead(leadId)

      if (result.success) {
        // Always remove from current view when archived, regardless of tab
        setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId))
      } else {
        throw new Error(result.error || 'Failed to archive lead')
      }
    } catch (error) {
      console.error('Error archiving lead:', error)
      alert('Failed to archive lead. Please try again.')
    }
  }

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to permanently delete this lead? This action cannot be undone.')) {
      return
    }

    try {
      const { deletePropertyLead } = await import('../api/properties')
      const secureDeleteLead = safeAPICall(deletePropertyLead, 'PropertyLeads.handleDeleteLead')
      const result = await secureDeleteLead(leadId)

      if (result.success) {
        // Remove the lead from local state
        setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId))
      } else {
        throw new Error(result.error || 'Failed to delete lead')
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Failed to delete lead. Please try again.')
    }
  }

  const handleImageClick = (imageUrl) => {
    // Optional: Open image in modal or fullscreen
    console.log('Image clicked:', imageUrl)
  }

  const PhoneNumberLink = ({ phoneNumber, className = '' }) => {
    if (!isValidPhoneNumber(phoneNumber)) {
      return <span className={className}>{phoneNumber}</span>
    }

    const formattedNumber = format_number(phoneNumber)
    const callLink = createPhoneCallLink(phoneNumber)
    const smsLink = createSMSLink(phoneNumber)

    return (
      <div className={`phone-links ${className}`}>
        <span className="formatted-number">{formattedNumber}</span>
        <div className="phone-actions">
          <a href={callLink} className="phone-action call-link" title="Call">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </a>
          <a href={smsLink} className="phone-action sms-link" title="Text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <h2 className="page-title">Listings</h2>
        <p className="page-subtitle">Leads</p>
        <div className="loading">Loading property leads...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="page-title">Listings</h2>
      <p className="page-subtitle">Leads</p>
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => handleTabChange('active')}
        >
          Current Leads
        </button>
        <button
          className={`tab ${activeTab === 'archived' ? 'active' : ''}`}
          onClick={() => handleTabChange('archived')}
        >
          Archived
        </button>
      </div>

      {/* Filter Controls */}
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select
            id="status-filter"
            value={statusFilter || ''}
            onChange={(e) => handleStatusFilterChange(e.target.value || null)}
            className="status-filter-select"
          >
            <option value="">All Statuses</option>
            {LEAD_STATUS_VALUES.map(status => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        {!loading && !error && (
          <div className="results-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
          </div>
        )}
      </div>

      <div className="leads-container">
        {error && (
          <div className="no-data">{error}</div>
        )}

        {!error && leads.length === 0 && (
          <div className="no-data">No property leads found.</div>
        )}

        {!error && leads.length > 0 && (
          isMobile ? (
            <ListingsGrid
              leads={leads}
              onSMSClick={handleSMSClick}
              onDeleteLead={handleDeleteLead}
              onArchiveLead={handleArchiveLead}
              onStatusUpdate={handleStatusUpdate}
              onImageClick={handleImageClick}
            />
          ) : (
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Details</th>
                  <th>Price</th>
                  <th>Agent</th>
                  <th>Broker</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <ImageCarousel
                        imageUrls={
                          lead.listing?.image_urls ||
                          lead.property?.image_urls ||
                          [lead.property?.image_url].filter(Boolean) ||
                          []
                        }
                        width={120}
                        height={90}
                        fallbackImage={getPlaceholderImage()}
                        className="property-carousel"
                      />
                    </td>
                    <td>
                      <div className="property-info">
                        <div className="property-address">
                          {lead.property.street_address}
                        </div>
                        <div className="property-details">
                          {lead.property.city}, {lead.property.state} {lead.property.zipcode}
                        </div>
                        <div className="property-details">
                          {lead.property.bedrooms} bed, {lead.property.bathrooms} bath • {lead.property.home_type?.replace('_', ' ')}
                        </div>
                        {lead.property.year_built && (
                          <div className="property-details">
                            Built {lead.property.year_built}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="price">
                        {formatPrice(lead.listing.price)}
                      </div>
                    </td>
                    <td>
                      <div className="agent-info">
                        <div className="agent-name">{lead.agent.full_name}</div>
                        {lead.agent.phone_number && (
                          <PhoneNumberLink
                            phoneNumber={lead.agent.phone_number}
                            className="agent-contact"
                          />
                        )}
                        {lead.agent.email && (
                          <div className="agent-contact">{lead.agent.email}</div>
                        )}
                        {lead.agent.license_number && (
                          <div className="agent-contact">{format_dre(lead.agent.license_number)}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="agent-info">
                        <div className="agent-name">{lead.broker.name}</div>
                        {lead.broker.phone_number && (
                          <PhoneNumberLink
                            phoneNumber={lead.broker.phone_number}
                            className="agent-contact"
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <StatusDropdown
                        lead={lead}
                        onStatusUpdate={handleStatusUpdate}
                      />
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn sms-btn"
                          onClick={() => handleSMSClick(lead)}
                          title="Send SMS to agent"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                        </button>
                        <button
                          className="action-btn archive-btn"
                          onClick={() => handleArchiveLead(lead.id)}
                          title="Archive lead"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"></path>
                            <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"></path>
                            <line x1="9" y1="12" x2="15" y2="12"></line>
                          </svg>
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteLead(lead.id)}
                          title="Delete lead permanently"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </button>

          <div className="pagination-info">
            Page {pagination.page} of {pagination.totalPages}
          </div>

          <div className="pagination-numbers">
            {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i
              if (pageNum > pagination.totalPages) return null

              return (
                <button
                  key={pageNum}
                  className={`pagination-number ${pageNum === pagination.page ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            className="pagination-btn"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </button>
        </div>
      )}

      <SMSHandler
        isTemplateModalOpen={isTemplateModalOpen}
        onCloseTemplateModal={handleCloseTemplateModal}
        onClosePreviewModal={handleClosePreviewModal}
        currentLead={currentLead}
        onSMSComplete={handleSMSComplete}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* This modal checks for pending SMS confirmations on page load */}
      <PendingSMSModal />
    </div>
  )
}

const PropertyLeads = () => {
  return (
    <StatusTransitionsProvider>
      <PropertyLeadsContent />
    </StatusTransitionsProvider>
  )
}

export default PropertyLeads