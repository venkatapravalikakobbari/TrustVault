import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    navigate('/documents')
  }

  return (
    <div className="login-page">
      <div className="login-background-shape shape-one"></div>
      <div className="login-background-shape shape-two"></div>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            T
          </div>

          <div>
            <h1>TrustVault</h1>
            <p>Secure document management</p>
          </div>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to securely access your documents.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-field">
            <label htmlFor="email">Email address</label>

            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {message && (
            <div className="login-error">
              {message}
            </div>
          )}

          <button type="submit" className="login-button">
            Sign in
          </button>
        </form>

        <div className="login-security">
          <span className="security-dot"></span>
          Your documents are protected by secure access controls
        </div>
      </div>
    </div>
  )
}

export default Login