import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { changePassword, fetchSecuritySummary, revokeOtherSessions, revokeSession } from '../../services/auth';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { useAuth } from '../../hooks/useAuth';
import { DashboardRefreshBar } from '../../components/ui/DashboardRefreshBar';
import VerificationModal from '../../components/ui/VerificationModal';
import { useToast } from '../../components/ui/ToastProvider';
import { isPlatformAdminUser } from '../../utils/authAccess';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface MetricItem {
  label: string;
  value: string;
  detail: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  action?: () => void;
  actionLabel?: string;
}

interface PanelItem {
  label: string;
  value: string;
  status?: string;
}

interface PanelDefinition {
  title: string;
  description: string;
  items: PanelItem[];
}

interface EnterpriseConsolePageProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  metrics: MetricItem[];
  primaryPanel: PanelDefinition;
  secondaryPanel?: PanelDefinition;
  footerPanels?: PanelDefinition[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  darkSurface?: boolean;
  mobileCollapsible?: boolean;
  loading?: boolean;
  loadingMessage?: string;
}

export function EnterpriseConsolePage({ title, subtitle, eyebrow = '', metrics, primaryPanel, secondaryPanel, footerPanels = [], actions, children, darkSurface = false, mobileCollapsible = false, loading = false, loadingMessage = 'Loading...' }: EnterpriseConsolePageProps) {
  const shellClass = darkSurface ? 'enterprise-console-shell enterprise-console-shell--dark enterprise-console-shell--overview' : 'enterprise-console-shell';
  const heroClass = darkSurface ? 'enterprise-console-hero enterprise-console-hero--dark enterprise-console-hero--overview' : 'enterprise-console-hero';
  const metricCardClass = darkSurface ? 'enterprise-console-metric-card enterprise-console-metric-card--dark enterprise-console-metric-card--overview' : 'enterprise-console-metric-card';
  const panelCardClass = darkSurface ? 'enterprise-console-panel enterprise-console-panel--dark enterprise-console-panel--overview' : 'enterprise-console-panel';

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={shellClass}>
      <section className={heroClass}>
        <div className="enterprise-console-hero__content">
          <div className="enterprise-console-hero__copy">
            {eyebrow ? <div className="enterprise-console-hero__eyebrow">{eyebrow}</div> : null}
            <h2 className="enterprise-console-hero__title">{title}</h2>
            <p className="enterprise-console-hero__subtitle">{subtitle}</p>
          </div>
          <div className="enterprise-console-hero__actions">
            {actions}
            {mobileCollapsible ? (
              <button className="mobile-toggle-btn" onClick={() => setMobileOpen((s) => !s)}>{mobileOpen ? 'Hide details' : 'Show details'}</button>
            ) : null}
          </div>
        </div>
      </section>

      <div className={`mobile-collapsible ${mobileOpen ? 'mobile-collapsible--open' : ''}`}>
        <section className={`enterprise-console-metrics ${darkSurface ? 'enterprise-console-metrics--overview' : ''}`}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={`metric-skeleton-${index}`} className={metricCardClass} style={{ padding: '1rem' }}>
                  <div className="skeleton" style={{ width: '46%', height: 12, borderRadius: 999, marginBottom: 18 }} />
                  <div className="skeleton" style={{ width: '58%', height: 32, borderRadius: 12, marginBottom: 14 }} />
                  <div className="skeleton" style={{ width: '56%', height: 12, borderRadius: 999 }} />
                </div>
              ))
            : metrics.map((m) => (
                <div key={m.label} className={`${metricCardClass}${m.action ? ' enterprise-console-metric-card--interactive' : ''}`} onClick={m.action} onKeyDown={(event) => { if (m.action && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); m.action(); } }} role={m.action ? 'button' : undefined} tabIndex={m.action ? 0 : undefined}>
                  <div className="enterprise-console-metric-card__label">{m.label}</div>
                  <div className="enterprise-console-metric-card__value">{m.value}</div>
                  <div className="enterprise-console-metric-card__detail">{m.detail}</div>
                  {m.action ? <span className="enterprise-console-metric-card__action">{m.actionLabel || 'Open controls'} <span aria-hidden="true">→</span></span> : null}
                </div>
              ))}
        </section>

        <section className={`enterprise-console-panels ${darkSurface ? 'enterprise-console-panels--overview' : ''}`}>
          {loading
            ? Array.from({ length: 2 }).map((_, index) => (
                <div key={`panel-skeleton-${index}`} className={panelCardClass} style={{ padding: '1.2rem' }}>
                  <div className="skeleton" style={{ width: '48%', height: 18, borderRadius: 999, marginBottom: 14 }} />
                  <div className="skeleton" style={{ width: '82%', height: 14, borderRadius: 999, marginBottom: 18 }} />
                  {Array.from({ length: 3 }).map((__, rowIndex) => (
                    <div key={`panel-row-skeleton-${rowIndex}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: rowIndex === 0 ? 8 : 12 }}>
                      <div className="skeleton" style={{ width: '42%', height: 12, borderRadius: 999 }} />
                      <div className="skeleton" style={{ width: '28%', height: 12, borderRadius: 999 }} />
                    </div>
                  ))}
                </div>
              ))
            : [primaryPanel, secondaryPanel].filter((panel): panel is PanelDefinition => Boolean(panel)).map((panel) => (
                <div key={panel.title} className={panelCardClass}>
                  <div className="enterprise-console-panel__header">
                    <h3 className="enterprise-console-panel__title">{panel.title}</h3>
                  </div>
                  <p className="enterprise-console-panel__description">{panel.description}</p>
                  <div className="enterprise-console-panel__items">
                    {panel.items.map((it) => (
                      <div key={it.label} className="enterprise-console-panel__row">
                        <div className="enterprise-console-panel__label">{it.label}</div>
                        <div className="enterprise-console-panel__value">{it.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
        </section>

        {footerPanels.length > 0 && (
          <section className={`enterprise-console-footer-panels ${darkSurface ? 'enterprise-console-footer-panels--overview' : ''}`}>
            {loading
              ? Array.from({ length: 2 }).map((_, index) => (
                  <div key={`footer-skeleton-${index}`} className="enterprise-console-footer-panel" style={{ padding: '1rem 1rem 1.1rem' }}>
                    <div className="skeleton" style={{ width: '44%', height: 18, borderRadius: 999, marginBottom: 14 }} />
                    <div className="skeleton" style={{ width: '82%', height: 13, borderRadius: 999, marginBottom: 18 }} />
                    {Array.from({ length: 3 }).map((__, rowIndex) => (
                      <div key={`footer-row-skeleton-${rowIndex}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: rowIndex === 0 ? 8 : 12 }}>
                        <div className="skeleton" style={{ width: '44%', height: 12, borderRadius: 999 }} />
                        <div className="skeleton" style={{ width: '24%', height: 12, borderRadius: 999 }} />
                      </div>
                    ))}
                  </div>
                ))
              : footerPanels.map((panel) => (
                  <div key={panel.title} className="enterprise-console-footer-panel">
                    <h3 className="enterprise-console-footer-panel__title">{panel.title}</h3>
                    <p className="enterprise-console-footer-panel__description">{panel.description}</p>
                    <div className="enterprise-console-footer-panel__items">
                      {panel.items.map((item) => (
                        <div key={item.label} className="enterprise-console-footer-panel__item">
                          <span className="enterprise-console-footer-panel__label">{item.label}</span>
                          <strong className="enterprise-console-footer-panel__value">{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
          </section>
        )}
      </div>

      {children}
    </div>
  );
}

interface AnalyticsTrendItem {
  day: string;
  requests: number;
  errors: number;
  registrations: number;
  approvals: number;
  events: number;
}

interface DashboardMetrics {
  registered_companies_total?: number;
  pending_approvals?: number;
  active_companies?: number;
  current_active_sessions?: number;
  api_keys_total?: number;
  webhook_endpoints_active?: number;
  api_requests_24h?: number;
  api_errors_24h?: number;
  avg_response_time_ms_24h?: number;
  webhook_attempts_7d?: number;
  webhook_success_rate_7d?: number;
  audit_events_7d?: number;
  report_exports_7d?: number;
  weekly_registration_growth?: number;
  approval_sla_percent?: number;
  last_updated?: string;
}

interface PrivilegedAdminRow {
  id?: number;
  name?: string;
  email?: string;
  is_system_owner?: boolean;
  mfa_enabled?: boolean;
  last_login_at?: string | null;
}

interface SecurityMetrics {
  audit_events?: number;
  active_api_keys?: number;
  recent_webhooks?: number;
  mfa_enabled_admins?: number;
  admin_mfa_coverage?: number;
  privileged_admins?: PrivilegedAdminRow[];
}

function hasStoredAuthToken() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.localStorage.getItem('idp_token') || window.sessionStorage.getItem('idp_token'));
}

function getEmailVerificationSource(company: any) {
  const registrantVerified = Boolean(company?.email_verified_at);
  const administratorVerified = company?.admin_verification_status === 'Verified'
    || Boolean(company?.admin_verified_at)
    || Boolean(company?.admin_verified_by);

  if (registrantVerified && administratorVerified) {
    return 'Verified by registrant via activation email / OTP; approved by System Administrator';
  }

  if (registrantVerified) {
    return 'Verified by registrant via activation email / OTP';
  }

  if (administratorVerified) {
    return 'Verified by System Administrator';
  }

  return 'Pending email verification';
}

function getEmailVerificationBadge(company: any) {
  const registrantVerified = Boolean(company?.email_verified_at);
  const administratorVerified = company?.admin_verification_status === 'Verified'
    || Boolean(company?.admin_verified_at)
    || Boolean(company?.admin_verified_by);

  if (registrantVerified && administratorVerified) {
    return { text: 'Registrant + admin verified', tone: 'success' };
  }

  if (registrantVerified) {
    return { text: 'Registrant verified', tone: 'success' };
  }

  if (administratorVerified) {
    return { text: 'Admin verified', tone: 'success' };
  }

  return { text: 'Pending', tone: 'warning' };
}

