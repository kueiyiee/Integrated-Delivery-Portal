import React, { useEffect, useState } from 'react';
import { typography } from '../../themes/designTokens';

type Column<T> = { key: string; label: string; render?: (row: T) => React.ReactNode };

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  className?: string;
};

export function Table<T extends Record<string, any>>({ columns, data, className }: TableProps<T>) {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 720);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isNarrow) {
    return (
      <div className={`data-list-wrapper${className ? ` ${className}` : ''}`}>
        {data.map((row, i) => (
          <div key={i} className="data-list-item">
            {columns.map((c) => (
              <div key={c.key} className="data-list-row">
                <div className="data-list-label">{c.label}</div>
                <div className="data-list-value">{c.render ? c.render(row) : (row as any)[c.key]}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`data-table-wrapper${className ? ` ${className}` : ''}`}>
      <table className="data-table" style={{ fontFamily: typography.fontFamily }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.92rem' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-label={c.label}
                  style={{ padding: '8px 12px', fontSize: '0.94rem' }}
                >
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
