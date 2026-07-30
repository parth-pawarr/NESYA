import React, { useEffect, useState } from 'react';
import {
  Search, Filter, MessageSquare, Trash2, Eye, RefreshCw, X,
  User, CheckCircle2, Clock, MapPin, BarChart2, CornerDownRight
} from 'lucide-react';
import {
  fetchAdminConversations, fetchConversationTranscript,
  updateConversationStatus, deleteConversation, type AdminConversationItem
} from '../../services/adminService';
import { useAdminStore } from '../../store/adminStore';

export default function ConversationManagement() {
  const [conversations, setConversations] = useState<AdminConversationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Transcript Inspector State
  const { selectedConversationId, setSelectedConversationId, refreshKey, triggerRefresh } = useAdminStore();
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  const loadConversations = async () => {
    setLoading(true);
    const params: any = { page, limit: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;

    const res = await fetchAdminConversations(params);
    setConversations(res.items);
    setTotal(res.total);
    setLoading(false);
  };

  useEffect(() => {
    loadConversations();
  }, [search, statusFilter, page, refreshKey]);

  // Load Transcript when selected
  useEffect(() => {
    if (selectedConversationId) {
      (async () => {
        setLoadingTranscript(true);
        const data = await fetchConversationTranscript(selectedConversationId);
        setTranscriptData(data);
        setLoadingTranscript(false);
      })();
    } else {
      setTranscriptData(null);
    }
  }, [selectedConversationId]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateConversationStatus(id, newStatus);
    triggerRefresh();
    if (transcriptData && transcriptData.id === id) {
      setTranscriptData({ ...transcriptData, status: newStatus });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this conversation session?')) {
      await deleteConversation(id);
      if (selectedConversationId === id) setSelectedConversationId(null);
      triggerRefresh();
    }
  };

  return (
    <div className="admin-section-container">
      {/* ── Header Toolbar ───────────────────────────────────────────────────── */}
      <div className="section-toolbar">
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations by title, session ID, or text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          {search && (
            <button className="clear-search-btn" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-group">
          <div className="select-wrapper">
            <Filter size={14} className="filter-icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-select"
            >
              <option value="">All Session Statuses</option>
              <option value="active">Active Sessions</option>
              <option value="completed">Completed FIR Sessions</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <button className="admin-btn secondary icon-only" onClick={loadConversations} title="Refresh Sessions">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Conversations Table ─────────────────────────────────────────────── */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-loading">
            <RefreshCw size={24} className="spin-icon" />
            <p>Fetching AI Sessions…</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="admin-empty-state">
            <MessageSquare size={40} />
            <h3>No Conversations Found</h3>
            <p>No chat sessions match your search criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Session Title & Preview</th>
                  <th>User</th>
                  <th>Completion</th>
                  <th>Police Station</th>
                  <th>Messages</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div>
                        <div className="conv-title">{c.title || 'Untitled Session'}</div>
                        <div className="conv-preview">{c.preview || 'No messages yet'}</div>
                      </div>
                    </td>
                    <td>
                      {c.user ? (
                        <div>
                          <div className="user-name-text">{c.user.full_name}</div>
                          <div className="user-email-text">{c.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted">Anonymous</span>
                      )}
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${c.completion_percentage}%` }}
                          />
                        </div>
                        <span className="progress-num">{c.completion_percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="station-cell">
                        <MapPin size={12} /> {c.police_station || 'Unassigned'}
                      </div>
                    </td>
                    <td className="center-cell">{c.message_count}</td>
                    <td>
                      <span className={`badge-pill status-${c.status}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="date-cell">
                      {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions">
                        <button
                          className="admin-btn icon-only ghost"
                          onClick={() => setSelectedConversationId(c.id)}
                          title="Inspect Chat Transcript"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="admin-btn icon-only ghost danger-text"
                          onClick={() => handleDelete(c.id)}
                          title="Delete Session"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Transcript Inspection Modal Drawer ────────────────────────────── */}
      {selectedConversationId && (
        <div className="admin-modal-overlay" onClick={() => setSelectedConversationId(null)}>
          <div className="admin-drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>Conversation Transcript Inspector</h3>
                <span className="drawer-subtitle">Session ID: {selectedConversationId}</span>
              </div>
              <button className="drawer-close-btn" onClick={() => setSelectedConversationId(null)}>
                <X size={18} />
              </button>
            </div>

            {loadingTranscript || !transcriptData ? (
              <div className="admin-drawer-loading">
                <RefreshCw size={24} className="spin-icon" />
                <p>Loading Conversation Transcript…</p>
              </div>
            ) : (
              <div className="drawer-body">
                {/* Meta Bar */}
                <div className="transcript-meta-bar">
                  <div className="meta-item">
                    <User size={14} />
                    <span><strong>Complainant:</strong> {transcriptData.user?.full_name || 'Anonymous'} ({transcriptData.user?.email || '-'})</span>
                  </div>
                  <div className="meta-item">
                    <BarChart2 size={14} />
                    <span><strong>Completion:</strong> {transcriptData.completion_percentage}%</span>
                  </div>
                  <div className="meta-item">
                    <MapPin size={14} />
                    <span><strong>Station:</strong> {transcriptData.police_station || 'Not selected'}</span>
                  </div>
                  <div className="meta-item">
                    <label>Status: </label>
                    <select
                      value={transcriptData.status}
                      onChange={(e) => handleStatusChange(transcriptData.id, e.target.value)}
                      className="admin-select sm"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Timeline Messages */}
                <div className="transcript-timeline">
                  {transcriptData.messages && transcriptData.messages.map((m: any) => (
                    <div key={m.id} className={`transcript-bubble-row ${m.role}`}>
                      <div className="bubble-role-badge">
                        {m.role === 'user' ? 'USER' : m.role === 'assistant' ? 'NESYA AI' : 'SYSTEM'}
                      </div>
                      <div className="transcript-bubble">
                        <div className="bubble-content">{m.content}</div>
                        <div className="bubble-time">
                          <Clock size={11} /> {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
