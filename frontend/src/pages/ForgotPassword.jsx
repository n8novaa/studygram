import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../auth/authService';
import AuthBrand from '../components/common/AuthBrand';
import '../styles/pages/login.css';

function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await requestPasswordReset(username.trim());
      setSuccess(true);
    } catch (err) {
      setError(
        err.message ||
          'Unable to process your request. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page login-page">
      <section className="auth-container">
        <AuthBrand />

        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Forgot your password?</h2>
            <p>
              Enter your username and we’ll send a reset link to the email on your account.
            </p>
          </div>

          {success ? (
            <div className="auth-success" role="status" aria-live="polite">
              <h3>Check your email</h3>
              <p>If an account matches that username, reset instructions are on their way.</p>
              <button
                type="button"
                className="auth-button auth-button-secondary"
                onClick={() => setSuccess(false)}
              >
                Try another username
              </button>
            </div>
          ) : (
            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >
              <div className="auth-field">
                <label htmlFor="reset-username">
                  Username
                </label>

                <input
                  id="reset-username"
                  className="auth-input"
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

              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="auth-button"
                disabled={loading}
              >
                {loading
                  ? 'Sending...'
                  : 'Send reset instructions'}
              </button>
            </form>
          )}

          <p className="auth-footer-prompt">
            <Link to="/login" className="auth-link">
              Back to sign in
            </Link>
          </p>
        </div>
        <p className="auth-page-footer">StudyGram</p>
      </section>
    </main>
  );
}

export default ForgotPassword;
