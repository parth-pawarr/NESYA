import React from 'react';
import { CheckCircle, X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useChatStore();

  if (toasts.length === 0) return null;

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />,
    error: <X size={16} style={{ color: 'var(--error)', flexShrink: 0 }} />,
    info: <CheckCircle size={16} style={{ color: 'var(--info)', flexShrink: 0 }} />,
  };

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`} role="alert">
          {icons[toast.type]}
          <span style={{ flex: 1, fontSize: 13 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
