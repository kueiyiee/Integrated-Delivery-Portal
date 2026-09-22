import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import '../styles/auth.css';
import { login as apiLogin, resolveAuthErrorMessage, PROFESSIONAL_ERROR_MESSAGES } from '../../services/auth';
import { AuthContext } from '../../contexts/AuthContext';
import { isPlatformAdminUser } from '../../utils/authAccess';
import { useToast } from '../../components/ui/ToastProvider';

export default function LoginPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const emailError = submitted && !email.trim() ? 'Email is required.' : null;
  const passwordError = submitted && !password.trim() ? 'Password is required.' : null;
  const isLoginEnabled = Boolean(email.trim() && password.trim());

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (!email.trim()) {
      setError(PROFESSIONAL_ERROR_MESSAGES.emailRequired);
      return;
    }
    if (!password.trim()) {
      setError(PROFESSIONAL_ERROR_MESSAGES.passwordRequired);
      return;
    }
    setLoading(true);
    try {
      const response = await apiLogin({ email, password, remember });

      if ('mfa_setup_required' in response && response.mfa_setup_required && response.token) {
        await auth.login(response.token, true, response.user ?? null);
        navigate('/mfa-setup');
        return;
      }

      if ('token' in response && response.token) {
        await auth.login(response.token, remember, response.user ?? null);

        const alertState = { alert: 'Login successful. Your secure workspace is ready.' };
        const user = response.user ?? null;
        const isAdmin = isPlatformAdminUser(user);
        const isCompanyUser = Boolean(user?.company_id);

        if (isAdmin) {
          toast.success({
            title: 'Signed In',
            description: 'Access granted to the System Administration Console.',
          });
          navigate('/admin', { state: alertState });
          return;
        }

        if (isCompanyUser) {
          toast.success({
            title: 'Signed In',
            description: 'Welcome back. Your company workspace is available.',
          });
          navigate('/client', { state: alertState });
          return;
        }

        navigate('/unauthorized', {
          state: {
            alert: 'Your account is signed in but does not have access to a dashboard. Please contact your system administrator.',
          },
        });
        return;
      }

      if ('mfa_required' in response && response.mfa_required) {
        sessionStorage.setItem('mfa_challenge_token', response.challenge_token);
        navigate('/mfa-challenge');
        return;
      }


      throw new Error('We were unable to complete your sign in request. Please verify your credentials and try again.');
    } catch (err: any) {
      const message = resolveAuthErrorMessage(err, 'login', PROFESSIONAL_ERROR_MESSAGES.invalidCredentials);
      const friendlyMessage = message.includes('unable to reach the server right now') || message.includes('timed out while reaching the server')
        ? PROFESSIONAL_ERROR_MESSAGES.signInNetwork
        : message;

      setError(friendlyMessage);
      toast.error({
        title: 'Sign-in unavailable',
        description: friendlyMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Sign in to your enterprise portal with secure, compliant credentials."
    >
      <div className="auth-login-grid">
        <div className="auth-login-form-shell">
          <form className="auth-form" onSubmit={submit} noValidate>

            <AuthInput
              id="email"
              label="Work email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              error={emailError}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 4h16v16H4z" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
              }
            />

            <AuthInput
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              error={passwordError}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              }
              action={
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12s-4.5 7.5-10.5 7.5S1.5 12 1.5 12Z" />
                      <circle cx="12" cy="12" r="3.2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12s-4.5 7.5-10.5 7.5S1.5 12 1.5 12Z" />
                      <path d="M8 8l8 8" />
                      <path d="M16 8l-8 8" />
                    </svg>
                  )}
                </button>
              }
            />

            <div className="auth-options">
              <label className="auth-remember" htmlFor="remember-me">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="auth-remember-box" aria-hidden="true">
                  {remember ? (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M13 4L6.2 11 3 7.7" />
                    </svg>
                  ) : null}
                </span>
                <span className="auth-remember-label">Keep me signed in</span>
              </label>
              <button type="button" className="auth-link" onClick={() => navigate('/forgot-password')}>
                Forgot password?
              </button>
            </div>

            {error ? <div className="auth-alert">{error}</div> : null}

            <div className="auth-button-row">
              <AuthButton type="submit" loading={loading} disabled={!isLoginEnabled}>
                {loading ? 'Signing in…' : 'Sign in'}
              </AuthButton>
            </div>

            <div className="auth-form-meta" aria-hidden={false}>
              <div style={{ display: 'flex', width: '100%', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                <span className="auth-form-meta-label">Need organization access?</span>
                <button
                  type="button"
                  className="auth-link secondary"
                  onClick={() => navigate('/register')}
                  aria-label="Request organization access"
                >
                  Request Organization Access
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </AuthShell>
  );
}
