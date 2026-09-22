import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';

type ToastType = 'success' | 'info' | 'warning' | 'error' | 'loading';

type ToastOptions = {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
};

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireText?: string;
  placeholder?: string;
  confirmDisabled?: boolean;
};

type ToastItem = ToastOptions & {
  id: number;
  type: ToastType;
  duration: number;
};

type ToastContextValue = {
  success: (options: Omit<ToastOptions, 'type'>) => void;
  info: (options: Omit<ToastOptions, 'type'>) => void;
  warning: (options: Omit<ToastOptions, 'type'>) => void;
  error: (options: Omit<ToastOptions, 'type'>) => void;
  loading: (options: Omit<ToastOptions, 'type'>) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ToastContext = createContext<ToastContextValue>({
  success: () => undefined,
  info: () => undefined,
  warning: () => undefined,
  error: () => undefined,
  loading: () => undefined,
  confirm: async () => false,
});

const statusStyles = {
  success: { icon: '✔', color: '#10B981', border: 'rgba(16, 185, 129, 0.34)' },
  info: { icon: 'ℹ', color: '#2563EB', border: 'rgba(37, 99, 235, 0.34)' },
  warning: { icon: '⚠', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.34)' },
  error: { icon: '✖', color: '#EF4444', border: 'rgba(239, 68, 68, 0.34)' },
  loading: { icon: '⏳', color: '#7C3AED', border: 'rgba(124, 58, 237, 0.34)' },
} as const;

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: number) => void }) {
  const styles = statusStyles[toast.type];
  const durationMs = Math.max(3000, toast.duration);

  return (
    <div
      className={`toast-card toast-card--${toast.type}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={{ ['--toast-accent' as string]: styles.color, ['--toast-border-color' as string]: styles.border } as React.CSSProperties}
    >
      <div className="toast-card__icon" aria-hidden="true" style={{ color: styles.color }}>
        {styles.icon}
      </div>
      <div className="toast-card__content">
        <div className="toast-card__title">{toast.title}</div>
        {toast.description ? <div className="toast-card__description">{toast.description}</div> : null}
        <div className="toast-card__progress" style={{ animationDuration: `${durationMs}ms` }} />
      </div>
      <button type="button" className="toast-card__close" onClick={() => onClose(toast.id)} aria-label="Dismiss notification">
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{ options: ConfirmOptions; resolve: (value: boolean | string) => void } | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const countRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((options: ToastOptions) => {
    const id = countRef.current + 1;
    countRef.current = id;

    const toast: ToastItem = {
      ...options,
      id,
      type: options.type ?? 'info',
      duration: options.duration ?? 4200,
    };

    setToasts((current) => [toast, ...current].slice(0, 4));
    window.setTimeout(() => dismissToast(id), toast.duration);
  }, [dismissToast]);

  const api = useMemo<ToastContextValue>(() => ({
    success: (options) => pushToast({ ...options, type: 'success' }),
    info: (options) => pushToast({ ...options, type: 'info' }),
    warning: (options) => pushToast({ ...options, type: 'warning' }),
    error: (options) => pushToast({ ...options, type: 'error', duration: 5200 }),
    loading: (options) => pushToast({ ...options, type: 'loading', duration: 3200 }),
    confirm: (options) => new Promise<boolean>((resolve) => {
      setConfirmInput('');
      setConfirmState({ options, resolve: (value) => resolve(Boolean(value)) });
    }),
  }), [pushToast]);

  const closeConfirm = useCallback((value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
      setConfirmInput('');
    }
  }, [confirmState]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={dismissToast} />
        ))}
      </div>
      <Modal open={Boolean(confirmState)} onClose={() => closeConfirm(false)} title={confirmState?.options.title}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.7 }}>{confirmState?.options.description}</p>
          {confirmState?.options.requireText ? (
            <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
              Type <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{confirmState.options.requireText}</span> to confirm
              <input
                value={confirmInput}
                onChange={(event) => setConfirmInput(event.target.value)}
                placeholder={confirmState.options.placeholder ?? confirmState.options.requireText}
                style={{ border: '1px solid rgba(15, 23, 42, 0.16)', borderRadius: 10, padding: '0.7rem 0.8rem', fontSize: '0.95rem' }}
              />
            </label>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => closeConfirm(false)}>
              {confirmState?.options.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => closeConfirm(true)}
              disabled={Boolean(confirmState?.options.requireText) && confirmInput.trim().toLowerCase() !== confirmState?.options.requireText?.trim().toLowerCase()}
            >
              {confirmState?.options.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
