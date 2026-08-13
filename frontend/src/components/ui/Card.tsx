import React from 'react';
import { colors, typography } from '../../themes/designTokens';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  interactive?: boolean;
};

export const Card: React.FC<CardProps> = ({ title, subtitle, children, style, interactive = false, className, ...rest }) => {
  return (
    <div
      className={`card${interactive ? ' interactive' : ''}${className ? ` ${className}` : ''}`}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--card-radius)',
        padding: 'var(--space-md)',
        boxShadow: 'var(--shadow)',
        fontFamily: typography.fontFamily,
        color: 'var(--text-primary)',
        ...style,
      }}
      {...rest}
    >
      {title && <div className="card-title" style={{ marginBottom: subtitle ? 'var(--space-sm)' : 'var(--space-md)' }}>{title}</div>}
      {subtitle && <div className="card-subtitle" style={{ marginBottom: 'var(--space-md)' }}>{subtitle}</div>}
      <div>{children}</div>
    </div>
  );
};

export default Card;
