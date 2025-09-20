import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSuccess = (session) => {
    setSession(session)
  }

  const handleSignOut = () => {
    setSession(null)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Auth onAuthSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            session ? (
              <Dashboard user={session.user} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/listings/leads"
          element={
            session ? (
              <Dashboard user={session.user} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/auth/callback"
          element={<AuthCallback />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

// Handle magic link callback
const AuthCallback = () => {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error during auth callback:', error)
          window.location.href = '/'
          return
        }

        if (data.session) {
          window.location.href = '/dashboard'
        } else {
          window.location.href = '/'
        }
      } catch (error) {
        console.error('Error during auth callback:', error)
        window.location.href = '/'
      }
    }

    handleAuthCallback()
  }, [])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px',
      color: '#666'
    }}>
      Signing you in...
    </div>
  )
}

export default App