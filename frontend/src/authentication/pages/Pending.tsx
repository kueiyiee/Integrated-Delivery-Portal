import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthButton } from '../components/AuthButton';
import '../styles/auth.css';

export default function Pending() {
  const navigate = useNavigate();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message ?? 'Your organization registration has been received and is awaiting verification and approval.';

  return (
    <AuthShell
      title="Activate account"
      subtitle={message}
      footerNote="Once verified, your workspace will be ready for immediate access."
    >
      <div className="auth-alert success">
        <strong>Next steps:</strong> Check your inbox for the verification email and click the link to activate your account.
      </div>

      <div className="auth-button-row">
        <AuthButton type="button" onClick={() => navigate('/login')}>
          Return to sign in
        </AuthButton>
      </div>
    </AuthShell>
  );
}
