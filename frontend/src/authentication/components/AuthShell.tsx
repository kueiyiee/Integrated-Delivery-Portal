import React from 'react';
import { AuthLayout } from './AuthLayout';
import '../styles/auth.css';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerNote?: string;
}

export function AuthShell({ title, subtitle, children, footerNote }: AuthShellProps) {
  return (
    <AuthLayout title={title} subtitle={subtitle} footerNote={footerNote}>
      {children}
    </AuthLayout>
  );
}
