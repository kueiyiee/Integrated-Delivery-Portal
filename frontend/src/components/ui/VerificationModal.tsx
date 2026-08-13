import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';

interface Props {
  open: boolean;
  mode: 'approve' | 'reject' | 'verify_email';
  company: any | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason?: string; note?: string; notify?: boolean }) => void;
}

export function VerificationModal({ open, mode, company, loading = false, onClose, onSubmit }: Props) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
      setNotify(true);
      setError(null);
    }
  }, [open, mode]);

  if (!open || !company) return null;

  const isReject = mode === 'reject';
  const title = mode === 'approve' ? 'Approve Company' : mode === 'reject' ? 'Reject Company' : 'Verify Company Email';

  const handleSubmit = () => {
    if (isReject && !reason.trim()) {
      const message = 'Rejection reason is required.';
      setError(message);
      toast.warning({ title: 'Validation Required', description: message });
      return;
    }

    setError(null);
    onSubmit({ reason: reason?.trim() || undefined, note: note?.trim() || undefined, notify });
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Company</div>
        <div style={{ fontWeight: 700 }}>{company.name} · {company.business_email}</div>
      </div>

      {mode !== 'verify_email' && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 6 }}>Rejection Reason{isReject ? ' (required)' : ''}</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={isReject ? 'Reason for rejection' : 'Optional reason'} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 6 }}>Internal Notes (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add internal comments or findings" rows={4} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input id="notify" type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        <label htmlFor="notify" style={{ color: 'var(--text-muted)' }}>Notify company by email</label>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} disabled={loading} style={{ padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading} style={{ padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: mode === 'reject' ? 'var(--danger)' : 'var(--success)', color: 'white', fontWeight: 700 }}>{mode === 'reject' ? 'Reject Company' : mode === 'approve' ? 'Approve Company' : 'Verify Email'}</button>
      </div>
    </Modal>
  );
}

export default VerificationModal;
