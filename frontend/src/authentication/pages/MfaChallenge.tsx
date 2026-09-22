import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import { verifyMfa, resolveAuthErrorMessage, PROFESSIONAL_ERROR_MESSAGES } from '../../services/auth';
import { AuthContext } from '../../contexts/AuthContext';
import { isPlatformAdminUser } from '../../utils/authAccess';
import '../styles/auth.css';

export default function MfaChallengePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const auth = React.useContext(AuthContext);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!code.trim()) {
      setError(PROFESSIONAL_ERROR_MESSAGES.validationRequired);
      setLoading(false);
      return;
    }

    try {
      const challengeToken = sessionStorage.getItem('mfa_challenge_token');
      if (!challengeToken) {
        throw new Error('Your MFA challenge has expired. Please sign in again.');
      }

      const result = await verifyMfa({ challenge_token: challengeToken, code: code.trim() });
      sessionStorage.removeItem('mfa_challenge_token');
      await auth.login(result.token, true, result.user);
      navigate(isPlatformAdminUser(result.user) ? '/admin' : '/client');
    } catch (err: any) {
      setError(resolveAuthErrorMessage(err, 'mfa', 'We could not verify your security code. Please check the code and try again.'));
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
          onChange={(e) => setCode(e.target.value.replace(/[^0-9A-Za-z-]/g, ''))}
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9A-Za-z-]+"
          maxLength={19}
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
