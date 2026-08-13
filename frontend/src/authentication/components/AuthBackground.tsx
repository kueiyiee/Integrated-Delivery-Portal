import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import authLight from '../../assets/backgrounds/auth-light.webp';
import authDark from '../../assets/backgrounds/auth-dark.webp';

export function AuthBackground() {
  const { resolvedMode } = useTheme();
  const background = resolvedMode === 'dark' ? authDark : authLight;

  const style: React.CSSProperties = {
    backgroundImage: `url(${background})`,
    backgroundPosition: 'center center',
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    transition: 'opacity 240ms ease, background-image 240ms ease',
  };

  return (
    <div className="auth-background" aria-hidden="true" style={style}>
      <div className="auth-background-overlay" />
      <div className="auth-background-fade" />
    </div>
  );
}
