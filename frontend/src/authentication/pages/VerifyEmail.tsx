import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthButton } from '../components/AuthButton';
import '../styles/auth.css';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get('status') ?? 'success';
  const message = params.get('message') ?? 'Your email verification has been completed.';
  const isSuccess = status === 'success';
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [emailInput, setEmailInput] = React.useState('');

  const handleResend = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const resp = await (await import('../../services/auth')).resendVerificationEmail({ email: emailInput });
      setNotice(resp.message || 'If an account is associated with this email, a new verification link has been sent.');
    } catch (err: any) {
      setNotice(err?.message || 'We were unable to resend your verification link. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  const title = useMemo(() => {
    if (isSuccess) {
      return 'Email verified successfully';
    }

    return 'Verification issue';
  }, [isSuccess]);

  const description = useMemo(() => {
    if (isSuccess) {
      return 'Your account is active and ready for use. You can now sign in to access your company dashboard.';
    }

    return 'We were unable to complete your email verification. The link may have expired or is invalid. Please request a new verification link below.';
  }, [isSuccess]);

  const showResend = !isSuccess;

  return (
    <AuthShell
      title={title}
      subtitle={description}
      footerNote="If needed, request a new verification link to continue."
    >
      <div className={`auth-alert ${isSuccess ? 'success' : ''}`}>
        {message}
      </div>

      {showResend ? (
        <div className="auth-verify-resend">
          <label htmlFor="verify-email" className="auth-verify-label">
            Request a new verification link
          </label>
          <input
            id="verify-email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Business email"
            className="auth-resend-input"
          />
          <div className="auth-verify-actions">
            <AuthButton type="button" onClick={handleResend} loading={loading}>
              Resend verification
            </AuthButton>
            <AuthButton type="button" onClick={() => navigate('/login')}>
              Sign in to Dashboard
            </AuthButton>
          </div>
          {notice ? <div className="auth-alert auth-alert-notice">{notice}</div> : null}
        </div>
      ) : (
        <div className="auth-verify-resend auth-verify-actions-single">
          <AuthButton type="button" onClick={() => navigate('/login')}>
            Sign in to Dashboard
          </AuthButton>
        </div>
      )}
    </AuthShell>
  );
}
