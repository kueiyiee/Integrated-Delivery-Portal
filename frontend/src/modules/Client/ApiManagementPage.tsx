import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { fetchApiUsageStatistics, fetchApiRequestLogs, type ApiUsageStatistics, type ApiRequestLogEntry } from '../../services/client';
import Card from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/ToastProvider';
import { useAuth } from '../../hooks/useAuth';

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
      if (failures.length === 3) {
        const message = 'Unable to load Developer & API Hub data right now.';
        setError(message);
        toast.error({ title: 'Unable to Load Developer & API Hub Data', description: message });
      }
    } catch (err) {
      console.error('Failed to load Developer & API Hub data', err);
      const message = 'Unable to load Developer & API Hub data right now.';
      setError(message);
      toast.error({ title: 'Unable to Load Developer & API Hub Data', description: message });
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
      console.error('Failed to load API request logs', err);
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
      console.error('Failed to load webhooks', err);
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

      <section className="company-grid company-grid--stats api-management-summary" aria-label="API usage summary">
        <Card title="API keys" subtitle="Organization-scoped credentials" className="company-stat-card"><div>{summary.keys}</div></Card>
        <Card title="Requests (24h)" subtitle="API volume" className="company-stat-card"><div>{usage?.requests_last_24h ?? '—'}</div></Card>
        <Card title="Requests (30d)" subtitle="API volume" className="company-stat-card"><div>{usage?.requests_last_30d ?? '—'}</div></Card>
        <Card title="Success rate" subtitle="Healthy responses · last 24h" className="company-stat-card"><div>{usage?.success_rate != null ? `${usage.success_rate}%` : 'No data'}</div></Card>
      </section>

      <section className="company-grid company-grid--split api-management-sections">
        <Card title="Last API activity" subtitle="Most recent request across your keys" className="api-management-card api-management-card--stacked">
          {usage?.last_activity ? (
            <div className="api-management-summary-list">
              <div><strong>{usage.last_activity.method}</strong> {usage.last_activity.endpoint}</div>
              <div>Status: {usage.last_activity.status_code} • {usage.last_activity.occurred_at ? new Date(usage.last_activity.occurred_at).toLocaleString() : '—'}</div>
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
                      <div>Key: {key.public_key || '—'}</div>
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
          {webhooksLoading ? <div className="text-muted">Loading…</div> : webhooks.length === 0 ? <div className="text-muted">No webhooks configured yet.</div> : (
            <div className="api-management-key-list">
              {webhooks.map((wh) => (
                <article key={wh.id} className="api-management-key-card">
                  <div className="api-management-key-card__header">
                    <div>
                      <strong>{wh.name}</strong>
                      <div className="text-muted">{wh.description || 'Webhook endpoint'}</div>
                    </div>
                    <div className="api-management-key-actions">
                      <Button variant="secondary" size="sm" onClick={async () => { setSecret(null); setShowKeyModal(true); try { const res = await api.post(`/v1/client/api-management/webhooks/${wh.id}/rotate`); setSecret(res.data?.data?.secret ?? null); toast.success({ title: 'Secret rotated', description: 'A new one-time secret has been generated — copy it now.' }); await loadWebhooks(); } catch (e: any) { toast.error({ title: 'Rotate failed', description: e?.response?.data?.message || 'Unable to rotate webhook secret.' }); } }}>Rotate</Button>
                    </div>
                  </div>
                  <div className="api-management-key-card__meta">
                    <div>Target: {wh.target_url}</div>
                    <div>Events: {Array.isArray(wh.events) ? wh.events.join(', ') : '—'}</div>
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
                      <td>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                      <td>{log.method}</td>
                      <td>{log.endpoint}</td>
                      <td className={log.status_code >= 400 ? 'text-danger' : 'text-success'}>{log.status_code}</td>
                      <td>{log.response_time_ms != null ? `${log.response_time_ms} ms` : '—'}</td>
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
            <div><span className="api-management-docs__label">Overview</span><p>{documentation?.documentation?.overview || 'Use organization-scoped APIs for secure integrations.'}</p></div>
            <div><span className="api-management-docs__label">Authentication</span><p>{documentation?.documentation?.authentication || 'Authenticate with your API key in the Authorization header.'}</p></div>
          </div>

          {documentation?.documentation?.endpoints?.length ? (
            <div className="api-management-docs__section">
              <div className="api-management-docs__section-heading"><span className="api-management-docs__label">Reference</span><strong>Available endpoints</strong></div>
              <div className="api-management-endpoint-list">
                {documentation.documentation.endpoints.map((endpoint) => (
                  <div key={`${endpoint.method}-${endpoint.path}`} className="api-management-endpoint-row">
                    <span className="api-management-endpoint-method">{endpoint.method}</span>
                    <span className="api-management-endpoint-path">{endpoint.path}</span>
                    <span>{endpoint.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {documentation?.documentation?.example_request?.curl ? (
            <div className="api-management-docs__section">
              <div className="api-management-docs__section-heading"><span className="api-management-docs__label">Quickstart</span><strong>Example request</strong></div>
              <pre className="api-management-example">{documentation.documentation.example_request.curl}</pre>
            </div>
          ) : null}

          {(documentation?.documentation?.best_practices ?? []).length ? (
            <ul className="api-management-best-practices" aria-label="Best practices">
              {documentation.documentation.best_practices.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}

          {documentation?.documentation?.rate_limits ? <p>{documentation.documentation.rate_limits}</p> : null}
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
