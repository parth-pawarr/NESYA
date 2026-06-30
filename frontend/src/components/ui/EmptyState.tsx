import React from 'react';
import { FileText } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <FileText size={32} />
      </div>
      <h3>Start Your FIR</h3>
      <p>
        Describe the incident in your own words and our AI Legal Assistant will
        guide you through filing a complete First Information Report.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {['My phone was stolen', 'I was assaulted', 'Online fraud happened'].map((ex) => (
          <span
            key={ex}
            style={{
              padding: '5px 12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
          >
            {ex}
          </span>
        ))}
      </div>
    </div>
  );
}
