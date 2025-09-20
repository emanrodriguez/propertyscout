import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const Auth = ({ onAuthSuccess }) => {
  const [authMethod, setAuthMethod] = useState('magiclink')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const otpRefs = useRef([])

  useEffect(() => {
    // Check for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          onAuthSuccess(session)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [onAuthSuccess])

  const showMessage = (text, type) => {
    setMessage(text)
    setMessageType(type)
  }

  const handleSendAuth = async (e) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    showMessage('', '')

    try {
      if (authMethod === 'magiclink') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        })

        if (error) {
          showMessage(error.message, 'error')
        } else {
          showMessage('Magic link sent! Check your email to sign in.', 'success')
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
          }
        })

        if (error) {
          showMessage(error.message, 'error')
        } else {
          showMessage('Verification code sent to your email!', 'info')
          setShowOtp(true)
          setTimeout(() => {
            otpRefs.current[0]?.focus()
          }, 100)
        }
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.replace(/\D/g, '')
      const newOtpCode = [...otpCode]

      for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
        if (index + i < 6) {
          newOtpCode[index + i] = pastedData[i]
        }
      }

      setOtpCode(newOtpCode)

      if (pastedData.length >= 6 - index) {
        handleVerifyOtp(newOtpCode)
      }
      return
    }

    const newOtpCode = [...otpCode]
    newOtpCode[index] = value
    setOtpCode(newOtpCode)

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-verify when last digit is entered
    if (index === 5 && value) {
      handleVerifyOtp(newOtpCode)
    }
  }

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async (codeArray = otpCode) => {
    const code = codeArray.join('')
    if (code.length !== 6) {
      showMessage('Please enter all 6 digits', 'error')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      })

      if (error) {
        showMessage(error.message, 'error')
        setOtpCode(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
      } else {
        showMessage('Signed in successfully!', 'success')
        setTimeout(() => {
          onAuthSuccess(data.session)
        }, 1000)
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) {
      showMessage('Please enter your email first', 'error')
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      })

      if (error) {
        showMessage(error.message, 'error')
      } else {
        showMessage('New verification code sent!', 'info')
        setOtpCode(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">PropertyScout</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        <div className="method-selector">
          <div
            className={`method-btn ${authMethod === 'magiclink' ? 'active' : ''}`}
            onClick={() => {
              setAuthMethod('magiclink')
              setShowOtp(false)
              setMessage('')
            }}
          >
            Magic Link
          </div>
          <div
            className={`method-btn ${authMethod === 'otp' ? 'active' : ''}`}
            onClick={() => {
              setAuthMethod('otp')
              setShowOtp(false)
              setMessage('')
            }}
          >
            OTP Code
          </div>
        </div>

        <form onSubmit={handleSendAuth}>
          <div className="form-group">
            <input
              type="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Sending...' :
             authMethod === 'magiclink' ? 'Send Magic Link' : 'Send OTP Code'}
          </button>
        </form>

        {showOtp && (
          <div className="otp-container">
            <div className="divider">
              <span>Enter verification code</span>
            </div>
            <div className="otp-inputs">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => otpRefs.current[index] = el}
                  type="text"
                  className="otp-input"
                  maxLength="6"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={(e) => {
                    e.preventDefault()
                    const pastedData = e.clipboardData.getData('text')
                    handleOtpChange(index, pastedData)
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <div className="resend-link">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend code
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default Auth