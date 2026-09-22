import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Button } from '../../components/ui/Button';
import { ConsolePageHeader } from '../../components/ConsolePageHeader';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/ToastProvider';

interface CompanyOption {
  id: number;
  name: string;
  business_email?: string;
  status?: string;
}

interface ApiKeyRow {
  id: number;
  company_id?: number | null;
  company?: CompanyOption | null;
  name: string;
  description?: string | null;
  public_key: string;
  environment: string;
  status: string;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function ApiKeysPage() {
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [expandedKeyId, setExpandedKeyId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    company_id: 'all',
    name: '',
    description: '',
    environment: 'production',
    permissions: '',
    expires_at: '',
  });

  const filterCompanyId = useMemo(() => {
    if (selectedCompanyId === 'all') return null;
    return Number(selectedCompanyId) || null;
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    setError(null);

    try {
      const response = await api.get('/v1/admin/api-keys/companies');
      setCompanies(response.data.data || []);
    } catch (err) {
      const message = 'Unable to load company list at the moment.';
      setError(message);
      setCompanies([]);
      toast.error({ title: 'Unable to Load Companies', description: message });
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchKeys = async () => {
    setLoadingKeys(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {};
      if (filterCompanyId) {
        params.company_id = filterCompanyId;
      }

      const response = await api.get('/v1/admin/api-keys', { params });
      setKeys(response.data.data || []);
    } catch (err) {
      const message = 'Unable to load API keys at the moment.';
      setError(message);
      setKeys([]);
      toast.error({ title: 'Unable to Load API Keys', description: message });
    } finally {
      setLoadingKeys(false);
    }
  };

  const loadData = async () => {
    await Promise.all([fetchCompanies(), fetchKeys()]);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [filterCompanyId]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {};
      if (filterCompanyId) params.company_id = filterCompanyId;

      const response = await api.get('/v1/admin/api-keys/export', {
        params,
        responseType: 'blob',
      });

      const headers = response.headers as Record<string, string | undefined>;
      const filename = headers['content-disposition']
        ? headers['content-disposition']?.split('filename=')[1]?.replace(/['"]+/g, '')
        : `api-keys-export-${Date.now()}.csv`;

      const blob = new Blob([response.data], { type: headers['content-type'] || 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = 'Unable to export API keys. Please try again.';
      setError(message);
      toast.error({ title: 'Export Failed', description: message });
    } finally {
      setExporting(false);
    }
  };

  const handleCreateKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    setNewKeySecret(null);

    try {
      const payload = {
        company_id: formData.company_id === 'all' ? null : Number(formData.company_id),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        environment: formData.environment,
        permissions: formData.permissions
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        expires_at: formData.expires_at || null,
      };

      const response = await api.post('/v1/admin/api-keys', payload);
      const data = response.data.data;
      setNewKeySecret(data.secret || null);
      setSuccessMessage('API key created successfully. Copy the secret now; it will not be visible again.');
      setShowSecretModal(true);
      setFormData({ ...formData, name: '', description: '', permissions: '', expires_at: '' });
      await fetchKeys();
      toast.success({
        title: 'API Key Generated Successfully',
        description: 'Your secure API key has been generated. Store it securely because it cannot be viewed again after this step.',
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to create API key.';
      setError(message);
      toast.error({ title: 'Unable to Create API Key', description: message });
    } finally {
      setSaving(false);
    }
  };

  const companyOptions = useMemo(() => [{ id: 0, name: 'All companies' }, ...companies], [companies]);

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <ConsolePageHeader
        title="API Key Administration"
        subtitle="Generate and export API credentials for every customer or by company, all from a single administrative control surface."
        breadcrumbs={[{ label: 'SYSTEM ADMINISTRATION CONSOLE', to: '/admin' }, { label: 'API Keys' }]}
        actions={(
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={loadData} disabled={loadingKeys || loadingCompanies}>Refresh</Button>
            <Button variant="primary" size="sm" onClick={handleExport} disabled={exporting || loadingKeys}>{exporting ? 'Exporting…' : 'Export CSV'}</Button>
          </div>
        )}
      />

      <section style={{ display: 'grid', gap: '1rem', padding: '1.25rem', borderRadius: 24, background: 'var(--surface-elevated)', border: '1px solid var(--surface-elevated-strong)' }}>
        <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label style={{ display: 'grid', gap: '0.45rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Filter by Company</span>
            <select
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid var(--surface-elevated-strong)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
            >
              {companyOptions.map((company) => (
                <option key={company.id} value={company.id === 0 ? 'all' : String(company.id)}>{company.name}</option>
              ))}
            </select>
          </label>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Active companies</span>
            <div style={{ padding: '0.85rem', borderRadius: 14, border: '1px solid var(--surface-elevated-strong)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}>{companies.length}</div>
          </div>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Keys listed</span>
            <div style={{ padding: '0.85rem', borderRadius: 14, border: '1px solid var(--surface-elevated-strong)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}>{keys.length}</div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: '1rem', padding: '1.25rem', borderRadius: 24, background: 'var(--surface-elevated)', border: '1px solid var(--surface-elevated-strong)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.86rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)' }}>Key distribution</div>
            <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.25rem' }}>Live API key registry</h2>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" onClick={loadData} disabled={loadingKeys || loadingCompanies}>Reload</Button>
          </div>
        </div>

        {loadingKeys ? (
          <div style={{ padding: '1.5rem', borderRadius: 20, background: 'var(--input-bg)', color: 'var(--text-muted)' }}>Loading API keys…</div>
        ) : keys.length === 0 ? (
          <div style={{ padding: '1.5rem', borderRadius: 20, background: 'var(--input-bg)', color: 'var(--text-muted)' }}>No API keys are available for the selected scope.</div>
        ) : (
          <div className="admin-api-key-registry" role="list" aria-label="API key registry">
            <div className="admin-api-key-registry__head" aria-hidden="true">
              <span>Company</span><span>Key</span><span>Environment</span><span>Status</span><span>Created</span><span />
            </div>
            {keys.map((key) => {
              const isExpanded = expandedKeyId === key.id;
              return (
                <div key={key.id} className={`admin-api-key-entry ${isExpanded ? 'admin-api-key-entry--expanded' : ''}`} role="listitem">
                  <button
                    type="button"
                    className="admin-api-key-entry__summary"
                    onClick={() => setExpandedKeyId(isExpanded ? null : key.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`api-key-details-${key.id}`}
                  >
                    <span className="admin-api-key-entry__company">
                      <strong>{key.company?.name ?? 'System'}</strong>
                      <small>{key.company?.business_email || 'Platform-managed key'}</small>
                    </span>
                    <span className="admin-api-key-entry__key">
                      <strong>{key.name}</strong>
                      <small>#{key.id}</small>
                    </span>
                    <span className="admin-api-key-entry__environment">{key.environment}</span>
                    <span><span className={`admin-api-key-status admin-api-key-status--${key.status.toLowerCase()}`}>{key.status}</span></span>
                    <span className="admin-api-key-entry__date">{key.created_at ? new Date(key.created_at).toLocaleDateString() : 'Not available'}</span>
                    <span className="admin-api-key-entry__toggle">{isExpanded ? 'Hide details' : 'View details'} <span aria-hidden="true">{isExpanded ? '−' : '+'}</span></span>
                  </button>
                  {isExpanded ? (
                    <div id={`api-key-details-${key.id}`} className="admin-api-key-entry__details">
                      <div className="admin-api-key-entry__details-grid">
                        <div><span>Company</span><strong>{key.company?.name ?? 'System'}</strong></div>
                        <div><span>Business email</span><strong>{key.company?.business_email || 'Not available'}</strong></div>
                        <div><span>Public key</span><strong className="admin-api-key-entry__mono">{key.public_key}</strong></div>
                        <div><span>Description</span><strong>{key.description || 'No description provided'}</strong></div>
                        <div><span>Expires</span><strong>{key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Does not expire'}</strong></div>
                        <div><span>Last updated</span><strong>{key.updated_at ? new Date(key.updated_at).toLocaleString() : 'No update recorded'}</strong></div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: '1rem', padding: '1.25rem', borderRadius: 24, background: 'var(--surface-elevated)', border: '1px solid var(--surface-elevated-strong)' }}>
        <div>
          <div style={{ fontSize: '0.86rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)' }}>Create new API key</div>
          <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.25rem' }}>Generate credentials</h2>
        </div>

        <form onSubmit={handleCreateKey} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label style={{ display: 'grid', gap: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Company</span>
              <select
                value={formData.company_id}
                onChange={(event) => setFormData((prev) => ({ ...prev, company_id: event.target.value }))}
                style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid var(--surface-elevated-strong)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              >
                <option value="all">System / all companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={String(company.id)}>{company.name}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Key name</span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                required
                placeholder="Integration key label"
                style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid var(--surface-elevated-strong)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Environment</span>
              <select
                value={formData.environment}
                onChange={(event) => setFormData((prev) => ({ ...prev, environment: event.target.value }))}
                style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid var(--surface-elevated-strong)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              >
                <option value="production">Production</option>
                <option value="test">Test</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label style={{ display: 'grid', gap: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Description</span>
              <input
                type="text"
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Optional description"
                style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid var(--surface-elevated-strong)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Permissions</span>
              <input
                type="text"
                value={formData.permissions}
                onChange={(event) => setFormData((prev) => ({ ...prev, permissions: event.target.value }))}
                placeholder="Comma-separated scopes"
                style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid var(--surface-elevated-strong)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Expiration</span>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(event) => setFormData((prev) => ({ ...prev, expires_at: event.target.value }))}
                style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid var(--surface-elevated-strong)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" size="md" loading={saving}>{saving ? 'Saving…' : 'Generate API key'}</Button>
          </div>
        </form>
      </section>

      <Modal open={showSecretModal} onClose={() => setShowSecretModal(false)} title="API key generated">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: 16, background: 'var(--success-soft)', border: '1px solid var(--success-border)' }}>
            <p style={{ margin: 0, color: 'var(--success)', lineHeight: 1.6 }}>This secret will only be shown once. Copy it now and keep it in a secure vault.</p>
          </div>
          <div style={{ padding: '1rem', borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', wordBreak: 'break-all', color: 'var(--border)' }}>
            <code>{newKeySecret || 'No secret available'}</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="md" onClick={() => setShowSecretModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
