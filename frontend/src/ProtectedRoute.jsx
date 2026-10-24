import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setSession(session)
      setLoading(false)
    }

    checkSession()
  }, [])

  if (loading) {
    return <p>Checking authentication...</p>
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute