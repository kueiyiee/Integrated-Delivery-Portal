import React from 'react';
import { colors, typography } from '../../themes/designTokens';

export const Topbar: React.FC = () => {
  return (
    <header style={{ height: 64, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--text-muted)' }}>Search…</div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🔔</button>
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>👤</button>
      </div>
    </header>
  );
};

export default Topbar;
