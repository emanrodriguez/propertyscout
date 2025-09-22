import { useState, useEffect } from 'react'
import { updatePropertyLeadMetadata, setPropertyLeadStatus, safeAPICall } from '../../lib/supabase'

const SMSPreviewModal = ({
  isOpen,
  onClose,
  onBack,
  smsDetails,
  lead,
  template,
  onSMSSent
}) => {
  const [loading, setLoading] = useState(false)
  const [showStatusConfirmation, setShowStatusConfirmation] = useState(false)
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)

  // Reset confirmation state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowStatusConfirmation(false)
      setStatusUpdateLoading(false)
    }
  }, [isOpen])

  const formatPhoneForDisplay = (phoneNumber) => {
    // Convert 17604076444 to (760) 407-6444
    if (phoneNumber && phoneNumber.length === 11 && phoneNumber.startsWith('1')) {
      const number = phoneNumber.substring(1)
      return `(${number.substring(0,3)}) ${number.substring(3,6)}-${number.substring(6)}`
    }
    return phoneNumber
  }

  const handleSendSMS = async () => {
    if (!smsDetails) return

    setLoading(true)

    try {
      // Create SMS URL
      const smsUrl = `sms:${smsDetails.phoneNumber}?body=${encodeURIComponent(smsDetails.message)}`

      console.log('Launching SMS app with URL:', smsUrl)

      // Open SMS app
      window.open(smsUrl, '_blank')

      // Update metadata to mark as messaged using secure API
      const updatedMetadata = {
        ...lead.metadata,
        messaged: true,
        message_count: (lead.metadata?.message_count || 0) + 1,
        last_message_date: new Date().toISOString(),
        last_template_used: template.name
      }

      const secureUpdateMetadata = safeAPICall(updatePropertyLeadMetadata, 'SMSPreviewModal.updateMetadata')
      const result = await secureUpdateMetadata(lead.id, updatedMetadata)

      if (!result.success) {
        console.error('Failed to update lead metadata:', result.error)
        // Don't throw error here since SMS was already sent
      }

      // Notify parent that SMS was sent
      if (onSMSSent) {
        onSMSSent()
      }

      // Show status confirmation screen instead of closing immediately
      setTimeout(() => {
        setShowStatusConfirmation(true)
      }, 1000)

    } catch (error) {
      console.error('Error launching SMS or updating metadata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (updateStatus) => {
    if (!updateStatus) {
      // User clicked "No" - just close the modal
      setShowStatusConfirmation(false)
      onClose()
      return
    }

    // User clicked "Yes" - update status to "contacted"
    setStatusUpdateLoading(true)

    try {
      const secureSetStatus = safeAPICall(setPropertyLeadStatus, 'SMSPreviewModal.updateStatus')
      const result = await secureSetStatus(lead.id, 'contacted')

      if (result.success && result.data.success) {
        console.log('Successfully updated lead status to contacted')
        // Close the modal after successful status update
        setShowStatusConfirmation(false)
        onClose()
      } else {
        console.error('Failed to update lead status:', result.data?.error || result.error)
        alert('Failed to update lead status. Please update manually.')
        setShowStatusConfirmation(false)
        onClose()
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      alert('An error occurred while updating lead status. Please update manually.')
      setShowStatusConfirmation(false)
      onClose()
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      if (showStatusConfirmation) {
        // Don't close on overlay click during status confirmation
        return
      }
      onClose()
    }
  }

  if (!isOpen || !smsDetails) return null

  return (
    <div className="sms-preview-overlay" onClick={handleOverlayClick}>
      <div className="sms-preview-modal">
        {showStatusConfirmation ? (
          <>
            <div className="modal-header">
              <h3>Update Status?</h3>
            </div>

            <div className="modal-content">
              <div className="status-confirmation-content">
                <div className="confirmation-icon">
                  ✅
                </div>
                <h4>SMS Sent Successfully!</h4>
                <p>Mark this lead as "Contacted"?</p>
                <div className="lead-info">
                  <strong>{lead.property?.street_address}</strong>
                  <br />
                  {lead.agent?.full_name}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => handleStatusUpdate(false)}
                className="no-btn"
                disabled={statusUpdateLoading}
              >
                No, Keep Current Status
              </button>
              <button
                onClick={() => handleStatusUpdate(true)}
                className="yes-btn"
                disabled={statusUpdateLoading}
              >
                {statusUpdateLoading ? (
                  <>
                    <div className="spinner small"></div>
                    Updating...
                  </>
                ) : (
                  'Yes, Mark as Contacted'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-header">
              <h3>SMS Preview</h3>
              <button className="close-btn" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

        <div className="modal-content">
          <div className="phone-info">
            <div className="recipient-info">
              <h4>Sending to:</h4>
              <div className="phone-display">
                <div className="phone-number">
                  {formatPhoneForDisplay(smsDetails.phoneNumber)}
                </div>
                <div className="agent-name">{smsDetails.agentName}</div>
              </div>
            </div>
          </div>

          <div className="message-preview">
            <h4>Message Preview:</h4>
            <div className="message-container">
              <div className="message-bubble">
                <div className="message-content">
                  {smsDetails.message}
                </div>
              </div>
              <div className="message-stats">
                <span className="char-count">
                  {smsDetails.message.length} characters
                </span>
                {smsDetails.message.length > 160 && (
                  <span className="sms-warning">
                    ⚠️ Message may be sent as multiple SMS
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="template-info">
            <h4>Template Used:</h4>
            <div className="template-name">{template.name}</div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onBack} className="back-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
            Back to Templates
          </button>

          <button
            onClick={handleSendSMS}
            className="send-sms-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner small"></div>
                Sending...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Send SMS
              </>
            )}
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SMSPreviewModal