import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getLeadTransitionsBatch, setPropertyLeadStatus, LEAD_STATUS_VALUES } from '../api/properties'
import { safeAPICall } from '../api/index'
import { useStatusTransitions } from '../contexts/StatusTransitionsContext'

// No longer using local cache - using StatusTransitionsContext instead

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
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const { getTransitionsForLead, isLeadLoading } = useStatusTransitions()

  // Load all status options when component mounts or lead ID changes
  useEffect(() => {
    if (lead?.id) {
      loadStatusOptions()
    }
  }, [lead?.id, getTransitionsForLead])

  // Listen for when batch loading completes for this lead
  useEffect(() => {
    if (lead?.id && !isLeadLoading(lead.id)) {
      const transitions = getTransitionsForLead(lead.id)
      if (transitions && statusOptions.length === 0) {
        // console.log('StatusDropdown: Batch completed for lead', lead.id, 'updating options')
        loadStatusOptions()
      }
    }
  }, [lead?.id, isLeadLoading, getTransitionsForLead, statusOptions.length])

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
      // Add a shorter delay to prevent immediate touch events
      const timer = setTimeout(() => {
        setModalReady(true)
      }, 100)
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

  const loadStatusOptions = () => {
    if (!lead?.id) return

    // console.log('StatusDropdown: Loading options for lead', lead.id)

    // Get transitions from context (they should already be loaded by PropertyLeads)
    const transitions = getTransitionsForLead(lead.id)
    const isLoading = isLeadLoading(lead.id)

    if (transitions !== null) { // We have batch data (could be empty array or populated)
      // console.log('StatusDropdown: Using batch data for lead', lead.id, 'transitions:', transitions)

      // Create a map of valid transitions with their weights
      const transitionMap = new Map()
      if (transitions && transitions.length > 0) {
        transitions.forEach(t => {
          transitionMap.set(t.to_status, {
            weight: t.weight,
            description: t.description,
            isValid: true
          })
        })
      }

      // Get all possible status values except the current status
      const allStatuses = LEAD_STATUS_VALUES.filter(status => status !== lead.status)

      // Create options for all statuses
      const options = allStatuses.map(status => {
        const transition = transitionMap.get(status)
        return {
          to_status: status,
          weight: transition?.weight || 0,
          description: transition?.description || 'Manual status change',
          isValid: transition?.isValid || false
        }
      })

      // Sort by weight (valid transitions first, then invalid ones)
      const sortedOptions = options.sort((a, b) => {
        if (a.isValid && !b.isValid) return -1
        if (!a.isValid && b.isValid) return 1
        return b.weight - a.weight
      })

      // console.log('StatusDropdown: Converted options for lead', lead.id, ':', sortedOptions)
      setStatusOptions(sortedOptions)
      setLoading(false) // Clear loading state since we have data

      // Set the suggested status (first valid transition with highest weight)
      const validTransitions = sortedOptions.filter(option => option.isValid)
      if (validTransitions.length > 0) {
        setSuggestedStatus(validTransitions[0].to_status)
        setSuggestionWeight(validTransitions[0].weight)
      } else {
        setSuggestedStatus(null)
        setSuggestionWeight(null)
      }
    } else if (isLoading) {
      // console.log('StatusDropdown: Lead', lead.id, 'is currently loading in batch, waiting...')
      // Don't fall back yet - the batch is loading
      setLoading(true)
      setStatusOptions([])
    } else {
      // console.log('StatusDropdown: No batch data found for lead', lead.id, 'and not loading, falling back to individual batch call')
      // Fallback to individual batch call if context data is not available and not loading
      loadStatusOptionsFallback()
    }
  }

  const loadStatusOptionsFallback = async () => {
    if (!lead?.id) return

    // console.log('StatusDropdown: Using fallback batch call for single lead', lead.id)
    setLoading(true)
    try {
      const secureGetTransitionsBatch = safeAPICall(getLeadTransitionsBatch, 'StatusDropdown.fallbackBatch')
      const result = await secureGetTransitionsBatch([lead.id])

      if (result.success && result.data[lead.id]) {
        // console.log('StatusDropdown: Fallback batch data received', result.data[lead.id])

        const transitions = result.data[lead.id]

        // Create a map of valid transitions with their weights
        const transitionMap = new Map()
        if (transitions && transitions.length > 0) {
          transitions.forEach(t => {
            transitionMap.set(t.to_status, {
              weight: t.weight,
              description: t.description,
              isValid: true
            })
          })
        }

        // Get all possible status values except the current status
        const allStatuses = LEAD_STATUS_VALUES.filter(status => status !== lead.status)

        // Create options for all statuses
        const options = allStatuses.map(status => {
          const transition = transitionMap.get(status)
          return {
            to_status: status,
            weight: transition?.weight || 0,
            description: transition?.description || 'Manual status change',
            isValid: transition?.isValid || false
          }
        })

        // Sort by weight (valid transitions first, then invalid ones)
        const sortedOptions = options.sort((a, b) => {
          if (a.isValid && !b.isValid) return -1
          if (!a.isValid && b.isValid) return 1
          return b.weight - a.weight
        })

        setStatusOptions(sortedOptions)

        // Set the suggested status (first valid transition with highest weight)
        const validTransitions = sortedOptions.filter(option => option.isValid)
        if (validTransitions.length > 0) {
          setSuggestedStatus(validTransitions[0].to_status)
          setSuggestionWeight(validTransitions[0].weight)
        } else {
          setSuggestedStatus(null)
          setSuggestionWeight(null)
        }
      } else {
        console.error('Failed to load status options via fallback:', result.error)
        setStatusOptions([])
        setSuggestedStatus(null)
        setSuggestionWeight(null)
      }
    } catch (error) {
      console.error('Error loading status options via fallback:', error)
      setStatusOptions([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus, statusOption) => {
    if (newStatus === lead.status || updating) return

    console.log('StatusDropdown: Attempting to change status from', lead.status, 'to', newStatus, 'for lead', lead.id)
    setUpdating(true)
    try {
      const secureSetStatus = safeAPICall(setPropertyLeadStatus, 'StatusDropdown.setStatus')
      const result = await secureSetStatus(lead.id, newStatus)

      console.log('StatusDropdown: API result:', result)

      if (result.success) {
        console.log('StatusDropdown: Status update successful, calling onStatusUpdate')
        // Notify parent component of the status change
        if (onStatusUpdate) {
          onStatusUpdate(lead.id, newStatus)
        }
        setIsOpen(false)
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

  // Touch handling functions to distinguish scrolling from clicking
  const handleTouchStart = (e, option) => {
    setTouchStart({
      y: e.touches[0].clientY,
      x: e.touches[0].clientX,
      time: Date.now(),
      option: option.to_status
    })
    setTouchEnd(null)
    setIsScrolling(false)
  }

  const handleTouchMove = (e) => {
    if (!touchStart) return

    const currentY = e.touches[0].clientY
    const currentX = e.touches[0].clientX
    const deltaY = Math.abs(currentY - touchStart.y)
    const deltaX = Math.abs(currentX - touchStart.x)

    // If moved more than 10px vertically, consider it scrolling
    if (deltaY > 10 || deltaX > 10) {
      setIsScrolling(true)
    }
  }

  const handleTouchEnd = (e, option) => {
    if (!touchStart) return

    const touchDuration = Date.now() - touchStart.time
    const wasTap = !isScrolling && touchDuration < 500 && touchStart.option === option.to_status

    setTouchEnd({
      y: e.changedTouches[0].clientY,
      time: Date.now()
    })

    if (wasTap) {
      console.log('StatusDropdown: Valid tap detected for:', option.to_status)
      handleStatusChange(option.to_status, option)
    } else {
      console.log('StatusDropdown: Scroll detected, ignoring tap for:', option.to_status)
    }

    // Reset touch state
    setTimeout(() => {
      setTouchStart(null)
      setTouchEnd(null)
      setIsScrolling(false)
    }, 100)
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

      {/* Mobile Overlay - using portal to avoid clipping */}
      {isOpen && isMobile && (() => {
        console.log('StatusDropdown: Rendering mobile overlay for lead', lead.id)
        return createPortal(
        <div className="status-dropdown-mobile-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            console.log('StatusDropdown: Mobile overlay clicked')
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
              console.log('StatusDropdown: Mobile modal clicked')
              e.stopPropagation()
            }}
            onTouchMove={handleTouchMove}
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
            <div className="mobile-modal-options">
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
                      // Only handle click if not on mobile or if it's not a touch device
                      if (!isMobile) {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('StatusDropdown: Desktop click:', option.to_status)
                        handleStatusChange(option.to_status, option)
                      }
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleTouchStart(e, option)
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleTouchEnd(e, option)
                    }}
                    disabled={updating}
                    style={{
                      opacity: updating ? 0.5 : 1,
                      cursor: updating ? 'not-allowed' : 'pointer'
                    }}
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
        </div>,
        document.body
      )
      })()}
    </div>
  )
}

export default StatusDropdown