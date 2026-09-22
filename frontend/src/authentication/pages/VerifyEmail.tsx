import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthButton } from '../components/AuthButton';
import { OtpInput } from '../components/OtpInput';
import { resendVerificationEmail, verifyEmailOtp } from '../../services/auth';
import '../styles/auth.css';

function maskEmail(value: string): string {
  if (!value || !value.includes('@')) {
    return '••••••@mail.com';
  }

  const [localPart, domain] = value.split('@');
  if (!localPart || !domain) {
    return '••••••@mail.com';
  }

  const visibleLocal = localPart.length > 1 ? localPart.slice(0, 1) : localPart.slice(0, 1);
  const masked = `${visibleLocal}${'•'.repeat(Math.max(4, Math.min(8, localPart.length - 1)))}`;
  return `${masked}@${domain}`;
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? params.get('email') ?? '';
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [otpInput, setOtpInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(45);
  const submitLock = useRef(false);
  const autoResendEmail = useRef<string | null>(null);

  useEffect(() => {
    if (initialEmail && !emailInput) {
      setEmailInput(initialEmail);
    }
  }, [initialEmail, emailInput]);

  useEffect(() => {
    const email = initialEmail.trim();

    if (!email || autoResendEmail.current === email) {
      return;
    }

    autoResendEmail.current = email;
    let mounted = true;

    setLoading(true);
    setNotice(null);

    resendVerificationEmail({ email })
      .then((response) => {
        if (!mounted) return;
        setNotice(response.message || 'A new verification code has been sent to your email address.');
        setResendSeconds(45);
        setOtpInput('');
      })
      .catch((err: any) => {
        if (!mounted) return;
        const status = err?.status ?? err?.response?.status;
        const message = String(err?.responseData?.message || err?.response?.data?.message || err?.message || '');

        if (status === 429 || message.toLowerCase().includes('too many')) {
          setNotice('Too many verification requests. Please wait before requesting another code.');
        } else if (status === 422) {
          setNotice(message || 'Please check the email address and try again.');
        } else {
          setNotice('We were unable to send your verification code. Please try again shortly.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [initialEmail]);

  useEffect(() => {
    if (!verified && resendSeconds > 0) {
      const timer = window.setTimeout(() => setResendSeconds((value) => value - 1), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [verified, resendSeconds]);

  const handleResend = async () => {
    if (!emailInput.trim()) {
      setNotice('Please enter the email address associated with your account.');
      return;
    }

    if (resendSeconds > 0) {
      setNotice(`Resend available in ${resendSeconds} seconds.`);
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const resp = await resendVerificationEmail({ email: emailInput });
      setNotice(resp.message || 'If an account is associated with this email, a new verification code has been sent.');
      setResendSeconds(45);
      setOtpInput('');
    } catch (err: any) {
      setNotice(err?.message || 'We were unable to resend your verification code. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (nextOtp?: string) => {
    const otpToVerify = (nextOtp ?? otpInput).trim();

    if (!emailInput.trim() || !/^[0-9]{6}$/.test(otpToVerify)) {
      setNotice('Enter the 6-digit verification code before continuing.');
      return;
    }

    if (loading || submitLock.current) {
      return;
    }

    submitLock.current = true;
    setLoading(true);
    setNotice(null);

    try {
      const resp = await verifyEmailOtp({ email: emailInput, otp: otpToVerify });

      if (resp.success) {
        setVerified(true);
        setNotice('Email verified successfully. Your account is now ready to use.');
        setTimeout(() => {
          navigate('/login', {
            state: {
              verifiedEmail: emailInput,
              message: 'Your email has been verified successfully. You can now sign in.',
            },
          });
        }, 700);
        return;
      }

      setNotice(resp.message || 'Invalid verification code. Please check your email and try again.');
      setOtpInput('');
    } catch (err: any) {
      const message = String(err?.response?.data?.message || err?.message || '');
      const lower = message.toLowerCase();

      if (lower.includes('expired')) {
        setNotice('Verification code expired. Please request a new code.');
      } else if (lower.includes('too many') || lower.includes('rate limit')) {
        setNotice('Too many verification attempts. Please request a new code later.');
      } else if (lower.includes('invalid') || lower.includes('incorrect')) {
        setNotice('Invalid verification code. Please check your email and try again.');
      } else {
        setNotice('Unable to verify your email right now. Please try again.');
      }

      setOtpInput('');
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  };

  const title = useMemo(() => (verified ? 'Email verified successfully' : 'Verify your email'), [verified]);
  const description = useMemo(() => (verified ? 'Your email address has been verified successfully. You can now sign in to the dashboard.' : 'We\'ve sent a verification code to your registered email address.'), [verified]);

  return (
    <AuthShell
      title={title}
      subtitle={description}
      footerNote="For security, codes expire quickly and are validated server-side."
    >
      {!verified ? (
        <div className="auth-verify-resend">
          <div className="auth-verify-email-row">
            <label htmlFor="verify-email" className="auth-verify-label">
              Email address
            </label>
            <input
              id="verify-email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value.trim())}
              placeholder="name@company.com"
              className="auth-resend-input"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="auth-verify-message">
            <span>We\'ve sent a 6-digit verification code to</span>
            <strong>{maskEmail(emailInput || 'k••••••@example.com')}</strong>
          </div>

          <div className="auth-otp-wrap">
            <OtpInput
              value={otpInput}
              onChange={setOtpInput}
              onComplete={(value) => {
                if (!loading && !submitLock.current) {
                  void handleVerifyOtp(value);
                }
              }}
              disabled={loading}
              autoFocus
              purpose="email_verification"
              ariaLabel="Email verification code"
            />
          </div>

          <div className="auth-button-row compact">
            <AuthButton type="button" onClick={() => void handleVerifyOtp()} loading={loading} disabled={loading || otpInput.length !== 6}>
              VERIFY EMAIL
            </AuthButton>
          </div>

          <div className="auth-verify-footer">
            <button type="button" className="auth-link secondary" onClick={() => navigate('/login')}>
              RETURN TO SIGN IN
            </button>
            <span>Didn\'t receive the code?</span>
            <button type="button" className="auth-link secondary" onClick={() => void handleResend()} disabled={loading || resendSeconds > 0}>
              {resendSeconds > 0 ? `Resend available in 00:${String(resendSeconds).padStart(2, '0')}` : 'RESEND CODE'}
            </button>
          </div>

          {notice ? <div className="auth-alert auth-alert-notice">{notice}</div> : null}
        </div>
      ) : (
        <div className="auth-verify-resend auth-verify-actions-single">
          <div className="auth-alert success">{notice ?? 'Email verified successfully.'}</div>
          <AuthButton type="button" onClick={() => navigate('/login')}>
            SIGN IN TO DASHBOARD
          </AuthButton>
        </div>
      )}
    </AuthShell>
  );
}
