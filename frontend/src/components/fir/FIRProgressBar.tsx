import React from 'react';
import { useChatStore } from '../../store/chatStore';

export default function FIRProgressBar() {
  const { activeSession } = useChatStore();
  const pct = activeSession?.completion_percentage ?? 0;
  const missing = activeSession?.missing_fields ?? [];

  if (pct === 0) return null;

  const getLabel = () => {
    if (pct >= 100) return 'FIR Complete ✓';
    if (pct >= 70) return 'Almost ready…';
    if (pct >= 40) return 'Good progress';
    return 'Collecting information';
  };

  const getColor = () => {
    if (pct >= 80) return 'var(--success)';
    if (pct >= 50) return 'var(--warning)';
    return 'var(--violet-400)';
  };

  return (
    <div className="progress-container">
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, var(--violet-500), ${getColor()})`,
          }}
        />
      </div>
      <div className="progress-label">
        <span>{getLabel()}</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {pct}% complete
          {missing.length > 0 && ` · ${missing.length} field${missing.length !== 1 ? 's' : ''} needed`}
        </span>
      </div>
    </div>
  );
}
