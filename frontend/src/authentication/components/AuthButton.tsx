import React from 'react';

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function AuthButton({ children, loading, disabled, ...rest }: AuthButtonProps) {
  return (
    <button className="auth-button" disabled={disabled || loading} {...rest}>
      <span>{children}</span>
      {loading ? <span className="auth-button-spinner" aria-hidden="true" /> : null}
    </button>
  );
}
