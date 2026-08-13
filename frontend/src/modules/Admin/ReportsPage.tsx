import React, { useEffect, useState } from 'react';
import { ConsolePageHeader } from '../../components/ConsolePageHeader';
import { api } from '../../api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { useToast } from '../../components/ui/ToastProvider';
import { DocumentVerificationScanner } from '../../components/ui/DocumentVerificationScanner';
import { formatEthiopianDateTime, makeReportFileName } from '../../utils/dates';

interface ReportFilter {
  startDate: string;
  endDate: string;
  companyId: string;
  userId: string;
  role: string;
  status: string;
  deliveryStatus: string;
  driverId: string;
  search: string;
}

interface ReportRow {
  id: number;
  title: string;
  category: string;
  created_at: string;
  total_records: number;
  status: string;
}

interface ReportExportHistoryRow {
  id: number;
  report_id: string;
  report_title: string;
  report_category: string;
  reference_number: string;
  export_format: string;
  generated_by_role: string | null;
  record_count: number;
  checksum: string;
  verification_id: string;
  verification_count?: number;
  expires_at?: string;
  verification_url?: string;
  download_url?: string;
  created_at: string;
}

interface VerificationResult {
  status: 'valid' | 'invalid';
  verification_source?: string;
  report_id?: string;
  reference_number?: string;
  verification_id?: string;
  generated_at?: string;
  generated_by?: string;
  generated_by_role?: string;
  company_id?: number;
  report_category?: string;
  document_type?: string;
  verification_timestamp?: string;
  message?: string;
}

