import React from 'react';
import { colors, typography } from '../../themes/designTokens';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            {title && <h2 id="modal-title" style={{ margin: 0, fontSize: typography.scale.h3.size, fontWeight: 700 }}>{title}</h2>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="modal-close">✕</button>
        </div>
        <div style={{ marginTop: 16 }}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
