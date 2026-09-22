import React, { useEffect, useState } from 'react';
import { fetchCompany, updateCompany, updateCompanyPassword, type Company } from '../../services/client';
import { confirmMfa, setupMfa, resolveAuthErrorMessage, PROFESSIONAL_MFA_MESSAGES } from '../../services/auth';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/ui/ToastProvider';
import { generateCompanyInitials } from '../../utils/initials';
import QRCode from 'qrcode';

const ABOUT_MAX_LENGTH = 2000;
const ADDRESS_MAX_LENGTH = 500;
const PHONE_PATTERN = /^[0-9]{7,20}$/;
const ADDRESS_PATTERN = /^[A-Za-z0-9\s,\.\-#/']+$/;

type FieldErrors = Record<string, string>;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function CompanySettingsPage() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});;

  const [website, setWebsite] = useState('');

  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
  const [mfaSaving, setMfaSaving] = useState(false);
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);

  // Get real MFA status from auth context (user.mfa_enabled from backend)
  const mfaEnabled = Boolean(user?.mfa_enabled);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchCompany()
      .then((data) => {
        if (!mounted) return;
        setCompany(data);
        setWebsite(data.social_links?.website ?? '');
      })
      .catch((err) => {
        console.error('Failed to load organization profile.');
        if (mounted) {
          const message = 'Unable to load organization profile right now. Please check your internet connection and refresh the page to try again.';
          setError(message);
          toast.error({ title: 'Organization profile unavailable', description: message });
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);



  function handleChange<K extends keyof Company>(key: K, value: Company[K]) {
    setCompany((c) => (c ? { ...c, [key]: value } : c));
  }

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (!company?.name || !company.name.trim()) {
      errors.name = 'Company name is required.';
    }

    const email = company?.business_email?.trim() ?? '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.business_email = 'Please enter a valid email address.';
    }

    const phone = company?.phone?.trim() ?? '';
    if (phone && !PHONE_PATTERN.test(phone)) {
      errors.phone = 'Phone number must contain digits only (7-20 digits).';
    }

    const address = company?.address?.trim() ?? '';
    if (address) {
      if (address.length > ADDRESS_MAX_LENGTH) {
        errors.address = `Address must be ${ADDRESS_MAX_LENGTH} characters or fewer.`;
      } else if (!ADDRESS_PATTERN.test(address)) {
        errors.address = "Address may only contain letters, numbers, spaces, and , . - # / '";
      }
    }

    const about = company?.about ?? '';
    if (about.length > ABOUT_MAX_LENGTH) {
      errors.about = `About Company must be ${ABOUT_MAX_LENGTH} characters or fewer.`;
    }

    const websiteValue = website.trim();
    if (websiteValue && !isValidUrl(websiteValue)) {
      errors.website = 'Please enter a valid website URL (e.g. https://example.com).';
    }

    return errors;
  }

  async function handleSave() {
    if (!company) return;

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const message = 'Please fix the highlighted fields before saving.';
      setError(message);
      toast.warning({ title: 'Validation Required', description: message });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateCompany({
        name: company.name,
        business_email: company.business_email,
        phone: company.phone,
        address: company.address,
        about: company.about,
        social_links: website.trim() ? { website: website.trim() } : undefined,
        primary_contact: company.primary_contact,
      });

      setCompany(updated);
      setWebsite(updated.social_links?.website ?? '');
      toast.success({
        title: 'Changes Saved',
        description: 'Your organization profile has been updated successfully.',
      });
    } catch (err: any) {
      console.error('Failed to update company.');
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        const mapped: FieldErrors = {};
        Object.entries(serverErrors as Record<string, string[]>).forEach(([key, messages]) => {
          mapped[key] = Array.isArray(messages) ? messages[0] : String(messages);
        });
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
      }
      const message = err?.response?.data?.message || 'Save failed. Please check the form and try again.';
      setError(message);
      toast.error({ title: 'Unable to Save Changes', description: message });
    } finally {
      setSaving(false);
    }
  }



  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordForm.password !== passwordForm.password_confirmation) {
      const message = 'New password and confirmation do not match.';
      setPasswordError(message);
      toast.warning({ title: 'Validation Required', description: message });
      return;
    }

    setPasswordSaving(true);
    try {
      const result = await updateCompanyPassword(passwordForm);
      const successMessage = result.message || 'Password updated successfully.';
      setPasswordSuccess(successMessage);
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
      toast.success({ title: 'Password Updated', description: successMessage });
    } catch (err: any) {
      const message = resolveAuthErrorMessage(err, 'verification', 'Unable to update password. Check your current password and try again.');
      setPasswordError(message);
      toast.error({ title: 'Unable to Update Password', description: message });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleSetupMfa() {
    setMfaMessage(null);
    setMfaSaving(true);
    try {
      const result = await setupMfa();
      const qr = await QRCode.toDataURL(result.otpauth, { width: 220, margin: 1, errorCorrectionLevel: 'M' });
      setMfaSetup({ secret: result.secret, qr });
    } catch (err) {
      setMfaMessage(resolveAuthErrorMessage(err, 'mfa', 'Unable to start MFA setup. Please try again.'));
    } finally {
      setMfaSaving(false);
    }
  }

  async function handleConfirmMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaSetup) return;
    setMfaSaving(true);
    setMfaMessage(null);
    try {
      await confirmMfa({ secret: mfaSetup.secret, code: mfaCode });
      setMfaRecoveryCodes([]);
      setMfaSetup(null);
      setMfaCode('');
      // Refresh user to get the updated mfa_enabled status from backend
      if (refreshUser) {
        await refreshUser();
      }
      setMfaMessage(PROFESSIONAL_MFA_MESSAGES.enabled);
    } catch (err) {
      setMfaMessage(resolveAuthErrorMessage(err, 'mfa', 'That code was not accepted. Check your authenticator and try again.'));
    } finally {
      setMfaSaving(false);
    }
  }

  const aboutLength = company?.about?.length ?? 0;

  return (
    <div>
      <header className="dashboard-hero">
        <div>
          <p className="dashboard-hero__eyebrow">Organization</p>
          <h1>Organization Settings</h1>
          <p>Manage your organization profile, business information, and account security.</p>
        </div>
        <div className="dashboard-hero__actions">
          <Link className="btn btn-secondary" to="/client">Back</Link>
        </div>
      </header>

      <section className="company-card">
        {loading ? (
          <div className="company-card__placeholder">Loading organization profile…</div>
        ) : company ? (
          <form
            onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
            className="company-profile-form"
            noValidate
          >
            <div className="company-profile-form__identity form-field">
              <span className="field-label">Company Identity</span>
              <div style={{ marginTop: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                  {generateCompanyInitials(company.name)} • {company.name}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Your company identity is automatically generated from your registered company name. 
                  Update your company name above to change the displayed initials.
                </p>
              </div>
            </div>

            <div className="company-profile-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="company-name">Company name</label>
                <input
                  id="company-name"
                  className="input-base"
                  value={company.name ?? ''}
                  onChange={(e) => { handleChange('name', e.target.value); clearFieldError('name'); }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  required
                />
                {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="company-email">Business email</label>
                <input
                  id="company-email"
                  type="email"
                  className="input-base"
                  value={company.business_email ?? ''}
                  onChange={(e) => { handleChange('business_email', e.target.value); clearFieldError('business_email'); }}
                  aria-invalid={Boolean(fieldErrors.business_email)}
                />
                {fieldErrors.business_email && <div className="field-error">{fieldErrors.business_email}</div>}
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="company-website">Website</label>
                <input
                  id="company-website"
                  type="url"
                  className="input-base"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => { setWebsite(e.target.value); clearFieldError('website'); }}
                  aria-invalid={Boolean(fieldErrors.website)}
                />
                {fieldErrors.website && <div className="field-error">{fieldErrors.website}</div>}
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="company-phone">Phone number</label>
                <input
                  id="company-phone"
                  className="input-base"
                  inputMode="numeric"
                  placeholder="e.g. 15551234567"
                  value={company.phone ?? ''}
                  onChange={(e) => { handleChange('phone', e.target.value); clearFieldError('phone'); }}
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
                {fieldErrors.phone ? (
                  <div className="field-error">{fieldErrors.phone}</div>
                ) : (
                  <div className="field-hint">Digits only, 7-20 numbers.</div>
                )}
              </div>

              <div className="form-field company-profile-grid__wide">
                <label className="field-label" htmlFor="company-address">Business address</label>
                <textarea
                  id="company-address"
                  className="input-base"
                  rows={2}
                  value={company.address ?? ''}
                  onChange={(e) => { handleChange('address', e.target.value); clearFieldError('address'); }}
                  aria-invalid={Boolean(fieldErrors.address)}
                />
                {fieldErrors.address && <div className="field-error">{fieldErrors.address}</div>}
              </div>

              <div className="form-field company-profile-grid__wide">
                <label className="field-label" htmlFor="company-about">About the company</label>
                <textarea
                  id="company-about"
                  className="input-base"
                  rows={4}
                  maxLength={ABOUT_MAX_LENGTH}
                  placeholder="Tell customers and partners about your business…"
                  value={company.about ?? ''}
                  onChange={(e) => { handleChange('about', e.target.value); clearFieldError('about'); }}
                  aria-invalid={Boolean(fieldErrors.about)}
                />
                <div className="field-hint" style={{ textAlign: 'right' }}>{aboutLength}/{ABOUT_MAX_LENGTH}</div>
                {fieldErrors.about && <div className="field-error">{fieldErrors.about}</div>}
              </div>
            </div>

            {error && (
              <div className="company-alert company-alert--danger" role="alert">
                <strong>Organization profile unavailable</strong>
                <div style={{ marginTop: '0.35rem' }}>{error}</div>
              </div>
            )}

            <div className="company-profile-form__actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              <Link className="btn btn-secondary" to="/client">Cancel</Link>
            </div>
          </form>
        ) : (
          <div className="company-card__placeholder">Organization profile is not available right now.</div>
        )}
      </section>

      <section className="company-card" style={{ marginTop: '1.25rem' }}>
        <h2 style={{ marginTop: 0 }}>Change password</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '-0.4rem' }}>Update the password used to sign in to your account.</p>
        <form onSubmit={handlePasswordSave} className="company-profile-form">
          <div className="company-profile-grid company-profile-grid--narrow">
            <div className="form-field">
              <label className="field-label" htmlFor="current-password">Current password</label>
              <input
                id="current-password"
                type="password"
                className="input-base"
                autoComplete="current-password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                className="input-base"
                autoComplete="new-password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                className="input-base"
                autoComplete="new-password"
                value={passwordForm.password_confirmation}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
                required
                minLength={8}
              />
            </div>
          </div>

          {passwordError && <div className="company-alert company-alert--danger">{passwordError}</div>}
          {passwordSuccess && <div className="company-alert company-alert--success">{passwordSuccess}</div>}

          <div className="company-profile-form__actions">
            <button className="btn btn-primary" type="submit" disabled={passwordSaving}>
              {passwordSaving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>

      <section className="company-card" style={{ marginTop: '1.25rem' }}>
        <h2 style={{ marginTop: 0 }}>Two-step verification</h2>
        <p style={{ color: 'var(--text-muted)' }}>{mfaEnabled ? 'MFA is enabled for your account.' : 'MFA is optional. Enable it to add authenticator-based protection.'}</p>
        {!mfaEnabled && !mfaSetup && <button className="btn btn-primary" type="button" onClick={() => void handleSetupMfa()} disabled={mfaSaving}>{mfaSaving ? 'Preparing…' : 'Set up MFA'}</button>}
        {mfaSetup && (
          <form onSubmit={handleConfirmMfa} className="company-profile-form mfa-setup-card">
            <div className="mfa-setup-qr-wrap">
              <img src={mfaSetup.qr} alt="MFA setup QR code" className="mfa-setup-qr" width="220" height="220" />
            </div>
            <p className="field-label">Manual setup key: <code>{mfaSetup.secret}</code></p>
            <input className="input-base" value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter six-digit code" required />
            <button className="btn btn-primary" type="submit" disabled={mfaSaving || mfaCode.length !== 6}>{mfaSaving ? 'Enabling…' : 'Enable MFA'}</button>
          </form>
        )}
        {mfaRecoveryCodes.length > 0 && (
          <div className="company-alert company-alert--success" role="status">
            <strong>Recovery codes</strong>
            <ul className="mfa-recovery-list">
              {mfaRecoveryCodes.map((code) => (
                <li key={code} className="mfa-recovery-item">{code}</li>
              ))}
            </ul>
            <div>Save them securely; they are shown once.</div>
          </div>
        )}
        {mfaMessage && <div className={`company-alert company-alert--${mfaMessage.toLowerCase().includes('not accepted') || mfaMessage.toLowerCase().includes('unable') ? 'danger' : 'success'}`} role="alert">{mfaMessage}</div>}
      </section>
    </div>
  );
}
