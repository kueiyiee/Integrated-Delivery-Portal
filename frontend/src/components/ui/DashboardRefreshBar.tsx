import React from 'react';

interface DashboardRefreshBarProps {
  loading?: boolean;
  error?: string | null;
  statusDescription?: string | null;
  lastUpdated?: string | null;
  statusLabel?: string;
  onRefresh: () => void;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: (enabled: boolean) => void;
}

export function DashboardRefreshBar({
  loading = false,
  error = null,
  statusDescription = null,
  lastUpdated = null,
  statusLabel = 'Live data',
  onRefresh,
  autoRefreshEnabled,
  onToggleAutoRefresh,
}: DashboardRefreshBarProps) {
  const formattedTime = lastUpdated ? new Date(lastUpdated).toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Not refreshed yet';
  const status = error ? 'Offline snapshot' : loading ? 'Refreshing' : statusLabel;
  const description = error ? statusDescription ?? 'Unable to refresh data from the analytics service.' : statusDescription;

  return (
    <section style={{ padding: '1rem 1.15rem', borderRadius: 22, background: 'var(--surface-2)', border: '1px solid rgba(var(--accent-rgb), 0.2)', boxShadow: 'var(--shadow)', display: 'grid', gap: '0.85rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: '1 1 0%' }}>
          <div style={{ fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.35rem' }}>Global system refresh</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            <span style={{ minWidth: 0 }}>{status}</span>
            <span style={{ opacity: 0.72, minWidth: 0 }}>Last updated: {formattedTime}</span>
            {error && <span style={{ color: 'var(--danger-border)', minWidth: 0 }}>{error}</span>}
          </div>
          {description ? <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.4rem', lineHeight: 1.6 }}>{description}</div> : null}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem', minWidth: 0, justifyContent: 'flex-end' }}>
          {typeof onToggleAutoRefresh === 'function' && (
            <button
              type="button"
              onClick={() => onToggleAutoRefresh(!Boolean(autoRefreshEnabled))}
              style={{
                borderRadius: 999,
                border: '1px solid rgba(var(--accent-rgb), 0.28)',
                background: autoRefreshEnabled ? 'var(--accent-soft)' : 'transparent',
                color: autoRefreshEnabled ? 'var(--accent)' : 'var(--text-muted)',
                padding: '0.55rem 0.9rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {autoRefreshEnabled ? 'Auto refresh on' : 'Enable auto refresh'}
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            style={{
              borderRadius: 999,
              border: '1px solid rgba(var(--accent-rgb), 0.28)',
              background: loading ? 'rgba(var(--accent-rgb), 0.2)' : 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
              color: 'var(--nav-active-text)',
              padding: '0.65rem 1rem',
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: 700,
              minWidth: 0,
              width: '100%',
              maxWidth: 200,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            {loading ? (
              <span style={{ width: 14, height: 14, border: '2px solid color-mix(in srgb, currentColor 35%, transparent)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 0.85s linear infinite' }} />
            ) : null}
            Refresh now
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}
