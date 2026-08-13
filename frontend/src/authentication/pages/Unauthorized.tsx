import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { AuthButton } from '../components/AuthButton';
import { useAuth } from '../../hooks/useAuth';
import '../styles/auth.css';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  return (
    <AuthShell
      title="Access denied"
      subtitle="Your account does not have permission to view this section."
      footerNote="If you believe this is an error, contact your system administrator."
    >
      <div className="auth-alert">
        You don’t have permission to view this page. Please contact your administrator if you believe this is an error.
      </div>

      <div className="auth-verify-actions auth-verify-actions-single">
        <AuthButton type="button" onClick={() => navigate('/login')}>
          Sign in with another account
        </AuthButton>
        <AuthButton type="button" onClick={() => navigate(auth.user?.company_id ? '/client' : '/admin')}>
          Return to dashboard
        </AuthButton>
      </div>
    </AuthShell>
  );
}
