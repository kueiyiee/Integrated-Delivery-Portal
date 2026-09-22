import React, { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../../components/layout/Header';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname === '/reset-password' || location.pathname === '/verify-email' || location.pathname === '/pending-approval' || location.pathname === '/mfa-challenge';

  useEffect(() => {
    const previousBodyOverflowY = document.body.style.overflowY;
    const previousHtmlOverflowY = document.documentElement.style.overflowY;

    if (isAuthRoute) {
      document.body.style.overflowY = 'hidden';
      document.documentElement.style.overflowY = 'hidden';
    }

    return () => {
      document.body.style.overflowY = previousBodyOverflowY;
      document.documentElement.style.overflowY = previousHtmlOverflowY;
    };
  }, [isAuthRoute]);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-1)', overflow: isAuthRoute ? 'hidden' : 'visible' }}>
      {!isAuthRoute && <Header />}
      <main className={isAuthRoute ? 'auth-root' : undefined} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%', justifyContent: 'center', alignItems: 'center', overflow: isAuthRoute ? 'hidden' : 'visible' }}>
        {children}
      </main>
      {!isAuthRoute && (
        <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.95rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span>© 2026 Enterprise Delivery Platform</span>
            <span>Enterprise-ready delivery orchestration</span>
          </div>
        </footer>
      )}
    </div>
  );
}
