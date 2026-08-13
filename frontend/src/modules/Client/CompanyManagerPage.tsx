import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../../components/ui/Avatar';
import { api } from '../../api';
// @ts-expect-error: qrcode has no bundled type definitions
import QRCode from 'qrcode';
import { changePassword, confirmMfa, fetchSecuritySummary, revokeAllSessions, revokeSession, setupMfa } from '../../services/auth';
import { cancelClientDelivery, createClientDelivery, deleteClientDelivery, downloadClientDeliveryDocument, fetchClientDeliveries, fetchClientCustomers, fetchClientDeliveryMonthlyStats, fetchCompany, fetchClientDocuments, downloadClientDocument, requestClientDeliveryPrintForm, updateClientDelivery, type Delivery, type Customer, type ClientDocumentRecord } from '../../services/client';
import { DeliveryStatus, DELIVERY_OPEN_STATUSES, DELIVERY_STATUS_OPTIONS, getDeliveryStatusLabel } from '../../types/delivery';
import Table from '../../components/ui/Table';
import Card from '../../components/ui/Card';
import { ColumnChart, SimpleBarChartCard, SimpleDonutChartCard, SimpleLineChartCard } from '../../components/ui/Charts';
import { useToast } from '../../components/ui/ToastProvider';
import { DocumentVerificationScanner } from '../../components/ui/DocumentVerificationScanner';
import { formatEthiopianDateTime, makeReportFileName } from '../../utils/dates';
import { resolveMediaUrl } from '../../utils/media';
import '../../styles/app.css';

