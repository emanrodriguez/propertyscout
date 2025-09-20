import { useState, useEffect, useRef } from 'react'
import { getAllStatusOptions, setPropertyLeadStatus, safeAPICall } from '../lib/supabase'

// Cache for status options - key: status, value: { data, timestamp }
const statusOptionsCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const StatusDropdown = ({ lead, onStatusUpdate }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [statusOptions, setStatusOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [suggestedStatus, setSuggestedStatus] = useState(null)
  const [suggestionWeight, setSuggestionWeight] = useState(null)
  const [dropdownDirection, setDropdownDirection] = useState('down')
  const dropdownRef = useRef(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [modalReady, setModalReady] = useState(false)

  // Load all status options when component mounts or status changes
  useEffect(() => {
    if (lead?.status) {
      loadStatusOptions()
    }
  }, [lead?.status])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Check if mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Reset modal ready state when opening/closing
  useEffect(() => {
    if (isOpen && isMobile) {
      // Add a delay to prevent immediate touch events
      const timer = setTimeout(() => {
        setModalReady(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setModalReady(false)
    }
  }, [isOpen, isMobile])

  // Check dropdown position when opening
  const checkDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const dropdownHeight = 180 // max-height of dropdown
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setDropdownDirection('up')
      } else {
        setDropdownDirection('down')
      }
    }
  }

  const loadStatusOptions = async () => {
    if (!lead?.status) return

    // Check cache first
    const cacheKey = lead.status
    const cached = statusOptionsCache.get(cacheKey)
    const now = Date.now()

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // Use cached data
      setStatusOptions(cached.data)

      // Set the suggested status (first valid transition with highest weight)
      const validTransitions = cached.data.filter(option => option.isValid)
      if (validTransitions.length > 0) {
        setSuggestedStatus(validTransitions[0].to_status)
        setSuggestionWeight(validTransitions[0].weight)
      } else {
        setSuggestedStatus(null)
        setSuggestionWeight(null)
      }
      return
    }

    setLoading(true)
    try {
      const secureGetStatusOptions = safeAPICall(getAllStatusOptions, 'StatusDropdown.getAllStatusOptions')
      const result = await secureGetStatusOptions(lead.status)

      if (result.success) {
        // Cache the result
        statusOptionsCache.set(cacheKey, {
          data: result.data,
          timestamp: now
        })

        setStatusOptions(result.data)

        // Set the suggested status (first valid transition with highest weight)
        const validTransitions = result.data.filter(option => option.isValid)
        if (validTransitions.length > 0) {
          setSuggestedStatus(validTransitions[0].to_status)
          setSuggestionWeight(validTransitions[0].weight)
        } else {
          setSuggestedStatus(null)
          setSuggestionWeight(null)
        }
      } else {
        console.error('Failed to load status options:', result.error)
        setStatusOptions([])
        setSuggestedStatus(null)
        setSuggestionWeight(null)
      }
    } catch (error) {
      console.error('Error loading status options:', error)
      setStatusOptions([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus, statusOption) => {
    if (newStatus === lead.status || updating) return

    setUpdating(true)
    try {
      const secureSetStatus = safeAPICall(setPropertyLeadStatus, 'StatusDropdown.setStatus')
      const result = await secureSetStatus(lead.id, newStatus)

      if (result.success) {
        // The RPC returns a JSON response, check if it was successful
        if (result.data.success) {
          // Invalidate cache for both old and new status
          statusOptionsCache.delete(lead.status)
          statusOptionsCache.delete(newStatus)

          // Notify parent component of the status change
          if (onStatusUpdate) {
            onStatusUpdate(lead.id, newStatus)
          }
          setIsOpen(false)
        } else {
          console.error('RPC returned error:', result.data.error)
          alert(`Failed to update status: ${result.data.error}`)
        }
      } else {
        console.error('Failed to update status:', result.error)
        alert('Failed to update status. Please try again.')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('An error occurred while updating status.')
    } finally {
      setUpdating(false)
    }
  }

  const formatStatusLabel = (status) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getStatusColor = (status) => {
    const colorMap = {
      'prospect_found': '#6c757d',   // Gray - Initial stage
      'contacted': '#0066cc',        // Blue - First contact
      'responded': '#28a745',        // Green - Positive response
      'proposal_sent': '#ff8c00',    // Orange - Waiting for decision
      'booked': '#9c27b0',           // Purple - Scheduled
      'shoot_completed': '#e91e63',  // Pink - Work done
      'delivered': '#00bcd4',        // Cyan - Content delivered
      'paid': '#4caf50',             // Success green - Payment received
      'closed_won': '#2e7d32',       // Dark green - Success
      'closed_lost': '#d32f2f'       // Red - Lost opportunity
    }
    return colorMap[status] || '#6c757d'
  }

  const getWeightIndicator = (weight) => {
    if (weight >= 80) return '🔥' // Hot lead
    if (weight >= 60) return '⭐' // Good lead
    if (weight >= 40) return '📈' // Possible
    return '💭' // Unlikely
  }

  if (!lead) return null

  return (
    <div className={`status-dropdown-container ${dropdownDirection === 'up' ? 'dropdown-up' : ''}`} ref={dropdownRef}>
      <button
        className={`status-current ${isOpen ? 'open' : ''}`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!isOpen) {
            checkDropdownPosition()
            // Reset modal ready state when opening
            setModalReady(false)
          }
          setIsOpen(!isOpen)
        }}
        style={{ backgroundColor: getStatusColor(lead.status) }}
        disabled={updating}
      >
        <span className="status-label">
          {formatStatusLabel(lead.status)}
        </span>
        {suggestedStatus && (
          <span className="suggestion-indicator" title={`Suggested: ${formatStatusLabel(suggestedStatus)}`}>
            {getWeightIndicator(suggestionWeight)}
          </span>
        )}
        <svg className={`dropdown-chevron ${isOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>

      {isOpen && !isMobile && (
        <div className="status-dropdown-menu">
          {loading ? (
            <div className="dropdown-item loading">Loading status options...</div>
          ) : statusOptions.length > 0 ? (
            <>
              {statusOptions.map((option) => (
                <button
                  key={option.to_status}
                  className={`dropdown-item transition-item ${
                    option.to_status === suggestedStatus ? 'suggested' : ''
                  } ${option.isValid ? 'valid-transition' : 'manual-transition'}`}
                  data-status={option.to_status}
                  onClick={() => handleStatusChange(option.to_status, option)}
                  disabled={updating}
                >
                  <div className="transition-content">
                    <span className="transition-status">
                      {formatStatusLabel(option.to_status)}
                    </span>
                    <span className="transition-weight">
                      {option.weight}%
                    </span>
                  </div>
                  {option.description && (
                    <div className="transition-description">{option.description}</div>
                  )}
                </button>
              ))}
            </>
          ) : (
            <div className="dropdown-item no-transitions">
              No status options available
            </div>
          )}
        </div>
      )}

      {updating && (
        <div className="status-updating-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div className="status-dropdown-mobile-overlay"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(false)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
          }}
        >
          <div className="status-dropdown-mobile-modal"
            onClick={(e) => {
              e.stopPropagation()
            }}
            onTouchEnd={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="mobile-modal-header">
              <h3>Change Status</h3>
              <button className="mobile-modal-close" onClick={() => setIsOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="mobile-modal-current">
              Current: <span style={{ color: getStatusColor(lead.status), fontWeight: 600 }}>
                {formatStatusLabel(lead.status)}
              </span>
            </div>
            <div className={`mobile-modal-options ${!modalReady ? 'not-ready' : ''}`}>
              {loading ? (
                <div className="dropdown-item loading">Loading status options...</div>
              ) : statusOptions.length > 0 ? (
                statusOptions.map((option) => (
                  <button
                    key={option.to_status}
                    className={`mobile-status-option ${
                      option.to_status === suggestedStatus ? 'suggested' : ''
                    } ${option.isValid ? 'valid-transition' : 'manual-transition'}`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!modalReady) return
                      handleStatusChange(option.to_status, option)
                      setIsOpen(false)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                    }}
                    disabled={updating || !modalReady}
                  >
                    <div className="transition-content">
                      <span className="transition-status">
                        {formatStatusLabel(option.to_status)}
                      </span>
                      <span className="transition-weight">
                        {option.weight}%
                      </span>
                    </div>
                    {option.description && (
                      <div className="transition-description">{option.description}</div>
                    )}
                  </button>
                ))
              ) : (
                <div className="dropdown-item">No status transitions available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusDropdown