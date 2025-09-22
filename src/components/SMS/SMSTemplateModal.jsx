import { useState, useEffect } from 'react'
import { getMessageTemplates, getAllSMSDetails } from '../../api/messaging'
import { safeAPICall } from '../../api/index'

const SMSTemplateModal = ({
  isOpen,
  onClose,
  lead,
  onTemplateSelect
}) => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [allSMSDetails, setAllSMSDetails] = useState({})

  useEffect(() => {
    if (isOpen && lead) {
      loadTemplatesAndDetails()
    }
  }, [isOpen, lead])

  const loadTemplatesAndDetails = async () => {
    setLoading(true)
    setError('')

    try {
      // Use secure API calls with safe wrappers
      const secureGetTemplates = safeAPICall(getMessageTemplates, 'SMSTemplateModal.getTemplates')
      const secureGetSMSDetails = safeAPICall(getAllSMSDetails, 'SMSTemplateModal.getSMSDetails')

      // Load templates and SMS details in parallel
      const [templatesResult, smsDetailsResult] = await Promise.all([
        secureGetTemplates(),
        secureGetSMSDetails([], lead.id) // Template IDs will be passed after templates are loaded
      ])

      // Handle templates result
      if (templatesResult.success) {
        setTemplates(templatesResult.data)

        if (templatesResult.data.length === 0) {
          setError('No message templates found. Please create templates in settings.')
        }
      } else {
        throw new Error(templatesResult.error?.message || 'Failed to load templates')
      }

      // Handle SMS details result
      if (smsDetailsResult.success) {
        setAllSMSDetails(smsDetailsResult.data)
      } else {
        console.warn('SMS details failed to load:', smsDetailsResult.error)
        // Don't throw error for SMS details since templates are more important
        setAllSMSDetails({})
      }

      console.log('Loaded templates:', templatesResult.data)
      console.log('Loaded all SMS details:', smsDetailsResult.data)

    } catch (err) {
      const errorMessage = err.message || 'Error loading templates. Please try again.'
      setError(errorMessage)
      console.error('Error loading templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template) => {
    // Get pre-fetched SMS details for this template
    const smsDetails = allSMSDetails[template.template_id] || allSMSDetails[template.id]

    console.log('Selecting template with pre-loaded SMS details:', smsDetails)

    // Pass the pre-loaded SMS details along with the template
    onTemplateSelect(template, lead, smsDetails)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="sms-template-overlay" onClick={handleOverlayClick}>
      <div className="sms-template-modal">
        <div className="modal-header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Send SMS</h3>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      
        <div className="modal-content">
          <div className="info-grid">
              <div className="info-item">
                <label>Address:</label>
                <span>{lead.property.street_address}</span>
              </div>
              <div className="info-item">
                <label>Agent:</label>
                <span>{lead.agent.first_name}</span>
              </div>
              <div className="info-item">
                <label>Phone:</label>
                <span>{lead.agent.phone_number}</span>
              </div>
            </div>
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading templates...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <p className="error-message">{error}</p>
              <button onClick={loadTemplates} className="retry-btn">
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && templates.length > 0 && (
            <div className="template-list">
              <h4>Available Templates</h4>
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`template-option ${allSMSDetails[template.template_id] || allSMSDetails[template.id] ? 'ready' : ''}`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="template-header">
                    <div className="template-name">
                      {template.name}
                      {(allSMSDetails[template.template_id] || allSMSDetails[template.id]) && (
                        <span className="cache-indicator" title="Ready for instant preview">⚡</span>
                      )}
                    </div>
                    <svg className="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"></polyline>
                    </svg>
                  </div>
                  <div className="template-preview">
                    {template.content.length > 150
                      ? `${template.content.substring(0, 150)}...`
                      : template.content
                    }
                  </div>
                  <div className="template-meta">
                    {template.content.length} characters
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default SMSTemplateModal