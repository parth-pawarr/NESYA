import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, FileText, ShieldAlert,
  Sun, Moon, LogOut, ArrowLeft, RefreshCw, Download, ShieldCheck,
  Search, PanelLeft, CheckCircle2
} from 'lucide-react';
import { useAdminStore, type AdminTab } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import { exportAdminData } from '../../services/adminService';
import AdminOverview from './AdminOverview';
import UserManagement from './UserManagement';
import ConversationManagement from './ConversationManagement';
import FIRManagement from './FIRManagement';
import AuditLogViewer from './AuditLogViewer';

export default function AdminLayout() {
  const { activeTab, setActiveTab, searchQuery, setSearchQuery, triggerRefresh } = useAdminStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportEntity, setExportEntity] = useState('users');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.className = next === 'light' ? 'light-mode' : '';
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportAdminData(exportEntity, exportFormat);
      if (exportFormat === 'json') {
        const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(res, null, 2))}`;
        const a = document.createElement('a');
        a.href = jsonStr;
        a.download = `${exportEntity}_export.json`;
        a.click();
      }
      setExportModalOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`admin-app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Sidebar Navigation ───────────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="brand-badge">
            <ShieldCheck size={24} className="brand-logo-icon" />
            {!collapsed && (
              <div>
                <div className="brand-title">NESYA ADMIN</div>
                <div className="brand-subtitle">Control & Compliance Panel</div>
              </div>
            )}
          </div>
        </div>

        <nav className="admin-nav-list">
          <button
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            title="Overview & Analytics"
          >
            <LayoutDashboard size={18} />
            {!collapsed && <span>Overview & Analytics</span>}
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            title="User Directory"
          >
            <Users size={18} />
            {!collapsed && <span>User Directory</span>}
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'conversations' ? 'active' : ''}`}
            onClick={() => setActiveTab('conversations')}
            title="AI Sessions"
          >
            <MessageSquare size={18} />
            {!collapsed && <span>AI Sessions</span>}
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'firs' ? 'active' : ''}`}
            onClick={() => setActiveTab('firs')}
            title="FIR Reports"
          >
            <FileText size={18} />
            {!collapsed && <span>FIR Repository</span>}
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
            title="Audit Security Logs"
          >
            <ShieldAlert size={18} />
            {!collapsed && <span>Audit & Security Logs</span>}
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button
            className="admin-btn ghost sm full-width"
            onClick={() => navigate('/')}
            title="Back to FIR Assistant"
          >
            <ArrowLeft size={16} />
            {!collapsed && <span>Back to Assistant</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Frame ───────────────────────────────────────────────────────── */}
      <div className="admin-main-wrapper">
        {/* Top Header */}
        <header className="admin-header">
          <div className="header-left">
            <button
              className="admin-header-btn"
              onClick={() => setCollapsed(!collapsed)}
              title="Toggle Sidebar"
            >
              <PanelLeft size={18} />
            </button>

            <div className="header-title">
              {activeTab === 'overview' && 'System Overview & Analytics'}
              {activeTab === 'users' && 'User Management & Authorization'}
              {activeTab === 'conversations' && 'AI Conversation Transcript Explorer'}
              {activeTab === 'firs' && 'FIR Report & BNS Legal Mapping Repository'}
              {activeTab === 'audit' && 'System Security & Activity Audit Log'}
            </div>
          </div>

          <div className="header-right">
            <button
              className="admin-btn secondary sm"
              onClick={() => setExportModalOpen(true)}
            >
              <Download size={14} /> Export Data
            </button>

            <button
              className="admin-header-btn"
              onClick={triggerRefresh}
              title="Refresh Data"
            >
              <RefreshCw size={16} />
            </button>

            {/* Superadmin Identity Badge */}
            {user && (
              <div className="admin-profile-pill">
                <div className="avatar-circle">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" />
                  ) : (
                    user.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="user-info">
                  <span className="name">{user.full_name}</span>
                  <span className="role-tag">Superadmin</span>
                </div>
              </div>
            )}

            <button className="admin-header-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              className="admin-header-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* View Component Container */}
        <main className="admin-body-content">
          {activeTab === 'overview' && <AdminOverview />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'conversations' && <ConversationManagement />}
          {activeTab === 'firs' && <FIRManagement />}
          {activeTab === 'audit' && <AuditLogViewer />}
        </main>
      </div>

      {/* ── Export Data Modal ────────────────────────────────────────────────── */}
      {exportModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setExportModalOpen(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Export System Data Reports</h3>
            <p className="modal-subtext">Select data collection entity and format for offline backup or auditing.</p>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Select Entity:</label>
              <select
                value={exportEntity}
                onChange={(e) => setExportEntity(e.target.value)}
                className="admin-select full-width"
              >
                <option value="users">Registered Users List</option>
                <option value="conversations">AI Conversation Logs</option>
                <option value="fir_reports">FIR Reports Repository</option>
                <option value="audit_logs">Audit Trail Logs</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: 14 }}>
              <label>File Format:</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="admin-select full-width"
              >
                <option value="csv">Comma Separated Values (.CSV)</option>
                <option value="json">JavaScript Object Notation (.JSON)</option>
              </select>
            </div>

            <div className="modal-actions" style={{ marginTop: 24 }}>
              <button
                className="admin-btn secondary"
                onClick={() => setExportModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="admin-btn primary"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? 'Generating…' : 'Download Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
