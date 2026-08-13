import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthButton } from '../components/AuthButton';
import '../styles/auth.css';

export default function AccountLockedPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Access restricted"
      subtitle="This account has been temporarily restricted by security policy."
      footerNote="Contact your administrator or security team to request assistance."
    >
      <div className="auth-alert">
        Your account access is currently restricted. Please contact your system administrator or support for assistance.
      </div>

      <div className="auth-button-row">
        <AuthButton type="button" onClick={() => navigate('/login')}>
          Return to sign in
        </AuthButton>
      </div>
    </AuthShell>
  );
}
