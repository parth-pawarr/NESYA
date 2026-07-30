import React, { useEffect, useState } from 'react';
import { Search, Filter, ShieldAlert, RefreshCw, X, Eye, Terminal, Clock, Globe } from 'lucide-react';
import { fetchAdminAuditLogs, type AdminAuditLogItem } from '../../services/adminService';
import { useAdminStore } from '../../store/adminStore';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal JSON Details
  const [inspectLog, setInspectLog] = useState<AdminAuditLogItem | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    const params: any = { page, limit: 25 };
    if (actionFilter) params.action = actionFilter;
    if (statusFilter) params.status = statusFilter;

    const res = await fetchAdminAuditLogs(params);
    setLogs(res.items);
    setTotal(res.total);
    setLoading(false);
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, statusFilter, page]);

  return (
    <div className="admin-section-container">
      {/* ── Header Toolbar ───────────────────────────────────────────────────── */}
      <div className="section-toolbar">
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Filter audit logs by action (e.g. user.login, fir.created)…"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="admin-search-input"
          />
          {actionFilter && (
            <button className="clear-search-btn" onClick={() => setActionFilter('')}>
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
              <option value="">All Event Statuses</option>
              <option value="success">Success Events</option>
              <option value="failure">Failure / Errors</option>
            </select>
          </div>

          <button className="admin-btn secondary icon-only" onClick={loadAuditLogs} title="Refresh Audit Log">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Audit Log Table ─────────────────────────────────────────────────── */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-loading">
            <RefreshCw size={24} className="spin-icon" />
            <p>Loading Audit Trail…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="admin-empty-state">
            <ShieldAlert size={40} />
            <h3>No Audit Logs Recorded</h3>
            <p>No audit entries match the current filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action Event</th>
                  <th>User Email</th>
                  <th>Target Resource</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="date-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} className="text-muted" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <span className="action-code-tag">{log.action}</span>
                    </td>
                    <td>
                      <div className="user-email-text">{log.user?.email || 'System / Anonymous'}</div>
                    </td>
                    <td>
                      <span className="resource-tag">
                        {log.resource_type ? `${log.resource_type}:${log.resource_id || ''}` : '-'}
                      </span>
                    </td>
                    <td>
                      <div className="ip-cell">
                        <Globe size={12} /> {log.ip_address}
                      </div>
                    </td>
                    <td>
                      <span className={`badge-pill ${log.status === 'success' ? 'success' : 'danger'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="admin-btn icon-only ghost"
                        onClick={() => setInspectLog(log)}
                        title="View JSON Context"
                      >
                        <Terminal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Audit Log Context Modal ────────────────────────────────────────── */}
      {inspectLog && (
        <div className="admin-modal-overlay" onClick={() => setInspectLog(null)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>Audit Log Payload Context</h3>
                <span className="drawer-subtitle">Log ID: {inspectLog.id}</span>
              </div>
              <button className="drawer-close-btn" onClick={() => setInspectLog(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="inspection-block">
                <table className="info-kv-table">
                  <tbody>
                    <tr><td>Action:</td><td><strong className="action-code-tag">{inspectLog.action}</strong></td></tr>
                    <tr><td>Status:</td><td><span className={`badge-pill ${inspectLog.status === 'success' ? 'success' : 'danger'}`}>{inspectLog.status}</span></td></tr>
                    <tr><td>User:</td><td>{inspectLog.user?.email || 'System'}</td></tr>
                    <tr><td>IP Address:</td><td>{inspectLog.ip_address}</td></tr>
                    <tr><td>Timestamp:</td><td>{new Date(inspectLog.created_at).toISOString()}</td></tr>
                    {inspectLog.user_agent && (
                      <tr><td>User Agent:</td><td style={{ wordBreak: 'break-all', fontSize: 12 }}>{inspectLog.user_agent}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="inspection-block" style={{ marginTop: 20 }}>
                <h4><Terminal size={16} /> Extended Log JSON Details</h4>
                <pre className="json-code-block">
                  {JSON.stringify(inspectLog.details || { message: 'No additional metadata logged.' }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
