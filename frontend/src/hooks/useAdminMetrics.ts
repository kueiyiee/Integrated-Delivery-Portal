import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

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
  webhook_success_rate_7d?: number;
  audit_events_7d?: number;
  report_exports_7d?: number;
  weekly_registration_growth?: number;
  approval_sla_percent?: number;
  last_updated?: string;
}

interface SecurityMetrics {
  audit_events?: number;
  active_api_keys?: number;
  recent_webhooks?: number;
}

export function useAdminMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [security, setSecurity] = useState<SecurityMetrics>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardRes, securityRes] = await Promise.all([
        api.get('/v1/admin/dashboard'),
        api.get('/v1/admin/security'),
      ]);

      const dashboardMetrics = dashboardRes.data.metrics || {};
      const securityMetrics = securityRes.data.metrics || {};

      // If dashboard does not include pending approvals, try to fetch companies meta as a fallback
      if ((dashboardMetrics.pending_approvals === undefined || dashboardMetrics.pending_approvals === null)) {
        try {
          const companiesRes = await api.get('/v1/admin/companies', { params: { per_page: 1 } });
          const meta = companiesRes?.data?.meta || companiesRes?.data || {};
          if (meta.verification_pending != null) {
            dashboardMetrics.pending_approvals = meta.verification_pending;
          }
        } catch (e) {
          // ignore fallback failures — we'll just show 0
        }
      }

      setMetrics(dashboardMetrics);
      setSecurity(securityMetrics);
    } catch (err) {
      setError('Failed to load admin metrics');
      setMetrics({});
      setSecurity({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { metrics, security, loading, error, refresh: fetch } as const;
}
