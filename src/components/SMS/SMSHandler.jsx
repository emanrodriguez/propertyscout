import { useState } from 'react'
import SMSTemplateModal from './SMSTemplateModal'
import SMSPreviewModal from './SMSPreviewModal'
import { getSMSDetails } from '../../lib/supabase'

const SMSHandler = ({
  isTemplateModalOpen,
  onCloseTemplateModal,
  onClosePreviewModal,
  currentLead,
  onSMSComplete
}) => {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
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

  const handleSMSSent = () => {
    // Notify parent that SMS was actually sent
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
        onBack={handleBackToTemplates}
        smsDetails={smsDetails}
        lead={currentLead}
        template={selectedTemplate}
        onSMSSent={handleSMSSent}
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