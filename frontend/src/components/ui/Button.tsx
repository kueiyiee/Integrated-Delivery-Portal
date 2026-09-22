import React, { useState } from 'react';
import { colors, typography } from '../../themes/designTokens';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', loading = false, children, style, disabled, ...rest }) => {
  const classNames = ['btn'];
  if (variant === 'primary') classNames.push('btn-primary');
  if (variant === 'secondary') classNames.push('btn-secondary');
  if (variant === 'ghost') classNames.push('btn-ghost');
  if (size === 'sm') classNames.push('btn-sm');
  if (size === 'lg') classNames.push('btn-lg');

  return (
    <button
      className={classNames.join(' ')}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <span className="btn-spinner" style={{ marginRight: 10 }} />
      )}
      {children}
    </button>
  );
};

export default Button;
