import React from 'react';
import type { Delivery } from '../../services/client';

export const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export type DeliveryFormState = {
  tracking_number: string;
  external_reference: string;
  notes: string;
  scheduled_at: string;
  pickup_address: string;
  dropoff_address: string;
  package_type: string;
  package_description: string;
  package_quantity: string;
  package_weight: string;
  package_weight_unit: 'kg' | 'g';
  package_special_handling: string;
  status: string;
};

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: React.ReactNode }) {
  const showEyebrow = eyebrow && eyebrow !== title;

  return (
    <header className="dashboard-hero">
      <div>
        {showEyebrow ? <p className="dashboard-hero__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="dashboard-hero__actions">{actions}</div> : null}
    </header>
  );
}

export function StatCard({ label, value, delta, tone }: { label: string; value: string; delta?: string; tone?: 'positive' | 'neutral' | 'warning' }) {
  const toneClass = tone === 'positive' ? 'company-stat-card--positive' : tone === 'warning' ? 'company-stat-card--warning' : '';

  return (
    <div className={`company-stat-card ${toneClass}`}>
      <div className="company-stat-card__label">{label}</div>
      <div className="company-stat-card__value">{value}</div>
      {delta ? <div className="company-stat-card__delta">{delta}</div> : null}
    </div>
  );
}

export function Chip({ label, tone }: { label: string; tone?: 'success' | 'neutral' | 'warning' }) {
  return <span className={`company-chip ${tone ? `company-chip--${tone}` : ''}`}>{label}</span>;
}

export function renderDeliveryStatusBadge(delivery: Delivery) {
  return (
    <span className={`company-status ${delivery.status === 'delivered' ? 'company-status--live' : 'company-status--warning'}`}>
      {delivery.status}
    </span>
  );
}
