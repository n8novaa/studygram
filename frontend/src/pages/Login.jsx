import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

import '../styles/login.css'


function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { loginUser } = useAuth()
  const navigate = useNavigate()


  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      await loginUser(username, password)
      navigate('/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }


  return (
    <main className="login-page">

      <section className="login-container">

        {/* Brand */}

        <div className="login-brand">
          <div className="login-logo">
            S
          </div>

          <h1>StudyGram</h1>

          <p>
            Your space to learn, collaborate,
            and study together.
          </p>
        </div>


        {/* Login card */}

        <div className="login-card">

          <div className="login-card-header">
            <h2>Welcome back</h2>

            <p>
              Sign in to continue to StudyGram.
            </p>
          </div>


          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            <div className="login-field">

              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Enter your username"
                autoComplete="username"
                disabled={loading}
                required
              />

            </div>


            <div className="login-field">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                required
              />

            </div>


            {error && (
              <div className="login-error">
                {error}
              </div>
            )}


            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? 'Logging in...'
                : 'Login'}
            </button>

          </form>

        </div>


        <p className="login-footer">
          StudyGram
        </p>

      </section>

    </main>
  )
}


export default Login