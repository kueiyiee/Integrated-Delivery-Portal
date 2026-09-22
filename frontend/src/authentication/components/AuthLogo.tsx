import React from 'react';

export function AuthLogo() {
  return (
    <div className="auth-logo">
      <div className="auth-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(245,245,250,0.94)" />
              <stop offset="100%" stopColor="rgba(175,180,190,0.7)" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
          <path d="M32 14 C22 14, 18 24, 18 34 C18 44, 24 50, 34 50 C44 50, 50 44, 50 34 C50 24, 42 14, 32 14 Z" fill="rgba(255,255,255,0.06)" />
          <path d="M20 34 C24 30, 28 26, 32 26 C36 26, 40 30, 44 34" stroke="url(#logoGlow)" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M26 22 L35 22" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" />
          <path d="M21 40 L27 34" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" />
          <path d="M43 40 L37 34" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="32" r="4" fill="rgba(255,255,255,0.95)" opacity="0.92" />
          <circle cx="23" cy="26" r="2" fill="rgba(255,255,255,0.92)" />
          <circle cx="41" cy="30" r="2" fill="rgba(255,255,255,0.92)" />
          <circle cx="33" cy="43" r="2" fill="rgba(255,255,255,0.92)" />
        </svg>
      </div>
      <div className="auth-logo-copy">
        <span className="brand-name">INTEGRATED DELIVERY PORTAL</span>
        <span className="brand-subtitle">Enterprise-grade authentication with audit-safe access controls.</span>
      </div>
    </div>
  );
}
