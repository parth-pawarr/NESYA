/**
 * NESYA Sidebar — Production-grade ChatGPT/Claude-style sidebar.
 *
 * Features:
 *  - Real-time debounced search
 *  - Time-grouped conversations (Today / Yesterday / Last 7 days / Older / Archived)
 *  - Inline rename (click title → editable)
 *  - Hover context menu: Rename | Archive | Delete
 *  - Infinite scroll / "Load more"
 *  - Completion badge + progress bar
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, MessageSquare, Trash2, Clock, Search, X,
  Archive, Pencil, Check, ChevronDown, ChevronRight, Loader2,
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useChat } from '../../hooks/useChat';
import type { ConversationSummary } from '../../services/api';

interface Props {
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
}

// ── Time grouping helpers ───────────────────────────────────────────────────

function getTimeGroup(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1) return 'Today';
  if (diffDays < 2) return 'Yesterday';
  if (diffDays < 7) return 'Last 7 Days';
  if (diffDays < 30) return 'Last 30 Days';
  return 'Older';
}

function groupConversations(
  conversations: ConversationSummary[],
): Record<string, ConversationSummary[]> {
  const groups: Record<string, ConversationSummary[]> = {};
  const order = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Older'];

  for (const conv of conversations) {
    if (conv.status === 'archived') continue;
    const group = getTimeGroup(conv.updated_at);
    if (!groups[group]) groups[group] = [];
    groups[group].push(conv);
  }

  // Return in sorted order
  const result: Record<string, ConversationSummary[]> = {};
  for (const key of order) {
    if (groups[key]?.length) result[key] = groups[key];
  }
  return result;
}

// ── Inline rename input ─────────────────────────────────────────────────────

function RenameInput({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSave(value.trim() || initialValue);
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => onSave(value.trim() || initialValue)}
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(16,163,127,0.4)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 12,
          padding: '3px 6px',
          outline: 'none',
          minWidth: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onSave(value.trim() || initialValue); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', padding: 2 }}
      >
        <Check size={12} />
      </button>
    </div>
  );
}

// ── Single conversation item ────────────────────────────────────────────────

function ConversationItem({
  conv,
  isActive,
  onSelect,
  onRename,
  onArchive,
  onDelete,
}: {
  conv: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const displayTitle = conv.title || conv.preview || 'New conversation';

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={renaming ? undefined : onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => !renaming && e.key === 'Enter' && onSelect()}
      style={{ position: 'relative' }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        {renaming ? (
          <RenameInput
            initialValue={conv.title ?? ''}
            onSave={(v) => { setRenaming(false); onRename(v); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <>
            <div className="conversation-item-title" style={{ flex: 1, minWidth: 0 }}>
              {displayTitle}
            </div>
            {/* Action buttons — visible on hover */}
            <div className="conv-actions" style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
                className="conv-action-btn"
                title="Rename"
                aria-label="Rename conversation"
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                className="conv-action-btn"
                title="Archive"
                aria-label="Archive conversation"
              >
                <Archive size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="conv-action-btn conv-action-delete"
                title="Delete"
                aria-label="Delete conversation"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Meta row */}
      <div className="conversation-item-meta">
        <Clock size={10} />
        <span>
          {new Date(conv.updated_at).toLocaleDateString([], {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
        {conv.status === 'completed' && (
          <span style={{
            marginLeft: 'auto',
            background: 'rgba(16,163,127,0.14)',
            color: '#10a37f',
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}>
            Complete
          </span>
        )}
        {conv.message_count > 0 && conv.status !== 'completed' && (
          <span style={{
            marginLeft: 'auto',
            color: 'var(--text-muted)',
            fontSize: 10,
          }}>
            {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {conv.completion_percentage > 0 && (
        <div style={{ marginTop: 5, height: 2, background: 'rgba(148,163,184,0.1)', borderRadius: 2 }}>
          <div style={{
            height: '100%',
            width: `${conv.completion_percentage}%`,
            background: conv.status === 'completed'
              ? 'linear-gradient(90deg, #10a37f, #06d6a0)'
              : 'linear-gradient(90deg, var(--violet-500), var(--cyan-400))',
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}
    </div>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────────────────

export default function Sidebar({ onNewChat, onSelectConversation }: Props) {
  const {
    conversations,
    activeSession,
    loadingConversations,
    hasMoreConversations,
    searchResults,
    searchQuery,
  } = useChatStore();

  const {
    loadMoreConversations,
    renameConversation,
    archiveConversation,
    removeConversation,
    searchChats,
  } = useChat();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      searchChats(search);
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search, searchChats]);

  // Infinite scroll
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreConversations(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMoreConversations]);

  const activeId = activeSession?.db_id;

  // Which list to display
  const displayList: ConversationSummary[] =
    search.trim() ? (searchResults ?? []) : conversations;

  const grouped = groupConversations(displayList.filter((c) => c.status !== 'archived'));
  const archived = displayList.filter((c) => c.status === 'archived');
  const totalActive = conversations.filter((c) => c.status !== 'archived').length;

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="brand-name">NESYA</div>
            <div className="brand-subtitle">FIR Legal Assistant</div>
          </div>
        </div>

        <button className="new-chat-btn" onClick={onNewChat} id="new-chat-btn">
          <Plus size={15} />
          New FIR Conversation
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '0 10px 8px', position: 'relative' }}>
        <Search
          size={13}
          style={{
            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }}
        />
        <input
          id="sidebar-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations…"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(148,163,184,0.12)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 12,
            padding: '7px 28px 7px 30px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(16,163,127,0.4)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(148,163,184,0.12)')}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 2,
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Conversation list */}
      <div className="sidebar-conversations">
        {loadingConversations && conversations.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Loader2 size={20} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : displayList.filter(c => c.status !== 'archived').length === 0 && !search ? (
          <div style={{ padding: '24px 8px', textAlign: 'center' }}>
            <MessageSquare size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
              No conversations yet.
              <br />Start a new FIR above.
            </p>
          </div>
        ) : search && searchResults?.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              No results for "{search}"
            </p>
          </div>
        ) : (
          <>
            {/* Time-grouped sections */}
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="sidebar-section-title">{group}</div>
                {items.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={activeId === conv.id}
                    onSelect={() => onSelectConversation(conv.id)}
                    onRename={(title) => renameConversation(conv.id, title)}
                    onArchive={() => archiveConversation(conv.id)}
                    onDelete={() => removeConversation(conv.id)}
                  />
                ))}
              </div>
            ))}

            {/* Load more spinner / sentinel */}
            {hasMoreConversations && (
              <div ref={bottomRef} style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                {loadingConversations
                  ? <Loader2 size={16} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
                  : <button
                      onClick={loadMoreConversations}
                      style={{
                        background: 'none', border: '1px solid var(--border)',
                        borderRadius: 6, color: 'var(--text-muted)',
                        fontSize: 11, padding: '4px 12px', cursor: 'pointer',
                      }}
                    >
                      Load more
                    </button>
                }
              </div>
            )}

            {/* Archived section */}
            {archived.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px 10px',
                    display: 'flex', alignItems: 'center', gap: 6,
                    color: 'var(--text-muted)', fontSize: 11,
                  }}
                >
                  {showArchived ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Archive size={11} />
                  Archived ({archived.length})
                </button>
                {showArchived && archived.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={activeId === conv.id}
                    onSelect={() => onSelectConversation(conv.id)}
                    onRename={(title) => renameConversation(conv.id, title)}
                    onArchive={() => {}} // already archived
                    onDelete={() => removeConversation(conv.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {totalActive} conversation{totalActive !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          v1.0.0
        </span>
      </div>

      <style>{`
        .conv-actions {
          opacity: 0;
          transition: opacity 0.15s;
        }
        .conversation-item:hover .conv-actions,
        .conversation-item.active .conv-actions {
          opacity: 1;
        }
        .conv-action-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 3px 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .conv-action-btn:hover {
          background: rgba(148,163,184,0.12);
          color: var(--text-primary);
        }
        .conv-action-delete:hover {
          background: rgba(239,68,68,0.12) !important;
          color: #ef4444 !important;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </aside>
  );
}
