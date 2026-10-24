import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { registerUser } from '../auth/authService';
import { EyeIcon, EyeOffIcon, ShieldIcon } from '../components/common/Icons';
import AuthBrand from '../components/common/AuthBrand';
import { useToast } from '../components/common/ToastContext';
import '../styles/pages/login.css';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await registerUser(username.trim(), email.trim(), password);
      addToast('Account created successfully! Logging you in...', 'success');
      
      // Auto-login newly registered user
      await loginUser(username.trim(), password);
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page login-page">
      <section className="auth-container">
        <AuthBrand />

        {/* Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Create an account</h2>
            <p>Join StudyGram and start collaborating</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                className="auth-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">
                Email <span>(Optional)</span>
              </label>
              <input
                id="reg-email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Password</label>
              <div className="auth-input-wrapper">
                <input
                  id="reg-password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
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

            <div className="auth-field">
              <label htmlFor="reg-confirm-password">Confirm Password</label>
              <input
                id="reg-confirm-password"
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={loading}
                required
              />
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
                  <span className="spinner" /> Creating Account...
                </>
              ) : (
                <>
                  Create account
                </>
              )}
            </button>
          </form>

          <p className="auth-footer-prompt">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>

        <p className="auth-page-footer">StudyGram</p>
      </section>
    </main>
  );
}

export default Register;
