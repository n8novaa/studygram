import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { confirmPasswordReset } from '../auth/authService';
import AuthBrand from '../components/common/AuthBrand';
import '../styles/pages/login.css';

function ResetPassword() {
  const { uid, token } = useParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(
        uid,
        token,
        password,
      );

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(
        err.message ||
          'Unable to reset your password. The link may be invalid or expired.',
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
            <h2>Create a new password</h2>
            <p>
              Choose a new password to secure your account.
            </p>
          </div>

          {success ? (
            <div role="status">
              <p>
                Password reset successful. You can now sign in.
              </p>

              <Link
                to="/login"
                className="auth-button"
                style={{
                  textDecoration: 'none',
                  marginTop: '16px',
                }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >
              <div className="auth-field">
                <label htmlFor="new-password">
                  New password
                </label>

                <input
                  id="new-password"
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="confirm-password">
                  Confirm new password
                </label>

                <input
                  id="confirm-password"
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Enter your password again"
                  autoComplete="new-password"
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
                  ? 'Resetting password...'
                  : 'Reset password'}
              </button>
            </form>
          )}

          {!success && (
            <p className="auth-footer-prompt">
              <Link to="/forgot-password" className="auth-link">
                Request a new reset link
              </Link>
            </p>
          )}

        </div>
        <p className="auth-page-footer">StudyGram</p>
      </section>
    </main>
  );
}

export default ResetPassword;
