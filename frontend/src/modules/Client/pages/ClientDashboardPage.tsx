import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Avatar from '../../../components/ui/Avatar';
import { api } from '../../../api';
import QRCode from 'qrcode';
import { changePassword, confirmMfa, disableMfa, fetchSecuritySummary, revokeAllSessions, revokeSession, setupMfa, PROFESSIONAL_MFA_MESSAGES, resolveAuthErrorMessage } from '../../../services/auth';
import { cancelClientDelivery, createClientDelivery, deleteClientDelivery, downloadClientDeliveryDocument, fetchClientDeliveries, fetchClientCustomers, fetchClientDeliveryMonthlyStats, fetchCompany, fetchClientDocuments, downloadClientDocument, requestClientDeliveryPrintForm, updateClientDelivery, type Delivery, type Customer, type ClientDocumentRecord } from '../../../services/client';
import { DeliveryStatus, DELIVERY_OPEN_STATUSES, DELIVERY_STATUS_OPTIONS, getDeliveryStatusLabel } from '../../../types/delivery';
import Table from '../../../components/ui/Table';
import Card from '../../../components/ui/Card';
import { ColumnChart, ExecutivePerformanceChart, SimpleDonutChartCard } from '../../../components/ui/Charts';
import { useToast } from '../../../components/ui/ToastProvider';
import { DocumentVerificationScanner } from '../../../components/ui/DocumentVerificationScanner';
import { formatEthiopianDateTime, makeReportFileName } from '../../../utils/dates';
import { resolveMediaUrl } from '../../../utils/media';
import '../../styles/app.css';
import { PageHeader, StatCard } from '../managerPageShared';

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
        console.error('Failed to load company deliveries.');
        failures.push('deliveries');
      }

      if (monthlyStatsResult.status === 'fulfilled') {
        setMonthlyDeliveryStats(monthlyStatsResult.value);
      } else {
        console.error('Failed to load monthly delivery statistics.');
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
  }, [toast]);

  useEffect(() => {
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
    const cancelledDeliveries = deliveries.filter((d) => d.status === DeliveryStatus.Cancelled || d.status === DeliveryStatus.Failed).length;
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
        render: (delivery: Delivery) => (delivery.created_at ? new Date(delivery.created_at).toLocaleString() : 'Not available'),
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

      <div className="company-dashboard__status-row" aria-label="Dashboard status summary">
        <span className="company-dashboard__status-chip company-dashboard__status-chip--live">System online</span>
        <span className="company-dashboard__status-chip">Operations active</span>
        <span className="company-dashboard__status-chip">{deliveryTotal ?? deliveries.length} deliveries tracked</span>
      </div>

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
                            <strong>{delivery.tracking_number || 'Not available'}</strong>
                          </div>
                          <div className="company-detail-row">
                            <span>Reference</span>
                            <strong>{delivery.external_reference || 'Not available'}</strong>
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
