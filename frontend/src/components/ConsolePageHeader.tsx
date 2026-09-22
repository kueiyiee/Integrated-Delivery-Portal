import React from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface ConsolePageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function ConsolePageHeader({ title, subtitle, breadcrumbs = [], actions }: ConsolePageHeaderProps) {
  return (
    <section style={{ padding: '1.25rem 1.35rem', borderRadius: 24, background: 'var(--surface-elevated)', border: '1px solid var(--surface-elevated-strong)', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          {breadcrumbs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.55rem', color: 'var(--accent)', fontSize: '0.86rem' }}>
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={item.label}>
                  {index > 0 && <span>/</span>}
                  {item.to ? <Link to={item.to} style={{ color: 'inherit', textDecoration: 'none' }}>{item.label}</Link> : <span>{item.label}</span>}
                </React.Fragment>
              ))}
            </div>
          )}
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>{title}</h2>
          {subtitle && <p style={{ margin: '0.45rem 0 0', color: 'var(--text-muted)', maxWidth: 760, lineHeight: 1.65 }}>{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </section>
  );
}
