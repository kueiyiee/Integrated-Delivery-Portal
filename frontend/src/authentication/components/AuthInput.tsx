import React from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  placeholder?: string;
  error?: string | null;
}

export function AuthInput({ id, label, type = 'text', icon, action, placeholder, error, ...rest }: AuthInputProps) {
  return (
    <label className="auth-input-group" htmlFor={id}>
      <span className="auth-input-label">{label}</span>
      <div className="auth-input-wrap">
        <input
          id={id}
          type={type}
          className={`auth-input-field ${icon ? 'with-icon' : ''} ${action ? 'with-action' : ''} ${error ? 'error' : ''}`}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        {icon ? <span className="auth-input-icon">{icon}</span> : null}
        {action ? <span className="auth-input-action">{action}</span> : null}
      </div>
      {error ? (
        <span className="auth-input-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
