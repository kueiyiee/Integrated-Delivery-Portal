import React from 'react';
import { colors, typography } from '../../themes/designTokens';

export const Sidebar: React.FC = ({ children }) => {
  return (
    <aside style={{ width: 'clamp(220px, 18vw, 280px)', maxWidth: '100%', background: 'var(--surface-2)', borderRight: '1px solid var(--border)', padding: 16, minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 20, fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', minWidth: 0 }}>Enterprise Delivery Platform</div>
      {children}
    </aside>
  );
};

export default Sidebar;
