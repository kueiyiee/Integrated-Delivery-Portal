import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { fetchApiUsageStatistics, fetchApiRequestLogs, type ApiUsageStatistics, type ApiRequestLogEntry } from '../../services/client';
import type { Webhook } from '../../services/auth';
import Card from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/ToastProvider';
import { useAuth } from '../../hooks/useAuth';
import { getApiHubFailureMessage } from '../../services/auth';

interface ApiKeyRow {
  id: number;
  name: string;
  description?: string | null;
  public_key?: string;
  environment?: string;
  status?: string;
  expires_at?: string | null;
  created_at?: string;
}

interface DocumentationEndpoint {
  method: string;
  path: string;
  description: string;
}

interface DocumentationData {
  company_id?: number;
  documentation?: {
    overview?: string;
    authentication?: string;
    webhook_signing?: string;
    best_practices?: string[];
    endpoints?: DocumentationEndpoint[];
    example_request?: { curl?: string };
    rate_limits?: string;
  };
}

export function ClientApiManagementPage() {
  const auth = useAuth();
  const toast = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [documentation, setDocumentation] = useState<DocumentationData | null>(null);
  const [usage, setUsage] = useState<ApiUsageStatistics | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [requestLogs, setRequestLogs] = useState<ApiRequestLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRow | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', environment: 'production', permissions: '' });
  const [showWebhookForm, setShowWebhookForm] = useState(true);
  const [webhookFormError, setWebhookFormError] = useState<string | null>(null);
  const [webhookSubmitting, setWebhookSubmitting] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<number | null>(null);
  const docs = documentation?.documentation ?? null;
  const bestPractices = docs?.best_practices ?? [];
  const [webhookForm, setWebhookForm] = useState({
    provider: '',
    name: '',
    description: '',
    target_url: '',
    http_method: 'POST',
    retry_count: 3,
    timeout_seconds: 10,
    events: 'delivery.created,delivery.updated',
    status: 'active' as 'active' | 'disabled',
  });

  const isCompanyApproved = Boolean(
    auth.user?.company?.admin_verification_status === 'Verified' ||
    auth.user?.company?.approval_status === 'approved'
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [keysResult, docsResult, usageResult] = await Promise.allSettled([
        api.get('/v1/client/api-management/api-keys'),
        api.get('/v1/client/api-management/documentation'),
        fetchApiUsageStatistics(),
      ]);

      const keyPayload = keysResult.status === 'fulfilled' ? keysResult.value.data?.data : [];
      const documentationPayload = docsResult.status === 'fulfilled' ? docsResult.value.data?.data ?? null : null;
      const usagePayload = usageResult.status === 'fulfilled' ? usageResult.value : null;

      setApiKeys(Array.isArray(keyPayload) ? keyPayload : []);
      setDocumentation(documentationPayload);
      setUsage(usagePayload);

      const failures = [keysResult, docsResult, usageResult].filter((result) => result.status === 'rejected');
      if (failures.length > 0) {
        const message = getApiHubFailureMessage(failures.map((result) => result.reason));

        if (message.includes('No API data is available for this organization yet')) {
          setError(null);
          return;
        }

        setError(message);
        toast.error({ title: 'Developer & API Hub unavailable', description: message });
      }
    } catch (err) {
      console.error('Failed to load Developer & API Hub data.');
      const message = getApiHubFailureMessage([err]);
      setError(message);
      toast.error({ title: 'Developer & API Hub unavailable', description: message });
    } finally {
      setLoading(false);
    }
  };

  const loadRequestLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetchApiRequestLogs({ per_page: 15 });
      setRequestLogs(response.data ?? []);
    } catch (err) {
      console.error('Failed to load API request logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const loadWebhooks = async () => {
    setWebhooksLoading(true);
    try {
      const res = await api.get('/v1/client/api-management/webhooks');
      setWebhooks(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load webhooks.');
    } finally {
      setWebhooksLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    void loadRequestLogs();
    void loadWebhooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateKey = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isCompanyApproved) {
      const message = 'API key generation is disabled until your organization account is approved by a system administrator.';
      setError(message);
      toast.warning({ title: 'Approval Required', description: message });
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post('/v1/client/api-management/api-keys', {
        name: formData.name,
        description: formData.description || null,
        environment: formData.environment,
        permissions: formData.permissions.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setSecret(response.data?.data?.secret ?? null);
      setShowKeyModal(true);
      setFormData({ name: '', description: '', environment: 'production', permissions: '' });
      await loadData();
      setSuccess('API key created successfully.');
      toast.success({
        title: 'API Key Generated Successfully',
        description: 'Your secure API key has been generated. Copy it while it is still visible.',
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to create API key.';
      setError(message);
      toast.error({ title: 'Unable to Create API Key', description: message });
    } finally {
      setSaving(false);
    }
  };

  const openRevokeModal = (key: ApiKeyRow) => {
    setRevokeTarget(key);
    setShowRevokeModal(true);
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) {
      return;
    }

    setRevokingKeyId(revokeTarget.id);
    setError(null);
    setSuccess(null);

    try {
      await api.post(`/v1/client/api-management/api-keys/${revokeTarget.id}/revoke`);
      await loadData();
      setSuccess('API key revoked successfully.');
      toast.success({ title: 'API Key Revoked', description: 'This credential is now disabled for all integrations.' });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to revoke API key.';
      setError(message);
      toast.error({ title: 'Unable to Revoke API Key', description: message });
    } finally {
      setRevokingKeyId(null);
      setShowRevokeModal(false);
      setRevokeTarget(null);
    }
  };

  const handleRevoke = (keyId: number) => {
    openRevokeModal({ id: keyId, name: '', status: 'active' });
  };

  const openDeleteModal = (key: ApiKeyRow) => {
    setDeleteTarget(key);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeletingKeyId(deleteTarget.id);
    setError(null);
    setSuccess(null);

    try {
      await api.delete(`/v1/client/api-management/api-keys/${deleteTarget.id}`);
      await loadData();
      setSuccess('API key deleted.');
      toast.success({ title: 'API Key Deleted', description: 'The selected API key has been removed from your account.' });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to delete API key.';
      setError(message);
      toast.error({ title: 'Unable to Delete API Key', description: message });
    } finally {
      setDeletingKeyId(null);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleRegenerate = async (keyId: number) => {
    try {
      const response = await api.post(`/v1/client/api-management/api-keys/${keyId}/regenerate`);
      setSecret(response.data?.data?.secret ?? null);
      setShowKeyModal(true);
      await loadData();
      setSuccess('API key regenerated.');
      toast.success({ title: 'API Key Regenerated', description: 'The previous API key has been revoked automatically.' });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to regenerate API key.';
      setError(message);
      toast.error({ title: 'Unable to Regenerate API Key', description: message });
    }
  };

  const handleCreateWebhook = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isCompanyApproved) {
      const message = 'Webhook creation is disabled until your organization account is approved by a system administrator.';
      setWebhookFormError(message);
      toast.warning({ title: 'Approval Required', description: message });
      return;
    }

    const provider = webhookForm.provider.trim();
    const name = webhookForm.name.trim();
    const targetUrl = webhookForm.target_url.trim();
    const parsedEvents = webhookForm.events
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!provider || !/^[a-z0-9-]+$/i.test(provider)) {
      setWebhookFormError('Provider is required and must contain only letters, numbers, or hyphens.');
      return;
    }

    if (!name) {
      setWebhookFormError('Webhook name is required.');
      return;
    }

    if (!targetUrl) {
      setWebhookFormError('Target URL is required.');
      return;
    }

    try {
      const parsedUrl = new URL(targetUrl);
      if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
        throw new Error('invalid-protocol');
      }
    } catch {
      setWebhookFormError('Target URL must be a valid HTTP or HTTPS endpoint.');
      return;
    }

    if (!parsedEvents.length) {
      setWebhookFormError('Add at least one event name, such as delivery.created.');
      return;
    }

    setWebhookFormError(null);
    setWebhookSubmitting(true);

    try {
      await api.post('/v1/client/api-management/webhooks', {
        provider,
        name,
        description: webhookForm.description.trim() || null,
        target_url: targetUrl,
        http_method: webhookForm.http_method,
        retry_count: Number(webhookForm.retry_count) || 3,
        timeout_seconds: Number(webhookForm.timeout_seconds) || 10,
        events: parsedEvents,
        status: webhookForm.status,
      });

      setWebhookForm({
        provider: '',
        name: '',
        description: '',
        target_url: '',
        http_method: 'POST',
        retry_count: 3,
        timeout_seconds: 10,
        events: 'delivery.created,delivery.updated',
        status: 'active',
      });
      setShowWebhookForm(false);
      setSuccess('Webhook configuration saved.');
      toast.success({
        title: 'Webhook Created Successfully',
        description: 'Your endpoint is now ready to receive delivery events.',
      });
      await loadWebhooks();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to create webhook.';
      setWebhookFormError(message);
      toast.error({ title: 'Unable to Create Webhook', description: message });
    } finally {
      setWebhookSubmitting(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: number) => {
    try {
      await api.delete(`/v1/client/api-management/webhooks/${webhookId}`);
      await loadWebhooks();
      setSuccess('Webhook deleted successfully.');
      toast.success({ title: 'Webhook Deleted', description: 'This endpoint has been removed from your organization.' });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to delete webhook.';
      setWebhookFormError(message);
      toast.error({ title: 'Unable to Delete Webhook', description: message });
    }
  };

  const handleTestWebhook = async (webhookId: number, webhookName: string) => {
    setTestingWebhookId(webhookId);
    try {
      const response = await api.post(`/v1/client/api-management/webhooks/${webhookId}/test`);

      const isSuccess = response.data?.data?.ok ?? response.data?.ok ?? false;
      const statusCode = response.data?.data?.status ?? response.status ?? null;
      const message = response.data?.data?.message || response.data?.message || 'Webhook test completed.';

      if (isSuccess) {
        toast.success({
          title: 'Webhook Test Successful',
          description: `${webhookName} received the test payload (HTTP ${statusCode}).`,
        });
      } else {
        toast.warning({
          title: 'Webhook Test Failed',
          description: `${webhookName} returned HTTP ${statusCode}. ${message}`,
        });
      }

      // Reload webhooks to show updated last_delivery_at and last_status
      await loadWebhooks();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to test webhook. The endpoint may be unreachable.';
      const statusCode = err?.response?.status;

      toast.error({
        title: 'Webhook Test Error',
        description: statusCode ? `HTTP ${statusCode}: ${message}` : message,
      });
    } finally {
      setTestingWebhookId(null);
    }
  };

  const summary = useMemo(() => ({
    keys: apiKeys.length,
    docs: documentation?.documentation?.best_practices?.length ?? 0,
  }), [apiKeys.length, documentation?.documentation?.best_practices?.length]);

  return (
    <div className="company-dashboard">
      <header className="dashboard-hero api-management-hero">
        <div className="api-management-hero__copy">
          <p className="dashboard-hero__eyebrow">Developer & API Hub</p>
          <h1>Secure integrations for your organization</h1>
          <p>Generate keys, monitor usage, and review request activity for your integrations.</p>
        </div>
        <div className="api-management-hero__signals" aria-label="Integration platform status">
          <span><i /> API platform online</span>
          <span>Organization scoped</span>
        </div>
      </header>

      {!isCompanyApproved ? (
        <article className="company-card api-management-lock">
          <div className="company-card__header">
            <div>
              <p className="company-card__eyebrow">Developer access locked</p>
              <h3>API integration access is pending approval</h3>
            </div>
          </div>
          <p>API key creation and external integrations are disabled until your organization is approved by the SYSTEM ADMINISTRATION CONSOLE.</p>
        </article>
      ) : null}

      {error ? (
        <div className="company-alert company-alert--danger" role="alert">
          <strong>Developer & API Hub unavailable</strong>
          <div style={{ marginTop: '0.35rem' }}>{error}</div>
        </div>
      ) : null}
      {success ? <div className="api-management-success" role="status">{success}</div> : null}

      <section className="company-grid company-grid--stats api-management-summary" aria-label="API usage summary">
        <Card title="API keys" subtitle="Organization-scoped credentials" className="company-stat-card"><div>{summary.keys}</div></Card>
        <Card title="Requests (24h)" subtitle="API volume" className="company-stat-card"><div>{usage?.requests_last_24h ?? 'No usage yet'}</div></Card>
        <Card title="Requests (30d)" subtitle="API volume" className="company-stat-card"><div>{usage?.requests_last_30d ?? 'No usage yet'}</div></Card>
        <Card title="Success rate" subtitle="Healthy responses · last 24h" className="company-stat-card"><div>{usage?.success_rate != null ? `${usage.success_rate}%` : 'No usage data yet'}</div></Card>
      </section>

      <section className="company-grid company-grid--split api-management-sections">
        <Card title="Last API activity" subtitle="Most recent request across your keys" className="api-management-card api-management-card--stacked">
          {usage?.last_activity ? (
            <div className="api-management-summary-list">
              <div><strong>{usage.last_activity.method}</strong> {usage.last_activity.endpoint}</div>
              <div>Status: {usage.last_activity.status_code} • {usage.last_activity.occurred_at ? new Date(usage.last_activity.occurred_at).toLocaleString() : 'Not available'}</div>
              {usage.average_response_time_ms != null ? <div>Average response time: {usage.average_response_time_ms} ms</div> : null}
            </div>
          ) : (
            <div className="text-muted">No API activity recorded yet.</div>
          )}
        </Card>

        <Card title="Create API key" subtitle="Generate a new organization-scoped credential" className="api-management-card api-management-card--stacked">
          <form onSubmit={handleCreateKey} className="api-management-form">
            <div className="api-management-form__grid">
              <label className="api-management-form__field">
                <span>Name</span>
                <input required disabled={!isCompanyApproved} value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label className="api-management-form__field">
                <span>Environment</span>
                <select disabled={!isCompanyApproved} value={formData.environment} onChange={(event) => setFormData((prev) => ({ ...prev, environment: event.target.value }))}>
                  <option value="production">Production</option>
                  <option value="test">Test</option>
                </select>
              </label>
            </div>
            <label className="api-management-form__field">
              <span>Description</span>
              <input disabled={!isCompanyApproved} value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} />
            </label>
            <label className="api-management-form__field">
              <span>Permissions</span>
              <input disabled={!isCompanyApproved} value={formData.permissions} onChange={(event) => setFormData((prev) => ({ ...prev, permissions: event.target.value }))} placeholder="deliveries.read,deliveries.write" />
            </label>
            <div className="api-management-form__actions">
              <Button type="submit" variant="primary" loading={saving} disabled={!isCompanyApproved}>
                {isCompanyApproved ? 'Generate API key' : 'Locked (Pending Approval)'}
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <section className="company-grid company-grid--split api-management-sections">
        <Card title="API keys" subtitle="Manage organization credentials" className="api-management-card">
          {loading ? <div className="text-muted">Loading…</div> : apiKeys.length === 0 ? <div className="text-muted">No API keys created yet.</div> : (
            <div className="api-management-key-list">
              {apiKeys.map((key) => {
                const keyUsage = usage?.keys?.find((entry) => entry.id === key.id);
                return (
                  <article key={key.id} className="api-management-key-card">
                    <div className="api-management-key-card__header">
                      <div>
                        <strong>{key.name}</strong>
                        <div className="text-muted">{key.description || 'Organization-scoped integration key'}</div>
                      </div>
                      <div className="api-management-key-actions">
                        <Button variant="secondary" size="sm" onClick={() => void handleRegenerate(key.id)} disabled={key.status !== 'active'}>Regenerate</Button>
                        <Button variant="secondary" size="sm" onClick={() => void openDeleteModal(key)} disabled={deletingKeyId === key.id || revokingKeyId === key.id}>
                          {deletingKeyId === key.id ? 'Deleting…' : 'Delete'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void openRevokeModal(key)}
                          disabled={key.status !== 'active' || revokingKeyId === key.id || deletingKeyId === key.id}
                        >
                          {key.status === 'revoked' ? 'Revoked' : revokingKeyId === key.id ? 'Revoking…' : 'Revoke'}
                        </Button>
                      </div>
                    </div>
                    <div className="api-management-key-card__meta">
                      <div>Key: {key.public_key || 'Hidden for security'}</div>
                      <div>Status: {key.status || 'active'} • Environment: {key.environment || 'production'}</div>
                      <div>Requests: {keyUsage?.total_requests ?? 0} • Last used: {keyUsage?.last_used_at ? new Date(keyUsage.last_used_at).toLocaleString() : 'Never'}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>
        <Card title="Webhooks" subtitle="Manage outgoing webhook endpoints" className="api-management-card">
          <div className="api-management-webhook-toolbar">
            <Button type="button" variant="primary" size="sm" onClick={() => setShowWebhookForm((current) => !current)}>
              {showWebhookForm ? 'Close form' : 'Add Webhook'}
            </Button>
          </div>

          {showWebhookForm ? (
            <form className="api-management-webhook-form" onSubmit={handleCreateWebhook}>
              <div className="api-management-form__grid">
                <label className="api-management-form__field">
                  <span>Provider</span>
                  <input
                    value={webhookForm.provider}
                    onChange={(event) => setWebhookForm((prev) => ({ ...prev, provider: event.target.value }))}
                    placeholder="billing"
                    aria-label="Provider"
                  />
                </label>
                <label className="api-management-form__field">
                  <span>Webhook name</span>
                  <input
                    value={webhookForm.name}
                    onChange={(event) => setWebhookForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Billing Sync"
                    aria-label="Webhook name"
                  />
                </label>
              </div>

              <div className="api-management-form__grid">
                <label className="api-management-form__field">
                  <span>Target URL</span>
                  <input
                    value={webhookForm.target_url}
                    onChange={(event) => setWebhookForm((prev) => ({ ...prev, target_url: event.target.value }))}
                    placeholder="https://example.com/webhooks/billing"
                    aria-label="Target URL"
                  />
                </label>
                <label className="api-management-form__field">
                  <span>HTTP method</span>
                  <select
                    value={webhookForm.http_method}
                    onChange={(event) => setWebhookForm((prev) => ({ ...prev, http_method: event.target.value as 'POST' | 'PUT' | 'PATCH' | 'GET' }))}
                    aria-label="HTTP method"
                  >
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="GET">GET</option>
                  </select>
                </label>
              </div>

              <div className="api-management-form__grid">
                <label className="api-management-form__field">
                  <span>Retry count</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={webhookForm.retry_count}
                    onChange={(event) => setWebhookForm((prev) => ({ ...prev, retry_count: Number(event.target.value) || 0 }))}
                  />
                </label>
                <label className="api-management-form__field">
                  <span>Timeout seconds</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={webhookForm.timeout_seconds}
                    onChange={(event) => setWebhookForm((prev) => ({ ...prev, timeout_seconds: Number(event.target.value) || 1 }))}
                  />
                </label>
              </div>

              <label className="api-management-form__field">
                <span>Events</span>
                <input
                  value={webhookForm.events}
                  onChange={(event) => setWebhookForm((prev) => ({ ...prev, events: event.target.value }))}
                  placeholder="delivery.created,delivery.updated"
                  aria-label="Events"
                />
              </label>

              <div className="api-management-form__grid">
                <label className="api-management-form__field">
                  <span>Description</span>
                  <input
                    value={webhookForm.description}
                    onChange={(event) => setWebhookForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Optional endpoint description"
                  />
                </label>
                <label className="api-management-form__field">
                  <span>Status</span>
                  <select
                    value={webhookForm.status}
                    onChange={(event) => setWebhookForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'disabled' }))}
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
              </div>

              {webhookFormError ? (
                <div className="company-alert company-alert--danger" role="alert">
                  <strong>Update required</strong>
                  <div style={{ marginTop: '0.35rem' }}>{webhookFormError}</div>
                </div>
              ) : null}

              <div className="api-management-form__actions">
                <Button type="submit" variant="primary" loading={webhookSubmitting}>
                  Add webhook
                </Button>
              </div>
            </form>
          ) : null}

          {webhooksLoading ? <div className="text-muted">Loading…</div> : webhooks.length === 0 ? <div className="text-muted">No webhooks configured yet.</div> : (
            <div className="api-management-key-list api-management-webhook-list">
              {webhooks.map((wh) => (
                <article key={wh.id} className="api-management-key-card api-management-webhook-card">
                  <div className="api-management-key-card__header">
                    <div>
                      <strong>{wh.name}</strong>
                      <div className="text-muted">{wh.description || 'Webhook endpoint'}</div>
                    </div>
                    <div className="api-management-key-actions">
                      <span className={`api-management-webhook-status api-management-webhook-status--${String(wh.status ?? 'active').toLowerCase()}`}>
                        {wh.status ?? 'active'}
                      </span>
                    </div>
                  </div>
                  <div className="api-management-key-card__meta">
                    <div><strong>Provider:</strong> {wh.provider || 'custom'}</div>
                    <div><strong>Target:</strong> {wh.target_url}</div>
                    <div><strong>Method:</strong> {wh.http_method || 'POST'}</div>
                    <div className="api-management-webhook-events">
                      {Array.isArray(wh.events) && wh.events.length ? wh.events.map((eventName: string) => (
                        <span key={`${wh.id}-${eventName}`} className="api-management-webhook-event-pill">{eventName}</span>
                      )) : <span className="text-muted">No events configured</span>}
                    </div>
                  </div>
                  <div className="api-management-key-actions api-management-webhook-actions">
                    <Button variant="secondary" size="sm" onClick={async () => { setSecret(null); setShowKeyModal(true); try { const res = await api.post(`/v1/client/api-management/webhooks/${wh.id}/rotate`); setSecret(res.data?.data?.secret ?? null); toast.success({ title: 'Secret rotated', description: 'A new one-time secret has been generated — copy it now.' }); await loadWebhooks(); } catch (e: any) { toast.error({ title: 'Rotate failed', description: e?.response?.data?.message || 'Unable to rotate webhook secret.' }); } }}>Rotate</Button>
                    <Button variant="secondary" size="sm" loading={testingWebhookId === wh.id} onClick={() => void handleTestWebhook(wh.id, wh.name)}>Test</Button>
                    <Button variant="ghost" size="sm" onClick={() => void handleDeleteWebhook(wh.id)}>Delete</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
        <Card title="API request logs" subtitle="Recent requests made with your API keys" className="api-management-card">
          {logsLoading ? <div className="text-muted">Loading…</div> : requestLogs.length === 0 ? (
            <div className="text-muted">No API requests logged yet.</div>
          ) : (
            <div className="api-management-table-wrapper">
              <table className="api-management-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Status</th>
                    <th>Response time</th>
                  </tr>
                </thead>
                <tbody>
                  {requestLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.created_at ? new Date(log.created_at).toLocaleString() : 'Not available'}</td>
                      <td>{log.method}</td>
                      <td>{log.endpoint}</td>
                      <td className={log.status_code >= 400 ? 'text-danger' : 'text-success'}>{log.status_code}</td>
                      <td>{log.response_time_ms != null ? `${log.response_time_ms} ms` : 'Not available'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section className="company-card api-management-docs">
        <div className="company-card__header api-management-docs__header">
          <div>
            <p className="company-card__eyebrow">Documentation</p>
            <h3>Integration reference and best practices</h3>
            <p className="api-management-docs__lead">A concise path from your first authenticated request to a resilient production integration.</p>
          </div>
          <span className="api-management-docs__badge">Live reference</span>
        </div>
        <div className="api-management-docs__content">
          <div className="api-management-docs__intro-grid">
            <div><span className="api-management-docs__label">Overview</span><p>{docs?.overview || 'Use organization-scoped APIs for secure integrations.'}</p></div>
            <div><span className="api-management-docs__label">Authentication</span><p>{docs?.authentication || 'Authenticate with your API key in the Authorization header.'}</p></div>
          </div>

          {docs?.endpoints?.length ? (
            <div className="api-management-docs__section">
              <div className="api-management-docs__section-heading"><span className="api-management-docs__label">Reference</span><strong>Available endpoints</strong></div>
              <div className="api-management-endpoint-list">
                {docs.endpoints.map((endpoint) => (
                  <div key={`${endpoint.method}-${endpoint.path}`} className="api-management-endpoint-row">
                    <span className="api-management-endpoint-method">{endpoint.method}</span>
                    <span className="api-management-endpoint-path">{endpoint.path}</span>
                    <span>{endpoint.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {docs?.example_request?.curl ? (
            <div className="api-management-docs__section">
              <div className="api-management-docs__section-heading"><span className="api-management-docs__label">Quickstart</span><strong>Example request</strong></div>
              <pre className="api-management-example">{docs.example_request.curl}</pre>
            </div>
          ) : null}

          {bestPractices.length ? (
            <ul className="api-management-best-practices" aria-label="Best practices">
              {bestPractices.map((item: string) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}

          {docs?.rate_limits ? <p>{docs.rate_limits}</p> : null}
        </div>
      </section>

      <Modal open={showKeyModal} onClose={() => setShowKeyModal(false)} title={secret ? 'API key generated' : 'API key updated'}>
        <div className="api-management-modal-content">
          <p className="api-management-modal-description">Copy the secret now. It will only be shown once.</p>
          <div className="api-management-key-secret">
            {secret || 'No secret available.'}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
            <Button variant="secondary" onClick={async () => { if (secret) { try { await navigator.clipboard.writeText(secret); toast.success({ title: 'Copied', description: 'Secret copied to clipboard.' }); } catch { toast.error({ title: 'Copy failed', description: 'Unable to copy secret to clipboard.' }); } } }}>Copy</Button>
            <Button variant="primary" onClick={() => setShowKeyModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showRevokeModal}
        onClose={() => {
          setShowRevokeModal(false);
          setRevokeTarget(null);
        }}
        title="Confirm API key revocation"
      >
        <div className="api-management-modal-content">
          <p className="api-management-modal-description">
            Revoking this API key will permanently disable it. Any integrations using this credential will stop working immediately.
          </p>
          <p className="api-management-modal-description"><strong>{revokeTarget?.name ?? 'Selected API key'}</strong></p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowRevokeModal(false);
                setRevokeTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={revokingKeyId === revokeTarget?.id}
              onClick={handleConfirmRevoke}
            >
              Revoke API Key
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        title="Confirm API key deletion"
      >
        <div className="api-management-modal-content">
          <p className="api-management-modal-description">
            Deleting this API key will remove it permanently. This action cannot be undone and will free up stored space for your account.
          </p>
          <p className="api-management-modal-description"><strong>{deleteTarget?.name ?? 'Selected API key'}</strong></p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={deletingKeyId === deleteTarget?.id}
              onClick={handleConfirmDelete}
            >
              Delete API Key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
