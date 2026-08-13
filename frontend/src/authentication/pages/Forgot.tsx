import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import '../styles/auth.css';
import { forgotPassword } from '../../services/auth';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const emailError = submitted && !email.trim() ? 'Email is required.' : null;
  const isForgotEnabled = Boolean(email.trim());

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setSuccess(null);
    if (!isForgotEnabled) {
      setError('Please enter your business email to continue.');
      return;
    }
    setLoading(true);
    try {
      const response = await forgotPassword({ email });
      setSuccess(response.message || 'If an account exists for this email, we have sent a password reset link to the registered address.');
    } catch (err: any) {
      setError(err?.message || 'We were unable to process your password recovery request. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Account recovery"
      subtitle="Enter your business email to receive a secure password reset link."
      footerNote="If your account exists, a reset link will be sent to your email."
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthInput
          id="email"
          label="Work email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          error={emailError}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16v16H4z" />
              <path d="M22 6l-10 7L2 6" />
            </svg>
          }
        />

        {error ? <div className="auth-alert">{error}</div> : null}
        {success ? <div className="auth-alert success">{success}</div> : null}

        <div className="auth-button-row">
          <AuthButton type="submit" loading={loading} disabled={!isForgotEnabled}>
            {loading ? 'Sending…' : 'Send recovery email'}
          </AuthButton>
        </div>

        <div className="auth-form-meta">
          <button type="button" className="auth-link secondary" onClick={() => navigate('/login')}>
            Return to sign in
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
