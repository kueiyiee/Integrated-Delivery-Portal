import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import '../styles/auth.css';
import { resetPassword } from '../../services/auth';

export default function ResetPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const passwordError = submitted && !password.trim() ? 'New password is required.' : null;
  const confirmError = submitted && !confirm.trim()
    ? 'Please confirm your new password.'
    : password && confirm && password !== confirm
    ? 'Passwords do not match.'
    : null;
  const isResetEnabled = Boolean(password.trim() && confirm.trim() && password === confirm && token && email);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setSuccess(null);
    if (!password.trim() || !confirm.trim()) {
      setError('Enter and confirm your new password before continuing.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords entered do not match. Please verify and try again.');
      return;
    }
    if (!token || !email) {
      setError('The password reset link is missing required security parameters. Please request a new recovery link.');
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword({ email, token, password, password_confirmation: confirm });
      setSuccess(response.message || 'Your password has been successfully updated. You may now sign in using your new credentials.');
    } catch (err: any) {
      setError(err?.message || 'Unable to update your password. The recovery link may have expired; please request a new one.');
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

        {error ? <div className="auth-alert">{error}</div> : null}
        {success ? <div className="auth-alert success">{success}</div> : null}

        <div className="auth-button-row">
          <AuthButton type="submit" loading={loading} disabled={!isResetEnabled}>
            {loading ? 'Updating…' : 'Update password securely'}
          </AuthButton>
        </div>

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
