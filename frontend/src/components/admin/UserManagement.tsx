import React, { useEffect, useState } from 'react';
import {
  Search, Filter, Shield, ShieldCheck, UserX, CheckCircle,
  XCircle, Eye, Calendar, Mail, Phone, Lock, RefreshCw, X, FileText, MessageSquare
} from 'lucide-react';
import { fetchAdminUsers, fetchUserDetails, updateUserStatus, type AdminUserItem } from '../../services/adminService';
import { useAdminStore } from '../../store/adminStore';

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [superuserFilter, setSuperuserFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  // Detail Modal State
  const { selectedUserId, setSelectedUserId, refreshKey, triggerRefresh } = useAdminStore();
  const [detailUser, setDetailUser] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const params: any = { page, limit: 15 };
    if (search) params.search = search;
    if (provider) params.provider = provider;
    if (activeFilter !== '') params.is_active = activeFilter === 'true';
    if (superuserFilter !== '') params.is_superuser = superuserFilter === 'true';

    const res = await fetchAdminUsers(params);
    setUsers(res.items);
    setTotal(res.total);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [search, provider, activeFilter, superuserFilter, page, refreshKey]);

  // Load User Details when selected
  useEffect(() => {
    if (selectedUserId) {
      (async () => {
        setLoadingDetail(true);
        const data = await fetchUserDetails(selectedUserId);
        setDetailUser(data);
        setLoadingDetail(false);
      })();
    } else {
      setDetailUser(null);
    }
  }, [selectedUserId]);

  const handleToggleActive = async (user: AdminUserItem) => {
    const nextState = !user.is_active;
    await updateUserStatus(user.id, { is_active: nextState });
    triggerRefresh();
  };

  const handleToggleSuperuser = async (user: AdminUserItem) => {
    const nextState = !user.is_superuser;
    await updateUserStatus(user.id, { is_superuser: nextState });
    triggerRefresh();
  };

  return (
    <div className="admin-section-container">
      {/* ── Header Toolbar ───────────────────────────────────────────────────── */}
      <div className="section-toolbar">
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search users by name or email…"
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
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="admin-select">
              <option value="">All Auth Providers</option>
              <option value="local">Local Email/Password</option>
              <option value="google">Google OAuth</option>
              <option value="github">GitHub OAuth</option>
            </select>
          </div>

          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="admin-select">
            <option value="">All Statuses</option>
            <option value="true">Active Accounts</option>
            <option value="false">Deactivated Accounts</option>
          </select>

          <select value={superuserFilter} onChange={(e) => setSuperuserFilter(e.target.value)} className="admin-select">
            <option value="">All Roles</option>
            <option value="true">Superusers Only</option>
            <option value="false">Regular Users</option>
          </select>

          <button className="admin-btn secondary icon-only" onClick={loadUsers} title="Refresh User Directory">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Users Data Table ─────────────────────────────────────────────────── */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-loading">
            <RefreshCw size={24} className="spin-icon" />
            <p>Fetching User Accounts…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            <UserX size={40} />
            <h3>No Users Found</h3>
            <p>No user accounts match your active search filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Auth Provider</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Registered Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-profile-cell">
                        <div className="user-avatar-circle">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" />
                          ) : (
                            u.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="user-name-text">{u.full_name}</div>
                          <div className="user-email-text">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`provider-badge ${u.auth_provider}`}>
                        {u.auth_provider}
                      </span>
                    </td>
                    <td>
                      {u.is_verified ? (
                        <span className="badge-pill success">
                          <CheckCircle size={12} /> Verified
                        </span>
                      ) : (
                        <span className="badge-pill warning">Unverified</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-pill ${u.is_active ? 'active' : 'inactive'}`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      {u.is_superuser ? (
                        <span className="badge-pill superuser">
                          <ShieldCheck size={12} /> Superadmin
                        </span>
                      ) : (
                        <span className="badge-pill regular">User</span>
                      )}
                    </td>
                    <td className="date-cell">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions">
                        <button
                          className="admin-btn icon-only ghost"
                          onClick={() => setSelectedUserId(u.id)}
                          title="Inspect Profile"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className={`admin-btn icon-only ghost ${u.is_active ? 'danger-text' : 'success-text'}`}
                          onClick={() => handleToggleActive(u)}
                          title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {u.is_active ? <UserX size={16} /> : <CheckCircle size={16} />}
                        </button>
                        <button
                          className={`admin-btn icon-only ghost ${u.is_superuser ? 'warning-text' : 'violet-text'}`}
                          onClick={() => handleToggleSuperuser(u)}
                          title={u.is_superuser ? 'Revoke Superuser' : 'Grant Superuser'}
                        >
                          <Shield size={16} />
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

      {/* ── User Inspection Detail Modal Drawer ────────────────────────────── */}
      {selectedUserId && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUserId(null)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>User Account Inspector</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedUserId(null)}>
                <X size={18} />
              </button>
            </div>

            {loadingDetail || !detailUser ? (
              <div className="admin-drawer-loading">
                <RefreshCw size={24} className="spin-icon" />
                <p>Loading User Details…</p>
              </div>
            ) : (
              <div className="drawer-body">
                {/* User Info Header */}
                <div className="user-detail-card">
                  <div className="user-detail-avatar">
                    {detailUser.user.avatar_url ? (
                      <img src={detailUser.user.avatar_url} alt="" />
                    ) : (
                      detailUser.user.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2>{detailUser.user.full_name}</h2>
                    <div className="detail-meta">
                      <span><Mail size={12} /> {detailUser.user.email}</span>
                      {detailUser.user.phone && <span><Phone size={12} /> {detailUser.user.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Quick Toggle Controls */}
                <div className="toggle-control-box">
                  <div className="toggle-item">
                    <div>
                      <strong>Account Active Status</strong>
                      <p>Enable or disable user authentication login access</p>
                    </div>
                    <button
                      className={`admin-btn sm ${detailUser.user.is_active ? 'danger' : 'success'}`}
                      onClick={() => handleToggleActive(detailUser.user)}
                    >
                      {detailUser.user.is_active ? 'Deactivate Account' : 'Activate Account'}
                    </button>
                  </div>

                  <div className="toggle-item">
                    <div>
                      <strong>Superuser Privileges</strong>
                      <p>Grants access to administrative APIs and Control Panel</p>
                    </div>
                    <button
                      className={`admin-btn sm ${detailUser.user.is_superuser ? 'secondary' : 'primary'}`}
                      onClick={() => handleToggleSuperuser(detailUser.user)}
                    >
                      {detailUser.user.is_superuser ? 'Revoke Superuser' : 'Make Superuser'}
                    </button>
                  </div>
                </div>

                {/* User Conversations List */}
                <div className="detail-section">
                  <h4><MessageSquare size={16} /> User AI Conversations ({detailUser.conversations.length})</h4>
                  {detailUser.conversations.length === 0 ? (
                    <p className="empty-subtext">No conversation sessions found.</p>
                  ) : (
                    <div className="detail-list">
                      {detailUser.conversations.map((c: any) => (
                        <div key={c.id} className="detail-list-item">
                          <div>
                            <strong>{c.title || 'Untitled Session'}</strong>
                            <div className="item-sub">{c.completion_percentage}% completed</div>
                          </div>
                          <span className={`status-pill ${c.status}`}>{c.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User FIR Reports List */}
                <div className="detail-section" style={{ marginTop: 20 }}>
                  <h4><FileText size={16} /> Associated FIR Reports ({detailUser.fir_reports.length})</h4>
                  {detailUser.fir_reports.length === 0 ? (
                    <p className="empty-subtext">No FIR reports generated for this user.</p>
                  ) : (
                    <div className="detail-list">
                      {detailUser.fir_reports.map((f: any) => (
                        <div key={f.id} className="detail-list-item">
                          <div>
                            <strong>{f.fir_number}</strong>
                            <div className="item-sub">{f.crime_type} · Confidence: {Math.round((f.overall_confidence || 0.85) * 100)}%</div>
                          </div>
                          <span className={`status-pill ${f.status}`}>{f.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
