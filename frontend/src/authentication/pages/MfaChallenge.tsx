import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import '../styles/auth.css';

export default function MfaChallengePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      navigate('/admin');
    } catch (err: any) {
      setError(err?.message || 'Unable to verify code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Two-step verification"
      subtitle="Enter the code from your authenticator app to continue."
      footerNote="Use the latest code from your authenticator app to complete sign in."
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthInput
          id="mfa-code"
          label="Authentication code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
        />

        {error ? <div className="auth-alert">{error}</div> : null}

        <div className="auth-button-row">
          <AuthButton type="submit" loading={loading}>
            Verify code
          </AuthButton>
        </div>

        <div className="auth-form-meta">
          <span className="auth-form-meta-label">Need to go back?</span>
          <button type="button" className="auth-link secondary" onClick={() => navigate('/login')}>
            Return to sign in
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
