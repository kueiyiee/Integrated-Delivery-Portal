import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../ui/ThemeToggle';

const navItems = [
  { label: 'Docs', to: '/docs' },
  { label: 'Getting started', to: '/docs/getting-started' },
  { label: 'API reference', to: '/docs/api' },
  { label: 'Security', to: '/docs/auth' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="header-shell" aria-label="Primary navigation">
      <div className="header-inner">
        <Link to="/" aria-label="Enterprise Delivery Platform home" className="header-brand">
          <div className="header-logo-mark" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0" stopColor="var(--accent)" />
                  <stop offset="1" stopColor="var(--accent-strong)" />
                </linearGradient>
              </defs>
              <rect x="2" y="6" width="14" height="8" rx="2" fill="url(#g1)" />
              <path d="M18 12h2v2h-2z" fill="currentColor" opacity="0.08" />
              <circle cx="7.5" cy="16.5" r="1.5" fill="#0f1724" />
              <circle cx="16.5" cy="16.5" r="1.5" fill="#0f1724" />
            </svg>
          </div>
          <div className="header-brand-copy">
            <div className="header-brand-title">Enterprise Delivery Platform</div>
            <div className="header-brand-subtitle">Logistics Intelligence · Secure Operations</div>
          </div>
        </Link>

        <nav className="header-nav" aria-label="Header navigation">
          {navItems.map((item) => (
            <Link key={item.label} to={item.to} className="header-link" onClick={() => setMobileOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <Link to="/register" className="btn btn-ghost header-action-button">
            Create account
          </Link>
          <Link to="/login" className="btn btn-primary header-action-button">
            Sign in
          </Link>
          <button aria-label="Open menu" onClick={() => setMobileOpen((v) => !v)} className="header-mobile-toggle">
            ☰
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="header-mobile-menu" role="menu">
          <div className="header-mobile-list">
            {navItems.map((item) => (
              <Link key={item.label} to={item.to} onClick={() => setMobileOpen(false)} className="header-mobile-link">
                {item.label}
              </Link>
            ))}
            <Link to="/register" className="btn btn-ghost header-mobile-button" onClick={() => setMobileOpen(false)}>
              Create account
            </Link>
            <Link to="/login" className="btn btn-primary header-mobile-button" onClick={() => setMobileOpen(false)}>
              Sign in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
