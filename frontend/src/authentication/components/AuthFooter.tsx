import React from 'react';

export function AuthFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="auth-footer">
      <span>© {currentYear} INTEGRATED DELIVERY PORTAL · All rights reserved.</span>
    </div>
  );
}
