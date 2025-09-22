import { useState, useEffect } from 'react'
import { updatePropertyLeadMetadata, setPropertyLeadStatus } from '../../api/properties'
import { safeAPICall } from '../../api/index'

const PENDING_SMS_KEY = 'pendingSMSConfirmation'

const SMSContactedModal = ({
  isOpen,
  onClose,
  smsDetails,
  lead,
  template,
  onSMSSent,
  onStatusUpdate
}) => {
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)

  // Execute SMS immediately when modal opens
  useEffect(() => {
    if (isOpen && smsDetails) {
      executeSMS()
    }
  }, [isOpen, smsDetails])

  const executeSMS = async () => {
    try {
      // Get working lead for this function
      const workingLead = lead || (smsDetails?.leadId ? {
        id: smsDetails.leadId,
        property: { street_address: smsDetails.propertyAddress },
        agent: { full_name: smsDetails.agentName },
        metadata: {}
      } : null)

      if (!workingLead?.id) {
        console.error('No lead data available for SMS')
        return
      }

      // Create SMS URL and open immediately
      const smsUrl = `sms:${smsDetails.phoneNumber}?body=${encodeURIComponent(smsDetails.message)}`
      console.log('Launching SMS app with URL:', smsUrl)

      // Store pending confirmation data in localStorage before opening SMS
      const pendingData = {
        leadId: workingLead.id,
        agentName: workingLead.agent?.full_name || smsDetails.agentName,
        propertyAddress: workingLead.property?.street_address || smsDetails.propertyAddress,
        templateName: template?.name || 'Unknown Template',
        timestamp: Date.now()
      }
      localStorage.setItem(PENDING_SMS_KEY, JSON.stringify(pendingData))

      window.open(smsUrl, '_blank')

      // Don't update metadata here - wait for user confirmation
      // Notify parent that SMS was sent
      if (onSMSSent) {
        onSMSSent()
      }
    } catch (error) {
      console.error('Error launching SMS:', error)
    }
  }

  const handleStatusUpdate = async (updateStatus) => {
    if (!updateStatus) {
      // User clicked "No" - just close the modal
      onClose()
      return
    }

    // Get working lead for this function
    const workingLead = lead || (smsDetails?.leadId ? {
      id: smsDetails.leadId,
      property: { street_address: smsDetails.propertyAddress },
      agent: { full_name: smsDetails.agentName },
      metadata: {}
    } : null)

    if (!workingLead?.id) {
      console.error('No lead ID available for status update')
      alert('Unable to update status - no lead information available.')
      onClose()
      return
    }

    // User clicked "Yes" - update status to "contacted"
    setStatusUpdateLoading(true)

    try {
      // Update both status and metadata since user confirmed contact
      const secureSetStatus = safeAPICall(setPropertyLeadStatus, 'SMSContactedModal.updateStatus')
      const statusResult = await secureSetStatus(workingLead.id, 'contacted')

      // Also update metadata to mark as messaged
      const updatedMetadata = {
        ...workingLead.metadata,
        messaged: true,
        message_count: (workingLead.metadata?.message_count || 0) + 1,
        last_message_date: new Date().toISOString(),
        last_template_used: template?.name || 'Unknown Template'
      }

      const secureUpdateMetadata = safeAPICall(updatePropertyLeadMetadata, 'SMSContactedModal.updateMetadata')
      const metadataResult = await secureUpdateMetadata(workingLead.id, updatedMetadata)

      if (statusResult.success && statusResult.data.success) {
        console.log('Successfully updated lead status to contacted')
        if (!metadataResult.success) {
          console.warn('Status updated but metadata update failed:', metadataResult.error)
        }

        // Notify parent component of the status change for immediate UI update
        if (onStatusUpdate) {
          onStatusUpdate(workingLead.id, 'contacted')
        }

        onClose()
      } else {
        console.error('Failed to update lead status:', statusResult.data?.error || statusResult.error)
        alert('Failed to update lead status. Please update manually.')
        onClose()
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      alert('An error occurred while updating lead status. Please update manually.')
      onClose()
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      // Don't allow closing by clicking overlay during this modal
      return
    }
  }

  console.log('SMSContactedModal render check:', {
    isOpen,
    hasSmsDetails: !!smsDetails,
    hasLead: !!lead,
    smsDetailsData: smsDetails
  })

  // If we don't have a full lead object but have smsDetails with leadId, create a minimal lead object
  const workingLead = lead || (smsDetails?.leadId ? {
    id: smsDetails.leadId,
    property: { street_address: smsDetails.propertyAddress },
    agent: { full_name: smsDetails.agentName },
    metadata: {}
  } : null)

  if (!isOpen || !smsDetails || !workingLead) return null

  console.log('SMSContactedModal is rendering!')

  return (
    <div
      className="sms-contacted-overlay"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div
        className="sms-contacted-modal"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        <div className="modal-header">
          <h3>Update Status?</h3>
        </div>

        <div className="modal-content">
          <div className="status-confirmation-content">
            <div className="confirmation-icon">
              ✅
            </div>
            <h4>SMS App Opening...</h4>
            <p>After sending the message, return here to mark this lead as "Contacted"</p>
            <div className="lead-info">
              <strong>{workingLead?.property?.street_address || 'Property Address'}</strong>
              <br />
              {workingLead?.agent?.full_name || 'Agent Name'}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={() => onClose()}
            className="no-btn"
            disabled={statusUpdateLoading}
          >
            Cancel
          </button>
          <button
            onClick={executeSMS}
            className="send-sms-btn"
            disabled={statusUpdateLoading}
          >
            Send SMS Now
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
      </div>
    </div>
  )
}

export default SMSContactedModal