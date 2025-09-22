import { useState } from 'react'
import SMSTemplateModal from './SMSTemplateModal'
import SMSPreviewModal from './SMSPreviewModal'
import SMSContactedModal from './SMSContactedModal'
import { getSMSDetails } from '../../api/messaging'

const SMSHandler = ({
  isTemplateModalOpen,
  onCloseTemplateModal,
  onClosePreviewModal,
  currentLead,
  onSMSComplete,
  onStatusUpdate
}) => {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isContactedModalOpen, setIsContactedModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [smsDetails, setSmsDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTemplateSelect = async (template, lead, smsDetails = null) => {
    setSelectedTemplate(template)

    if (!smsDetails) {
      setError('SMS details not available')
      console.error('No SMS details provided for template:', template)
      return
    }

    console.log('Using pre-loaded SMS details:', smsDetails)
    setSmsDetails(smsDetails)

    // Close template modal and open preview modal instantly
    onCloseTemplateModal()
    // Instant transition since data is already loaded
    setTimeout(() => {
      setIsPreviewModalOpen(true)
    }, 10)
  }

  const handleBackToTemplates = () => {
    setSmsDetails(null)
    setSelectedTemplate(null)
    setError('')
    // This will be handled by parent component to show template modal again
  }

  const handlePreviewClose = () => {
    setSmsDetails(null)
    setSelectedTemplate(null)
    setError('')
    setIsPreviewModalOpen(false)
  }

  const handlePreviewCloseWithoutClear = () => {
    setError('')
    setIsPreviewModalOpen(false)
  }

  const handleOpenContactedModal = () => {
    console.log('Opening contacted modal, current state:', {
      isPreviewModalOpen,
      isContactedModalOpen,
      smsDetails: !!smsDetails,
      currentLead: !!currentLead,
      currentLeadDetails: currentLead
    })
    // Close preview modal immediately and open contacted modal
    setIsPreviewModalOpen(false)
    setIsContactedModalOpen(true)

    // Add a timeout to check state after update
    setTimeout(() => {
      console.log('After state update:', {
        isContactedModalOpen: true, // should be true
        isPreviewModalOpen: false, // should be false
        smsDetails: !!smsDetails,
        currentLead: !!currentLead
      })
    }, 50)
  }

  const handleContactedModalClose = () => {
    setSmsDetails(null)
    setSelectedTemplate(null)
    setError('')
    setIsContactedModalOpen(false)

    // Clear localStorage when closing modal
    const PENDING_SMS_KEY = 'pendingSMSConfirmation'
    localStorage.removeItem(PENDING_SMS_KEY)

    // Notify parent that SMS process is complete
    if (onSMSComplete) {
      onSMSComplete()
    }
  }

  const handleSMSSent = () => {
    // This will be called from the SMSContactedModal
    if (onSMSComplete) {
      onSMSComplete()
    }
  }

  return (
    <>
      <SMSTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={onCloseTemplateModal}
        lead={currentLead}
        onTemplateSelect={handleTemplateSelect}
      />

      <SMSPreviewModal
        isOpen={isPreviewModalOpen && !!smsDetails}
        onClose={handlePreviewClose}
        onCloseWithoutClear={handlePreviewCloseWithoutClear}
        onBack={handleBackToTemplates}
        smsDetails={smsDetails}
        lead={currentLead}
        template={selectedTemplate}
        onOpenContactedModal={handleOpenContactedModal}
      />

      <SMSContactedModal
        isOpen={isContactedModalOpen && !!smsDetails}
        onClose={handleContactedModalClose}
        smsDetails={smsDetails}
        lead={currentLead}
        template={selectedTemplate}
        onSMSSent={handleSMSSent}
        onStatusUpdate={onStatusUpdate}
      />

      {error && (
        <div className="sms-error-toast">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
            <button
              className="error-close"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default SMSHandler