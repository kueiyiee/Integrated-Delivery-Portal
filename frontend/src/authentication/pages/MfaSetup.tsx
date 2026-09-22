import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import { confirmMfa, setupMfa, resolveAuthErrorMessage, PROFESSIONAL_MFA_MESSAGES } from '../../services/auth';
import { useAuth } from '../../hooks/useAuth';
import QRCode from 'qrcode';
import '../styles/auth.css';

export default function MfaSetupPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setupMfa()
      .then(async (result) => {
        const qr = await QRCode.toDataURL(result.otpauth, { width: 240, margin: 1, errorCorrectionLevel: 'M' });
        if (!mounted) return;
        setSecret(result.secret);
        setQrDataUrl(qr);
      })
      .catch((err) => mounted && setError(resolveAuthErrorMessage(err, 'mfa', 'Unable to start MFA setup. Please sign in again and retry.')))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (!code.trim()) {
      setError(PROFESSIONAL_MFA_MESSAGES.codeEmpty);
      setSaving(false);
      return;
    }

    try {
      const result = await confirmMfa({ secret, code: code.trim() });
      setRecoveryCodes(result.recovery_codes ?? []);
      if (result.token) {
        await auth.login(result.token, true, result.user ?? null);
      }
    } catch (err) {
      setError(resolveAuthErrorMessage(err, 'mfa', PROFESSIONAL_MFA_MESSAGES.codeEmpty));
    } finally {
      setSaving(false);
    }
  };

  if (recoveryCodes.length > 0) {
    return (
      <AuthShell title="MFA is ready" subtitle="Save these recovery codes in a secure password manager. Each code works once.">
        <div className="auth-form">
          <div className="auth-alert" role="status">These codes are shown only during setup.</div>
          <div style={{ display: 'grid', gap: '0.55rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.75rem', fontFamily: 'monospace' }}>
            {recoveryCodes.map((recoveryCode) => <div key={recoveryCode} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{recoveryCode}</div>)}
          </div>
          <AuthButton type="button" onClick={() => navigate('/admin')}>Continue to administration</AuthButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set up two-step verification" subtitle="Use an authenticator app to protect your administrator account.">
      <form className="auth-form" onSubmit={submit} noValidate>
        {loading ? <div className="auth-form-meta-label">Preparing secure setup…</div> : null}
        {!loading && qrDataUrl ? (
          <>
            <div style={{ display: 'grid', justifyItems: 'center', gap: '0.75rem', width: '100%' }}>
              <img src={qrDataUrl} alt="MFA setup QR code" width="240" height="240" style={{ borderRadius: '0.75rem', width: 'min(100%, 240px)', height: 'auto', display: 'block' }} />
              <code style={{ wordBreak: 'break-all', overflowWrap: 'anywhere', fontSize: '0.8rem' }}>{secret}</code>
            </div>
            <p className="auth-form-meta-label">Scan the QR code, then enter the six-digit code from your authenticator app.</p>
            <AuthInput id="mfa-setup-code" label="Authenticator code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required />
            {error ? <div className="auth-alert" role="alert">{error}</div> : null}
            <AuthButton type="submit" loading={saving} disabled={code.trim().length !== 6}>Enable MFA</AuthButton>
          </>
        ) : null}
      </form>
    </AuthShell>
  );
}