export function ExecutiveDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [security, setSecurity] = useState<SecurityMetrics>({});
  const [analytics, setAnalytics] = useState<AnalyticsTrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<7 | 14 | 30>(14);
  const [error, setError] = useState<string | null>(null);
  const [analyticsAvailable, setAnalyticsAvailable] = useState<boolean | null>(null);
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState<Array<Record<string, any>>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionAction, setSessionAction] = useState<number | 'all' | null>(null);
  const [mfaGuideOpen, setMfaGuideOpen] = useState(false);
  const toast = useToast();

  const openSessions = async () => {
    setSessionsOpen(true);
    setSessionsLoading(true);
    try {
      const result = await fetchSecuritySummary();
      setSessions(result.sessions);
    } catch (error: any) {
      toast.error({ title: 'Sessions unavailable', description: error?.message || 'Unable to load active sessions.' });
    } finally { setSessionsLoading(false); }
  };

  const terminateSession = async (sessionId: number) => {
    setSessionAction(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, revoked: true } : session));
      toast.success({ title: 'Session terminated', description: 'The selected session no longer has access.' });
    } catch (error: any) {
      toast.error({ title: 'Session not terminated', description: error?.message || 'The session could not be terminated.' });
    } finally { setSessionAction(null); }
  };

  const terminateOtherSessions = async () => {
    setSessionAction('all');
    try {
      const result = await revokeOtherSessions();
      setSessions((current) => current.map((session) => session.is_current ? session : { ...session, revoked: true }));
      toast.success({ title: 'Other sessions terminated', description: result.message });
    } catch (error: any) {
      toast.error({ title: 'Sessions not terminated', description: error?.message || 'Other sessions could not be terminated.' });
    } finally { setSessionAction(null); }
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!hasStoredAuthToken()) {
        throw new Error('missing-token');
      }

      const [dashboardRes, securityRes] = await Promise.all([
        api.get('/v1/admin/dashboard'),
        api.get('/v1/admin/security'),
      ]);

      setMetrics(dashboardRes.data.metrics ?? {});
      setSecurity(securityRes.data.metrics ?? {});
    } catch (err) {
      console.error('Failed to load dashboard metrics.');
      setMetrics({});
      setSecurity({});
      setError('Live dashboard metrics are temporarily unavailable. Please refresh the page and try again. If the issue continues, contact support.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalyticsData = useCallback(async (period: 7 | 14 | 30) => {
    setAnalyticsLoading(true);
    setError(null);

    try {
      if (!hasStoredAuthToken()) {
        throw new Error('missing-token');
      }

      const analyticsRes = await api.get('/v1/admin/analytics', { params: { period } });
      const hasAnalytics = analyticsRes.data.has_analytics ?? true;
      setAnalyticsAvailable(hasAnalytics);
      setAnalytics(Array.isArray(analyticsRes.data.metrics) ? analyticsRes.data.metrics : []);
    } catch (err: any) {
      console.error('Failed to load analytics metrics.');
      setAnalytics([]);
      setAnalyticsAvailable(false);
      setError(err?.response?.data?.message || err?.message || 'Live analytics are currently unavailable.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
    void fetchAnalyticsData(analyticsPeriod);
  }, [fetchDashboardData, fetchAnalyticsData, analyticsPeriod]);

  useEffect(() => {
    const updateViewport = () => {
      if (window.innerWidth < 768) {
        setViewport('mobile');
      } else if (window.innerWidth < 1024) {
        setViewport('tablet');
      } else {
        setViewport('desktop');
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Moveable: hook for rotating webhook secrets (extracted so modal can use it)
  function useRotateWebhook() {
    const [rotating, setRotating] = useState(false);
    const [secret, setSecret] = useState<string | null>(null);
    const [errorRotate, setErrorRotate] = useState<string | null>(null);

    const rotate = useCallback(async (webhookId: number) => {
      setRotating(true);
      setErrorRotate(null);
      setSecret(null);
      try {
        const res = await api.post(`/v1/client/api-management/webhooks/${webhookId}/rotate`);
        const data = res?.data?.data;
        if (data?.secret) {
          setSecret(data.secret);
        }
        return data;
      } catch (err: any) {
        setErrorRotate(err?.response?.data?.message || String(err?.message || 'Rotation failed'));
        throw err;
      } finally {
        setRotating(false);
      }
    }, []);

    return { rotate, rotating, secret, errorRotate, clear: () => setSecret(null) } as const;
  }

  const handleRefresh = () => {
    fetchDashboardData();
    fetchAnalyticsData(analyticsPeriod);
  };

  // (Rotation hook defined above.)

  const analyticPoints = useMemo(() => analytics.map((item) => ({
    day: item.day,
    requests: item.requests,
    errors: item.errors,
    registrations: item.registrations,
    approvals: item.approvals,
    events: item.events,
  })), [analytics]);

  const analyticsSummary = useMemo(() => ({
    totalRequests: analyticPoints.reduce((sum, item) => sum + (item.requests ?? 0), 0),
    totalErrors: analyticPoints.reduce((sum, item) => sum + (item.errors ?? 0), 0),
    totalRegistrations: analyticPoints.reduce((sum, item) => sum + (item.registrations ?? 0), 0),
    totalApprovals: analyticPoints.reduce((sum, item) => sum + (item.approvals ?? 0), 0),
    totalEvents: analyticPoints.reduce((sum, item) => sum + (item.events ?? 0), 0),
  }), [analyticPoints]);

  const analyticsEmpty = analyticsAvailable === false || (!analyticsLoading && analyticPoints.length === 0);
  const isCompactViewport = viewport === 'mobile' || viewport === 'tablet';
  const chartHeight = isCompactViewport ? 320 : 430;

  const formatCompactValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    }
    return value.toLocaleString();
  };

  const [rotateModalOpen, setRotateModalOpen] = useState(false);
  const [rotateTargetId, setRotateTargetId] = useState<number | null>(null);

  function RotateWebhookModal({ open, onClose, initialId }: { open: boolean; onClose: () => void; initialId?: number | null }) {
    const { rotate, rotating, secret, errorRotate, clear } = useRotateWebhook();
    const [id, setId] = useState<number | null>(initialId ?? null);
    const [webhooksList, setWebhooksList] = useState<Array<{ id: number; name?: string; target_url?: string }>>([]);
    const [webhooksLoading, setWebhooksLoading] = useState(false);

    useEffect(() => {
      setId(initialId ?? null);
    }, [initialId, open]);

    useEffect(() => {
      if (!open) return;
      let cancelled = false;
      const load = async () => {
        setWebhooksLoading(true);
        try {
          const res = await api.get('/v1/client/api-management/webhooks');
          if (!cancelled) {
            setWebhooksList(Array.isArray(res.data?.data) ? res.data.data : []);
            // preselect first if no initial id
            if (!id && Array.isArray(res.data?.data) && res.data.data.length > 0) {
              setId(res.data.data[0].id ?? null);
            }
          }
        } catch (e) {
          // ignore - fallback to manual id input
        } finally {
          if (!cancelled) setWebhooksLoading(false);
        }
      };
      void load();
      return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const doRotate = async () => {
      if (!id) return;
      try {
        await rotate(id);
      } catch (e) {
        // swallow; errorRotate set by hook
      }
    };

    const copySecret = async () => {
      if (!secret) return;
      try {
        await navigator.clipboard.writeText(secret);
      } catch (e) {
        // ignore
      }
    };

    if (!open) return null;

    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Rotate Webhook Secret</h3>
          <p>This will generate a new one-time secret. It will be shown only once — copy it now.</p>
          <label>Webhook</label>
          {webhooksLoading ? (
            <div>Loading webhooks…</div>
          ) : webhooksList.length > 0 ? (
            <select value={id ?? ''} onChange={(e) => setId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select a webhook...</option>
              {webhooksList.map((wh) => (
                <option key={wh.id} value={wh.id}>{wh.name ? `${wh.name} • ${wh.target_url ?? 'No endpoint configured'}` : `#${wh.id} ${wh.target_url ?? 'No endpoint configured'}`}</option>
              ))}
            </select>
          ) : (
            <input type="number" value={id ?? ''} onChange={(e) => setId(e.target.value ? Number(e.target.value) : null)} placeholder="Webhook ID" />
          )}
          <div className="modal-actions">
            <button onClick={onClose} className="btn">Cancel</button>
            <button onClick={doRotate} className="btn btn-primary" disabled={rotating || !id}>{rotating ? 'Rotating…' : 'Rotate'}</button>
          </div>

          {errorRotate ? <div className="modal-error">{errorRotate}</div> : null}

          {secret ? (
            <div className="modal-secret">
              <label>One-time secret</label>
              <div className="secret-row">
                <input readOnly value={secret} />
                <button onClick={copySecret} className="btn">Copy</button>
              </div>
              <p className="muted">This secret will never be shown again. Store it securely now.</p>
              <div className="modal-actions">
                <button onClick={() => { clear(); onClose(); }} className="btn btn-primary">Done</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <EnterpriseConsolePage
      title="Dashboard"
      subtitle={loading ? 'Loading live platform metrics…' : ''}
      actions={
        <>
          <DashboardRefreshBar
            loading={loading || analyticsLoading}
            error={error}
            statusDescription={error ? 'Offline snapshot - refresh to retry loading analytics and metrics.' : 'All analytics connected and up to date.'}
            lastUpdated={metrics?.last_updated || undefined}
            onRefresh={handleRefresh}
            autoRefreshEnabled={false}
          />
          <div style={{ marginLeft: 12 }}>
            <button className="btn" onClick={() => { setRotateTargetId(null); setRotateModalOpen(true); }}>Rotate Webhook Secret</button>
          </div>
        </>
      }
      metrics={[
        { label: 'Registered companies', value: metrics?.registered_companies_total != null ? String(metrics.registered_companies_total) : '0', detail: 'Registered tenants', tone: metrics?.registered_companies_total ? 'success' : 'info' },
        { label: 'Pending approvals', value: metrics?.pending_approvals != null ? String(metrics.pending_approvals) : '0', detail: 'Requires action', tone: metrics?.pending_approvals && metrics.pending_approvals > 0 ? 'warning' : 'info' },
        { label: 'Active companies', value: metrics?.active_companies != null ? String(metrics.active_companies) : '0', detail: 'Active tenants', tone: 'info' },
        { label: 'Online sessions', value: metrics?.current_active_sessions != null ? String(metrics.current_active_sessions) : '0', detail: metrics?.current_active_sessions ? 'Live sessions detected' : 'No other live sessions detected', tone: metrics?.current_active_sessions ? 'success' : 'info', action: () => { void openSessions(); }, actionLabel: 'View sessions' },
        { label: 'API keys', value: metrics?.api_keys_total != null ? String(metrics.api_keys_total) : '0', detail: 'Total keys', tone: 'info' },
        { label: 'Webhook endpoints', value: metrics?.webhook_endpoints_active != null ? String(metrics.webhook_endpoints_active) : '0', detail: 'Configured endpoints', tone: 'info' },
      ]}
      primaryPanel={{
        title: 'Governance at a glance',
        description: 'A live operational view of security posture, workflow throughput, and platform health.',
          items: [
          { label: 'Audit events (7d)', value: security?.audit_events != null ? String(security.audit_events) : '0', status: 'info' },
          { label: 'Active API keys', value: security?.active_api_keys != null ? String(security.active_api_keys) : '0', status: security?.active_api_keys ? 'success' : 'info' },
          { label: 'Privileged MFA enabled', value: security?.mfa_enabled_admins != null ? String(security.mfa_enabled_admins) : '0', status: security?.mfa_enabled_admins && security.mfa_enabled_admins > 0 ? 'success' : 'warning' },
          { label: 'Admin MFA coverage', value: security?.admin_mfa_coverage != null ? `${security.admin_mfa_coverage}%` : '0%', status: security?.admin_mfa_coverage !== undefined && security.admin_mfa_coverage < 100 ? 'warning' : 'success' },
          { label: 'Webhook delivery rate', value: metrics?.webhook_success_rate_7d != null ? `${metrics.webhook_success_rate_7d}%` : '0%', status: metrics?.webhook_success_rate_7d && metrics.webhook_success_rate_7d < 90 ? 'warning' : 'success' },
          { label: 'API errors (24h)', value: metrics?.api_errors_24h != null ? String(metrics.api_errors_24h) : '0', status: metrics?.api_errors_24h && metrics.api_errors_24h > 20 ? 'warning' : 'info' },
        ],
      }}
      secondaryPanel={{
        title: 'Enterprise operations',
        description: 'Operational and adoption signals from live system telemetry.',
          items: [
          { label: 'API requests (24h)', value: metrics?.api_requests_24h != null ? String(metrics.api_requests_24h) : '0' },
          { label: 'Average latency (24h)', value: metrics?.avg_response_time_ms_24h != null ? `${metrics.avg_response_time_ms_24h} ms` : '0 ms' },
          { label: 'Report exports (7d)', value: metrics?.report_exports_7d != null ? String(metrics.report_exports_7d) : '0' },
        ],
      }}
      footerPanels={[
        {
          title: 'Security center',
          description: 'High-confidence controls for privileged access and incident response.',
            items: [
            { label: 'Audit events (7d)', value: security?.audit_events != null ? String(security.audit_events) : '0' },
            { label: 'Active API keys', value: security?.active_api_keys != null ? String(security.active_api_keys) : '0' },
            { label: 'Privileged MFA enabled', value: security?.mfa_enabled_admins != null ? String(security.mfa_enabled_admins) : '0' },
            { label: 'Admin MFA coverage', value: security?.admin_mfa_coverage != null ? `${security.admin_mfa_coverage}%` : '0%' },
            { label: 'Recent webhook integrations', value: security?.recent_webhooks != null ? String(security.recent_webhooks) : '0' },
          ],
        },
        {
          title: 'Approval performance',
          description: 'Live onboarding throughput and SLA performance.',
            items: [
            { label: 'Pending approvals', value: metrics?.pending_approvals != null ? String(metrics.pending_approvals) : '0' },
            { label: 'Registration growth', value: metrics?.weekly_registration_growth != null ? `${metrics.weekly_registration_growth}%` : '0%' },
            { label: 'Approval SLA', value: metrics?.approval_sla_percent != null ? `${metrics.approval_sla_percent}%` : '0%' },
          ],
        },
      ]}
      darkSurface
      loading={loading}
      loadingMessage="Loading enterprise overview…"
    >
      <section className="enterprise-console-section">
        <div className="enterprise-console-fill-card">
          <div className="enterprise-console-fill-card__header">
            <div className="enterprise-console-fill-card__copy">
              <div className="enterprise-console-fill-card__eyebrow">Executive overview</div>
              <h3 className="enterprise-console-fill-card__title">Live enterprise activity and governance insights</h3>
              <p className="enterprise-console-fill-card__text">A professional operational dashboard for platform performance, security posture, and approvals velocity.</p>
            </div>
            <div className={`enterprise-console-pill-list ${isCompactViewport ? 'enterprise-console-pill-list--mobile' : ''}`}>
              <span className="enterprise-console-pill enterprise-console-pill--info">Live</span>
              <span className="enterprise-console-pill enterprise-console-pill--success">Secure</span>
              <span className="enterprise-console-pill enterprise-console-pill--warning">Governance</span>
            </div>
          </div>
        </div>

        <div className="enterprise-console-summary-grid">
          {[
            { label: 'Requests', value: formatCompactValue(analyticsSummary.totalRequests), tone: 'info' },
            { label: 'Errors', value: formatCompactValue(analyticsSummary.totalErrors), tone: analyticsSummary.totalErrors > 0 ? 'danger' : 'success' },
            { label: 'Registrations', value: formatCompactValue(analyticsSummary.totalRegistrations), tone: 'success' },
            { label: 'Approvals', value: formatCompactValue(analyticsSummary.totalApprovals), tone: 'success' },
            { label: 'Audit events', value: formatCompactValue(analyticsSummary.totalEvents), tone: 'info' },
          ].map((item) => (
            <div key={item.label} className="enterprise-console-summary-card">
              <div className="enterprise-console-summary-card__label">{item.label}</div>
              <div className={`enterprise-console-summary-card__value enterprise-console-summary-card__value--${item.tone}`}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="enterprise-console-chart-panel">
          <div className="enterprise-console-chart-panel__head">
            <div>
              <div className="enterprise-console-chart-panel__eyebrow">Admin MFA status</div>
              <h3 className="enterprise-console-chart-panel__subtitle">Privileged administrator access coverage</h3>
            </div>
          </div>

          <div className="enterprise-console-panel__items" style={{ marginTop: 16 }}>
            {Array.isArray(security?.privileged_admins) && security.privileged_admins.length > 0 ? (
              security.privileged_admins.map((admin) => (
                <div key={admin.id ?? admin.email ?? admin.name ?? 'privileged-admin'} className="enterprise-console-panel__row" style={{ padding: '0.7rem 0', borderBottom: '1px solid rgba(148,163,184,0.14)' }}>
                  <div className="enterprise-console-panel__label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <span>{admin.name || 'System administrator'}</span>
                    <small style={{ opacity: 0.75, fontSize: '0.75rem' }}>{admin.email || 'No email provided'}</small>
                  </div>
                  <div className="enterprise-console-panel__value" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`enterprise-console-pill ${admin.mfa_enabled ? 'enterprise-console-pill--success' : 'enterprise-console-pill--warning'}`}>
                      {admin.mfa_enabled ? 'MFA enabled' : 'MFA missing'}
                    </span>
                    {admin.is_system_owner ? <span className="enterprise-console-pill enterprise-console-pill--info">System owner</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="enterprise-console-panel__row">
                <div className="enterprise-console-panel__label">Privileged administrators</div>
                <div className="enterprise-console-panel__value">No privileged admin records available.</div>
              </div>
            )}
          </div>

          <div className="enterprise-console-mfa-guide">
            <button
              type="button"
              className="enterprise-console-mfa-guide__toggle"
              aria-expanded={mfaGuideOpen}
              aria-controls="admin-mfa-guide"
              onClick={() => setMfaGuideOpen((open) => !open)}
            >
              <span>
                <strong>MFA readiness guide</strong>
                <small>Review enrollment steps when you are ready.</small>
              </span>
              <span aria-hidden="true">{mfaGuideOpen ? '−' : '+'}</span>
            </button>

            {mfaGuideOpen ? (
              <div id="admin-mfa-guide" className="enterprise-console-mfa-guide__body">
                <ol>
                  <li>Open Admin Profile &amp; Security and start MFA setup.</li>
                  <li>Scan the displayed QR code with your authenticator app.</li>
                  <li>Enter the current six-digit code to confirm enrollment.</li>
                  <li>Store the one-time recovery codes in an approved secure location.</li>
                  <li>Sign in again and verify that the dashboard shows MFA enabled.</li>
                </ol>
                <p>Nothing starts until you choose the setup action. Existing MFA enforcement and recovery protections remain active.</p>
                <Link to="/admin/profile" className="btn btn-primary">Open security settings</Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="enterprise-console-chart-panel">
          <div className="enterprise-console-chart-panel__head">
            <div>
              <div className="enterprise-console-chart-panel__eyebrow">Signal timeline</div>
              <h3 className="enterprise-console-chart-panel__subtitle">Demand, reliability, and governance trends</h3>
            </div>
            <div className="enterprise-console-chart-panel__buttons">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAnalyticsPeriod(days as 7 | 14 | 30)}
                  className={`enterprise-console-chart-panel__button ${analyticsPeriod === days ? 'enterprise-console-chart-panel__button--active' : ''}`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="enterprise-console-chart-panel__meta">
            <span className="enterprise-console-chart-panel__tag enterprise-console-chart-panel__tag--info">Demand</span>
            <span className="enterprise-console-chart-panel__tag enterprise-console-chart-panel__tag--success">Reliability</span>
            <span className="enterprise-console-chart-panel__tag enterprise-console-chart-panel__tag--warning">Governance</span>
            <span className="enterprise-console-chart-panel__status">Live signal strength · <span className="enterprise-console-chart-panel__tag enterprise-console-chart-panel__tag--accent">High</span></span>
          </div>

          <div className="enterprise-console-chart-panel__body" style={{ height: chartHeight }}>
            {analyticsLoading ? (
              <div className="enterprise-console-loading-state">Loading analytics…</div>
            ) : analyticsEmpty ? (
              <div className="enterprise-console-empty-state">No analytics data available for the selected period.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analyticPoints} margin={{ top: 16, right: isCompactViewport ? 10 : 18, left: isCompactViewport ? -4 : 4, bottom: 6 }}>
                  <defs>
                    <filter id="executiveGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <linearGradient id="executiveRequestsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(148,163,184,0.16)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: isCompactViewport ? 11 : 12 }} axisLine={false} tickLine={false} dy={10} minTickGap={isCompactViewport ? 8 : 16} />
                  <YAxis yAxisId="volume" tick={{ fill: 'var(--text-muted)', fontSize: isCompactViewport ? 11 : 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(1)}k` : value}`} width={isCompactViewport ? 38 : 46} />
                  <YAxis yAxisId="activity" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: isCompactViewport ? 11 : 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={isCompactViewport ? 38 : 46} />
                  <Tooltip
                    cursor={{ stroke: 'var(--accent)', strokeDasharray: '4 4' }}
                    wrapperStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 14px 30px rgba(15,23,42,0.16)' }}
                    contentStyle={{ background: 'var(--card)', color: 'var(--text)', borderRadius: 14, border: '1px solid var(--border)', padding: '0.8rem 0.9rem' }}
                    formatter={(value: number | string) => [formatCompactValue(Number(value)), '']}
                  />
                  <Legend
                    verticalAlign="top"
                    align="left"
                    height={isCompactViewport ? 64 : 42}
                    iconSize={isCompactViewport ? 8 : 10}
                    wrapperStyle={{
                      color: 'var(--text-muted)',
                      fontSize: isCompactViewport ? 11 : 12,
                      fontWeight: 600,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.85rem',
                      justifyContent: 'flex-start',
                      padding: 0,
                      margin: 0,
                    }}
                    formatter={(value) => <span style={{ whiteSpace: 'nowrap' }}>{value}</span>}
                  />
                  <Area yAxisId="volume" type="monotone" dataKey="requests" stroke="var(--accent)" fill="url(#executiveRequestsGradient)" name="API requests" strokeWidth={3} activeDot={{ r: 5, strokeWidth: 2, fill: 'var(--surface-elevated)' }} animationDuration={1200} isAnimationActive filter="url(#executiveGlow)" />
                  <Bar yAxisId="activity" dataKey="registrations" fill="var(--success)" name="Registrations" barSize={isCompactViewport ? 10 : 12} radius={[4, 4, 0, 0]} animationDuration={1000} isAnimationActive />
                  <Bar yAxisId="activity" dataKey="approvals" fill="var(--teal, var(--accent))" name="Approvals" barSize={isCompactViewport ? 10 : 12} radius={[4, 4, 0, 0]} animationDuration={1000} isAnimationActive />
                  <Line yAxisId="activity" type="monotone" dataKey="errors" stroke="var(--danger)" name="Errors" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} animationDuration={1000} isAnimationActive filter="url(#executiveGlow)" />
                  <Line yAxisId="activity" type="monotone" dataKey="events" stroke="var(--warning)" name="Audit events" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} animationDuration={1000} isAnimationActive filter="url(#executiveGlow)" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>
      {sessionsOpen ? (
        <div className="session-control-modal" role="dialog" aria-modal="true" aria-labelledby="session-control-title">
          <div className="session-control-panel">
            <div className="session-control-header">
              <div><div className="enterprise-console-fill-card__eyebrow">SECURITY CENTER</div><h3 id="session-control-title">Online sessions</h3><p>Review access to your administrator account and terminate sessions you do not recognize.</p></div>
              <button type="button" className="btn btn-secondary" onClick={() => setSessionsOpen(false)} aria-label="Close sessions">×</button>
            </div>
            {sessionsLoading ? <p>Loading active sessions...</p> : sessions.length === 0 ? <p>No session records are available.</p> : <div className="session-control-list">{sessions.map((session) => <div className={`session-control-row${session.revoked ? ' session-control-row--revoked' : ''}`} key={session.id}><div><strong>{session.is_current ? 'This device' : (session.device || session.browser || 'Active device')}</strong><p>{session.browser || 'Unknown browser'} · {session.os || 'Unknown OS'} · {session.ip_address || 'Unknown IP'}</p><small>{session.last_activity ? new Date(session.last_activity).toLocaleString() : 'Activity time unavailable'}{session.is_current ? ' · Current session' : ''}</small></div>{session.revoked ? <span>Terminated</span> : session.is_current ? <span className="session-control-current">Current</span> : <button type="button" className="btn btn-secondary" disabled={sessionAction !== null} onClick={() => void terminateSession(session.id)}>Terminate</button>}</div>)}</div>}
            <div className="session-control-footer"><span>Current session is always protected.</span><button type="button" className="btn btn-danger" disabled={sessionAction !== null || !sessions.some((session) => !session.is_current && !session.revoked)} onClick={() => void terminateOtherSessions()}>Terminate all others</button></div>
          </div>
        </div>
      ) : null}
    </EnterpriseConsolePage>
  );
}

export function CompanyApprovalsPage() {
  const [verificationQuery, setVerificationQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const handleVerification = async () => {
    const query = verificationQuery.trim();
    if (!query) {
      setVerificationError('Please enter a reference number, verification URL, or verification token.');
      setVerificationResult(null);
      return;
    }

    setVerificationLoading(true);
    setVerificationError(null);
    setVerificationResult(null);

    try {
      const response = await api.post('/v1/admin/reports/verify', { query });
      setVerificationResult(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to verify the document right now. Please check the input and try again.';
      setVerificationError(message);
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <EnterpriseConsolePage
      title="Company Approvals"
      subtitle="Review, validate, approve, and govern onboarding outcomes with structured controls and review history."
      eyebrow="Governance"
      metrics={[
        { label: 'New requests', value: '0', detail: 'Pending review', tone: 'info' },
        { label: 'Approved', value: '0', detail: 'This month', tone: 'info' },
        { label: 'Rejected', value: '0', detail: 'Needs follow-up', tone: 'info' },
        { label: 'Suspended', value: '0', detail: 'Under review', tone: 'info' },
      ]}
      primaryPanel={{
        title: 'Approval workflow',
        description: 'Use evidence-based review steps to confirm identity, business legitimacy, and company compliance.',
        items: [
          { label: 'Verification status', value: '12 dossiers awaiting legal review', status: 'warning' },
          { label: 'Approval notes', value: '7 companies need updated documents', status: 'info' },
          { label: 'History', value: 'Complete audit trail available for each company', status: 'success' },
        ],
      }}
      secondaryPanel={{
        title: 'Operations',
        description: 'Move from review to activation with secure actions for approve, reject, suspend, restore, and delete.',
        items: [
          { label: 'Approve', value: 'Fast-track verified organizations' },
          { label: 'Suspend', value: 'Protect the platform from risky tenants' },
          { label: 'Restore', value: 'Recover service after review completion' },
        ],
      }}
      footerPanels={[
        { title: 'Verification', description: 'Maintain confidence in every onboarding decision.', items: [{ label: 'Document checks', value: '98%' }, { label: 'Manual review', value: 'Pending' }, { label: 'Risk score', value: 'Low' }] },
        { title: 'Governance', description: 'Control every lifecycle action with full accountability.', items: [{ label: 'Approver', value: 'System Admin' }, { label: 'Audit trail', value: 'Recorded' }, { label: 'Next action', value: 'Review queue' }] },
      ]}
      children={(
        <section className="enterprise-console-verification-panel">
          <div className="enterprise-console-verification-panel__header">
            <div>
              <div className="enterprise-console-fill-card__eyebrow">Document verification</div>
              <h3 className="enterprise-console-verification-panel__title">Verify export authenticity</h3>
            </div>
            <div className="enterprise-console-form-label">Enter a reference number, verification URL, or verification token to confirm the document.</div>
          </div>

          <div className="enterprise-console-form-grid">
            <div className="enterprise-console-details-section">
              <label className="enterprise-console-form-label">Reference / token / verification link</label>
              <input
                type="text"
                value={verificationQuery}
                onChange={(event) => setVerificationQuery(event.target.value)}
                placeholder="REF-xxxx, verification token, or report URL"
                className="enterprise-console-input enterprise-console-input--verification"
              />
              {verificationError ? <div className="enterprise-console-error-text">{verificationError}</div> : null}
            </div>
            <button
              type="button"
              onClick={handleVerification}
              disabled={verificationLoading}
              className="enterprise-console-button enterprise-console-button--primary"
            >
              {verificationLoading ? 'Verifying…' : 'Verify document'}
            </button>
          </div>

          {verificationResult ? (
            <div className={`enterprise-console-verification-result ${verificationResult.status === 'valid' ? 'enterprise-console-verification-result--valid' : 'enterprise-console-verification-result--invalid'}`}>
              <div className="enterprise-console-verification-result__header">
                <div>
                  <div className="enterprise-console-verification-result__heading">
                    Document verification {verificationResult.status === 'valid' ? 'successful' : 'failed'}
                  </div>
                  <div className="enterprise-console-verification-result__message">{verificationResult.message || 'Verification completed against system records.'}</div>
                </div>
                <div className="enterprise-console-verification-result__status">
                  {verificationResult.status}
                </div>
              </div>

              <div className="enterprise-console-verification-result__details">
                {verificationResult.reference_number ? <div><strong>Reference:</strong> {verificationResult.reference_number}</div> : null}
                {verificationResult.verification_id ? <div><strong>Verification code:</strong> {verificationResult.verification_id}</div> : null}
                {verificationResult.report_id ? <div><strong>Report ID:</strong> {verificationResult.report_id}</div> : null}
                {verificationResult.report_category ? <div><strong>Category:</strong> {verificationResult.report_category}</div> : null}
                {verificationResult.generated_by ? <div><strong>Generated by:</strong> {verificationResult.generated_by}{verificationResult.generated_by_role ? ` • ${verificationResult.generated_by_role}` : ''}</div> : null}
                {verificationResult.generated_at ? <div><strong>Generated at:</strong> {verificationResult.generated_at}</div> : null}
                {verificationResult.verification_timestamp ? <div><strong>Verified at:</strong> {verificationResult.verification_timestamp}</div> : null}
              </div>
            </div>
          ) : null}
        </section>
      )}
    />
  );
}

export function CompaniesPage() {
  const toast = useToast();
  const verificationOptions = [
    { value: 'all', label: 'All companies' },
    { value: 'email_verified', label: 'Email verified' },
    { value: 'email_pending', label: 'Email pending' },
    { value: 'admin_verified', label: 'SYSTEM ADMINISTRATION CONSOLE approved' },
    { value: 'admin_pending', label: 'SYSTEM ADMINISTRATION CONSOLE pending approval' },
    { value: 'admin_rejected', label: 'SYSTEM ADMINISTRATION CONSOLE rejected' },
    { value: 'fully_verified', label: 'Fully verified' },
    { value: 'needs_attention', label: 'Needs attention' },
  ];

  const [meta, setMeta] = useState({ total: 0, active: 0, suspended: 0, active_subscriptions: 0, verification_pending: 0 });
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | 'verify_email'>('approve');

  // Mobile-first viewport detection
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [isPhone, setIsPhone] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isTinyMobile, setIsTinyMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 520 : false);
  const [openActionsCompanyId, setOpenActionsCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
      setIsPhone(width < 768);
      setIsTinyMobile(width < 520);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const auth = useContext(AuthContext);

  const canManage = useMemo(() => isPlatformAdminUser(auth?.user), [auth?.user]);

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    setError(null);

    const params: Record<string, any> = {
      page,
      per_page: perPage,
      search,
    };

    if (verificationStatus !== 'all') {
      params.verification_status = verificationStatus;
    }

    api
      .get('/v1/admin/companies', { params })
      .then((response) => {
        const payload = response?.data ?? {};
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        const m = payload?.meta || {};

        setMeta({
          total: m.total ?? list.length ?? 0,
          active: m.active ?? m.active_subscriptions ?? 0,
          suspended: m.suspended ?? 0,
          active_subscriptions: m.active_subscriptions ?? 0,
          verification_pending: m.verification_pending ?? 0,
        });
        setCompanies(list);
        setError(null);
      })
      .catch((err: any) => {
        const message = err?.response?.data?.message || 'Unable to load companies from the backend right now.';
        setMeta({ total: 0, active: 0, suspended: 0, active_subscriptions: 0, verification_pending: 0 });
        setCompanies([]);
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [page, perPage, search, verificationStatus]);

  const handleCompanyAction = async (action: 'approve' | 'reject' | 'suspend' | 'restore' | 'delete' | 'verify_email', payload: Record<string, any> = {}) => {
    setActionLoading(true);
    setActionMessage(null);

    try {
      const endpoint = action === 'delete'
        ? `/v1/admin/companies/${selectedCompany.id}`
        : action === 'verify_email'
          ? `/v1/admin/companies/${selectedCompany.id}/verify-email`
          : `/v1/admin/companies/${selectedCompany.id}/${action}`;

      const method = action === 'delete' ? 'delete' : 'post';

      const payloadToSend: Record<string, any> = {};
      if (action === 'approve') {
        if (payload.note) payloadToSend.note = payload.note;
        payloadToSend.notify = payload.notify !== undefined ? payload.notify : true;
      }

      if (action === 'delete') {
        if (payload.confirmation_name) payloadToSend.confirmation_name = payload.confirmation_name;
        if (payload.reason) payloadToSend.reason = payload.reason;
      }

      if (action === 'reject') {
        if (!payload.reason) {
          const message = 'Rejection reason is required.';
          setActionMessage({ type: 'error', text: message });
          toast.warning({ title: 'Validation Required', description: message });
          setActionLoading(false);
          return;
        }
        payloadToSend.reason = payload.reason;
        if (payload.note) payloadToSend.note = payload.note;
        payloadToSend.notify = payload.notify !== undefined ? payload.notify : true;
      }

      let responseData: any = null;
      if (method === 'delete') {
        await api.delete(endpoint, { data: payloadToSend });
      } else {
        const res = await api.post(endpoint, payloadToSend);
        responseData = res?.data?.data;
      }

      if (responseData) {
        setSelectedCompany(responseData);
        setCompanies((prev) => prev.map((c) => (c.id === responseData.id ? responseData : c)));
      }

      const successMessage = getSuccessMessage(action, selectedCompany.name);
      setActionMessage({ type: 'success', text: successMessage });
      toast.success({
        title: 'Company Action Completed',
        description: successMessage,
      });

      setTimeout(() => {
        if (action === 'delete') {
          setSelectedCompany(null);
        }
        setRefreshTick((value) => value + 1);
        fetchCompanies();
      }, 1200);
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message
        || (err?.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : null)
        || err?.message
        || getErrorMessage(action);

      setActionMessage({ type: 'error', text: serverMessage });
      toast.error({ title: 'Action Failed', description: serverMessage });
    } finally {
      setActionLoading(false);
    }
  };

  const openVerificationModal = (mode: 'approve' | 'reject' | 'verify_email') => {
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleModalSubmit = (payload: { reason?: string; note?: string; notify?: boolean }) => {
    setModalOpen(false);
    handleCompanyAction(modalMode === 'verify_email' ? 'verify_email' : modalMode, payload as any);
  };

  const getSuccessMessage = (action: string, companyName: string) => {
    const messages: Record<string, string> = {
      approve: `${companyName} has been successfully approved and is now active on the platform.`,
      verify_email: `${companyName}'s business email has been marked verified by an administrator. If the account is approved, the registrant can now sign in.`,
      reject: `${companyName} has been rejected and the company administrator has been notified.`,
      suspend: `${companyName} has been temporarily suspended. All access and integrations are now disabled.`,
      restore: `${companyName} has been restored and is now active again.`,
      delete: `${companyName} has been permanently deleted from the platform along with all associated data.`,
    };
    return messages[action] || 'Action completed successfully.';
  };

  const getErrorMessage = (action: string) => {
    return `We were unable to complete this action. Please try again or contact support if the issue persists.`;
  };

  useEffect(() => {
    if (!auth || auth.loading) return;

    if (!auth.isAuthenticated) {
      setCompanies([]);
      setMeta({ total: 0, active: 0, suspended: 0, active_subscriptions: 0, verification_pending: 0 });
      setError(null);
      setLoading(false);
      return;
    }

    if (!canManage) {
      setCompanies([]);
      setMeta({ total: 0, active: 0, suspended: 0, active_subscriptions: 0, verification_pending: 0 });
      const message = 'You do not have access to Organization Management.';
      setError(message);
      toast.warning({ title: 'Access Restricted', description: message });
      setLoading(false);
      return;
    }

    fetchCompanies();
  }, [auth, auth?.isAuthenticated, auth?.loading, canManage, fetchCompanies, refreshTick, toast]);

  // Company Details View
  if (selectedCompany) {
    return (
      <div className="enterprise-console-details-shell">
        <div className="enterprise-console-details-back">
          <button
            onClick={() => setSelectedCompany(null)}
            className="enterprise-console-button enterprise-console-button--secondary"
            style={{ padding: '0.6rem 1.2rem' }}
          >
            ← Back to Companies
          </button>
        </div>

        <VerificationModal
          open={modalOpen}
          mode={modalMode}
          company={selectedCompany}
          loading={actionLoading}
          onClose={() => setModalOpen(false)}
          onSubmit={handleModalSubmit}
        />

        <div className="enterprise-console-details-hero">
          <div className="enterprise-console-details-hero__eyebrow">COMPANY PROFILE</div>
          <h2 className="enterprise-console-details-hero__title">{selectedCompany.name}</h2>
          <p className="enterprise-console-details-hero__subtitle">Status: <strong className="enterprise-console-details-status" style={{ color: selectedCompany.status === 'active' ? 'var(--success)' : selectedCompany.status === 'suspended' ? 'var(--danger)' : 'var(--warning)' }}>{selectedCompany.status.toUpperCase()}</strong></p>
        </div>

        {actionMessage && (
          <div className={`enterprise-console-details-banner ${actionMessage.type === 'success' ? 'enterprise-console-details-banner--success' : ''}`}>
            {actionMessage.text}
          </div>
        )}

        {/* SYSTEM ADMINISTRATION CONSOLE notice: company can already sign in, but API access is gated on approval */}
        {selectedCompany.admin_verification_status !== 'Verified' && (
          <div className="enterprise-console-details-banner enterprise-console-details-banner--success">
            This company can already sign in and use the dashboard. It is awaiting <strong>SYSTEM ADMINISTRATION_CONSOLE Approval</strong> before it can generate API keys or webhooks.
          </div>
        )}

        <div className="enterprise-console-details-grid">
          <div className="enterprise-console-details-card">
            <h3 className="enterprise-console-details-section__heading">Organization Information</h3>
            <div className="enterprise-console-details-section">
              <div>
                <div className="enterprise-console-details-field-label">Business Email</div>
                <div className="enterprise-console-details-field-value">{selectedCompany.business_email}</div>
              </div>
              <div>
                <div className="enterprise-console-details-field-label">Contact Phone</div>
                <div className="enterprise-console-details-field-value">{selectedCompany.phone || 'Not provided'}</div>
              </div>
              <div>
                <div className="enterprise-console-details-field-label">Legal Address</div>
                <div className="enterprise-console-details-field-value">{selectedCompany.address || 'Not provided'}</div>
              </div>
              <div>
                <div className="enterprise-console-details-field-label">Registration Number</div>
                <div className="enterprise-console-details-field-value">{selectedCompany.business_registration_number || selectedCompany.company_code || 'Not provided'}</div>
              </div>
            </div>
          </div>

          <div className="enterprise-console-details-card">
            <h3 className="enterprise-console-details-section__heading">Account Status</h3>
            <div className="enterprise-console-details-section">
              <div>
                <div className="enterprise-console-details-field-label">Current Status</div>
                <div className="enterprise-console-details-status" style={{ color: selectedCompany.status === 'active' ? 'var(--success)' : selectedCompany.status === 'suspended' ? 'var(--danger)' : 'var(--warning)' }}>
                  {selectedCompany.status.charAt(0).toUpperCase() + selectedCompany.status.slice(1)}
                </div>
              </div>
              <div>
                <div className="enterprise-console-details-field-label">Email verification source</div>
                <div className="enterprise-console-details-field-value" style={{ color: selectedCompany.email_verified_at ? 'var(--success)' : 'var(--warning)' }}>
                  {getEmailVerificationSource(selectedCompany)}
                </div>
              </div>
              <div>
                <div className="enterprise-console-details-field-label">SYSTEM ADMINISTRATION CONSOLE approval</div>
                <div className="enterprise-console-details-field-value" style={{ color: selectedCompany.admin_approval_status === 'Verified' ? 'var(--success)' : selectedCompany.admin_approval_status === 'Rejected' ? 'var(--danger)' : 'var(--warning)' }}>
                  {selectedCompany.admin_approval_status || 'Pending'}
                </div>
              </div>
              <div>
                <div className="enterprise-console-details-field-label">Joined Date</div>
                <div className="enterprise-console-details-field-value">{selectedCompany.created_at ? new Date(selectedCompany.created_at).toLocaleDateString() : 'Unknown'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="enterprise-console-details-card">
          <h3 className="enterprise-console-details-section__heading">Verification notes</h3>
          <div className="enterprise-console-details-section" style={{ marginBottom: '1.25rem' }}>
            <div>
              <div className="enterprise-console-details-field-label">SYSTEM ADMINISTRATION CONSOLE approval note</div>
              <div className="enterprise-console-details-field-value">{selectedCompany.admin_verification_note || 'No note provided.'}</div>
            </div>
            <div>
              <div className="enterprise-console-details-field-label">Verified by</div>
              <div className="enterprise-console-details-field-value">
                {selectedCompany.admin_verifier?.name
                  ?? selectedCompany.admin_verified_by
                  ?? (selectedCompany.admin_approval_status === 'Verified' ? 'Approved' : 'Pending review')}
              </div>
            </div>
          </div>
          <h3 className="enterprise-console-details-section__heading">Management Actions</h3>
          <div className="enterprise-console-details-actions-grid">
            {!selectedCompany.email_verified_at && (
              <button
                onClick={() => openVerificationModal('verify_email')}
                disabled={actionLoading}
                className="enterprise-console-button enterprise-console-button--secondary"
                style={{ opacity: actionLoading ? 0.6 : 1 }}
              >
                ✉️ Mark Email Verified
              </button>
            )}

            {(selectedCompany.admin_verification_status !== 'Verified' && selectedCompany.admin_approval_status !== 'Verified' && selectedCompany.approval_status !== 'approved') && (
              <button
                onClick={() => openVerificationModal('approve')}
                disabled={actionLoading}
                className="enterprise-console-button enterprise-console-button--success"
                style={{ opacity: actionLoading ? 0.6 : 1 }}
              >
                ✓ Approve Company
              </button>
            )}

            {(selectedCompany.admin_verification_status !== 'Rejected' && selectedCompany.admin_approval_status !== 'Rejected' && selectedCompany.approval_status !== 'rejected') && (
              <button
                onClick={() => openVerificationModal('reject')}
                disabled={actionLoading}
                className="enterprise-console-button enterprise-console-button--danger"
                style={{ opacity: actionLoading ? 0.6 : 1 }}
              >
                ✕ Reject Company
              </button>
            )}

            {selectedCompany.status !== 'suspended' ? (
              <button
                onClick={() => handleCompanyAction('suspend')}
                disabled={actionLoading}
                className="enterprise-console-button enterprise-console-button--danger"
                style={{ opacity: actionLoading ? 0.6 : 1, background: 'var(--warning)', color: '#1f2937' }}
              >
                ⊘ Suspend Company
              </button>
            ) : (
              <button
                onClick={() => handleCompanyAction('restore')}
                disabled={actionLoading}
                className="enterprise-console-button enterprise-console-button--primary"
                style={{ opacity: actionLoading ? 0.6 : 1 }}
              >
                ↻ Restore Company
              </button>
            )}

            <button
              onClick={async () => {
                const confirmed = await toast.confirm({
                  title: 'Delete Company',
                  description: `This will permanently remove ${selectedCompany.name || 'this company'} from the platform and revoke its access and integrations. Type the company name exactly to continue.`,
                  confirmLabel: 'Delete Company',
                  cancelLabel: 'Cancel',
                  requireText: selectedCompany.name || '',
                  placeholder: selectedCompany.name || 'Company name',
                });
                if (confirmed) {
                  await handleCompanyAction('delete', { confirmation_name: selectedCompany.name });
                }
              }}
              disabled={actionLoading}
              className="enterprise-console-button enterprise-console-button--danger"
              style={{ opacity: actionLoading ? 0.6 : 1 }}
            >
              🚨 Delete Company
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Companies List View (reordered for clearer information hierarchy)
  return (
    <div className="enterprise-console-page">
      {/* Level 1: Breadcrumb, Title, Description, Primary Action */}
      <div className="enterprise-console-page__hero">
        <div className="enterprise-console-page__hero-copy">
          <div className="enterprise-console-page__hero-eyebrow">Admin • Organization Management</div>
          <h1 className="enterprise-console-page__hero-title">Organization Management</h1>
          <p className="enterprise-console-page__hero-subtitle">Overview of organizations registered on the platform. Review verification status, manage approvals, and inspect subscription and account health.</p>
        </div>

      </div>

      {/* Level 2: Status Summary */}
      <div className="enterprise-console-section">
        <div className="enterprise-console-cards-row">
          <div className="enterprise-console-card enterprise-console-card--accent">
            <div className="enterprise-console-card__label">Total Companies</div>
            <div className="enterprise-console-card__value enterprise-console-card__value--accent">{meta.total}</div>
          </div>
          <div className="enterprise-console-card enterprise-console-card--success-soft">
            <div className="enterprise-console-card__label">Active</div>
            <div className="enterprise-console-card__value enterprise-console-card__value--success">{meta.active ?? meta.active_subscriptions}</div>
          </div>
          <div className="enterprise-console-card enterprise-console-card--warning-soft">
            <div className="enterprise-console-card__label">Pending</div>
            <div className="enterprise-console-card__value enterprise-console-card__value--warning">{meta.verification_pending}</div>
          </div>
          <div className="enterprise-console-card enterprise-console-card--danger-soft">
            <div className="enterprise-console-card__label">Suspended</div>
            <div className="enterprise-console-card__value enterprise-console-card__value--danger">{meta.suspended}</div>
          </div>
        </div>

        {/* Level 3: Attention banner (only shown when there are pending/verifications needing review) */}
        {meta.verification_pending > 0 && (
          <div className="enterprise-console-banner">
            <div className="enterprise-console-banner__text">Attention: {meta.verification_pending} companies need review</div>
            <div className="enterprise-console-banner__actions">
              <button
                onClick={() => { setVerificationStatus('admin_pending'); setPage(1); fetchCompanies(); }}
                className="enterprise-console-button enterprise-console-button--primary"
              >
                Show Pending
              </button>
            </div>
          </div>
        )}

        {/* Level 4: Search and Filters (moved immediately above the main table) */}
        <div className="enterprise-console-control-row">
          <input
            placeholder="Search companies by name, email, or registration number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="enterprise-console-input"
            style={{ width: isMobile ? '100%' : '340px' }}
          />
          <select
            value={verificationStatus}
            onChange={(e) => { setVerificationStatus(e.target.value); setPage(1); }}
            className="enterprise-console-select"
            style={{ width: isMobile ? '100%' : '240px' }}
          >
            {verificationOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setPage(1);
              setRefreshTick((value) => value + 1);
              fetchCompanies();
            }}
            className="enterprise-console-button enterprise-console-button--primary"
            style={{ width: isMobile ? '100%' : 'auto', maxWidth: '210px' }}
          >
            Search
          </button>
        </div>

        {/* Main table or mobile card list */}
        {isMobile ? (
          <div className="enterprise-console-mobile-list">
            {loading ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading companies…</div>
            ) : companies.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No companies found matching your search.</div>
            ) : companies.map((c) => (
              <div key={c.id} className="enterprise-console-mobile-card" style={{ padding: isTinyMobile ? '0.75rem' : '0.95rem', boxShadow: isTinyMobile ? 'none' : '0 1px 4px rgba(15, 23, 42, 0.05)' }}>
                <div className="enterprise-console-mobile-card__header">
                  <div style={{ minWidth: 0, flex: '1 1 0%' }}>
                    <div className="enterprise-console-mobile-card__title" style={{ fontSize: isTinyMobile ? '1rem' : '1.05rem' }}>{c.name}</div>
                    <div className="enterprise-console-mobile-card__subtitle" style={{ fontSize: isTinyMobile ? '0.82rem' : '0.88rem' }}>{c.business_email || c.business_registration_number || 'No contact details available'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button
                      onClick={() => setSelectedCompany(c)}
                      className="enterprise-console-label-button enterprise-console-label-button--info"
                      style={{ padding: isTinyMobile ? '0.55rem 0.9rem' : '0.45rem 0.85rem', fontSize: isTinyMobile ? '0.85rem' : '0.88rem' }}
                    >
                      Details
                    </button>
                  </div>
                </div>

                <div className="enterprise-console-mobile-card__meta">
                  <div className={`enterprise-console-badge ${getEmailVerificationBadge(c).tone === 'success' ? 'enterprise-console-badge--success' : 'enterprise-console-badge--warning'}`} style={{ padding: isTinyMobile ? '0.24rem 0.55rem' : '0.28rem 0.65rem', fontSize: isTinyMobile ? '0.78rem' : '0.82rem' }}>{getEmailVerificationBadge(c).text}</div>
                  <div className={`enterprise-console-badge ${c.admin_approval_status === 'Verified' ? 'enterprise-console-badge--success' : c.admin_approval_status === 'Rejected' ? 'enterprise-console-badge--danger' : 'enterprise-console-badge--warning'}`} style={{ padding: isTinyMobile ? '0.24rem 0.55rem' : '0.28rem 0.65rem', fontSize: isTinyMobile ? '0.78rem' : '0.82rem' }}>{c.admin_approval_status || 'Pending'}</div>
                  <div className={`enterprise-console-badge ${c.status === 'active' ? 'enterprise-console-badge--success' : c.status === 'suspended' ? 'enterprise-console-badge--danger' : 'enterprise-console-badge--warning'}`} style={{ padding: isTinyMobile ? '0.24rem 0.55rem' : '0.28rem 0.65rem', fontSize: isTinyMobile ? '0.78rem' : '0.82rem' }}>{c.status ? (c.status.charAt(0).toUpperCase() + c.status.slice(1)) : 'Pending review'}</div>
                </div>

                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {isPhone ? (
                    <div style={{ display: 'grid', gap: '0.5rem', width: '100%' }}>
                      <button
                        type="button"
                        aria-label="Company actions"
                        title="Actions"
                        onClick={() => setOpenActionsCompanyId((prev) => (prev === c.id ? null : c.id))}
                        className="enterprise-console-button enterprise-console-button--secondary"
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}
                      >
                        <span>{openActionsCompanyId === c.id ? 'Hide actions' : 'Actions'}</span>
                        <span style={{ fontSize: '1rem' }}>{openActionsCompanyId === c.id ? '−' : '+'}</span>
                      </button>
                      {openActionsCompanyId === c.id ? (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          <button
                            onClick={() => { setSelectedCompany(c); setOpenActionsCompanyId(null); }}
                            className="enterprise-console-actions__button enterprise-console-actions__button--ghost"
                            style={{ width: '100%', fontSize: '0.95rem' }}
                          >
                            View Details
                          </button>
                          {c.admin_verification_status !== 'Verified' && c.admin_approval_status !== 'Verified' && c.approval_status !== 'approved' && (
                            <button onClick={() => { setSelectedCompany(c); openVerificationModal('approve'); setOpenActionsCompanyId(null); }} className="enterprise-console-actions__button enterprise-console-actions__button--success" style={{ width: '100%', fontSize: '0.95rem' }}>Approve</button>
                          )}
                          {c.admin_verification_status !== 'Rejected' && c.admin_approval_status !== 'Rejected' && c.approval_status !== 'rejected' && (
                            <button onClick={() => { setSelectedCompany(c); openVerificationModal('reject'); setOpenActionsCompanyId(null); }} className="enterprise-console-actions__button enterprise-console-actions__button--danger" style={{ width: '100%', fontSize: '0.95rem' }}>Reject</button>
                          )}
                          {c.status !== 'suspended' ? (
                            <button onClick={() => { setSelectedCompany(c); handleCompanyAction('suspend'); setOpenActionsCompanyId(null); }} className="enterprise-console-actions__button enterprise-console-actions__button--danger" style={{ width: '100%', fontSize: '0.95rem', background: 'var(--warning)', color: '#1f2937' }}>Suspend</button>
                          ) : (
                            <button onClick={() => { setSelectedCompany(c); handleCompanyAction('restore'); setOpenActionsCompanyId(null); }} className="enterprise-console-actions__button enterprise-console-actions__button--ghost" style={{ width: '100%', fontSize: '0.95rem', color: 'var(--accent)' }}>Restore</button>
                          )}
                          <button
                            onClick={async () => {
                              setSelectedCompany(c);
                              const confirmed = await toast.confirm({
                                title: 'Delete Company',
                                description: 'Are you sure you want to permanently delete this company? This action cannot be undone.',
                                confirmLabel: 'Delete Company',
                                cancelLabel: 'Cancel',
                              });
                              if (confirmed) {
                                await handleCompanyAction('delete');
                              }
                              setOpenActionsCompanyId(null);
                            }}
                            className="enterprise-console-actions__button enterprise-console-actions__button--danger"
                            style={{ width: '100%', fontSize: '0.95rem' }}
                          >
                            Delete Company
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {c.admin_verification_status !== 'Verified' && c.admin_approval_status !== 'Verified' && c.approval_status !== 'approved' && (
                        <button onClick={() => { setSelectedCompany(c); openVerificationModal('approve'); }} className="enterprise-console-actions__button enterprise-console-actions__button--success" style={{ flex: 1 }}>Approve</button>
                      )}
                      {c.admin_verification_status !== 'Rejected' && c.admin_approval_status !== 'Rejected' && c.approval_status !== 'rejected' && (
                        <button onClick={() => { setSelectedCompany(c); openVerificationModal('reject'); }} className="enterprise-console-actions__button enterprise-console-actions__button--danger" style={{ flex: 1 }}>Reject</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="enterprise-console-table-wrapper">
            <table className="enterprise-console-table">
              <thead>
                <tr className="enterprise-console-table__head">
                  <th className="enterprise-console-table__cell enterprise-console-table__cell--header">Company Name</th>
                  <th className="enterprise-console-table__cell enterprise-console-table__cell--header">Email</th>
                  <th className="enterprise-console-table__cell enterprise-console-table__cell--header">Registration</th>
                  <th className="enterprise-console-table__cell enterprise-console-table__cell--header">Email Verified</th>
                  <th className="enterprise-console-table__cell enterprise-console-table__cell--header">SYSTEM ADMINISTRATION CONSOLE Approval</th>
                  <th className="enterprise-console-table__cell enterprise-console-table__cell--header">Status</th>
                  <th className="enterprise-console-table__cell enterprise-console-table__cell--header">Subscription</th>
                  <th className="enterprise-console-table__cell enterprise-console-table__cell--header">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="enterprise-console-table__cell" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading companies…</td></tr>
                ) : companies.length === 0 ? (
                  <tr><td colSpan={8} className="enterprise-console-table__cell" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No companies found matching your search.</td></tr>
                ) : companies.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--surface-elevated)' }}>
                    <td className="enterprise-console-table__cell" style={{ color: 'var(--text)', fontWeight: 600 }}>{c.name}</td>
                    <td className="enterprise-console-table__cell" style={{ color: 'var(--text-muted)' }}>{c.business_email}</td>
                    <td className="enterprise-console-table__cell" style={{ color: 'var(--text-muted)' }}>{c.business_registration_number || c.company_code || 'Not registered yet'}</td>
                    <td className="enterprise-console-table__cell">
                      <span className={`enterprise-console-label-button ${getEmailVerificationBadge(c).tone === 'success' ? 'enterprise-console-label-button--success' : 'enterprise-console-label-button--warning'}`}>{getEmailVerificationBadge(c).text}</span>
                    </td>
                    <td className="enterprise-console-table__cell">
                      <span className={`enterprise-console-label-button ${c.admin_approval_status === 'Verified' ? 'enterprise-console-label-button--success' : c.admin_approval_status === 'Rejected' ? 'enterprise-console-label-button--danger' : 'enterprise-console-label-button--warning'}`}>
                        {c.admin_approval_status || 'Pending'}
                      </span>
                    </td>
                    <td className="enterprise-console-table__cell">
                      <span className={`enterprise-console-label-button ${c.status === 'active' ? 'enterprise-console-label-button--success' : c.status === 'suspended' ? 'enterprise-console-label-button--danger' : 'enterprise-console-label-button--warning'}`}>
                        {c.status ? (c.status.charAt(0).toUpperCase() + c.status.slice(1)) : 'Pending review'}
                      </span>
                    </td>
                    <td className="enterprise-console-table__cell" style={{ color: 'var(--text-muted)' }}>{c.subscription_status ?? '-'}</td>
                    <td className="enterprise-console-table__cell">
                      <div className="enterprise-console-actions">
                        <button onClick={() => setSelectedCompany(c)} className="enterprise-console-actions__button enterprise-console-actions__button--ghost">View Details</button>

                        {c.admin_verification_status !== 'Verified' && c.admin_approval_status !== 'Verified' && c.approval_status !== 'approved' && (
                          <button onClick={() => { setSelectedCompany(c); openVerificationModal('approve'); }} className="enterprise-console-actions__button enterprise-console-actions__button--success">Approve</button>
                        )}

                        {c.admin_verification_status !== 'Rejected' && c.admin_approval_status !== 'Rejected' && c.approval_status !== 'rejected' && (
                          <button onClick={() => { setSelectedCompany(c); openVerificationModal('reject'); }} className="enterprise-console-actions__button enterprise-console-actions__button--danger">Reject</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {companies.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Page {page} · Showing {companies.length} companies</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { if (page > 1) { setPage(page - 1); setRefreshTick((value) => value + 1); fetchCompanies(); } }}
                disabled={page === 1}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: page === 1 ? 'var(--border)' : 'var(--card)',
                  color: 'var(--text)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => { if (page * perPage < meta.total) { setPage(page + 1); setRefreshTick((value) => value + 1); fetchCompanies(); } }}
                disabled={page * perPage >= meta.total}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: page * perPage >= meta.total ? 'var(--border)' : 'var(--card)',
                  color: 'var(--text)',
                  cursor: page * perPage >= meta.total ? 'not-allowed' : 'pointer',
                  opacity: page * perPage >= meta.total ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DevelopersPage() {
  return (
    <EnterpriseConsolePage
      title="Developers"
      subtitle="Provision secure credentials, manage integrations, and oversee webhooks, retries, and documentation."
      eyebrow="Developer center"
      actions={<button className="btn btn-primary" type="button">Manage webhooks</button>}
      metrics={[
        { label: 'API keys', value: '44', detail: 'Active', tone: 'info' },
        { label: 'Webhook endpoints', value: '14', detail: 'Configured', tone: 'info' },
        { label: 'Webhook logs', value: '328', detail: 'Last 24h', tone: 'info' },
        { label: 'retry queue', value: '11', detail: 'Pending', tone: 'warning' },
        { label: 'Secret rotation', value: 'Scheduled', detail: 'Next 7 days', tone: 'success' },
      ]}
      primaryPanel={{
        title: 'Developer operations',
        description: 'Provide the tools teams need to integrate confidently while keeping risk under control.',
        items: [
          { label: 'API documentation', value: 'Reference and SDK guidance available', status: 'success' },
          { label: 'System integrations', value: 'Connected to CRM, analytics, and messaging', status: 'info' },
          { label: 'Webhook management', value: 'Endpoints and delivery policies managed centrally', status: 'info' },
        ],
      }}
      secondaryPanel={{
        title: 'Readiness',
        description: 'Balance speed and resilience with secure keys, verified webhooks, and observability.',
        items: [
          { label: 'API usage', value: 'High-volume throughput remains healthy' },
          { label: 'Retry queue', value: 'Manual intervention only for exceptions' },
          { label: 'Secret rotation', value: 'Automated and auditable' },
        ],
      }}
      footerPanels={[
        {
          title: 'Webhook center',
          description: 'Manage webhook configuration, delivery reliability, and endpoint rotation from one place.',
          items: [
            { label: 'Configured webhook endpoints', value: '14' },
            { label: 'Delivery success rate', value: '92%' },
            { label: 'Rotation status', value: 'Enabled' },
          ],
        },
      ]}
    />
  );
}

export function CommunicationCenterPage() {
  return (
    <EnterpriseConsolePage
      title="Communication Center"
      subtitle="Route announcements, attachments, and secure messages with rich history and delivery tracking."
      eyebrow="Communication"
      metrics={[
        { label: 'Inbox', value: '82', detail: 'Unread', tone: 'warning' },
        { label: 'Sent', value: '214', detail: 'This week', tone: 'info' },
        { label: 'Announcements', value: '12', detail: 'Broadcasts', tone: 'success' },
        { label: 'Read receipts', value: '94%', detail: 'Delivered', tone: 'success' },
      ]}
      primaryPanel={{
        title: 'Message operations',
        description: 'Coordinate communications with company managers and platform stakeholders in one place.',
        items: [
          { label: 'Compose', value: 'Create targeted messages and attachments', status: 'info' },
          { label: 'Conversation history', value: 'Full thread visibility for every message', status: 'success' },
          { label: 'Search', value: 'Find any message by content or recipient', status: 'info' },
        ],
      }}
      secondaryPanel={{
        title: 'Engagement',
        description: 'Support fast communication while preserving accountability and platform trust.',
        items: [
          { label: 'Attachments', value: 'Files stored with retention policy' },
          { label: 'Read receipts', value: 'Available for each outbound message' },
          { label: 'Announcements', value: 'Broadcast to all impacted managers' },
        ],
      }}
    />
  );
}

export function NotificationCenterPage() {
  return (
    <EnterpriseConsolePage
      title="Notification Center"
      subtitle="Manage alerts, incident notifications, and personnel communication flows."
      eyebrow="Notifications"
      metrics={[
        { label: 'Alert volume', value: '27', detail: 'Today', tone: 'warning' },
        { label: 'Delivered', value: '24', detail: 'Success', tone: 'success' },
        { label: 'Pending', value: '3', detail: 'Review needed', tone: 'warning' },
        { label: 'Escalated', value: '1', detail: 'Critical', tone: 'danger' },
      ]}
      primaryPanel={{
        title: 'Alert state',
        description: 'Keep administrators aware of incidents, approvals, and system lifecycle events.',
        items: [
          { label: 'Incident alerts', value: 'High-priority events are routed immediately', status: 'danger' },
          { label: 'Announcements', value: 'Critical notices remain visible for stakeholders', status: 'warning' },
          { label: 'Routing', value: 'Notifications are prioritized by severity', status: 'info' },
        ],
      }}
      secondaryPanel={{
        title: 'Operational focus',
        description: 'Ensure every operational signal leads to the right response without noise.',
        items: [
          { label: 'Queue health', value: 'Notifications stay within SLA' },
          { label: 'Status', value: 'Delivery channels remain healthy' },
          { label: 'Coverage', value: 'All admin teams are represented' },
        ],
      }}
    />
  );
}

// Legacy executive notice removed — Executive dashboard now shows live metrics.

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const normalizeGender = (value: unknown) => {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return ['male', 'female', 'other', 'prefer-not-to-say'].includes(normalized) ? normalized : 'prefer-not-to-say';
  };
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: normalizeGender(user?.gender),
    bio: user?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const isCompactViewport = viewport === 'mobile' || viewport === 'tablet';

  useEffect(() => {
    const updateViewport = () => {
      if (window.innerWidth < 768) {
        setViewport('mobile');
      } else if (window.innerWidth < 1024) {
        setViewport('tablet');
      } else {
        setViewport('desktop');
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      gender: normalizeGender(user?.gender),
      bio: user?.bio || '',
    });
    setHasChanges(false);
  }, [user]);

  useEffect(() => {
    if (!message || message.type === 'success') return;

    const timer = window.setTimeout(() => setMessage(null), 6500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const dismissMessage = () => setMessage(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };



  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender,
        bio: formData.bio,
      };

      await api.put('/v1/auth/profile', payload);

      if (refreshUser) {
        await refreshUser();
      }

      setHasChanges(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      setMessage({ type: 'success', text: 'Profile updated successfully. Your system admin identity is now synced across the console.' });
    } catch (err: any) {
      // Surface server-provided validation or error messages when available
      const serverMessage = err?.response?.data?.message;

      if (serverMessage) {
        setMessage({ type: 'error', text: serverMessage });
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.current_password || !passwordForm.password || !passwordForm.password_confirmation) {
      setPasswordMessage({ type: 'error', text: 'Please complete the current password, new password, and confirmation fields.' });
      return;
    }

    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordMessage({ type: 'error', text: 'The new password and confirmation do not match.' });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    try {
      await changePassword({
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      });

      setPasswordMessage({ type: 'success', text: 'Your password was updated securely. Please use the new credentials for future sign-ins.' });
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err?.response?.data?.message || 'We were unable to change your password. Please verify your current password and try again.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '2rem', maxWidth: '900px' }}>
      <section style={{ padding: '2rem', borderRadius: 28, background: 'rgba(var(--accent-rgb), 0.12)', border: '1px solid rgba(var(--accent-rgb), 0.24)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
          <div>
            <div style={{ color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: '0.78rem', fontWeight: 700 }}>ACCOUNT</div>
            <h2 style={{ margin: '0.5rem 0 0.4rem', fontSize: 'clamp(1.5rem, 2.2vw, 2.1rem)', color: 'var(--text)' }}>Profile Management</h2>
            <p style={{ margin: 0, lineHeight: 1.75, color: 'var(--text-muted)' }}>Manage your personal information, preferences, and account settings.</p>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{
          padding: '0.55rem 0.95rem',
          borderRadius: 999,
          border: '1px solid rgba(var(--accent-rgb), 0.26)',
          background: 'rgba(var(--accent-rgb), 0.1)',
          color: 'var(--accent)',
          fontSize: '0.88rem',
          fontWeight: 700,
        }}>
          {saving ? 'Saving your changes…' : hasChanges ? 'Unsaved changes' : lastSavedAt ? `Saved at ${lastSavedAt}` : 'All changes saved'}
        </div>

        {message && (
          <div style={{
            padding: '1rem 1.2rem',
            borderRadius: 16,
            background: message.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
            border: message.type === 'success' ? '1px solid var(--success-soft)' : '1px solid var(--danger-soft)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            flex: 1,
            minWidth: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}>
            <span>{message.text}</span>
            <button
              type="button"
              onClick={dismissMessage}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 700,
                opacity: 0.8,
                padding: 0,
              }}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gap: '2rem', alignItems: 'start', padding: '1.5rem', borderRadius: 20, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--border)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>Email Address</label>
              <input
                type="email"
                value={formData.email}
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '1rem',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Email address cannot be changed</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--border)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--border)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                  }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself (optional)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--border)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  minHeight: '100px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', padding: '1.5rem', borderRadius: 20, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Account Role</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>{user?.roles?.[0]?.name || 'System Administrator'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Account Status</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--success)' }}>Active</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSaveProfile}
            disabled={saving || !hasChanges}
            style={{
              padding: '0.8rem 1.8rem',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent)',
              color: 'white',
              fontWeight: 600,
              cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
              opacity: saving || !hasChanges ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      <section style={{ padding: '1.75rem', borderRadius: 24, background: 'linear-gradient(135deg, var(--surface-2), var(--surface-3))', border: '1px solid rgba(var(--accent-rgb), 0.24)', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: '0.75rem', fontWeight: 700 }}>SECURITY</div>
            <h3 style={{ margin: '0.4rem 0 0.35rem', fontSize: '1.3rem', color: 'var(--text)' }}>Password Security</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.75 }}>Use your current password followed by a strong new password. This keeps your account secure and aligns with the enterprise standards used across every dashboard.</p>
          </div>
          <div style={{ padding: '0.55rem 0.9rem', borderRadius: 999, background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-soft)', fontWeight: 700, fontSize: '0.85rem' }}>Protected</div>
        </div>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>Current password</label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
              placeholder="Enter your current password"
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: 12, border: '1px solid rgba(var(--accent-rgb), 0.22)', background: 'var(--border)', color: 'var(--text)', fontSize: '0.98rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>New password</label>
            <input
              type="password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Choose a strong new password"
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: 12, border: '1px solid rgba(var(--accent-rgb), 0.22)', background: 'var(--border)', color: 'var(--text)', fontSize: '0.98rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>Confirm new password</label>
            <input
              type="password"
              value={passwordForm.password_confirmation}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
              placeholder="Confirm your new password"
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: 12, border: '1px solid rgba(var(--accent-rgb), 0.22)', background: 'var(--border)', color: 'var(--text)', fontSize: '0.98rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--accent)', fontSize: '0.9rem', lineHeight: 1.8 }}>
            Passwords must be between 4 and 8 characters and include a mix of letters and numbers for a secure, streamlined sign-in experience.
          </div>
          <button
            type="button"
            onClick={handlePasswordChange}
            disabled={passwordSaving || !passwordForm.current_password || !passwordForm.password || !passwordForm.password_confirmation}
            style={{ padding: '0.85rem 1.5rem', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', color: 'white', fontWeight: 700, cursor: passwordSaving ? 'not-allowed' : 'pointer', opacity: passwordSaving || !passwordForm.current_password || !passwordForm.password || !passwordForm.password_confirmation ? 0.6 : 1 }}
          >
            {passwordSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>

        {passwordMessage && (
          <div style={{ padding: '1rem 1.15rem', borderRadius: 14, background: passwordMessage.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)', border: passwordMessage.type === 'success' ? '1px solid var(--success-soft)' : '1px solid var(--danger-soft)', color: passwordMessage.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
            {passwordMessage.text}
          </div>
        )}
      </section>
    </div>
  );
}
