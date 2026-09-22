import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import '../styles/auth.css';
import { register as apiRegister, resolveAuthErrorMessage, PROFESSIONAL_ERROR_MESSAGES } from '../../services/auth';

export default function RegisterPage() {
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const companyError = submitted && !company.trim() ? 'Company name is required.' : null;
  const nameError = submitted && !name.trim() ? 'Full name is required.' : null;
  const emailError = submitted && !email.trim() ? 'Business email is required.' : null;
  const passwordError = submitted && !password.trim() ? 'Password is required.' : null;
  const confirmError = submitted && !confirm.trim()
    ? 'Please confirm your password.'
    : password && confirm && password !== confirm
    ? 'Passwords do not match.'
    : null;
  const isRegisterEnabled = Boolean(
    company.trim() &&
    name.trim() &&
    email.trim() &&
    password.trim() &&
    confirm.trim() &&
    password === confirm
  );

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setSuccess(null);
    if (!company.trim() || !name.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      setError(PROFESSIONAL_ERROR_MESSAGES.validationRequired);
      return;
    }
    if (password !== confirm) {
      setError('The passwords entered do not match. Please verify and try again.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiRegister({
        company_name: company,
        name,
        email,
        password,
        password_confirmation: confirm,
      });

      const submittedEmail = email.trim();
      const onboardingMessage = 'Your organization registration has been received. Please enter the six-digit verification code sent to your email to complete activation.';
      setSuccess(response.message || onboardingMessage);
      navigate(`/verify-email?email=${encodeURIComponent(submittedEmail)}`, {
        state: {
          email: submittedEmail,
          message: onboardingMessage,
        },
      });
    } catch (err: any) {
      setError(resolveAuthErrorMessage(err, 'register', 'We were unable to submit your registration. Please verify the provided information and try again later.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Request Organization Access"
      subtitle="Submit your organization details to begin the secure onboarding process."
      footerNote="Your request will be reviewed by Operations & Security."
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-form-grid-2">
          <AuthInput
            id="company"
            label="Company name"
            type="text"
            placeholder=""
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="organization"
          />
          <AuthInput
            id="name"
            label="Full name"
            type="text"
            placeholder=""
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
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
        />
        <div className="auth-form-grid-2">
          <AuthInput
            id="password"
            label="Password"
            type="password"
            placeholder="Create a secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            error={passwordError}
          />
          <AuthInput
            id="confirm"
            label="Confirm password"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            error={confirmError}
          />
        </div>

        {error ? <div className="auth-alert">{error}</div> : null}
        {success ? <div className="auth-alert success">{success}</div> : null}

        <div className="auth-button-row">
          <AuthButton type="submit" loading={loading} disabled={!isRegisterEnabled}>
            {loading ? 'Submitting request…' : 'Submit Access Request'}
          </AuthButton>
        </div>

        <div className="auth-form-meta">
          <span className="auth-form-meta-label">Already submitted a request?</span>
          <button type="button" className="auth-link secondary" onClick={() => navigate('/login')}>
            Return to Sign In
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
