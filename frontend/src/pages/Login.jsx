import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { EyeIcon, EyeOffIcon, ShieldIcon, SparklesIcon } from '../components/common/Icons';
import { useToast } from '../components/common/ToastContext';
import '../styles/pages/login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, loginUser, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/app', { replace: true });
    }
  }, [user, authLoading, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginUser(username.trim(), password);
      addToast(`Welcome back, ${username}!`, 'success');
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-container">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo">S</div>
          <h1>StudyGram</h1>
          <p>Your space to learn, collaborate, and study together.</p>
        </div>

        {/* Login card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your workspaces</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                className="auth-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrapper">
                <input
                  id="login-password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <ShieldIcon size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> Logging in...
                </>
              ) : (
                <>
                  <SparklesIcon size={16} /> Sign In
                </>
              )}
            </button>
          </form>

          <p className="auth-footer-prompt">
            Don't have an account yet?{' '}
            <Link to="/register" className="auth-link">
              Create account
            </Link>
          </p>
        </div>

        <p className="auth-page-footer">StudyGram &bull; Collaborative Learning Platform</p>
      </section>
    </main>
  );
}

export default Login;