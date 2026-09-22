import React from 'react';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div style={{ minHeight: '100dvh', width: '100%', display: 'grid', placeItems: 'center', padding: '1.25rem', background: 'linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%)', color: 'var(--text-primary)' }}>
      <div style={{ width: '100%', maxWidth: 520, display: 'grid', gap: '1rem', alignItems: 'center' }}>
        <section style={{ borderRadius: 32, background: 'var(--surface-elevated)', border: '1px solid var(--border)', padding: '2rem', display: 'grid', gap: '1rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.95rem', borderRadius: 999, background: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb), 0.2)', width: 'fit-content' }}>
            <span style={{ fontWeight: 700 }}>Welcome</span>
          </div>

          <div>
            <h1 style={{ margin: '0 0 0.6rem', fontSize: 'clamp(2rem, 4vw, 2.6rem)', lineHeight: 1.08 }}>Access your portal</h1>
            <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--text-muted)', fontSize: '1rem' }}>
              Continue to your workspace with a secure sign-in or create an account to get started.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.95rem' }}>
            <Link to="/login" style={{ padding: '1rem 1.15rem', borderRadius: 999, background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', color: 'white', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link to="/register" style={{ padding: '1rem 1.15rem', borderRadius: 999, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
              Create account
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
