import React from 'react';
import { Plus, MessageSquare, Trash2, Clock } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

interface Props {
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}

export default function Sidebar({ onNewChat, onSelectSession }: Props) {
  const { sessions, activeSessionId, deleteSession, addToast } = useChatStore();

  const sortedSessions = Object.values(sessions).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    addToast('Conversation deleted', 'info');
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div className="brand-name">NESYA</div>
            <div className="brand-subtitle">FIR Legal Assistant</div>
          </div>
        </div>

        <button className="new-chat-btn" onClick={onNewChat}>
          <Plus size={15} />
          New FIR Conversation
        </button>
      </div>

      {/* Conversation List */}
      <div className="sidebar-conversations">
        {sortedSessions.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center' }}>
            <MessageSquare size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              No conversations yet.
              <br />Start a new FIR above.
            </p>
          </div>
        ) : (
          <>
            <div className="sidebar-section-title">Recent</div>
            {sortedSessions.map((session) => (
              <div
                key={session.session_id}
                className={`conversation-item ${activeSessionId === session.session_id ? 'active' : ''}`}
                onClick={() => onSelectSession(session.session_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectSession(session.session_id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <div className="conversation-item-title">
                    {session.preview || 'New conversation'}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, session.session_id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 2,
                      borderRadius: 4,
                      flexShrink: 0,
                      opacity: 0,
                      transition: 'opacity 0.15s',
                    }}
                    className="delete-btn"
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <div className="conversation-item-meta">
                  <Clock size={10} />
                  {new Date(session.updated_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {session.status === 'fir_ready' && (
                    <span style={{
                      marginLeft: 'auto',
                      background: 'rgba(16,163,127,0.12)',
                      color: 'var(--text-primary)',
                      padding: '1px 6px',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 600,
                    }}>
                      Complete
                    </span>
                  )}
                </div>
                {session.completion_percentage > 0 && (
                  <div style={{ marginTop: 5, height: 2, background: 'rgba(148,163,184,0.12)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%',
                      width: `${session.completion_percentage}%`,
                      background: 'linear-gradient(90deg, var(--violet-500), var(--cyan-400))',
                      borderRadius: 2,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {sortedSessions.length} conversation{sortedSessions.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          v1.0.0
        </span>
      </div>

      <style>{`
        .conversation-item:hover .delete-btn { opacity: 1 !important; }
      `}</style>
    </aside>
  );
}
