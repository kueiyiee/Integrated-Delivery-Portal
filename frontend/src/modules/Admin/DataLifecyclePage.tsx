import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Eye, RefreshCw, Trash2, X } from 'lucide-react';
import { api } from '../../api';

type Category = { resource: string; label: string; description: string; count: number; confirmation_phrase: string };
type RecordPage = { data: Array<Record<string, unknown>>; meta: { total: number; current_page: number; last_page: number } };
type Impact = { label: string; selected_count: number; confirmation_phrase: string; protected: string[] };

const valueOf = (value: unknown) => value == null || value === '' ? 'Not provided' : typeof value === 'object' ? JSON.stringify(value) : String(value);

export function DataLifecyclePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState<Category | null>(null);
  const [records, setRecords] = useState<RecordPage | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [deleteAll, setDeleteAll] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: Category[] }>('/v1/admin/data-lifecycle/summary');
      setCategories(response.data.data);
    } catch { showMessage('Unable to load lifecycle controls.', 'error'); }
    finally { setLoading(false); }
  };

  const loadRecords = async (category: Category, nextPage = 1) => {
    setRecordsLoading(true);
    try {
      const response = await api.get<RecordPage>(`/v1/admin/data-lifecycle/${category.resource}/records`, { params: { page: nextPage, per_page: 10 } });
      setRecords(response.data);
      setPage(nextPage);
    } catch { showMessage('Unable to load records for this category.', 'error'); }
    finally { setRecordsLoading(false); }
  };

  useEffect(() => { void loadSummary(); }, []);

  const openRecords = (category: Category) => {
    setActive(category);
    setSelected([]);
    setImpact(null);
    setConfirmation('');
    void loadRecords(category);
  };

  const preview = async (all: boolean) => {
    if (!active) return;
    setDeleteAll(all);
    setImpact(null);
    try {
      const response = await api.post<{ data: Impact }>(`/v1/admin/data-lifecycle/${active.resource}/preview`, { ids: all ? [] : selected });
      setImpact(response.data.data);
    } catch { showMessage('Unable to calculate current deletion impact.', 'error'); }
  };

  const executeDelete = async () => {
    if (!active || !impact || confirmation !== impact.confirmation_phrase) return;
    setDeleting(true);
    try {
      const response = await api.post<{ data: { deleted_count: number } }>(`/v1/admin/data-lifecycle/${active.resource}/delete`, { ids: deleteAll ? [] : selected, delete_all: deleteAll, confirmation });
      showMessage(`Operation complete: ${response.data.data.deleted_count.toLocaleString()} ${active.label.toLowerCase()} permanently deleted from the database.`, 'success');
      setActive(null);
      setRecords(null);
      await loadSummary();
    } catch (error: any) {
      showMessage(error?.response?.data?.message || error?.message || 'The deletion request could not reach the server. Check the connection and try again.', 'error');
    }
    finally { setDeleting(false); }
  };

  return (
    <div className="enterprise-console-shell lifecycle-page">
      <section className="enterprise-console-hero lifecycle-page__hero">
        <div className="enterprise-console-hero__content lifecycle-page__hero-content">
          <div className="enterprise-console-hero__copy lifecycle-page__hero-copy">
            <div className="enterprise-console-hero__eyebrow">SYSTEM ADMINISTRATION</div>
            <h2 className="enterprise-console-hero__title">Data Lifecycle &amp; System Controls</h2>
            <p className="enterprise-console-hero__subtitle">Review and permanently remove operational records with database-backed confirmation and protected system boundaries.</p>
          </div>
          <button type="button" className="btn btn-secondary lifecycle-page__refresh" onClick={() => void loadSummary()} disabled={loading}><RefreshCw size={16} /> Refresh data</button>
        </div>
      </section>

      {message ? <div className={`auth-alert${messageType === 'success' ? ' success' : ''}`} role={messageType === 'error' ? 'alert' : 'status'}>{messageType === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{message}<button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message"><X size={16} /></button></div> : null}
      <section className="lifecycle-page__management" style={{ marginTop: '1.5rem' }}>
        <div className="enterprise-console-hero__eyebrow">DATA MANAGEMENT</div>
        <h3>Verified operational categories</h3>
        <div className="enterprise-console-metrics lifecycle-page__categories">
          {loading ? <div className="enterprise-console-panel">Loading database counts...</div> : categories.map((category) => (
            <article className="enterprise-console-panel" key={category.resource}>
              <div className="enterprise-console-panel__header"><h3 className="enterprise-console-panel__title">{category.label}</h3><Database size={18} color="var(--accent)" /></div>
              <p className="enterprise-console-panel__description">{category.description}</p>
              <div className="enterprise-console-panel__row"><span className="enterprise-console-panel__label">Current records</span><strong className="enterprise-console-panel__value">{category.count.toLocaleString()}</strong></div>
              <div className="enterprise-console-panel__row"><span className="enterprise-console-panel__label">Impact</span><span className="enterprise-console-panel__value">Permanent deletion</span></div>
              <button type="button" className="btn btn-secondary lifecycle-page__manage" onClick={() => openRecords(category)}><Eye size={16} /> Manage records</button>
            </article>
          ))}
        </div>
      </section>

      <section className="enterprise-console-panel lifecycle-page__protected" style={{ marginTop: '1.5rem', borderColor: 'var(--danger-border)' }}>
        <div className="enterprise-console-panel__header"><div><div className="enterprise-console-hero__eyebrow" style={{ color: 'var(--danger)' }}>CRITICAL SYSTEM ACTIONS</div><h3 className="enterprise-console-panel__title">Protected boundaries</h3></div><AlertTriangle size={20} color="var(--danger)" /></div>
        <p className="enterprise-console-panel__description">System administrators, roles, permissions, audit logs, configuration, and application infrastructure are excluded from these controls.</p>
      </section>

      {active ? (
        <div className="lifecycle-modal" role="dialog" aria-modal="true" aria-labelledby="lifecycle-dialog-title">
          <div className="enterprise-console-panel lifecycle-modal__panel">
            <div className="enterprise-console-panel__header lifecycle-modal__header"><h3 id="lifecycle-dialog-title" className="enterprise-console-panel__title">Manage {active.label}</h3><button type="button" className="btn btn-secondary lifecycle-modal__close" onClick={() => setActive(null)} aria-label="Close records"><X size={16} /></button></div>
            {recordsLoading ? <p>Loading current records...</p> : (
              <>
                <div className="lifecycle-modal__select-all" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.8rem 0', borderBottom: '1px solid var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean((records?.data ?? []).length) && (records?.data ?? []).every((record) => selected.includes(Number(record.id)))}
                    onChange={(event) => {
                      const pageIds = (records?.data ?? []).map((record) => Number(record.id));
                      setSelected((current) => event.target.checked
                        ? [...new Set([...current, ...pageIds])]
                        : current.filter((id) => !pageIds.includes(id)));
                    }}
                    aria-label="Select all records on this page"
                  />
                  <strong>Select all on this page</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>({records?.data.length ?? 0} records)</span>
                </div>
                <div className="lifecycle-modal__table-wrap"><table className="lifecycle-modal__table"><tbody>
                  {records?.data.map((record) => {
                    const id = Number(record.id);
                    return <tr key={id}><td style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}><input type="checkbox" checked={selected.includes(id)} onChange={() => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} aria-label={`Select record ${id}`} /> <strong>#{id}</strong></td><td style={{ padding: '0.7rem', borderBottom: '1px solid var(--border)' }}>{valueOf(record.name || record.tracking_number || record.email)}</td><td style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>{valueOf(record.status || record.created_at)}</td></tr>;
                  })}
                </tbody></table></div>
                <div className="lifecycle-modal__pagination"><span>{selected.length} selected of {records?.meta.total ?? 0}</span><span><button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => void loadRecords(active, page - 1)}>Previous</button> <button type="button" className="btn btn-secondary" disabled={!records || page >= records.meta.last_page} onClick={() => void loadRecords(active, page + 1)}>Next</button></span></div>
                <div className="lifecycle-modal__actions"><button type="button" className="btn btn-secondary" disabled={!selected.length} onClick={() => void preview(false)}><Trash2 size={16} /> Delete selected</button><button type="button" className="btn btn-danger" disabled={!records?.meta.total} onClick={() => void preview(true)}><Trash2 size={16} /> Delete all</button></div>
              </>
            )}
            {impact ? <div className="lifecycle-modal__impact"><strong>Permanent deletion preview</strong><p>You are about to remove <strong>{impact.selected_count.toLocaleString()}</strong> {impact.label.toLowerCase()}. This cannot be reversed.</p><p>Protected: {impact.protected.join(', ')}.</p><label htmlFor="lifecycle-confirm">Type <strong>{impact.confirmation_phrase}</strong> to confirm.</label><input id="lifecycle-confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /><button type="button" className="btn btn-danger" disabled={deleting || confirmation !== impact.confirmation_phrase} onClick={() => void executeDelete()}>{deleting ? 'Deleting...' : 'Confirm permanent deletion'}</button></div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
