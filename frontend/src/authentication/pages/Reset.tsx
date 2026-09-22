import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import { OtpInput } from '../components/OtpInput';
import '../styles/auth.css';
import { resetPassword, verifyPasswordResetOtp, resolveAuthErrorMessage, PROFESSIONAL_ERROR_MESSAGES } from '../../services/auth';

export default function ResetPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [otpVerified, setOtpVerified] = useState(Boolean(token));
  const passwordError = submitted && !password.trim() ? 'New password is required.' : null;
  const confirmError = submitted && !confirm.trim()
    ? 'Please confirm your new password.'
    : password && confirm && password !== confirm
    ? 'Passwords do not match.'
    : null;
  const isOtpReady = Boolean(email && /^[0-9]{6}$/.test(otp));
  const isResetEnabled = Boolean(otpVerified && password.trim() && confirm.trim() && password === confirm && email);

  const verifyOtp = async (nextOtp = otp) => {
    if (!email) {
      setError('This reset request is missing the account email. Please start again from Account recovery.');
      return;
    }

    if (!/^[0-9]{6}$/.test(nextOtp)) {
      setError('Enter the six-digit reset code from your email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await verifyPasswordResetOtp({ email, otp: nextOtp });
      setOtpVerified(response.success);
      setSubmitted(false);
      setError(null);
    } catch (err: any) {
      setOtpVerified(false);
      setError(resolveAuthErrorMessage(err, 'verification', 'That reset code is invalid or expired. Please request a new code.'));
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setSuccess(null);
    if (!otpVerified && !token) {
      setError('Verify the six-digit reset code before setting a new password.');
      return;
    }
    if (!password.trim() || !confirm.trim()) {
      setError(PROFESSIONAL_ERROR_MESSAGES.validationRequired);
      return;
    }
    if (password !== confirm) {
      setError('The passwords entered do not match. Please verify and try again.');
      return;
    }
    if (!email) {
      setError('Please provide the email address associated with your account.');
      return;
    }
    if (!token && !/^[0-9]{6}$/.test(otp)) {
      setError('Enter the 6-digit reset code you received by email, or use the secure reset link from your email.');
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword({
        email,
        token: token || undefined,
        otp: token ? undefined : otp,
        password,
        password_confirmation: confirm,
      });
      setSuccess(response.message || 'Your password has been successfully updated. You may now sign in using your new credentials.');
    } catch (err: any) {
      setError(resolveAuthErrorMessage(err, 'reset-password', 'Unable to update your password. The security code or reset link may have expired; please request a new one.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Set new password"
      subtitle="Set a strong password to secure your account."
      footerNote="Password reset links expire after a limited time for your protection."
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        {!token && !otpVerified ? (
          <div className="auth-otp-group">
            <div className="auth-verify-message auth-verify-message-compact">
              <span>Enter the six-digit code sent to</span>
              <strong>{email || 'your registered email address'}</strong>
            </div>
            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={(value) => void verifyOtp(value)}
              disabled={loading}
              autoFocus
              purpose="password_reset"
              ariaLabel="Password reset verification code"
            />
            <div className="auth-button-row compact">
              <AuthButton type="button" onClick={() => void verifyOtp()} loading={loading} disabled={!isOtpReady || loading}>
                {loading ? 'Checking code…' : 'Verify reset code'}
              </AuthButton>
            </div>
          </div>
        ) : null}
        {otpVerified ? (
          <section className="auth-password-stage" aria-live="polite" aria-labelledby="password-stage-title">
            <div className="auth-password-stage-header">
              <div className="auth-password-stage-check" aria-hidden="true">✓</div>
              <div>
                <h2 id="password-stage-title">Create your new password</h2>
                <p>Your reset code has been verified. Choose a strong password to protect your account.</p>
              </div>
            </div>
            <AuthInput
              id="password"
              label="New password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              error={passwordError}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              }
            />
            <AuthInput
              id="confirm"
              label="Confirm password"
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              error={confirmError}
            />
            <p className="auth-password-stage-hint">Use at least 8 characters. Avoid passwords you use elsewhere.</p>
          </section>
        ) : null}

        {error ? <div className="auth-alert">{error}</div> : null}
        {success ? <div className="auth-alert success">{success}</div> : null}

        {otpVerified ? (
          <div className="auth-button-row">
            <AuthButton type="submit" loading={loading} disabled={!isResetEnabled}>
              {loading ? 'Updating…' : 'Set new password securely'}
            </AuthButton>
          </div>
        ) : null}

        <div className="auth-form-meta">
          <span className="auth-form-meta-label">Already have access?</span>
          <button type="button" className="auth-link secondary" onClick={() => navigate('/login')}>
            Return to sign in
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
