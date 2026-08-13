import React from 'react';
import { AuthBackground } from './AuthBackground';
import { AuthFooter } from './AuthFooter';
import '../styles/auth.css';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerNote?: string;
}

export function AuthLayout({ title, subtitle, children, footerNote }: AuthLayoutProps) {
  return (
    <div className="auth-layout-root">
      <AuthBackground />
      <div className="auth-layout-shell" role="main">
        <div className="auth-minimal-panel">
          <div className="auth-card-header">
            <div className="auth-card-brand">
              <p className="auth-card-brand-title">INTEGRATED DELIVERY PORTAL</p>
              <p className="auth-card-brand-subtitle">Enterprise delivery management platform</p>
            </div>
            <div className="auth-card-copy">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="auth-card-form">{children}</div>

          {footerNote ? <p className="auth-card-footnote">{footerNote}</p> : null}
        </div>
        <AuthFooter />
      </div>
    </div>
  );
}
