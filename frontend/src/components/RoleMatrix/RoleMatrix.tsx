import React from 'react';
import { colors } from '../../themes/designTokens';

type Permission = { id: number; key: string; label: string };
type Role = { id: number; name: string };

type RoleMatrixProps = {
  roles: Role[];
  permissions: Permission[];
  assignments: Record<number, number[]>; // roleId -> permissionIds
  onToggle: (roleId: number, permissionId: number) => void;
};

export const RoleMatrix: React.FC<RoleMatrixProps> = ({ roles, permissions, assignments, onToggle }) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: 8, textAlign: 'left' }}>Permission</th>
            {roles.map((r) => (
              <th key={r.id} style={{ padding: 8, minWidth: 140, textAlign: 'center' }}>{r.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p.id} style={{ borderTop: `1px solid var(--border)` }}>
              <td style={{ padding: 8 }}>{p.label}</td>
              {roles.map((r) => {
                const checked = (assignments[r.id] || []).includes(p.id);
                return (
                  <td key={r.id} style={{ padding: 8, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(r.id, p.id)}
                      aria-label={`${r.name}-${p.key}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RoleMatrix;
