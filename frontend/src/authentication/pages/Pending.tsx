import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthButton } from '../components/AuthButton';
import '../styles/auth.css';

export default function Pending() {
  const navigate = useNavigate();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message ?? 'Your organization registration has been verified and is now awaiting administrative approval.';

  return (
    <AuthShell
      title="Awaiting approval"
      subtitle={message}
      footerNote="Once the system administrator approves your organization, you will receive access to your workspace."
    >
      <div className="auth-alert success">
        <strong>What happens next:</strong> Your email is verified, and the platform team is reviewing your organization setup. You will be notified once approval is complete.
      </div>

      <div style={{ display: 'grid', gap: '0.75rem', padding: '0.5rem 0' }}>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
          <span style={{ display: 'inline-flex', width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.76rem' }}>1</span>
          <div><strong>Verification passed.</strong> Your six-digit code was accepted and your work email is confirmed.</div>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
          <span style={{ display: 'inline-flex', width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.76rem' }}>2</span>
          <div><strong>Administrative review in progress.</strong> A system administrator is checking your company details and access request.</div>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
          <span style={{ display: 'inline-flex', width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.76rem' }}>3</span>
          <div><strong>Access activated.</strong> Once approved, you can sign in and continue directly to your dashboard.</div>
        </div>
      </div>

      <div className="auth-button-row">
        <AuthButton type="button" onClick={() => navigate('/login')}>
          Return to sign in
        </AuthButton>
      </div>
    </AuthShell>
  );
}
