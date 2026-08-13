import React from 'react';
import { generateCompanyInitials, getCompanyAbbreviation } from '../../utils/initials';
import { getCompanyIdentityColor, getContrastColor } from '../../utils/companyIdentityColor';
import './CompanyIdentity.css';

export interface CompanyIdentityProps {
  /** Company name */
  name?: string | null;
  /** Optional explicit abbreviation (max 3 chars) */
  abbreviation?: string | null;
  /** Size variant: 'sm' (32px), 'md' (48px), 'lg' (64px), 'xl' (80px) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** CSS class name for additional styling */
  className?: string;
  /** Additional wrapper style */
  style?: React.CSSProperties;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Tooltip text */
  title?: string;
  /** Whether the avatar is clickable/interactive */
  clickable?: boolean;
}

function getSizePixels(size: 'sm' | 'md' | 'lg' | 'xl'): number {
  const sizes = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 80,
  };
  return sizes[size] || sizes.md;
}

function getFontSize(size: 'sm' | 'md' | 'lg' | 'xl'): string {
  const sizes = {
    sm: '0.75rem',
    md: '0.95rem',
    lg: '1.25rem',
    xl: '1.5rem',
  };
  return sizes[size] || sizes.md;
}

export default function CompanyIdentity({
  name,
  abbreviation,
  size = 'md',
  className,
  style,
  ariaLabel,
  title,
  clickable = false,
}: CompanyIdentityProps) {
  const initials = getCompanyAbbreviation(name, abbreviation);
  const backgroundColor = getCompanyIdentityColor(name);
  const textColor = getContrastColor(backgroundColor);
  const sizePixels = getSizePixels(size);
  const fontSize = getFontSize(size);

  const wrapperStyle: React.CSSProperties = {
    width: sizePixels,
    height: sizePixels,
    minWidth: sizePixels,
    minHeight: sizePixels,
    backgroundColor,
    color: textColor,
    ...style,
  };

  const initalsStyle: React.CSSProperties = {
    fontSize,
  };

  return (
    <div
      className={`company-identity ${size} ${clickable ? 'clickable' : ''} ${className || ''}`}
      style={wrapperStyle}
      title={title || name || undefined}
      aria-label={ariaLabel || `${name} company identity`}
      role="img"
    >
      <span className="company-identity-initials" style={initalsStyle}>
        {initials}
      </span>
      <span className="company-identity-ring" aria-hidden="true" />
    </div>
  );
}
