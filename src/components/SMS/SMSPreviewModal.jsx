import { useState } from 'react'
import { updatePropertyLeadMetadata, safeAPICall } from '../../lib/supabase'

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

      // Show success and close modal
      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (error) {
      console.error('Error launching SMS or updating metadata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !smsDetails) return null

  return (
    <div className="sms-preview-overlay" onClick={handleOverlayClick}>
      <div className="sms-preview-modal">
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
      </div>
    </div>
  )
}

export default SMSPreviewModal