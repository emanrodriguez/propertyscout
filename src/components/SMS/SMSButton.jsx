import { useState } from 'react'

const SMSButton = ({
  lead,
  onSMSClick,
  disabled = false,
  loading = false
}) => {
  const [buttonState, setButtonState] = useState('default')

  const handleClick = async () => {
    if (disabled || loading) return

    setButtonState('loading')
    try {
      await onSMSClick(lead)
      setButtonState('success')

      // Reset button after 3 seconds
      setTimeout(() => {
        setButtonState('default')
      }, 3000)
    } catch (error) {
      setButtonState('error')
      console.error('SMS Error:', error)

      // Reset button after 3 seconds
      setTimeout(() => {
        setButtonState('default')
      }, 3000)
    }
  }

  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <>
            <div className="sms-spinner"></div>
            Loading...
          </>
        )
      case 'success':
        return (
          <>
            <svg className="sms-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
            SMS Ready
          </>
        )
      case 'error':
        return (
          <>
            <svg className="sms-icon error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Error
          </>
        )
      default:
        return (
          <>
            <svg className="sms-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {lead.metadata?.messaged ? `SMS (${lead.metadata.message_count || 1})` : 'SMS Agent'}
          </>
        )
    }
  }

  const getButtonClassName = () => {
    let className = 'sms-button'

    if (buttonState === 'loading') className += ' loading'
    if (buttonState === 'success') className += ' success'
    if (buttonState === 'error') className += ' error'
    if (lead.metadata?.messaged) className += ' messaged'
    if (disabled) className += ' disabled'

    return className
  }

  return (
    <button
      className={getButtonClassName()}
      onClick={handleClick}
      disabled={disabled || loading || buttonState === 'loading'}
      title={
        lead.metadata?.messaged
          ? `Last message: ${new Date(lead.metadata.last_message_date).toLocaleDateString()}`
          : 'Send SMS to agent'
      }
    >
      {getButtonContent()}
    </button>
  )
}

export default SMSButton