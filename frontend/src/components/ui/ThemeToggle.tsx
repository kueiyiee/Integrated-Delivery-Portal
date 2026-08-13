import React from 'react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { mode, setThemeMode } = useTheme();

  const isLight = mode === 'light';

  const handleToggle = () => {
    setThemeMode(isLight ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      title={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 999,
        border: '1px solid var(--border)',
        background: 'linear-gradient(135deg, var(--surface-2), var(--surface-3))',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
        padding: 0,
      }}
      onMouseEnter={(event) => {
        (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(event) => {
        (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px)';
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 999,
          background: 'var(--surface-3)',
          color: 'var(--accent)',
          boxShadow: 'inset 0 0 0 1px var(--border)',
          fontSize: '0.9rem',
          flexShrink: 0,
        }}
      >
        {isLight ? '☀️' : '🌙'}
      </span>
    </button>
  );
}
