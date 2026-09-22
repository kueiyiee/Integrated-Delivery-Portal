import React, { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

export function AuthBackground() {
  const { resolvedMode } = useTheme();
  const [background, setBackground] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadBackground = async () => {
      const module = resolvedMode === 'dark'
        ? await import('../../assets/backgrounds/auth-dark.webp')
        : await import('../../assets/backgrounds/auth-light.webp');
      if (mounted) setBackground(module.default);
    };

    const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void) => number };
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => { void loadBackground(); });
      return () => {
        mounted = false;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(() => { void loadBackground(); }, 300);
    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [resolvedMode]);

  const style: React.CSSProperties = {
    ...(background ? { backgroundImage: `url(${background})` } : {}),
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