type DeliveryFormState = {
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

function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: React.ReactNode }) {
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

function StatCard({ label, value, delta, tone }: { label: string; value: string; delta?: string; tone?: 'positive' | 'neutral' | 'warning' }) {
  const toneClass = tone === 'positive' ? 'company-stat-card--positive' : tone === 'warning' ? 'company-stat-card--warning' : '';

  return (
    <Card className={`company-stat-card ${toneClass}`}>
      <div className="company-stat-card__label">{label}</div>
      <div className="company-stat-card__value">{value}</div>
      {delta ? <div className="company-stat-card__delta">{delta}</div> : null}
    </Card>
  );
}

function Chip({ label, tone }: { label: string; tone?: 'success' | 'neutral' | 'warning' }) {
  return <span className={`company-chip ${tone ? `company-chip--${tone}` : ''}`}>{label}</span>;
}

export function ClientDashboardPage() {
  const auth = useAuth();
  const toast = useToast();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryTotal, setDeliveryTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; time?: string }>>([]);
  const [verificationQuery, setVerificationQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [monthlyDeliveryStats, setMonthlyDeliveryStats] = useState<Array<{ month: number; total: number }>>(() => Array.from({ length: 12 }, (_, index) => ({ month: index + 1, total: 0 })));

  const isCompanyApproved = Boolean(
    auth.user?.company?.admin_verification_status === 'Verified' ||
    auth.user?.company?.approval_status === 'approved'
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const loadDashboardMetrics = async () => {
      const [deliveriesResult, monthlyStatsResult] = await Promise.allSettled([
        fetchClientDeliveries({ per_page: 8 }),
        fetchClientDeliveryMonthlyStats(),
      ]);

      if (!mounted) return;

      const failures: string[] = [];

      if (deliveriesResult.status === 'fulfilled') {
        setDeliveries(deliveriesResult.value.data ?? []);
        setDeliveryTotal(deliveriesResult.value.meta?.total ?? null);
      } else {
        console.error('Failed to load company deliveries', deliveriesResult.reason);
        failures.push('deliveries');
      }

      if (monthlyStatsResult.status === 'fulfilled') {
        setMonthlyDeliveryStats(monthlyStatsResult.value);
      } else {
        console.error('Failed to load monthly delivery statistics', monthlyStatsResult.reason);
        failures.push('delivery performance');
      }

      if (failures.includes('deliveries')) {
        const message = 'Delivery activity could not be loaded. Refresh to retry.';
        setError(message);
        toast.error({ title: 'Unable to Load Dashboard Metrics', description: message });
      } else if (failures.length > 0) {
        const message = `Some supporting dashboard data is unavailable: ${failures.join(', ')}. Delivery activity remains available.`;
        setError(message);
        toast.warning({ title: 'Supporting Data Unavailable', description: message });
      }

      setLoading(false);
    };

    void loadDashboardMetrics();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // try to load lightweight notifications; fail silently if endpoint is missing
    let mounted = true;
    api.get('/v1/client/notifications').then((r) => {
      if (!mounted) return;
      setNotifications(r.data?.data ?? []);
    }).catch(() => {}).finally(() => {});

    return () => { mounted = false; };
  }, []);

  const activeDeliveries = useMemo(() => deliveries.slice(0, 5), [deliveries]);

  const deliveryPerformanceChartData = useMemo(() => {
    const monthLookup = new Map(
      monthlyDeliveryStats.map((item) => [Number(item.month), Number(item.total) || 0]),
    );

    const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

    return monthLabels.map((label, index) => ({
      label,
      value: monthLookup.get(index + 1) ?? 0,
    }));
  }, [monthlyDeliveryStats]);

  const stats = useMemo(() => {
    const totalDeliveries = deliveryTotal ?? deliveries.length;
    const pendingDeliveries = deliveries.filter((d) => DELIVERY_OPEN_STATUSES.includes(d.status as DeliveryStatus)).length;
    const completedDeliveries = deliveries.filter((d) => d.status === DeliveryStatus.Delivered).length;
    const cancelledDeliveries = deliveries.filter((d) => [DeliveryStatus.Cancelled, DeliveryStatus.Failed].includes(d.status as DeliveryStatus)).length;
    const successRate = totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0;

    return [
      { key: 'total', label: 'Total deliveries', value: String(totalDeliveries), delta: `${pendingDeliveries} pending`, tone: 'neutral' as const },
      { key: 'pending', label: 'Pending deliveries', value: String(pendingDeliveries), delta: 'Needs action', tone: 'warning' as const },
      { key: 'completed', label: 'Completed deliveries', value: String(completedDeliveries), delta: 'Completed', tone: 'positive' as const },
      { key: 'success_rate', label: 'Delivery success rate', value: `${successRate}%`, delta: 'Completion rate', tone: 'positive' as const },
      { key: 'cancelled', label: 'Cancelled deliveries', value: String(cancelledDeliveries), delta: 'Cancelled', tone: 'neutral' as const },
    ];
  }, [deliveryTotal, deliveries]);

  const pendingDeliveryNames = deliveries
    .filter((d) => DELIVERY_OPEN_STATUSES.includes(d.status as DeliveryStatus))
    .map((d) => d.external_reference ?? d.tracking_number ?? d.uuid)
    .filter(Boolean);

  const deliveryTrendLabel = pendingDeliveryNames.length > 0
    ? `▲ ${pendingDeliveryNames.length} pending deliveries need attention`
    : '▼ No pending deliveries at the moment';

  const parseVerificationToken = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    try {
      const parsedUrl = new URL(trimmed);
      const match = parsedUrl.pathname.match(/\/reports\/verify\/([A-Za-z0-9]{64})/);
      if (match) {
        return match[1];
      }
    } catch {
      // not a URL
    }

    if (/^[A-Za-z0-9]{64}$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  };

  const handleVerifyDocument = async () => {
    const query = verificationQuery.trim();
    if (!query) {
      setVerificationError('Please enter a report verification token or verification URL.');
      setVerificationResult(null);
      return;
    }

    const token = parseVerificationToken(query);
    if (!token) {
      setVerificationError('Company dashboard verification supports tokens or verification URLs only. For reference numbers, use the Audit & Reports console.');
      setVerificationResult(null);
      return;
    }

    setVerificationLoading(true);
    setVerificationError(null);
    setVerificationResult(null);

    try {
      const response = await api.get(`/v1/reports/verify/${token}`);
      setVerificationResult(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to verify the document right now. Please check the token or verification URL.';
      setVerificationError(message);
    } finally {
      setVerificationLoading(false);
    }
  };

  const deliveredDeliveryNames = deliveries
    .filter((d) => d.status === DeliveryStatus.Delivered)
    .map((d) => d.external_reference ?? d.tracking_number ?? d.uuid)
    .filter(Boolean);

  const columns = useMemo(
    () => [
      { key: 'tracking_number', label: 'Tracking' },
      {
        key: 'external_reference',
        label: 'Customer / Reference',
        render: (delivery: Delivery) => delivery.external_reference ?? delivery.uuid,
      },
      {
        key: 'status',
        label: 'Status',
        render: (delivery: Delivery) => (
          <span className={`company-status ${delivery.status === DeliveryStatus.Delivered ? 'company-status--live' : 'company-status--warning'}`}>
            {getDeliveryStatusLabel(delivery.status)}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: 'Created',
        render: (delivery: Delivery) => (delivery.created_at ? new Date(delivery.created_at).toLocaleString() : '—'),
      },
    ],
    [],
  );

  return (
    <div className="company-dashboard company-dashboard--command-center">
      <PageHeader
        eyebrow="Command Center"
        title="Command Center"
        description="Monitor company operations, delivery performance, and customer engagement in one secure command center."
        actions={(
          <div className="company-dashboard-actions">
            <div className="company-dashboard-actions__primary">
              <Link className="btn btn-secondary" to="/client/deliveries">View Delivery Operations</Link>
              <Link className="btn btn-primary" to="/client/company">Organization settings</Link>
            </div>
          </div>
        )}
      />

      {!isCompanyApproved ? (
        <div className="company-notice company-notice--info">
          <strong>✓ Account Active</strong> — Your email is verified and your company dashboard is active. System administrator review is in progress for API Key generation & third-party integrations.
        </div>
      ) : null}

      <section className="company-panel company-panel--verify">
        <div className="company-panel__header">
          <div>
            <p className="company-panel__eyebrow">Document verification</p>
            <h2>Verify exported documents</h2>
          </div>
          <p className="company-panel__meta">Use any verification URL or token from a report export to confirm that the document is authentic.</p>
        </div>

        <div className="company-panel__body">
          <div className="company-panel__field">
            <label className="field-label">Verification URL or token</label>
            <input
              className="input-base"
              type="text"
              value={verificationQuery}
              onChange={(event) => setVerificationQuery(event.target.value)}
              placeholder="Enter a verification token or report URL"
            />
            {verificationError ? <div className="field-error">{verificationError}</div> : null}
          </div>
          <DocumentVerificationScanner
            value={verificationQuery}
            onChange={setVerificationQuery}
            buttonLabel="Scan exported document QR"
            compact
          />
          <button
            type="button"
            className="btn btn-primary company-panel__button"
            onClick={handleVerifyDocument}
            disabled={verificationLoading}
          >
            {verificationLoading ? 'Verifying…' : 'Verify document'}
          </button>

          {verificationResult ? (
            <div className="company-verification-result">
              <div className="company-verification-result__header">
                <div>
                  <div className="company-verification-result__title">Document verification {verificationResult.status === 'valid' ? 'successful' : 'failed'}</div>
                  <div className="company-verification-result__subtitle">{verificationResult.message || 'Verification completed against system records.'}</div>
                </div>
                <span className={`company-status ${verificationResult.status === 'valid' ? 'company-status--live' : 'company-status--warning'} company-status--pill`}>{verificationResult.status}</span>
              </div>

              <div className="company-verification-result__details">
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
        </div>
      </section>

      <section className="dashboard-metrics dashboard-metrics--compact">
        <div className="dashboard-metrics__grid">
              <Card className="dashboard-metrics__card dashboard-metrics__card--deliveries">
            <div className="dashboard-metrics__card-header">
              <div className="dashboard-metrics__icon">📦</div>
              <div>
                <p className="dashboard-metrics__eyebrow">Deliveries</p>
                <h3 className="dashboard-metrics__label">Operational snapshot</h3>
              </div>
            </div>
            <div className="dashboard-metrics__grid-sm">
              {stats
                .filter((stat) => ['total', 'pending', 'completed', 'cancelled'].includes(stat.key))
                .map((stat) => (
                  <div key={stat.key} className={`dashboard-metrics__mini-row dashboard-metrics__mini-row--${stat.key}`}>
                    <div className="dashboard-metrics__mini-icon">
                      {stat.key === 'pending' ? '⚠️' : stat.key === 'completed' ? '✅' : stat.key === 'cancelled' ? '✖️' : '📦'}
                    </div>
                    <div>
                      <div className="dashboard-metrics__mini-label">{stat.label}</div>
                      <div className="dashboard-metrics__mini-value">{stat.value}</div>
                    </div>
                    <div className="dashboard-metrics__mini-delta">{stat.delta}</div>
                  </div>
                ))}
            </div>
            <div className="dashboard-metrics__note">{deliveryTrendLabel}</div>
          </Card>
        </div>

        <div className="dashboard-action-required">
          <div className="dashboard-action-required__title">⚠️ Action Required</div>
          <p className="dashboard-action-required__summary">Focus on pending deliveries with the highest urgency to keep the workflow smooth.</p>
          {pendingDeliveryNames.length > 0 ? (
            <ul className="dashboard-action-required__list">
              {pendingDeliveryNames.slice(0, 4).map((id) => (
                <li key={id}>{id}</li>
              ))}
              {pendingDeliveryNames.length > 4 ? (
                <li className="dashboard-action-required__more">+{pendingDeliveryNames.length - 4} more pending deliveries</li>
              ) : null}
            </ul>
          ) : (
            <div className="dashboard-action-required__empty">No pending deliveries require immediate action.</div>
          )}
        </div>
      </section>

      <section className="company-grid company-grid--split company-grid--gap-lg company-grid--spaced-top">
        <Card title="Delivery performance" subtitle="Throughput and route efficiency" className="company-card company-card--chart">
          <ColumnChart
            barColor="var(--accent)"
            data={deliveryPerformanceChartData}
          />
        </Card>

        <div className="company-panel-stack">
          <Card title="Organization profile" subtitle="Operations overview" className="company-card company-card--stacked">
            <div className="company-profile-summary">
              <Avatar name="CM" />
              <div>
                <strong>Corporate delivery operations</strong>
              </div>
            </div>
            <ul className="company-profile-list">
              <li>Primary contact: Operations team</li>
              <li>Address: Shared fulfillment center</li>
              <li>Verification status: <strong>Verified</strong></li>
              <li>Email verification: <strong>Verified</strong></li>
            </ul>
          </Card>

          <Card title="Notifications" subtitle="Recent alerts & system messages" className="company-card company-card--stacked">
            {notifications.length === 0 ? (
              <div className="company-empty-state">No new notifications</div>
            ) : (
              <ul className="company-notifications-list">
                {notifications.slice(0,5).map((n) => (
                  <li key={n.id} className="company-notification-item"><strong>{n.message}</strong><div className="company-notification-time">{n.time}</div></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <section className="company-grid company-grid--split company-grid--gap-lg company-grid--spaced-top">
        <Card title="Recent activities" subtitle="Latest deliveries and actions" className="company-card company-card--fullwidth company-card--activities">
          {loading ? (
            <div className="company-empty-state">Loading recent activities…</div>
          ) : activeDeliveries.length === 0 ? (
            <div className="company-empty-state">No recent activities recorded yet.</div>
          ) : (
            <div className="company-activity-feed" aria-label="Recent delivery activities">
              <div className="company-activity-feed__summary">
                <span>Showing the latest {activeDeliveries.length} activities</span>
                {deliveryTotal && deliveryTotal > activeDeliveries.length ? <Link to="/client/deliveries">View all {deliveryTotal.toLocaleString()} deliveries</Link> : null}
              </div>
              {activeDeliveries.map((delivery) => {
                const activityId = delivery.uuid || delivery.tracking_number;
                const isExpanded = expandedActivityId === activityId;
                const statusLabel = getDeliveryStatusLabel(delivery.status);
                const createdAt = delivery.created_at ? new Date(delivery.created_at).toLocaleString() : 'Time unavailable';

                return (
                  <div key={activityId} className={`company-activity-item ${isExpanded ? 'company-activity-item--expanded' : ''}`}>
                    <button
                      type="button"
                      className="company-activity-item__summary"
                      onClick={() => setExpandedActivityId(isExpanded ? null : activityId)}
                      aria-expanded={isExpanded}
                      aria-controls={`activity-details-${activityId}`}
                    >
                      <span className="company-activity-item__marker" aria-hidden="true" />

                      <span className="company-activity-item__main">
                        <span className="company-activity-item__headline">
                          <strong>{delivery.external_reference || delivery.tracking_number || 'Delivery activity'}</strong>
                          <span className={`company-status ${delivery.status === DeliveryStatus.Delivered ? 'company-status--live' : 'company-status--warning'}`}>{statusLabel}</span>
                        </span>
                        <span className="company-activity-item__meta">{createdAt}</span>
                      </span>

                      <span className="company-activity-item__toggle">{isExpanded ? 'Hide details' : 'View details'} <span aria-hidden="true">{isExpanded ? '−' : '+'}</span></span>
                    </button>

                    {isExpanded ? (
                      <div id={`activity-details-${activityId}`} className="company-activity-item__details">
                        <div className="company-detail-panel company-activity-item__detail-panel">
                          <div className="company-detail-row">
                            <span>Tracking number</span>
                            <strong>{delivery.tracking_number || '—'}</strong>
                          </div>
                          <div className="company-detail-row">
                            <span>Reference</span>
                            <strong>{delivery.external_reference || '—'}</strong>
                          </div>
                          <div className="company-detail-row">
                            <span>Status</span>
                            <strong>{statusLabel}</strong>
                          </div>
                          <div className="company-detail-row">
                            <span>Created</span>
                            <strong>{createdAt}</strong>
                          </div>
                        </div>

                        {delivery.package ? (
                          <div className="company-detail-panel company-activity-item__detail-panel">
                            <div className="company-detail-row company-detail-row--header">
                              <strong>Package details</strong>
                            </div>
                            <div className="company-detail-row">
                              <span>Type</span>
                              <strong>{delivery.package.type || 'Package'}</strong>
                            </div>
                            {delivery.package.description ? (
                              <div className="company-detail-row">
                                <span>Description</span>
                                <strong>{delivery.package.description}</strong>
                              </div>
                            ) : null}
                            {delivery.package.quantity ? (
                              <div className="company-detail-row">
                                <span>Quantity</span>
                                <strong>{delivery.package.quantity}</strong>
                              </div>
                            ) : null}
                            {delivery.package.weight ? (
                              <div className="company-detail-row">
                                <span>Weight</span>
                                <strong>{delivery.package.weight} {delivery.package.weight_unit || 'kg'}</strong>
                              </div>
                            ) : null}
                            {delivery.package.special_handling ? (
                              <div className="company-detail-row">
                                <span>Handling</span>
                                <strong>{delivery.package.special_handling}</strong>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Monthly statistics" subtitle="Last 12 months" className="company-card company-card--fullwidth">
          <div className="company-stats-summary">
            <div className="company-stats-summary__row">
              <span>Deliveries</span>
              <span>{deliveryTotal ?? deliveries.length}</span>
            </div>
            <div className="company-stats-summary__row">
              <span>Completed</span>
              <span>{deliveredDeliveryNames.length}</span>
            </div>
            <div className="company-stats-summary__row">
              <span>Pending</span>
              <span>{pendingDeliveryNames.length}</span>
            </div>
          </div>

          <div className="company-stats-breakdown">
            <div>
              <div className="company-stats-breakdown__title">Recent completed deliveries</div>
              {deliveredDeliveryNames.length > 0 ? (
                <ul className="company-list-styled">
                  {deliveredDeliveryNames.slice(0, 4).map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                  {deliveredDeliveryNames.length > 4 ? <li className="company-list-styled__more">+{deliveredDeliveryNames.length - 4} more completed deliveries</li> : null}
                </ul>
              ) : (
                <div className="company-empty-state">No completed deliveries available yet.</div>
              )}
            </div>

            <div>
              <div className="company-stats-breakdown__title">Pending deliveries</div>
              {pendingDeliveryNames.length > 0 ? (
                <ul className="company-list-styled">
                  {pendingDeliveryNames.slice(0, 4).map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                  {pendingDeliveryNames.length > 4 ? <li className="company-list-styled__more">+{pendingDeliveryNames.length - 4} more pending deliveries</li> : null}
                </ul>
              ) : (
                <div className="company-empty-state">All deliveries have been completed.</div>
              )}
            </div>
          </div>

          <div className="company-sparkline">
            <div className="company-sparkline__bar" />
          </div>
        </Card>
      </section>
    </div>
  );
}

export function ClientCustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchClientCustomers({ per_page: 12 })
      .then((response) => {
        if (!mounted) return;
        setCustomers(response.data ?? []);
      })
      .catch((err) => {
        console.error('Failed to load customer list', err);
        if (!mounted) return;
        const message = 'Unable to load customers. Refresh to retry.';
        setError(message);
        toast.error({ title: 'Unable to Load Customers', description: message });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      {
        key: 'created_at',
        label: 'Joined',
        render: (customer: Customer) => (customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '—'),
      },
    ],
    [],
  );

  return (
    <div className="company-dashboard">
      <PageHeader title="Customers" description="Review your customer roster, contact points, and activity status." actions={(<Link className="btn btn-primary" to="/client/customers">Add customer</Link>)} />
      <section className="company-grid company-grid--stats">
        <StatCard label="Customers" value={String(customers.length)} delta="Active accounts" tone="positive" />
        <StatCard label="Open support" value="2" delta="Critical tickets" tone="warning" />
        <StatCard label="Verified profiles" value="100%" delta="Trusted contacts" tone="neutral" />
      </section>
      <article className="company-card">
        <div className="company-card__header">
          <div>
            <p className="company-card__eyebrow">Customer roster</p>
            <h3>Recent company customers</h3>
          </div>
        </div>
        {loading ? (
          <div className="company-card__placeholder">Loading customer data…</div>
        ) : customers.length === 0 ? (
          <div className="company-card__placeholder">No customers have been added yet.</div>
        ) : (
          <Table columns={columns} data={customers} />
        )}
        {error && <div className="company-text-danger" role="alert">{error}</div>}
      </article>
    </div>
  );
}

export function ClientDeliveriesPage() {
  const auth = useAuth();
  const toast = useToast();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Delivery | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [formState, setFormState] = useState<DeliveryFormState>({
    tracking_number: '',
    external_reference: '',
    notes: '',
    scheduled_at: '',
    pickup_address: '',
    dropoff_address: '',
    package_type: '',
    package_description: '',
    package_quantity: '',
    package_weight: '',
    package_weight_unit: 'kg',
    package_special_handling: '',
    status: DeliveryStatus.Pending,
  });

  const loadDeliveries = async (filters?: { search?: string; status?: string }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchClientDeliveries({ per_page: 24, ...(filters?.search ? { search: filters.search } : {}), ...(filters?.status ? { status: filters.status } : {}) });
      setDeliveries(response.data ?? []);
    } catch (err) {
      console.error('Failed to load deliveries', err);
      const message = 'Unable to load deliveries. Refresh to retry.';
      setError(message);
      toast.error({ title: 'Unable to Load Deliveries', description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (!mounted) return;
      await loadDeliveries();
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleApplyFilters = () => {
    void loadDeliveries({ search, status: statusFilter });
  };

  const resetForm = () => {
    setFormState({
      tracking_number: '',
      external_reference: '',
      notes: '',
      scheduled_at: '',
      pickup_address: '',
      dropoff_address: '',
      package_type: '',
      package_description: '',
      package_quantity: '',
      package_weight: '',
      package_weight_unit: 'kg',
      package_special_handling: '',
      status: DeliveryStatus.Pending,
    });
    setCancelReason('');
    setIsEditing(false);
    setSelectedDelivery(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditModal = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsEditing(true);
    setFormState({
      tracking_number: delivery.tracking_number ?? '',
      external_reference: delivery.external_reference ?? '',
      notes: delivery.notes ?? '',
      scheduled_at: delivery.scheduled_at ? delivery.scheduled_at.slice(0, 10) : '',
      pickup_address: delivery.pickup_address?.line1 ?? delivery.pickup_address?.address ?? '',
      dropoff_address: delivery.dropoff_address?.line1 ?? delivery.dropoff_address?.address ?? '',
      package_type: delivery.package?.type ?? '',
      package_description: delivery.package?.description ?? '',
      package_quantity: delivery.package?.quantity?.toString() ?? '',
      package_weight: delivery.package?.weight?.toString() ?? '',
      package_weight_unit: (delivery.package?.weight_unit ?? 'kg') as 'kg' | 'g',
      package_special_handling: delivery.package?.special_handling ?? '',
      status: (delivery.status as string) ?? DeliveryStatus.Pending,
    });
    setCancelReason('');
    setShowForm(true);
  };

  const validateDeliveryForm = (): string | null => {
    if (!formState.pickup_address.trim()) {
      return 'Pickup address is recommended to ensure delivery accuracy. Please add a pickup address or verify the route details.';
    }

    if (!formState.dropoff_address.trim()) {
      return 'Dropoff address is recommended to ensure delivery accuracy. Please add a dropoff address or verify the route details.';
    }

    if (!formState.dropoff_address.trim()) {
      return 'Dropoff address is recommended to ensure delivery accuracy. Please add a dropoff address or verify the route details.';
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validateDeliveryForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const packagePayload = formState.package_type || formState.package_description || formState.package_quantity || formState.package_weight || formState.package_special_handling
        ? {
            type: formState.package_type || null,
            description: formState.package_description || null,
            quantity: formState.package_quantity ? Number(formState.package_quantity) : null,
            weight: formState.package_weight ? Number(formState.package_weight) : null,
            weight_unit: formState.package_weight_unit as 'kg' | 'g' | null,
            special_handling: formState.package_special_handling || null,
          }
        : null;

    const payload = {
        external_reference: formState.external_reference.trim() || null,
        notes: formState.notes.trim() || null,
        scheduled_at: formState.scheduled_at || null,
        pickup_address: formState.pickup_address ? { line1: formState.pickup_address } : null,
        dropoff_address: formState.dropoff_address ? { line1: formState.dropoff_address } : null,
        package: packagePayload,
        status: formState.status,
      };

      if (isEditing && selectedDelivery) {
        await updateClientDelivery(selectedDelivery.id, payload);
      } else {
        await createClientDelivery(payload);
      }

      setShowForm(false);
      resetForm();
      await loadDeliveries({ search, status: statusFilter });
    } catch (err: any) {
      console.error('Failed to save delivery', err);
      const message = err?.message || 'Unable to save the delivery. Please try again or contact support if the issue persists.';
      setError(message);
      toast.error({ title: 'Unable to Save Delivery', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (nextStatus: string) => {
    if (!selectedDelivery) return;
    setSubmitting(true);

    try {
      await updateClientDelivery(selectedDelivery.id, { status: nextStatus, notes: selectedDelivery.notes ?? '' });
      const refreshed = await fetchClientDeliveries({ per_page: 24, ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}) });
      setDeliveries(refreshed.data ?? []);
      setSelectedDelivery((prev) => prev ? { ...prev, status: nextStatus } : prev);
    } catch (err) {
      console.error('Failed to update delivery status', err);
      const message = 'Unable to update the delivery status.';
      setError(message);
      toast.error({ title: 'Unable to Update Delivery Status', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedDelivery) return;
    setSubmitting(true);

    try {
      await cancelClientDelivery(selectedDelivery.id, { cancel_reason: cancelReason || 'Cancelled by company manager', notes: selectedDelivery.notes ?? '' });
      const refreshed = await fetchClientDeliveries({ per_page: 24, ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}) });
      setDeliveries(refreshed.data ?? []);
      setSelectedDelivery((prev) => prev ? { ...prev, status: DeliveryStatus.Cancelled } : prev);
      setCancelReason('');
      toast.success({ title: 'Delivery Cancelled', description: 'The delivery was cancelled successfully.' });
    } catch (err) {
      console.error('Failed to cancel delivery', err);
      const message = 'Unable to cancel the delivery.';
      setError(message);
      toast.error({ title: 'Unable to Cancel Delivery', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (delivery: Delivery) => {
    setDeleteTarget(delivery);
    setShowDeleteConfirm(true);
  };

  const handlePrintDeliveryForm = async () => {
    if (!selectedDelivery) return;
    setPrintError(null);
    setPrintLoading(true);

    try {
      const response = await requestClientDeliveryPrintForm(selectedDelivery.id);
      const generatedAt = new Date().toLocaleString();
      const printedBy = auth.user?.name || auth.user?.email || 'Unknown user';
      const verificationUrl = response.verification_url;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: 'M', width: 240 });
      const preview = window.open('', '_blank', 'width=950,height=900');

      if (!preview) {
        throw new Error('Unable to open preview window. Check popup settings.');
      }

      const delivery = response.delivery;
      const statusLabel = getDeliveryStatusLabel(delivery.status);
      const notes = delivery.notes || '—';
      const scheduledAt = delivery.scheduled_at ? new Date(delivery.scheduled_at).toLocaleString() : '—';
      const pickupAddress = delivery.pickup_address?.line1 || '—';
      const dropoffAddress = delivery.dropoff_address?.line1 || '—';
      const packageType = delivery.package?.type || '—';
      const packageDescription = delivery.package?.description || '—';
      const packageQuantity = delivery.package?.quantity ?? '—';
      const packageWeight = delivery.package?.weight ? `${delivery.package.weight} ${delivery.package.weight_unit ?? ''}` : '—';
      const packageSpecial = delivery.package?.special_handling || '—';
      const historyRows = (delivery.status_history ?? []).map((event) => `<tr><td>${getDeliveryStatusLabel(event.status)}</td><td>${event.changed_at ? new Date(event.changed_at).toLocaleString() : '—'}</td></tr>`).join('');

      preview.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Delivery Form ${delivery.tracking_number}</title><style>
        body{font-family:Inter,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}
        .form-wrapper{max-width:900px;margin:0 auto;}
        .brand{display:flex;justify-content:space-between;align-items:center;gap:12px;}
        .brand-logo{font-size:1rem;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.18em;}
        .brand-meta{text-align:right;font-size:.85rem;color:#475569;}
        h1{margin:22px 0 10px;font-size:1.8rem;color:#111;}
        .section{margin:24px 0;border:1px solid #d1d5db;border-radius:12px;padding:18px;}
        .section-title{font-size:1rem;font-weight:700;margin-bottom:12px;color:#111;}
        .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .field{margin-bottom:12px;}
        .field-label{display:block;font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;color:#475569;}
        .field-value{font-size:1rem;color:#111;line-height:1.6;}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:.95rem;}
        th,td{border:1px solid #d1d5db;padding:12px;text-align:left;vertical-align:top;}
        th{background:#f8fafc;font-weight:700;color:#111;}
        .qr-panel{display:flex;gap:18px;align-items:center;margin-top:18px;}
        .qr-panel img{width:160px;height:160px;border:1px solid #e5e7eb;border-radius:12px;}
        .verification-text{font-size:.95rem;color:#111;line-height:1.6;}
        .signature-block{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px;}
        .signature-box{border-top:1px solid #111;padding-top:8px;color:#111;font-size:.95rem;}
        @media print{body{margin:0;padding:0;}button#printButton{display:none;} .section{border:none;}}
      </style></head><body>
        <div class="form-wrapper">
          <div class="brand">
            <div><div class="brand-logo">Delivery Portal</div><div class="field-value">Official delivery form</div></div>
            <div class="brand-meta"><div>Printed: ${generatedAt}</div><div>Printed by: ${printedBy}</div></div>
          </div>
          <h1>Delivery Form</h1>
          <div class="section">
            <div class="section-title">Delivery summary</div>
            <div class="field-grid">
              <div class="field"><span class="field-label">Tracking number</span><div class="field-value">${delivery.tracking_number}</div></div>
              <div class="field"><span class="field-label">Status</span><div class="field-value">${statusLabel}</div></div>
              <div class="field"><span class="field-label">Reference</span><div class="field-value">${delivery.external_reference ?? '—'}</div></div>
              <div class="field"><span class="field-label">Scheduled at</span><div class="field-value">${scheduledAt}</div></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Addresses</div>
            <div class="field-grid">
              <div class="field"><span class="field-label">Pickup address</span><div class="field-value">${pickupAddress}</div></div>
              <div class="field"><span class="field-label">Dropoff address</span><div class="field-value">${dropoffAddress}</div></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Package details</div>
            <div class="field-grid">
              <div class="field"><span class="field-label">Type</span><div class="field-value">${packageType}</div></div>
              <div class="field"><span class="field-label">Quantity</span><div class="field-value">${packageQuantity}</div></div>
              <div class="field"><span class="field-label">Weight</span><div class="field-value">${packageWeight}</div></div>
              <div class="field"><span class="field-label">Special handling</span><div class="field-value">${packageSpecial}</div></div>
              <div class="field" style="grid-column:1 / -1;"><span class="field-label">Description</span><div class="field-value">${packageDescription}</div></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Notes</div>
            <div class="field-value">${notes}</div>
          </div>
          <div class="section">
            <div class="section-title">Status timeline</div>
            <table><thead><tr><th>Status</th><th>Timestamp</th></tr></thead><tbody>${historyRows || '<tr><td colspan="2">No status events available.</td></tr>'}</tbody></table>
          </div>
          <div class="section qr-panel">
            <div>
              <div class="field-label">Verification QR code</div>
              <img src="${qrDataUrl}" alt="Delivery verification QR code" />
            </div>
            <div class="verification-text">
              <div><strong>Verification URL</strong></div>
              <div>${verificationUrl}</div>
              <div style="margin-top:12px;color:#475569;">Scan this QR code or visit the link to verify the document later using the Delivery Portal verification page.</div>
            </div>
          </div>
          <div class="signature-block">
            <div class="signature-box">Printed form signer<br><br>Signature: __________________________</div>
            <div class="signature-box">Delivery partner sign-off<br><br>Signature: __________________________</div>
          </div>
          <button id="printButton" onclick="window.print()" style="margin-top:24px;padding:12px 18px;border:none;border-radius:10px;background:#1d4ed8;color:#fff;font-weight:700;cursor:pointer;">Print this form</button>
        </div>
      </body></html>`);
      preview.document.close();
    } catch (err: any) {
      console.error('Failed to prepare print form', err);
      setPrintError(err?.message || 'Unable to generate the print form.');
    } finally {
      setPrintLoading(false);
    }
  };

  const handlePrintBlankDeliveryForm = async () => {
    if (!selectedDelivery) return;
    setPrintError(null);
    setPrintLoading(true);

    try {
      const preview = window.open('', '_blank', 'width=950,height=900');
      if (!preview) {
        throw new Error('Unable to open preview window. Check popup settings.');
      }

      const trackingNumber = selectedDelivery.tracking_number || '______________________________';
      const scheduledAt = selectedDelivery.scheduled_at ? new Date(selectedDelivery.scheduled_at).toLocaleDateString() : '______________________________';

      preview.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Blank Delivery Form</title><style>
        body{font-family:Inter,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}
        .form-wrapper{max-width:940px;margin:0 auto;}
        .brand{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;}
        .brand-logo{font-size:1rem;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.18em;}
        .brand-meta{text-align:right;font-size:.85rem;color:#475569;min-width:220px;}
        h1{margin:22px 0 10px;font-size:1.9rem;color:#111;}
        .section{margin:20px 0;border:1px solid #e2e8f0;border-radius:14px;padding:20px;}
        .section-title{font-size:1rem;font-weight:700;margin-bottom:14px;color:#0f172a;}
        .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
        .field{margin-bottom:14px;}
        .field-label{display:block;font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;color:#475569;}
        .blank-line{min-height:30px;border-bottom:1px dashed #cbd5e1;}
        .blank-text{font-size:.95rem;line-height:1.8;color:#475569;}
        .two-column{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
        .signature-row{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px;}
        .signature-box{padding-top:12px;border-top:1px solid #cbd5e1;font-size:.95rem;color:#475569;}
        .hint{font-size:.82rem;color:#64748b;margin-top:6px;}
        @media (max-width: 760px) {.field-grid,.two-column,.signature-row{grid-template-columns:1fr;}}
      </style></head><body>
        <div class="form-wrapper">
          <div class="brand">
            <div>
              <div class="brand-logo">Delivery Portal</div>
              <div class="blank-text">Blank delivery form for handwritten delivery details and signatures.</div>
            </div>
            <div class="brand-meta">
              <div><strong>Tracking:</strong></div>
              <div>${trackingNumber}</div>
              <div><strong>Scheduled date:</strong></div>
              <div>${scheduledAt}</div>
            </div>
          </div>
          <h1>Blank Delivery Form</h1>
          <div class="section">
            <div class="section-title">Delivery details</div>
            <div class="field-grid">
              <div class="field"><span class="field-label">Tracking number</span><div class="blank-line"></div></div>
              <div class="field"><span class="field-label">Reference number</span><div class="blank-line"></div></div>
              <div class="field"><span class="field-label">Scheduled date</span><div class="blank-line"></div></div>
              <div class="field"><span class="field-label">Delivery status</span><div class="blank-line"></div></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Pickup address</div>
            <div class="blank-line"></div>
            <div class="blank-line"></div>
            <div class="blank-line"></div>
          </div>
          <div class="section">
            <div class="section-title">Dropoff address</div>
            <div class="blank-line"></div>
            <div class="blank-line"></div>
            <div class="blank-line"></div>
          </div>
          <div class="section">
            <div class="section-title">Package details</div>
            <div class="field-grid">
              <div class="field"><span class="field-label">Package type</span><div class="blank-line"></div></div>
              <div class="field"><span class="field-label">Quantity</span><div class="blank-line"></div></div>
              <div class="field"><span class="field-label">Weight</span><div class="blank-line"></div></div>
              <div class="field"><span class="field-label">Special handling</span><div class="blank-line"></div></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Notes</div>
            <div class="blank-line"></div>
            <div class="blank-line"></div>
            <div class="blank-line"></div>
          </div>
          <div class="section">
            <div class="section-title">Signatures</div>
            <div class="signature-row">
              <div class="signature-box">Prepared by<br><br>Signature: __________________________</div>
              <div class="signature-box">Received by<br><br>Signature: __________________________</div>
            </div>
          </div>
          <script>window.onload = () => window.print();</script>
        </div>
      </body></html>`);
      preview.document.close();
    } catch (err: any) {
      console.error('Failed to generate blank delivery form', err);
      setPrintError(err?.message || 'Unable to generate the blank delivery form.');
    } finally {
      setPrintLoading(false);
    }
  };

  const normalizeHeaderValue = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
    return undefined;
  };

  const extractFilename = (contentDisposition: unknown, fallback: string) => {
    const headerValue = normalizeHeaderValue(contentDisposition);
    if (!headerValue) return fallback;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(headerValue);
    return match?.[1] ? decodeURIComponent(match[1]) : fallback;
  };

  const downloadDeliveryDocument = async (format: 'pdf' | 'docx') => {
    if (!selectedDelivery) return;
    setPrintError(null);
    setPrintLoading(true);

    try {
      const response = await downloadClientDeliveryDocument(selectedDelivery.id, format);
      const contentType = normalizeHeaderValue(response.headers['content-type']) ?? '';

      if (contentType.includes('application/json') || contentType.includes('text/html')) {
        const text = await response.data.text();
        throw new Error(`Unexpected server response while generating the document: ${text.substring(0, 200)}`);
      }

      const filename = extractFilename(
        response.headers['content-disposition'],
        makeReportFileName(
          `Delivery Document - ${selectedDelivery.tracking_number}`,
          selectedDelivery.external_reference ?? 'delivery',
          format,
        ),
      );

      const blob = new Blob([response.data], { type: contentType || 'application/octet-stream' });
      if (blob.size === 0) {
        throw new Error('The generated document is empty. Please try again or contact support.');
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      console.error('Failed to download delivery document', err);
      setPrintError(err?.message || 'Unable to download the delivery document.');
      toast.error({ title: 'Download Failed', description: err?.message || 'Unable to download the delivery document.' });
    } finally {
      setPrintLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);

    try {
      await deleteClientDelivery(deleteTarget.id);
      const refreshed = await fetchClientDeliveries({ per_page: 24, ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}) });
      setDeliveries(refreshed.data ?? []);
      if (selectedDelivery?.id === deleteTarget.id) {
        setSelectedDelivery(null);
      }
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      toast.success({ title: 'Delivery Deleted', description: 'The delivery has been removed from your company account.' });
    } catch (err) {
      console.error('Failed to delete delivery', err);
      const message = 'Unable to delete the delivery. Please try again.';
      setError(message);
      toast.error({ title: 'Unable to Delete Delivery', description: message });
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'tracking_number', label: 'Tracking' },
      { key: 'external_reference', label: 'Reference' },
      {
        key: 'status',
        label: 'Status',
        render: (delivery: Delivery) => (
          <span className={`company-status ${delivery.status === DeliveryStatus.Delivered ? 'company-status--live' : 'company-status--warning'}`}>
            {getDeliveryStatusLabel(delivery.status)}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: 'Created',
        render: (delivery: Delivery) => (delivery.created_at ? new Date(delivery.created_at).toLocaleString() : '—'),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (delivery: Delivery) => (
          <div className="company-action-buttons">
            <button className="btn btn-secondary company-button-small" onClick={() => setSelectedDelivery(delivery)} type="button">Track</button>
            <button className="btn btn-secondary company-button-small" onClick={() => openEditModal(delivery)} type="button">Edit</button>
            <button className="btn btn-secondary company-button-small" onClick={() => { setSelectedDelivery(delivery); setCancelReason(''); setShowForm(false); }} type="button">Cancel</button>
            <button className="btn btn-danger company-button-small" onClick={() => openDeleteModal(delivery)} type="button">Delete</button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="company-dashboard">
      <PageHeader eyebrow="Delivery Operations" title="Delivery Operations" description="Coordinate dispatch, track proof of delivery, and keep every handoff visible in one place." actions={(<button className="btn btn-primary" onClick={openCreateModal} type="button">New delivery</button>)} />
      <section className="company-grid company-grid--stats">
        <StatCard label="Total deliveries" value={String(deliveries.length)} delta="Latest routing" tone="neutral" />
        <StatCard label="Pending" value={String(deliveries.filter((delivery) => DELIVERY_OPEN_STATUSES.includes(delivery.status as DeliveryStatus)).length)} delta="Need action" tone="warning" />
        <StatCard label="Delivered" value={String(deliveries.filter((delivery) => delivery.status === DeliveryStatus.Delivered).length)} delta="Confirmed" tone="positive" />
      </section>

      <article className="company-card company-card--spaced-bottom">
        <div className="company-card__header">
          <div>
            <p className="company-card__eyebrow">Search & filters</p>
            <h3>Find deliveries quickly</h3>
          </div>
        </div>
        <div className="company-grid company-grid--form-fields">
          <label className="company-form-field">
            <span className="company-form-field__label">Search</span>
            <input className="company-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tracking or reference" />
          </label>
          <label className="company-form-field">
            <span className="company-form-field__label">Status</span>
            <select className="company-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {DELIVERY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="company-form-actions company-form-actions--group">
            <button className="btn btn-primary company-button-small" onClick={handleApplyFilters} type="button">Apply filters</button>
            <button className="btn btn-secondary company-button-small" onClick={() => { setSearch(''); setStatusFilter(''); void loadDeliveries(); }} type="button">Clear</button>
          </div>
        </div>
      </article>

      <div className="report-grid company-card--spaced-bottom">
        <aside className="report-sidebar">
          <article className="company-card report-card">
            <div className="company-card__header">
              <div>
                <p className="company-card__eyebrow">Quick view</p>
                <h3>Delivery pace</h3>
              </div>
            </div>
            <div className="company-detail-grid">
              <div className="company-detail-row">
                <span className="company-detail-meta">Total deliveries</span>
                <strong>{deliveries.length}</strong>
              </div>
              <div className="company-detail-row">
                <span className="company-detail-meta">Pending</span>
                <strong>{deliveries.filter((delivery) => DELIVERY_OPEN_STATUSES.includes(delivery.status as DeliveryStatus)).length}</strong>
              </div>
              <div className="company-detail-row">
                <span className="company-detail-meta">Delivered</span>
                <strong>{deliveries.filter((delivery) => delivery.status === DeliveryStatus.Delivered).length}</strong>
              </div>
            </div>
          </article>
        </aside>

        <section className="report-main">
          <article className="company-card">
            <div className="company-card__header">
              <div>
                <p className="company-card__eyebrow">Delivery details</p>
                <h3>Recent routing activity</h3>
              </div>
            </div>
            {loading ? (
              <div className="company-empty-state">Loading delivery list…</div>
            ) : deliveries.length === 0 ? (
              <div className="company-empty-state">No deliveries are available yet.</div>
            ) : (
              <div className="company-table-wrapper">
                <Table columns={columns} data={deliveries} />
              </div>
            )}
          </article>

          <article className="company-card company-card--detail report-card">
            <div className="company-card__header">
              <div>
                <p className="company-card__eyebrow">Tracking view</p>
                <h3>{selectedDelivery ? `Tracking ${selectedDelivery.tracking_number}` : 'Select a delivery'}</h3>
              </div>
            </div>
            {selectedDelivery ? (
              <div className="company-detail-panel">
                <div className="company-detail-overview">
                  <div>
                    <p className="company-detail-overview__eyebrow">Delivery overview</p>
                    <h4 className="company-detail-overview__heading">Essential delivery details and controls</h4>
                  </div>
                  <span className={`company-status ${selectedDelivery.status === DeliveryStatus.Delivered ? 'company-status--live' : selectedDelivery.status === DeliveryStatus.Cancelled ? 'company-status--cancelled' : selectedDelivery.status === DeliveryStatus.Pending ? 'company-status--pending' : 'company-status--warning'}`}>
                    {getDeliveryStatusLabel(selectedDelivery.status)}
                  </span>
                </div>

                <div className="company-detail-summary">
                  <div>
                    <p className="company-detail-subtle">Tracking number</p>
                    <strong>{selectedDelivery.tracking_number}</strong>
                  </div>
                  <div>
                    <p className="company-detail-subtle">Reference</p>
                    <strong>{selectedDelivery.external_reference ?? '—'}</strong>
                  </div>
                  <div>
                    <p className="company-detail-subtle">Scheduled</p>
                    <strong>{selectedDelivery.scheduled_at ? new Date(selectedDelivery.scheduled_at).toLocaleString() : '—'}</strong>
                  </div>
                </div>

                <div className="company-detail-grid company-detail-grid--columns">
                  <div className="company-detail-section">
                    <div className="company-detail-section__title">Delivery details</div>
                    <div className="company-detail-row"><span>Delivery ID</span><span>{selectedDelivery.uuid}</span></div>
                    <div className="company-detail-row"><span>Status</span><span>{getDeliveryStatusLabel(selectedDelivery.status)}</span></div>
                    <div className="company-detail-row"><span>Created</span><span>{selectedDelivery.created_at ? new Date(selectedDelivery.created_at).toLocaleString() : '—'}</span></div>
                    <div className="company-detail-row"><span>Updated</span><span>{selectedDelivery.updated_at ? new Date(selectedDelivery.updated_at).toLocaleString() : '—'}</span></div>
                  </div>

                  <div className="company-detail-section">
                    <div className="company-detail-section__title">Package information</div>
                    <div className="company-detail-row"><span>Type</span><span>{selectedDelivery.package?.type ?? '—'}</span></div>
                    <div className="company-detail-row"><span>Description</span><span>{selectedDelivery.package?.description ?? '—'}</span></div>
                    <div className="company-detail-row"><span>Quantity</span><span>{selectedDelivery.package?.quantity ?? '—'}</span></div>
                    <div className="company-detail-row"><span>Weight</span><span>{selectedDelivery.package?.weight ? `${selectedDelivery.package.weight} ${selectedDelivery.package.weight_unit ?? 'kg'}` : '—'}</span></div>
                    <div className="company-detail-row"><span>Handling</span><span>{selectedDelivery.package?.special_handling ?? '—'}</span></div>
                  </div>

                  <div className="company-detail-section">
                    <div className="company-detail-section__title">Addresses</div>
                    <div className="company-detail-section__block">
                      <div className="company-detail-subtle">Pickup</div>
                      <div>{selectedDelivery.pickup_address?.line1 ?? '—'}</div>
                      <div>{selectedDelivery.pickup_address?.address ?? ''}</div>
                    </div>
                    <div className="company-detail-section__block">
                      <div className="company-detail-subtle">Dropoff</div>
                      <div>{selectedDelivery.dropoff_address?.line1 ?? '—'}</div>
                      <div>{selectedDelivery.dropoff_address?.address ?? ''}</div>
                    </div>
                  </div>
                </div>

                <div className="company-detail-section company-detail-section--wide">
                  <div className="company-detail-section__title">Notes</div>
                  <div>{selectedDelivery.notes || 'No notes provided.'}</div>
                </div>

                <div className="company-detail-footer">
                  <div className="company-detail-footer__section">
                    <div className="company-detail-footer__header">
                      <span className="company-detail-heading">Operational controls</span>
                      <span className="company-detail-subtle">Update delivery status or cancel the shipment.</span>
                    </div>
                    <div className="company-detail-footer__status-buttons">
                      <button className="btn btn-secondary company-button-small" onClick={() => void handleStatusUpdate(DeliveryStatus.InTransit)} disabled={submitting || selectedDelivery?.status === DeliveryStatus.InTransit || selectedDelivery?.status === DeliveryStatus.Delivered || selectedDelivery?.status === DeliveryStatus.Cancelled || selectedDelivery?.status === DeliveryStatus.Failed} type="button">Mark in transit</button>
                      <button className="btn btn-secondary company-button-small" onClick={() => void handleStatusUpdate(DeliveryStatus.PickedUp)} disabled={submitting || selectedDelivery?.status === DeliveryStatus.PickedUp || selectedDelivery?.status === DeliveryStatus.Delivered || selectedDelivery?.status === DeliveryStatus.Cancelled || selectedDelivery?.status === DeliveryStatus.Failed} type="button">Mark picked up</button>
                      <button className="btn btn-primary company-button-small" onClick={() => void handleStatusUpdate(DeliveryStatus.Delivered)} disabled={submitting || selectedDelivery?.status === DeliveryStatus.Delivered || selectedDelivery?.status === DeliveryStatus.Cancelled || selectedDelivery?.status === DeliveryStatus.Failed} type="button">Mark delivered</button>
                      <button className="btn btn-secondary company-button-small" onClick={() => void handleStatusUpdate(DeliveryStatus.Failed)} disabled={submitting || selectedDelivery?.status === DeliveryStatus.Delivered || selectedDelivery?.status === DeliveryStatus.Cancelled || selectedDelivery?.status === DeliveryStatus.Failed} type="button">Mark failed</button>
                    </div>
                  </div>

                  <div className="company-detail-footer__section company-export-actions">
                    <div className="company-export-action-block">
                      <span className="company-export-heading">Export delivery</span>
                      <div className="company-action-buttons">
                        <button className="btn btn-secondary company-button-small" onClick={() => void downloadDeliveryDocument('pdf')} disabled={printLoading || submitting} type="button">{printLoading ? 'Preparing document…' : 'Download PDF'}</button>
                        <button className="btn btn-secondary company-button-small" onClick={() => void downloadDeliveryDocument('docx')} disabled={printLoading || submitting} type="button">{printLoading ? 'Preparing document…' : 'Download Word'}</button>
                      </div>
                    </div>
                    <div className="company-export-action-block">
                      <span className="company-export-heading">Print form</span>
                      <button className="btn btn-primary company-button-small company-button-block" onClick={() => void handlePrintDeliveryForm()} disabled={printLoading || submitting} type="button">
                        {printLoading ? 'Preparing print form…' : 'Print delivery form'}
                      </button>
                    </div>
                    <div className="company-export-action-block">
                      <span className="company-export-heading">Blank fill-in form</span>
                      <button className="btn btn-secondary company-button-small company-button-block" onClick={() => void handlePrintBlankDeliveryForm()} disabled={printLoading || submitting} type="button">
                        {printLoading ? 'Preparing blank form…' : 'Print blank form'}
                      </button>
                    </div>
                    <div className="company-export-action-block company-export-action-block--danger">
                      <span className="company-export-heading">Delivery control</span>
                      <button className="btn btn-danger company-button-small company-button-block" onClick={() => void handleCancel()} disabled={submitting} type="button">Cancel delivery</button>
                    </div>
                  </div>
                </div>
                {printError ? <div className="company-text-danger" role="alert">{printError}</div> : null}

                <div className="company-detail-section company-detail-section--wide">
                  <div className="company-detail-section__title">Status history</div>
                  <ul className="company-detail-list">
                    {(selectedDelivery.status_history ?? []).length > 0 ? (selectedDelivery.status_history ?? []).map((event: any, index: number) => (
                      <li key={`${event.status}-${index}`} className="company-detail-list__item">
                        <div>{getDeliveryStatusLabel(event.status)}</div>
                        <div className="company-detail-meta">{event.changed_at ? new Date(event.changed_at).toLocaleString() : '—'}</div>
                      </li>
                    )) : <li className="company-detail-list__item">No timeline entries yet.</li>}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="company-detail-meta">Choose a delivery to see the timeline and update its status.</div>
            )}
          </article>
        </section>
      </div>

      {showForm ? (
        <div className="company-modal-backdrop">
          <div className="company-card company-modal">
            <div className="company-card__header company-modal-header">
              <div>
                <p className="company-card__eyebrow">Delivery form</p>
                <h3>{isEditing ? 'Edit delivery' : 'Create delivery'}</h3>
              </div>
              <button className="btn btn-secondary company-button-small" onClick={() => { setShowForm(false); resetForm(); }} type="button">Close</button>
            </div>
            <form onSubmit={handleSubmit} className="company-modal-form">
              {error ? (
                <div className="company-modal-error">{error}</div>
              ) : null}
              {isEditing && selectedDelivery ? (
                <div className="company-form-field">
                  <span className="company-form-field__label">Tracking number</span>
                  <div className="company-form-field__readonly">{selectedDelivery.tracking_number}</div>
                </div>
              ) : (
                <div className="company-form-field">
                  <span className="company-form-field__label">Tracking number</span>
                  <div className="company-form-field__note">The portal will assign a generated tracking number when the delivery is created.</div>
                </div>
              )}
              <label className="company-form-field">
                <span className="company-form-field__label">Reference</span>
                <input className="company-input" value={formState.external_reference} onChange={(event) => setFormState((prev) => ({ ...prev, external_reference: event.target.value }))} />
              </label>
              <div className="company-grid--form-fields">
                <label className="company-form-field">
                  <span className="company-form-field__label">Pickup address</span>
                  <input className="company-input" value={formState.pickup_address} onChange={(event) => setFormState((prev) => ({ ...prev, pickup_address: event.target.value }))} />
                </label>
                <label className="company-form-field">
                  <span className="company-form-field__label">Dropoff address</span>
                  <input className="company-input" value={formState.dropoff_address} onChange={(event) => setFormState((prev) => ({ ...prev, dropoff_address: event.target.value }))} />
                </label>
              </div>
              <div className="company-grid--form-fields">
                <label className="company-form-field">
                  <span className="company-form-field__label">Package type</span>
                  <select className="company-select" value={formState.package_type} onChange={(event) => setFormState((prev) => ({ ...prev, package_type: event.target.value }))}>
                    <option value="">Select type</option>
                    <option value="document">Document</option>
                    <option value="parcel">Parcel</option>
                    <option value="box">Box</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="company-form-field">
                  <span className="company-form-field__label">Quantity</span>
                  <input className="company-input" type="number" min={1} max={100} value={formState.package_quantity} onChange={(event) => setFormState((prev) => ({ ...prev, package_quantity: event.target.value }))} />
                </label>
              </div>
              <div className="company-grid--form-fields">
                <label className="company-form-field">
                  <span className="company-form-field__label">Description</span>
                  <input className="company-input" value={formState.package_description} onChange={(event) => setFormState((prev) => ({ ...prev, package_description: event.target.value }))} />
                </label>
                <label className="company-form-field">
                  <span className="company-form-field__label">Weight</span>
                  <div className="company-form-row company-form-row--compact">
                    <input className="company-input" type="number" min={0.01} step="0.01" value={formState.package_weight} onChange={(event) => setFormState((prev) => ({ ...prev, package_weight: event.target.value }))} />
                    <select className="company-select company-select--inline" value={formState.package_weight_unit} onChange={(event) => setFormState((prev) => ({ ...prev, package_weight_unit: event.target.value as 'kg' | 'g' }))}>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                </label>
              </div>
              <label className="company-form-field">
                <span className="company-form-field__label">Special handling</span>
                <input className="company-input" value={formState.package_special_handling} onChange={(event) => setFormState((prev) => ({ ...prev, package_special_handling: event.target.value }))} />
              </label>
              <label className="company-form-field">
                <span className="company-form-field__label">Scheduled date</span>
                <input className="company-input" type="date" value={formState.scheduled_at} onChange={(event) => setFormState((prev) => ({ ...prev, scheduled_at: event.target.value }))} />
              </label>
              <label className="company-form-field">
                <span className="company-form-field__label">Notes</span>
                <textarea className="company-textarea" value={formState.notes} onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))} rows={5} />
              </label>
              <label className="company-form-field">
                <span className="company-form-field__label">Status</span>
                <select className="company-select" value={formState.status} onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}>
                  {DELIVERY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <div className="company-form-row company-form-actions">
                <button className="btn btn-secondary company-button-small" onClick={() => { setShowForm(false); resetForm(); }} type="button">Cancel</button>
                <button className="btn btn-primary company-button-small" disabled={submitting} type="submit">{submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create delivery'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm && deleteTarget ? (
        <div className="company-modal-backdrop">
          <div className="company-card company-modal">
            <div className="company-card__header company-modal-header">
              <div>
                <p className="company-card__eyebrow">Confirm deletion</p>
                <h3>Delete delivery {deleteTarget.tracking_number}</h3>
              </div>
              <button className="btn btn-secondary company-button-small" onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }} type="button">Close</button>
            </div>
            <div className="company-modal-content">
              <p>Deleting a delivery is permanent and cannot be undone. Only proceed if you are sure this record should be removed from the company delivery history.</p>
              <div className="company-form-row company-form-actions">
                <button className="btn btn-secondary company-button-small" onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }} type="button">Cancel</button>
                <button className="btn btn-danger company-button-small" disabled={deleting} onClick={() => void handleDelete()} type="button">{deleting ? 'Deleting…' : 'Delete delivery'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ClientDocumentsPage() {
  const toast = useToast();
  const [documents, setDocuments] = useState<ClientDocumentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadDocuments = async (nextSearch = search) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchClientDocuments(nextSearch ? { search: nextSearch } : {});
      setDocuments(response.data ?? []);
    } catch (err) {
      console.error('Failed to load client documents', err);
      const message = 'Unable to load your company documents right now.';
      setError(message);
      toast.error({ title: 'Unable to Load Documents', description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!mounted) return;
      await loadDocuments('');
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleDownload = async (documentRecord: ClientDocumentRecord) => {
    if (!documentRecord.id) return;
    setDownloadingId(documentRecord.id);

    try {
      const response = await downloadClientDocument(documentRecord.id);
      const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
      const fallbackName = `${documentRecord.reference_number || documentRecord.report_id || 'document'}.${(documentRecord.export_format || 'bin').toString().toLowerCase()}`;
      const match = typeof disposition === 'string' ? /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition) : null;
      const filename = match?.[1] ? decodeURIComponent(match[1]) : fallbackName;
      const blob = new Blob([response.data], { type: response.headers?.['content-type'] || documentRecord.mime_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success({ title: 'Document Downloaded', description: 'Your document has been downloaded successfully.' });
    } catch (err) {
      console.error('Failed to download client document', err);
      const message = 'Unable to download the document. Please try again.';
      toast.error({ title: 'Download Failed', description: message });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="company-dashboard">
      <PageHeader
        eyebrow="Secure document archive"
        title="Document Center"
        description="Review, search, and download company exports, delivery documents, and verification-backed records in one place."
      />

      <section className="company-card company-card--spaced-bottom">
        <div className="company-card__header">
          <div>
            <p className="company-card__eyebrow">Enterprise document archive</p>
            <h3>Company documents and exports</h3>
          </div>
        </div>

        <div className="company-form-row" style={{ marginBottom: '1rem' }}>
          <input
            className="company-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, reference number, or verification code"
          />
          <button className="btn btn-primary" type="button" onClick={() => void loadDocuments(search)}>
            Search
          </button>
        </div>

        {loading ? (
          <div className="company-card__placeholder">Loading document archive…</div>
        ) : error ? (
          <div className="company-text-danger" role="alert">{error}</div>
        ) : documents.length === 0 ? (
          <div className="company-card__placeholder">No documents are available for your company yet.</div>
        ) : (
          <div className="company-list company-list--stacked">
            {documents.map((documentRecord) => (
              <div key={documentRecord.id} className="company-list__item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <strong>{documentRecord.report_title || documentRecord.report_category || 'Document export'}</strong>
                    <div className="company-detail-subtle" style={{ marginTop: '0.35rem' }}>
                      {documentRecord.reference_number ? `Reference: ${documentRecord.reference_number}` : null}
                      {documentRecord.verification_id ? ` • Verification: ${documentRecord.verification_id}` : null}
                    </div>
                    <div className="company-detail-subtle" style={{ marginTop: '0.25rem' }}>
                      {documentRecord.report_category ? `Category: ${documentRecord.report_category}` : null}
                      {documentRecord.export_format ? ` • Format: ${documentRecord.export_format}` : null}
                      {documentRecord.record_count ? ` • Records: ${documentRecord.record_count}` : null}
                    </div>
                    <div className="company-detail-subtle" style={{ marginTop: '0.25rem' }}>
                      Generated {documentRecord.created_at ? new Date(documentRecord.created_at).toLocaleString() : 'recently'}
                      {documentRecord.expires_at ? ` • Expires ${new Date(documentRecord.expires_at).toLocaleString()}` : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
                    <span className={`company-status ${documentRecord.is_expired ? 'company-status--warning' : 'company-status--live'}`}>
                      {documentRecord.is_expired ? 'Expired' : 'Active'}
                    </span>
                    <button className="btn btn-secondary" type="button" disabled={downloadingId === documentRecord.id} onClick={() => void handleDownload(documentRecord)}>
                      {downloadingId === documentRecord.id ? 'Downloading…' : 'Download'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function ClientReportsPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [companyName, setCompanyName] = useState('Company');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'delivery' | 'monthly' | 'weekly'>('delivery');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()]} ${now.getFullYear()}`;
  });
  const [selectedWeek, setSelectedWeek] = useState(() => {
    return new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  });
  const [openMonthly, setOpenMonthly] = useState(true);
  const [openWeekly, setOpenWeekly] = useState(false);
  const [openExport, setOpenExport] = useState(false);

  const monthlyOptions = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels: Array<{ key: string; time: number }> = [];

    deliveries.forEach((delivery) => {
      if (!delivery.created_at) return;
      const createdAt = new Date(delivery.created_at);
      if (Number.isNaN(createdAt.getTime())) return;
      const label = `${monthNames[createdAt.getMonth()]} ${createdAt.getFullYear()}`;
      labels.push({ key: label, time: createdAt.getTime() });
    });

    const unique = Array.from(new Map(labels
      .sort((a, b) => b.time - a.time)
      .map((item) => [item.key, item]))
      .values())
      .map((item) => item.key);

    const now = new Date();
    const recent = Array.from({ length: 6 }, (_, idx) => {
      const month = new Date(now.getFullYear(), now.getMonth() - idx, 1);
      return `${monthNames[month.getMonth()]} ${month.getFullYear()}`;
    });

    const merged = Array.from(new Set([...unique, ...recent]));
    return merged.sort((a, b) => {
      const [aMonth, aYear] = a.split(' ');
      const [bMonth, bYear] = b.split(' ');
      const aIndex = monthNames.indexOf(aMonth);
      const bIndex = monthNames.indexOf(bMonth);
      const yearDiff = Number(bYear) - Number(aYear);
      return yearDiff !== 0 ? yearDiff : aIndex - bIndex;
    });
  }, [deliveries]);

  const weeklyOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, idx) => {
      const day = new Date(now);
      day.setDate(now.getDate() - idx);
      return day.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
    });
  }, []);

  useEffect(() => {
    if (monthlyOptions.length && !monthlyOptions.includes(selectedMonth)) {
      setSelectedMonth(monthlyOptions[0]);
    }
  }, [monthlyOptions, selectedMonth]);

  useEffect(() => {
    if (weeklyOptions.length && !weeklyOptions.includes(selectedWeek)) {
      setSelectedWeek(weeklyOptions[0]);
    }
  }, [weeklyOptions, selectedWeek]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchClientDeliveries({ per_page: 100 }),
      fetchCompany(),
    ])
      .then(([deliveryResponse, companyResponse]) => {
        if (!mounted) return;
        setDeliveries(deliveryResponse.data ?? []);
        setCompanyName(companyResponse?.name || 'Company');
      })
      .catch((err) => {
        console.error('Failed to load reports data', err);
        if (!mounted) return;
        setError('Unable to load reports right now. Refresh to retry.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const reportSummary = useMemo(() => {
    const statusCounts = deliveries.reduce<Record<string, number>>((acc, delivery) => {
      const key = delivery.status || DeliveryStatus.Pending;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - idx));
      const monthLabel = monthOrder[date.getMonth()];
      const yearLabel = date.getFullYear();
      const count = deliveries.filter((delivery) => {
        if (!delivery.created_at) return false;
        const createdAt = new Date(delivery.created_at);
        return createdAt.getMonth() === date.getMonth() && createdAt.getFullYear() === date.getFullYear();
      }).length;
      return { name: `${monthLabel} ${yearLabel}`, value: count };
    });

    const weeklyData = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - idx));
      const count = deliveries.filter((delivery) => {
        if (!delivery.created_at) return false;
        const createdAt = new Date(delivery.created_at);
        return createdAt.toDateString() === date.toDateString();
      }).length;
      return { name: date.toLocaleDateString('en', { weekday: 'short' }), value: count };
    });

    const delivered = statusCounts.delivered ?? 0;
    const pending = (statusCounts.pending ?? 0) + (statusCounts.assigned ?? 0) + (statusCounts.in_transit ?? 0) + (statusCounts.picked_up ?? 0);
    const cancelled = (statusCounts.cancelled ?? 0) + (statusCounts.failed ?? 0);
    const average = deliveries.length > 0 ? Math.round((delivered / deliveries.length) * 100) : 0;

    return {
      statusCounts,
      monthlyData,
      weeklyData,
      delivered,
      pending,
      cancelled,
      average,
      total: deliveries.length,
    };
  }, [deliveries]);

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    const reportLabel = reportType === 'delivery'
      ? 'Delivery Report'
      : reportType === 'monthly'
        ? `Monthly Report – ${selectedMonth}`
        : `Weekly Report – ${selectedWeek}`;
    const generatedAt = formatEthiopianDateTime(new Date());
    const filename = makeReportFileName(reportLabel, companyName, format === 'excel' ? 'xlsx' : format);
    const rows = [
      ['Generated at', generatedAt],
      ['Company', companyName],
      ['Report', reportLabel],
      ['Total Deliveries', String(reportSummary.total)],
      ['Delivered', String(reportSummary.delivered)],
      ['Pending', String(reportSummary.pending)],
      ['Cancelled', String(reportSummary.cancelled)],
      ['Success rate', `${reportSummary.average}%`],
    ];

    if (format === 'csv') {
      const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (format === 'excel') {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ss:Workbook xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <ss:Worksheet ss:Name="${reportLabel}">
    <ss:Table>
      ${rows.map((row) => `<ss:Row>${row.map((value) => `<ss:Cell><ss:Data ss:Type="String">${String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</ss:Data></ss:Cell>`).join('')}</ss:Row>`).join('')}
    </ss:Table>
  </ss:Worksheet>
</ss:Workbook>`;
      const blob = new Blob([xml], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const preview = window.open('', '_blank', 'width=900,height=700');
    if (!preview) return;
    preview.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${reportLabel}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111;background:#f7f8fb}body h1{margin-bottom:12px;font-size:1.75rem}body p{margin:0.35rem 0;color:#4b5563}table{border-collapse:collapse;width:100%;margin-top:18px;background:#fff}th,td{border:1px solid #e5e7eb;padding:12px;text-align:left;font-size:0.95rem}th{background:#f3f4f6;font-weight:700;color:#111}</style></head><body><h1>${reportLabel}</h1><p><strong>Company:</strong> ${companyName}</p><p><strong>Generated at:</strong> ${generatedAt} (Addis Ababa)</p><table><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload = () => window.print();</script></body></html>`);
    preview.document.close();
  };

  return (
    <div className="company-dashboard">
      <PageHeader eyebrow="Analytics & Insights" title="Analytics & Insights" description="Review delivery trends, track company performance, and export polished reports in PDF, Excel, or CSV." />

      <section className="company-grid company-grid--stats">
        <StatCard label="Total deliveries" value={String(reportSummary.total)} delta="Live company records" tone="neutral" />
        <StatCard label="Delivered" value={String(reportSummary.delivered)} delta="Confirmed handoffs" tone="positive" />
        <StatCard label="Pending" value={String(reportSummary.pending)} delta="Needs follow-up" tone="warning" />
        <StatCard label="Success rate" value={`${reportSummary.average}%`} delta="Completion efficiency" tone="positive" />
      </section>

      <article className="company-card company-card--spaced-bottom">
        <div className="company-card__header">
          <div>
            <p className="company-card__eyebrow">Reports</p>
            <h3>Delivery, monthly, and weekly reporting</h3>
          </div>
        </div>

        <div className="report-grid">
          <aside className="report-sidebar">
            <div className="report-menu">
              <div className="report-menu__header">
                <div>
                  <div className="report-menu__title">Reports</div>
                  <h4 className="report-menu__subtitle">Delivery, monthly, and weekly reporting</h4>
                  <p className="report-menu__description">
                    Select the view you want to analyze, review the active time window, and export polished reports for operations or leadership.
                  </p>
                </div>
                <div className="report-menu__summary">
                  <span className="report-menu-pill">Current view: {reportType === 'delivery' ? 'Delivery' : reportType === 'monthly' ? 'Monthly' : 'Weekly'}</span>
                  <span className="report-menu-pill">Total: {reportSummary.total}</span>
                  <span className="report-menu-pill">Success rate: {reportSummary.average}%</span>
                </div>
              </div>

              <div className="report-menu-tabs">
                <button
                  type="button"
                  className={`btn ${reportType === 'delivery' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setReportType('delivery')}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  className={`btn ${reportType === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setReportType('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`btn ${reportType === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setReportType('weekly')}
                >
                  Weekly
                </button>
              </div>

              <div className="report-menu-grid">
                <div className="report-menu-panel">
                  <div className="report-menu-panel__header">
                    <span>Monthly reports</span>
                    <span className="report-menu-panel__badge">{selectedMonth}</span>
                  </div>
                  <button type="button" className="report-menu-toggle" onClick={() => setOpenMonthly((value) => !value)}>
                    <span>{openMonthly ? '▼ Show monthly options' : '▶ Expand monthly reports'}</span>
                    <span>{openMonthly ? '▾' : '▸'}</span>
                  </button>
                  {openMonthly ? (
                    <div className="report-menu-section">
                      {monthlyOptions.map((month) => (
                        <button
                          key={month}
                          type="button"
                          onClick={() => { setReportType('monthly'); setSelectedMonth(month); }}
                          className={`report-menu-action ${month === selectedMonth ? 'report-menu-action--active' : ''}`}
                        >
                          <span>{month}</span>
                          {month === selectedMonth ? <span>Selected</span> : null}
                        </button>
                      ))}
                      <button type="button" onClick={() => { setReportType('monthly'); }} className="report-menu-action report-menu-action--viewall">
                        <span>View all months</span>
                        <span>→</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="report-menu-panel">
                  <div className="report-menu-panel__header">
                    <span>Weekly reports</span>
                    <span className="report-menu-panel__badge">{selectedWeek}</span>
                  </div>
                  <button type="button" className="report-menu-toggle" onClick={() => setOpenWeekly((value) => !value)}>
                    <span>{openWeekly ? '▼ Show weekly options' : '▶ Expand weekly reports'}</span>
                    <span>{openWeekly ? '▾' : '▸'}</span>
                  </button>
                  {openWeekly ? (
                    <div className="report-menu-section">
                      {weeklyOptions.map((week) => (
                        <button
                          key={week}
                          type="button"
                          onClick={() => { setReportType('weekly'); setSelectedWeek(week); }}
                          className={`report-menu-action ${week === selectedWeek ? 'report-menu-action--active' : ''}`}
                        >
                          <span>{week}</span>
                          {week === selectedWeek ? <span>Selected</span> : null}
                        </button>
                      ))}
                      <button type="button" onClick={() => { setReportType('weekly'); }} className="report-menu-action report-menu-action--viewall">
                        <span>View all weeks</span>
                        <span>→</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="report-menu-panel">
                  <div className="report-menu-panel__header">
                    <span>Export reports</span>
                    <span className="report-menu-panel__badge">One click</span>
                  </div>
                  <button type="button" className="report-menu-toggle" onClick={() => setOpenExport((value) => !value)}>
                    <span>{openExport ? '▼ Export options' : '▶ Export options'}</span>
                    <span>{openExport ? '▾' : '▸'}</span>
                  </button>
                  {openExport ? (
                    <div className="report-menu-section">
                      <button type="button" className="report-menu-action" onClick={() => exportReport('pdf')}>
                        <span>PDF</span>
                      </button>
                      <button type="button" className="report-menu-action" onClick={() => exportReport('excel')}>
                        <span>Excel</span>
                      </button>
                      <button type="button" className="report-menu-action" onClick={() => exportReport('csv')}>
                        <span>CSV</span>
                      </button>
                      <div className="report-menu-divider" />
                      <button type="button" className="report-menu-action" onClick={() => exportReport('csv')}>
                        <span>Bulk export</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <section className="report-main">
            {loading ? (
              <div className="company-card__placeholder">Loading reports…</div>
            ) : error ? (
              <div className="company-text-danger" role="alert">{error}</div>
            ) : (
              <>
                <div className="company-grid company-grid--split company-grid--gap-lg company-card--spaced-bottom">
                  <div className="company-box report-card">
                    <p className="company-detail-meta">Summary</p>
                    <h4 className="company-card__title">{reportType === 'delivery' ? 'Delivery overview' : reportType === 'monthly' ? 'Monthly performance snapshot' : 'Weekly activity snapshot'}</h4>
                    <p className="company-detail-subtle">
                      {reportType === 'delivery'
                        ? `${reportSummary.total} deliveries tracked with ${reportSummary.delivered} completed and ${reportSummary.pending} still active.`
                        : reportType === 'monthly'
                          ? `The selected month ${selectedMonth} shows the current delivery trend for ${companyName}.`
                          : `The selected week ${selectedWeek} highlights recent delivery volume for ${companyName}.`}
                    </p>
                  </div>
                  <div className="company-box report-card">
                    <p className="company-detail-meta">Insights</p>
                    <h4 className="company-card__title">Performance health</h4>
                    <p className="company-detail-subtle">Success rate is {reportSummary.average}%, with {reportSummary.cancelled} cancelled or failed deliveries.</p>
                    <p className="company-detail-subtle">Focus attention on pending deliveries first to improve completion and reduce reopening work.</p>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </article>

      <section className="company-grid company-grid--split company-grid--gap-lg company-grid--spaced-bottom">
        <SimpleLineChartCard title="Delivery performance charts" subtitle="Weekly trend" data={reportSummary.weeklyData} color="var(--accent)" />
        <SimpleBarChartCard title="Monthly reports" subtitle="Last six months" data={reportSummary.monthlyData} color="var(--success)" />
      </section>

      <section className="company-grid company-grid--split company-grid--gap-lg">
        <SimpleDonutChartCard title="Company statistics" subtitle="Delivery status mix" data={[
          { name: 'Delivered', value: reportSummary.delivered },
          { name: 'Pending', value: reportSummary.pending },
          { name: 'Cancelled', value: reportSummary.cancelled },
        ]} />
        <Card title="Report highlights" subtitle="Operational snapshot">
          <div className="company-detail-grid">
            <div className="company-detail-row">
              <span className="company-text-muted">Completed</span>
              <strong>{reportSummary.delivered}</strong>
            </div>
            <div className="company-detail-row">
              <span className="company-text-muted">Pending</span>
              <strong>{reportSummary.pending}</strong>
            </div>
            <div className="company-detail-row">
              <span className="company-text-muted">Cancelled</span>
              <strong>{reportSummary.cancelled}</strong>
            </div>
            <div className="company-detail-row">
              <span className="company-text-muted">Success rate</span>
              <strong>{reportSummary.average}%</strong>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

export function ClientCommunicationPage() {
  return (
    <div className="company-dashboard">
      <PageHeader title="Communication" description="Communicate securely with the system administrator and keep your requests and responses organized." actions={(<Link className="btn btn-secondary" to="/client/communication">Compose</Link>)} />
      <article className="company-card">
        <div className="company-card__header">
          <div>
            <p className="company-card__eyebrow">Inbox</p>
            <h3>Messages and approvals</h3>
          </div>
        </div>
        <div className="company-list company-list--stacked">
          <div className="company-list__item">
            <strong>System Administrator</strong>
            <p>Approval request for updated SLA policy • 2 mins ago</p>
          </div>
          <div className="company-list__item">
            <strong>Operations support</strong>
            <p>Vehicle maintenance scheduling update • 37 mins ago</p>
          </div>
          <div className="company-list__item">
            <strong>Security review</strong>
            <p>MFA reset confirmation • 1 hour ago</p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function ClientSettingsPage() {
  return (
    <div className="company-dashboard">
      <PageHeader eyebrow="Organization Settings" title="Organization Settings" description="Manage your organization profile, business information, verification status, and operating details." />
      <section className="company-grid company-grid--stats">
        <StatCard label="Verification" value="Approved" delta="document review complete" tone="positive" />
        <StatCard label="Contacts" value="4" delta="primary + team" tone="neutral" />
      </section>
      <article className="company-card">
        <div className="company-card__header">
          <div>
            <p className="company-card__eyebrow">Organization profile</p>
            <h3>Business, address, and verification</h3>
          </div>
        </div>
        <div className="company-list company-list--stacked">
          <div className="company-list__item">
            <strong>Business information</strong>
            <p>Company operations and fulfillment services</p>
          </div>
          <div className="company-list__item">
            <strong>Address</strong>
            <p>Corporate delivery center profile</p>
          </div>
          <div className="company-list__item">
            <strong>Verification status</strong>
            <p>Trusted business profile with completed documentation</p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function ClientProfilePage() {
  const { user, refreshUser } = useAuth();
  const company = user?.company;
  const initials = user?.name ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'CM';
  const profileScore = [user?.name, user?.phone, user?.bio, user?.profile_photo].filter(Boolean).length;
  const profileCompletion = Math.min(100, Math.round((profileScore / 4) * 100));
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    gender: user?.gender || 'prefer-not-to-say',
    bio: user?.bio || '',
    profilePhoto: user?.profile_photo || null,
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      gender: user?.gender || 'prefer-not-to-say',
      bio: user?.bio || '',
      profilePhoto: user?.profile_photo || null,
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

  const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError('The photo must be smaller than 10MB.');
      return;
    }

    setPhotoError(null);
    setProfilePhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({ ...prev, profilePhoto: event.target?.result as string }));
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (profilePhotoFile) {
        const form = new FormData();
        form.append('_method', 'PUT');
        form.append('name', formData.name || '');
        form.append('phone', formData.phone || '');
        form.append('gender', formData.gender || '');
        form.append('bio', formData.bio || '');
        form.append('profile_photo', profilePhotoFile, profilePhotoFile.name);
        await api.post('/v1/auth/profile', form);
      } else {
        const payload: any = {
          name: formData.name,
          phone: formData.phone,
          gender: formData.gender,
          bio: formData.bio,
        };

        if (formData.profilePhoto) payload.profile_photo = formData.profilePhoto;

        await api.put('/v1/auth/profile', payload);
      }

      if (refreshUser) await refreshUser();
      setProfilePhotoFile(null);
      setHasChanges(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      setMessage({ type: 'success', text: 'Your profile changes are saved and synced across all dashboards.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Unable to save your profile information. Please try again.' });
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
    <div className="company-dashboard">
      <PageHeader eyebrow="Organization Settings" title="Profile" description="A refined organization and manager profile experience for approved tenant users." />

      <section className="company-grid company-grid--split">
        <article className="company-card company-card--wide">
          <div className="company-card__header">
            <div>
              <p className="company-card__eyebrow">Manager profile</p>
              <h3>{user?.name || 'Company manager'}</h3>
              <p>{company?.name ? `${company.name} • ${company?.status === 'active' ? 'Approved business profile' : 'Verification pending'}` : 'Business tenant profile'}</p>
            </div>
          </div>

          <div className="company-profile-pill company-profile-pill--large">
            <div className="company-profile-pill__avatar-wrapper">
              <Avatar src={resolveMediaUrl(user?.profile_photo ?? null)} name={user?.name ?? null} size={72} />
            </div>
            <div>
              <strong>{user?.name || 'Company manager'}</strong>
              <p>{user?.roles?.map((role) => role.name).join(', ') || 'Company Manager'}</p>
            </div>
          </div>

          <div className="company-list company-list--stacked">
            <div className="company-list__item">
              <strong>Profile completion</strong>
              <p>{profileCompletion}% complete · Add a photo, phone, and summary for stronger business credibility.</p>
            </div>
            <div className="company-list__item">
              <strong>Contact</strong>
              <p>{user?.phone || 'Phone not provided'}</p>
            </div>
            <div className="company-list__item">
              <strong>Company status</strong>
              <p>{company?.status ? company.status.replace(/_/g, ' ') : 'Unknown'}</p>
            </div>
          </div>
        </article>

        <article className="company-card">
          <div className="company-card__header">
            <div>
              <p className="company-card__eyebrow">Business profile</p>
              <h3>Company identity</h3>
            </div>
            <span className={`company-badge company-badge--${company?.status === 'active' ? 'success' : company?.status === 'suspended' ? 'danger' : 'warning'}`}>
              {company?.status ? company.status.replace(/_/g, ' ') : 'Pending'}
            </span>
          </div>

          <div className="company-grid company-grid--two-column">
            <div>
              <p className="company-detail-label">Company name</p>
              <p className="company-detail-value">{company?.name || 'Not available'}</p>
            </div>
            <div>
              <p className="company-detail-label">Registration</p>
              <p className="company-detail-value">{company?.business_registration_number || company?.company_code || 'Not available'}</p>
            </div>
            <div>
              <p className="company-detail-label">Subscription</p>
              <p className="company-detail-value">{company?.subscription_status || 'Standard'}</p>
            </div>
            <div>
              <p className="company-detail-label">Email verified</p>
              <p className="company-detail-value">{company?.email_verified_at ? new Date(company.email_verified_at).toLocaleDateString() : 'No'}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="company-grid company-grid--profile-secondary">
        <article className="company-card">
          <div className="company-card__header">
            <div>
              <p className="company-card__eyebrow">Business contact</p>
              <h3>Professional profile</h3>
            </div>
          </div>
          <div className="company-list company-list--stacked">
            <div className="company-list__item">
              <strong>Email</strong>
              <p>{user?.email || 'Not provided'}</p>
            </div>
            <div className="company-list__item">
              <strong>Phone</strong>
              <p>{user?.phone || 'Not provided'}</p>
            </div>
            <div className="company-list__item">
              <strong>About the company</strong>
              <p>{user?.bio || 'Provide a short professional summary that communicates your company’s services and credibility.'}</p>
            </div>
          </div>
        </article>

        <article className="company-card">
          <div className="company-card__header">
            <div>
              <p className="company-card__eyebrow">Next steps</p>
              <h3>Profile readiness</h3>
            </div>
          </div>
          <div className="company-list company-list--stacked">
            <div className="company-list__item">
              <strong>Recommended update</strong>
              <p>Upload a profile photo, confirm your phone number, and complete your business summary to resemble the system admin experience.</p>
            </div>
            <div className="company-list__item">
              <strong>Verified business</strong>
              <p>{company?.status === 'active' ? 'Your company is approved and operational.' : 'Your company is still completing verification.'}</p>
            </div>
            <div className="company-list__item">
              <strong>Consistency</strong>
              <p>Use the same contact details across your company and manager profile for a polished tenant dashboard.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="company-grid company-grid--profile-secondary">
        <article className="company-card">
          <div className="company-card__header">
            <div>
              <p className="company-card__eyebrow">Profile settings</p>
              <h3>Update your professional profile</h3>
            </div>
          </div>

          <div className="company-form-status-row">
            <div className="company-badge company-badge--success company-badge--accent">
              {saving ? 'Saving your changes…' : hasChanges ? 'Unsaved changes' : lastSavedAt ? `Saved at ${lastSavedAt}` : 'All changes saved'}
            </div>

            {message ? (
              <div className={`company-alert company-alert--${message.type === 'success' ? 'success' : 'danger'} company-alert--grow`}>
                <span>{message.text}</span>
                <button type="button" onClick={dismissMessage} className="company-alert__close" aria-label="Dismiss message">×</button>
              </div>
            ) : null}
          </div>

          <div className="company-grid company-grid--two-column company-grid--gap-lg">
            <div className="company-detail-grid">
              <div className="company-detail-row">
                <div className="company-avatar-card">
                  <Avatar src={resolveMediaUrl(formData.profilePhoto || user?.profile_photo || null)} name={formData.name || user?.name || null} size={140} />
                </div>
                <div>
                  <label className="btn btn-secondary company-file-label">
                    Upload photo
                    <input type="file" accept="image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tif,.tiff,.heic,.heif,.avif" onChange={handlePhotoUpload} className="company-file-input" />
                  </label>
                  {photoError ? <div className="company-alert company-alert--danger company-alert--spaced-top">{photoError}</div> : null}
                </div>
              </div>

              <div>
                <label className="company-detail-label" htmlFor="profile-name">Full name</label>
                <input id="profile-name" type="text" name="name" value={formData.name} onChange={handleInputChange} className="company-input" />
              </div>

              <div>
                <label className="company-detail-label" htmlFor="profile-phone">Phone number</label>
                <input id="profile-phone" type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+1 (555) 000-0000" className="company-input" />
              </div>
            </div>

            <div className="company-detail-grid">
              <div>
                <label className="company-detail-label" htmlFor="profile-gender">Gender</label>
                <select id="profile-gender" name="gender" value={formData.gender} onChange={handleInputChange} className="company-input">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="company-detail-label" htmlFor="profile-bio">Professional summary</label>
                <textarea id="profile-bio" name="bio" value={formData.bio} onChange={handleInputChange} rows={5} className="company-input" placeholder="Describe your company services and professional role." />
              </div>

              <div className="company-form-actions">
                <button type="button" onClick={handleSaveProfile} disabled={saving || !hasChanges} className="btn btn-primary">
                  {saving ? 'Saving...' : hasChanges ? 'Save profile' : 'Saved'}
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="company-card company-card--highlighted">
        <div className="company-card__header">
          <div>
            <p className="company-card__eyebrow">Security</p>
            <h3>Account security</h3>
            <p>Manage your password, add two-factor authentication, review recent sign-ins, and revoke suspicious sessions from one place.</p>
          </div>
          <span className="company-badge company-badge--success">Protected</span>
        </div>

        <div className="company-grid company-grid--two-column company-grid--gap-lg company-card--spaced-bottom">
          <div>
            <label className="company-detail-label" htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))} className="company-input" placeholder="Enter your current password" />
          </div>
          <div>
            <label className="company-detail-label" htmlFor="new-password">New password</label>
            <input id="new-password" type="password" value={passwordForm.password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))} className="company-input" placeholder="Choose a strong new password" />
          </div>
          <div>
            <label className="company-detail-label" htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" value={passwordForm.password_confirmation} onChange={(e) => setPasswordForm((prev) => ({ ...prev, password_confirmation: e.target.value }))} className="company-input" placeholder="Confirm your new password" />
          </div>
        </div>

        <div className="company-detail-row">
          <div className="company-detail-label company-detail-label--accent">Use a minimum of 8 characters with uppercase, lowercase, numbers, and symbols.</div>
          <button type="button" onClick={handlePasswordChange} disabled={passwordSaving || !passwordForm.current_password || !passwordForm.password || !passwordForm.password_confirmation} className="btn btn-primary">
            {passwordSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>

        {passwordMessage ? (
          <div className={`company-alert company-alert--${passwordMessage.type === 'success' ? 'success' : 'danger'} company-alert--spaced-top`}>
            {passwordMessage.text}
          </div>
        ) : null}

        <div className="company-card__section">
          <div className="company-detail-row">
            <div>
              <h4 className="company-section-title">Two-factor authentication</h4>
              <div className="company-detail-subtle company-detail-subtle--small">{securitySummary?.mfa_enabled ? 'Authentication is protected with MFA.' : 'Add an extra layer of protection to your account.'}</div>
            </div>
            {!securitySummary?.mfa_enabled ? (
              <button type="button" onClick={handleSetupMfa} className="btn btn-secondary" disabled={mfaSaving}>{mfaSaving ? 'Preparing…' : 'Enable MFA'}</button>
            ) : null}
          </div>

          {mfaQr ? (
            <div className="company-box company-alert--spaced-top">
              <div className="company-detail-subtle company-detail-subtle--small">Scan this QR code using an authenticator app and enter the 6-digit code below.</div>
              <div className="company-detail-subtle company-detail-subtle--small company-detail-subtle--muted">{mfaQr}</div>
              <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} className="company-input company-input--spaced-top" placeholder="Enter 6-digit code" />
              <div className="company-form-actions--top">
                <button type="button" onClick={handleConfirmMfa} className="btn btn-primary" disabled={mfaSaving || mfaCode.length < 6}>{mfaSaving ? 'Verifying…' : 'Verify MFA'}</button>
              </div>
            </div>
          ) : null}

          {mfaMessage ? <div className={`company-alert company-alert--${mfaMessage.type === 'success' ? 'success' : 'danger'} company-alert--spaced-top`}>{mfaMessage.text}</div> : null}
        </div>

        <div className="company-card__section">
          <div className="company-detail-row">
            <div>
              <h4 className="company-section-title">Login history</h4>
              <div className="company-detail-subtle company-detail-subtle--small">Recent sign-ins and authentication outcomes.</div>
            </div>
          </div>
          {securityLoading ? <div className="company-text-muted">Loading security activity…</div> : (
            <div className="company-detail-grid">
              {(securitySummary?.login_history ?? []).length === 0 ? <div className="company-text-muted">No sign-in activity recorded yet.</div> : (securitySummary?.login_history ?? []).map((item: any) => (
                <div key={item.id} className="company-item-box">
                  <div className="company-detail-row">
                    <strong>{item.reason || 'authenticated'}</strong>
                    <span className={`company-badge ${item.success ? 'company-badge--success' : 'company-badge--warning'}`}>{item.success ? 'Success' : 'Failed'}</span>
                  </div>
                  <div className="company-detail-subtle company-detail-subtle--small">{item.ip_address || 'Unknown IP'} • {item.browser || 'Unknown browser'} • {item.device || 'Unknown device'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="company-card__section">
          <div className="company-detail-row">
            <div>
              <h4 className="company-section-title">Activity logs</h4>
              <div className="company-detail-subtle company-detail-subtle--small">Recent account and profile actions.</div>
            </div>
          </div>
          <div className="company-detail-grid">
            {(securitySummary?.activity_logs ?? []).length === 0 ? <div className="company-text-muted">No recent activity recorded.</div> : (securitySummary?.activity_logs ?? []).map((item: any) => (
              <div key={item.id} className="company-item-box">
                <div className="company-detail-row">
                  <strong>{item.action}</strong>
                  <span className="company-detail-subtle company-detail-subtle--small">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div className="company-detail-subtle company-detail-subtle--small">{item.metadata ? JSON.stringify(item.metadata) : 'No metadata'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="company-card__section">
          <div className="company-detail-row">
            <div>
              <h4 className="company-section-title">Session management</h4>
              <div className="company-detail-subtle company-detail-subtle--small">Manage currently active sessions and revoke suspicious access.</div>
            </div>
            <button type="button" onClick={handleRevokeAllSessions} className="btn btn-secondary" disabled={sessionBusyId === -1}>{sessionBusyId === -1 ? 'Revoking…' : 'Revoke all'}</button>
          </div>
          {sessionMessage ? <div className={`company-alert company-alert--${sessionMessage.type === 'success' ? 'success' : 'danger'} company-alert--spaced-top`}>{sessionMessage.text}</div> : null}
          <div className="company-detail-grid">
            {(securitySummary?.sessions ?? []).length === 0 ? <div className="company-text-muted">No active device sessions recorded.</div> : (securitySummary?.sessions ?? []).map((item: any) => (
              <div key={item.id} className="company-item-box">
                <div className="company-detail-row">
                  <div>
                    <strong>{item.device || 'Unknown device'}</strong>
                    <div className="company-detail-subtle company-detail-subtle--small">{item.browser || 'Unknown browser'} • {item.os || 'Unknown OS'} • {item.ip_address || 'Unknown IP'}</div>
                  </div>
                  <div className="company-detail-row">
                    <span className={`company-badge ${item.revoked ? 'company-badge--warning' : 'company-badge--success'}`}>{item.revoked ? 'Revoked' : 'Active'}</span>
                    {!item.revoked ? <button type="button" onClick={() => void handleRevokeSession(item.id)} className="btn btn-secondary" disabled={sessionBusyId === item.id}>{sessionBusyId === item.id ? 'Revoking…' : 'Revoke'}</button> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
