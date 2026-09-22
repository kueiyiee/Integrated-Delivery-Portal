import React from 'react';

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-card" role="region" aria-label="Authentication panel">
      {children}
    </div>
  );
}
