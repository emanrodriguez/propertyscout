import { useState, useEffect } from 'react'
import { updatePropertyLeadMetadata, setPropertyLeadStatus } from '../../api/properties'
import { safeAPICall } from '../../api/index'

const PENDING_SMS_KEY = 'pendingSMSConfirmation'

const PendingSMSModal = () => {
  const [pendingData, setPendingData] = useState(null)
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)

  useEffect(() => {
    // Check for pending SMS confirmation on component mount
    const checkPendingSMS = () => {
      const stored = localStorage.getItem(PENDING_SMS_KEY)
      if (stored) {
        try {
          const data = JSON.parse(stored)
          // Only show if it's recent (within 10 minutes)
          const isRecent = Date.now() - data.timestamp < 10 * 60 * 1000
          if (isRecent) {
            setPendingData(data)
          } else {
            // Clean up old data
            localStorage.removeItem(PENDING_SMS_KEY)
          }
        } catch (error) {
          console.error('Error parsing pending SMS data:', error)
          localStorage.removeItem(PENDING_SMS_KEY)
        }
      }
    }

    checkPendingSMS()
  }, [])

  const handleStatusUpdate = async (updateStatus) => {
    if (!updateStatus) {
      // User clicked "No" - just close and clear
      localStorage.removeItem(PENDING_SMS_KEY)
      setPendingData(null)
      return
    }

    if (!pendingData?.leadId) {
      console.error('No lead ID available for status update')
      alert('Unable to update status - no lead information available.')
      localStorage.removeItem(PENDING_SMS_KEY)
      setPendingData(null)
      return
    }

    // User clicked "Yes" - update status to "contacted"
    setStatusUpdateLoading(true)

    try {
      // Update both status and metadata since user confirmed contact
      const secureSetStatus = safeAPICall(setPropertyLeadStatus, 'PendingSMSModal.updateStatus')
      const statusResult = await secureSetStatus(pendingData.leadId, 'contacted')

      // Also update metadata to mark as messaged
      const updatedMetadata = {
        messaged: true,
        message_count: 1,
        last_message_date: new Date().toISOString(),
        last_template_used: pendingData.templateName || 'Unknown Template'
      }

      const secureUpdateMetadata = safeAPICall(updatePropertyLeadMetadata, 'PendingSMSModal.updateMetadata')
      const metadataResult = await secureUpdateMetadata(pendingData.leadId, updatedMetadata)

      if (statusResult.success && statusResult.data.success) {
        console.log('Successfully updated lead status to contacted')
        if (!metadataResult.success) {
          console.warn('Status updated but metadata update failed:', metadataResult.error)
        }
        // Clear localStorage and close modal
        localStorage.removeItem(PENDING_SMS_KEY)
        setPendingData(null)
      } else {
        console.error('Failed to update lead status:', statusResult.data?.error || statusResult.error)
        alert('Failed to update lead status. Please update manually.')
        localStorage.removeItem(PENDING_SMS_KEY)
        setPendingData(null)
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      alert('An error occurred while updating lead status. Please update manually.')
      localStorage.removeItem(PENDING_SMS_KEY)
      setPendingData(null)
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

  if (!pendingData) return null

  return (
    <div
      className="sms-pending-overlay"
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
        className="sms-pending-modal"
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
          <h3>SMS Sent - Update Status?</h3>
        </div>

        <div className="modal-content">
          <div className="status-confirmation-content">
            <div className="confirmation-icon">
              ✅
            </div>
            <h4>Did you send the SMS?</h4>
            <p>Mark this lead as "Contacted" if you sent the message.</p>
            <div className="lead-info">
              <strong>{pendingData.propertyAddress}</strong>
              <br />
              {pendingData.agentName}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={() => handleStatusUpdate(false)}
            className="no-btn"
            disabled={statusUpdateLoading}
          >
            No, Don't Update
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

export default PendingSMSModal