export function ReportsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<ReportFilter>({
    startDate: '',
    endDate: '',
    companyId: '',
    userId: '',
    role: '',
    status: '',
    deliveryStatus: '',
    driverId: '',
    search: '',
  });
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [exportMeta, setExportMeta] = useState<{
    verificationUrl?: string;
    referenceNumber?: string;
    documentVersion?: string;
    checksum?: string;
  }>({});
  const [history, setHistory] = useState<ReportExportHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [verificationQuery, setVerificationQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/v1/admin/reports', { params: { search: filters.search, company_id: filters.companyId, user_id: filters.userId, role: filters.role, status: filters.status, delivery_status: filters.deliveryStatus, driver_id: filters.driverId, start_date: filters.startDate, end_date: filters.endDate } })
      .then((response) => {
        setReports(response.data.data || []);
      })
      .catch(() => {
        setReports([]);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await api.get('/v1/admin/reports/history');
      setHistory(response.data.data || []);
    } catch (err) {
      setHistory([]);
      const message = 'Unable to load export history from the system right now. Please try again using the "Retry" button below. If the problem continues, contact your IT team or support.';
      setHistoryError(message);
      toast.error({ title: 'Unable to Load Export History', description: message });
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const extractFilename = (contentDisposition: unknown, fallback: string) => {
    const headerValue = normalizeHeaderValue(contentDisposition);
    if (!headerValue) return fallback;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(headerValue);
    return match?.[1] ? decodeURIComponent(match[1]) : fallback;
  };

  const normalizeHeaderValue = (value: unknown): string | undefined => {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      return value[0];
    }
    return undefined;
  };

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv' | 'docx') => {
    if (!selectedReport) return;
    setExporting(true);
    try {
      const response = await api.get(`/v1/admin/reports/${selectedReport.id}/export`, {
        params: {
          format,
          search: filters.search || undefined,
          company_id: filters.companyId || undefined,
          user_id: filters.userId || undefined,
          role: filters.role || undefined,
          status: filters.status || undefined,
          delivery_status: filters.deliveryStatus || undefined,
          driver_id: filters.driverId || undefined,
          start_date: filters.startDate || undefined,
          end_date: filters.endDate || undefined,
        },
        responseType: 'blob',
      });

      const generatedAt = formatEthiopianDateTime(new Date());
      const defaultName = `${selectedReport.category}-${selectedReport.id}-${generatedAt.replace(/[^0-9]/g, '_')}.${format}`;
      const filename = extractFilename(response.headers['content-disposition'], makeReportFileName(selectedReport.title, selectedReport.category, format === 'xlsx' ? 'xlsx' : format));
      const contentType = normalizeHeaderValue(response.headers['content-type']) ?? 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || defaultName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportMeta({
        verificationUrl: normalizeHeaderValue(response.headers['x-report-verification-url']),
        referenceNumber: normalizeHeaderValue(response.headers['x-report-reference-number']),
        documentVersion: normalizeHeaderValue(response.headers['x-report-document-version']),
        checksum: normalizeHeaderValue(response.headers['x-report-checksum']),
      });

      try {
        const historyResponse = await api.get('/v1/admin/reports/history');
        setHistory(historyResponse.data.data || []);
      } catch {
        // ignore refresh failure
      }
    } catch (error) {
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadHistory = async (historyRecord: ReportExportHistoryRow) => {
    try {
      setExporting(true);
      const response = await api.get(`/v1/admin/reports/history/${historyRecord.id}/download`, {
        responseType: 'blob',
      });
      const defaultName = makeReportFileName(historyRecord.report_title, historyRecord.report_category, historyRecord.export_format);
      const filename = extractFilename(response.headers['content-disposition'], defaultName);
      const contentType = normalizeHeaderValue(response.headers['content-type']) ?? 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleVerifyHistoryRecord = async (historyRecord: ReportExportHistoryRow) => {
    const query = historyRecord.verification_id || historyRecord.reference_number || historyRecord.verification_url;
    if (!query) {
      setVerificationError('No verification reference is available for this export.');
      setVerificationResult(null);
      return;
    }

    setVerificationQuery(query);
    setVerificationLoading(true);
    setVerificationError(null);
    setVerificationResult(null);

    try {
      const response = await api.post('/v1/admin/reports/verify', { query });
      setVerificationResult(response.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to verify the document right now. Please check the input and try again.';
      setVerificationError(message);
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyDocument = async () => {
    if (!verificationQuery.trim()) {
      setVerificationError('Please enter a reference number, verification URL, or token to verify.');
      setVerificationResult(null);
      return;
    }

    setVerificationLoading(true);
    setVerificationError(null);
    setVerificationResult(null);

    try {
      const response = await api.post('/v1/admin/reports/verify', { query: verificationQuery.trim() });
      setVerificationResult(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to verify the document right now. Please check the input and try again.';
      setVerificationError(message);
    } finally {
      setVerificationLoading(false);
    }
  };

  const renderExportStatus = (historyRecord: ReportExportHistoryRow) => {
    const expired = historyRecord.expires_at ? new Date(historyRecord.expires_at).getTime() < Date.now() : false;
    const verified = (historyRecord.verification_count ?? 0) > 0;
    const status = expired ? 'Expired' : verified ? 'Verified' : 'Archived';
    const statusClass = expired ? 'warning' : verified ? 'success' : 'archived';

    return (
      <span className={`report-status-pill report-status-pill--${statusClass}`}>
        {status}
      </span>
    );
  };

  const columns = [
    { key: 'title', label: 'Report' },
    { key: 'category', label: 'Category' },
    { key: 'created_at', label: 'Created' },
    { key: 'total_records', label: 'Records' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', render: (row: ReportRow) => (
      <div className="report-action-group">
        <Button variant="secondary" size="sm" onClick={() => { setSelectedReport(row); setReportModalOpen(true); }}>View</Button>
      </div>
    ) },
  ];

  return (
    <div className="admin-reports-page">
      <ConsolePageHeader
        title="Audit & Reports"
        subtitle="Generate polished executive reports and export audit-ready data in PDF, Excel, CSV, or Word formats."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Audit & Reports' }]}
        actions={<Button variant="primary" size="md" onClick={() => { setSelectedReport(null); setReportModalOpen(true); }}>Export a report</Button>}
      />

      <section className="report-panel report-panel--filters">
        <div className="report-filter-grid">
          <label className="report-filter-field">
            <span>Search reports</span>
            <input className="input-base" value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search by title, category, or reference" />
          </label>
          <label className="report-filter-field">
            <span>Company</span>
            <input className="input-base" value={filters.companyId} onChange={(event) => setFilters((prev) => ({ ...prev, companyId: event.target.value }))} placeholder="Company ID" />
          </label>
          <label className="report-filter-field">
            <span>User</span>
            <input className="input-base" value={filters.userId} onChange={(event) => setFilters((prev) => ({ ...prev, userId: event.target.value }))} placeholder="User ID" />
          </label>
          <label className="report-filter-field">
            <span>Role</span>
            <input className="input-base" value={filters.role} onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))} placeholder="Role" />
          </label>
          <label className="report-filter-field">
            <span>Status</span>
            <input className="input-base" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} placeholder="Status" />
          </label>
        </div>
      </section>

      <section className="report-panel report-panel--overview">
        <div className="report-panel__header">
          <div>
            <p className="report-panel__eyebrow">Reports</p>
            <h2>Enterprise reporting library</h2>
          </div>
          <div className="report-panel__actions">
            <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, startDate: '', endDate: '', companyId: '', userId: '', role: '', status: '', deliveryStatus: '', driverId: '', search: '' })}>Clear filters</Button>
            <Button variant="primary" size="sm" onClick={() => setReports(reports)} disabled={loading}>Apply filters</Button>
          </div>
        </div>

        {loading ? (
          <div className="report-empty-state">Loading reports…</div>
        ) : reports.length === 0 ? (
          <div className="report-empty-state">No reports match your filters. Adjust the criteria to narrow or broaden results.</div>
        ) : (
          <Table className="admin-reports-table" columns={columns} data={reports} />
        )}
      </section>

      <section className="report-panel report-panel--history">
        <div className="report-panel__header">
          <div>
            <p className="report-panel__eyebrow">Export history</p>
            <h2>Recent exports</h2>
          </div>
          <div className="report-panel__meta">{history.length} records in this view</div>
        </div>

        {historyLoading ? (
          <div className="report-empty-state">Loading export history…</div>
        ) : historyError ? (
          <div className="report-empty-state report-empty-state--warning">
            <div>Export history is temporarily unavailable.</div>
            <div className="report-empty-state__actions">
              <Button variant="primary" size="sm" onClick={() => void loadHistory()}>Retry</Button>
              <Button variant="ghost" size="sm" onClick={() => { window.open('mailto:support@localhost', '_blank'); }}>Contact support</Button>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="report-empty-state">No export history is available yet. Generate a report to create a permanent archived record.</div>
        ) : (
          <Table
            className="admin-reports-table"
            columns={[
              { key: 'report_title', label: 'Report' },
              { key: 'report_category', label: 'Category' },
              { key: 'reference_number', label: 'Reference' },
              { key: 'export_format', label: 'Format' },
              { key: 'record_count', label: 'Records' },
              {
                key: 'status',
                label: 'Status',
                render: (row: ReportExportHistoryRow) => renderExportStatus(row),
              },
              { key: 'created_at', label: 'Exported' },
              {
                key: 'actions',
                label: 'Actions',
                render: (row: ReportExportHistoryRow) => (
                  <div className="report-action-group">
                    <Button variant="secondary" size="sm" onClick={() => handleDownloadHistory(row)} disabled={exporting}>Download</Button>
                    {(row.verification_id || row.reference_number || row.verification_url) ? (
                      <Button variant="ghost" size="sm" onClick={() => void handleVerifyHistoryRecord(row)} disabled={verificationLoading}>Verify</Button>
                    ) : null}
                    <a href={row.download_url} target="_blank" rel="noreferrer" className="report-link">Open archive</a>
                  </div>
                ),
              },
            ]}
            data={history}
          />
        )}
      </section>

      <section className="report-panel report-panel--verification">
        <div className="report-panel__header">
          <div>
            <p className="report-panel__eyebrow">Verification</p>
            <h2>Verify a report or document</h2>
          </div>
          <div className="report-panel__meta">Enter a reference number, verification URL, or token to confirm authenticity.</div>
        </div>

        <div className="report-verify-grid">
          <div className="report-verify-input-group">
            <label className="report-filter-field">
              <span>Reference / token / verification link</span>
              <input
                className="input-base"
                type="text"
                value={verificationQuery}
                onChange={(event) => setVerificationQuery(event.target.value)}
                placeholder="Enter REF-xxxx, verified token, or verification URL"
              />
            </label>
            {verificationError ? <div className="report-error-text">{verificationError}</div> : null}
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <DocumentVerificationScanner
              value={verificationQuery}
              onChange={setVerificationQuery}
              buttonLabel="Scan document QR"
              compact
            />
            <Button variant="primary" size="sm" onClick={handleVerifyDocument} disabled={verificationLoading}>{verificationLoading ? 'Verifying…' : 'Verify document'}</Button>
          </div>
        </div>

        {verificationResult ? (
          <article className={`report-verification-result report-verification-result--${verificationResult.status}`}>
            <div className="report-verification-result__header">
              <div>
                <div className="report-verification-result__title">Document verification {verificationResult.status === 'valid' ? 'successful' : 'failed'}</div>
                <div className="report-verification-result__subtitle">{verificationResult.message || 'Verification completed against system records.'}</div>
              </div>
              <span className={`report-status-pill report-status-pill--${verificationResult.status}`}>{verificationResult.status}</span>
            </div>

            <div className="report-verification-result__details">
              {verificationResult.reference_number ? <div><strong>Reference:</strong> {verificationResult.reference_number}</div> : null}
              {verificationResult.verification_id ? <div><strong>Verification code:</strong> {verificationResult.verification_id}</div> : null}
              {verificationResult.report_id ? <div><strong>Report ID:</strong> {verificationResult.report_id}</div> : null}
              {verificationResult.report_category ? <div><strong>Category:</strong> {verificationResult.report_category}</div> : null}
              {verificationResult.generated_by ? <div><strong>Generated by:</strong> {verificationResult.generated_by}{verificationResult.generated_by_role ? ` • ${verificationResult.generated_by_role}` : ''}</div> : null}
              {verificationResult.generated_at ? <div><strong>Generated at:</strong> {verificationResult.generated_at}</div> : null}
              {verificationResult.verification_timestamp ? <div><strong>Verified at:</strong> {verificationResult.verification_timestamp}</div> : null}
            </div>
          </article>
        ) : null}
      </section>

      <Modal open={reportModalOpen} onClose={() => setReportModalOpen(false)} title={selectedReport ? selectedReport.title : 'Report details'}>
        {selectedReport ? (
          <div className="report-modal-details">
            <div className="report-modal-summary"><strong>Report ID:</strong> {selectedReport.id}</div>
            <div className="report-modal-summary"><strong>Category:</strong> {selectedReport.category}</div>
            <div className="report-modal-summary"><strong>Generated:</strong> {formatEthiopianDateTime(selectedReport.created_at)} (Addis Ababa)</div>
            <div className="report-modal-summary"><strong>Records:</strong> {selectedReport.total_records}</div>
            <div className="report-modal-details">
              <div className="report-modal-actions">
                <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')} disabled={exporting}>Export as PDF</Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport('xlsx')} disabled={exporting}>Export as Excel</Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} disabled={exporting}>Export as CSV</Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport('docx')} disabled={exporting}>Export as Word</Button>
              </div>
              {exportMeta.referenceNumber ? (
                <section className="report-modal-meta">
                  <div className="report-modal-meta-title">Last export details</div>
                  <div className="report-modal-meta-details">
                    <div><strong>Reference:</strong> {exportMeta.referenceNumber}</div>
                    <div><strong>Document Version:</strong> {exportMeta.documentVersion}</div>
                    <div><strong>Checksum:</strong> {exportMeta.checksum}</div>
                    <div><strong>Verification URL:</strong> <a href={exportMeta.verificationUrl} target="_blank" rel="noreferrer" className="report-link">{exportMeta.verificationUrl}</a></div>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="report-modal-details">
            <div className="report-modal-summary">Choose a report to view details and export options. All exports include verification metadata and professional formatting for executive review.</div>
            <label className="report-filter-field">
              <span>Report</span>
              <select
                className="input-base"
                defaultValue=""
                onChange={(event) => {
                  const report = reports.find((r) => String(r.id) === event.target.value) ?? null;
                  setSelectedReport(report);
                }}
              >
                <option value="" disabled>Select a report…</option>
                {reports.map((report) => (
                  <option key={report.id} value={report.id}>{report.title} ({report.total_records} records)</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
