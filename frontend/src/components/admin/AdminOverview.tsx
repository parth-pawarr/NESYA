import React, { useEffect, useState } from 'react';
import {
  Users, MessageSquare, FileText, AlertTriangle, ShieldCheck,
  TrendingUp, Activity, CheckCircle2, RefreshCw, Cpu, Database
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { fetchAdminOverview, type AdminOverviewResponse } from '../../services/adminService';
import { useAdminStore } from '../../store/adminStore';

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  submitted: '#3b82f6',
  acknowledged: '#10b981',
  rejected: '#ef4444',
};

export default function AdminOverview() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshKey, setActiveTab, setSelectedFIRId } = useAdminStore();

  const loadData = async () => {
    setLoading(true);
    const res = await fetchAdminOverview();
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  if (loading || !data) {
    return (
      <div className="admin-loading-state">
        <RefreshCw size={28} className="spin-icon" />
        <p>Loading Admin Dashboard Overview…</p>
      </div>
    );
  }

  const { summary, fir_status_distribution, crime_type_distribution, daily_trends, recent_activity, system_health } = data;

  const pieData = [
    { name: 'Draft', value: fir_status_distribution.draft, color: STATUS_COLORS.draft },
    { name: 'Submitted', value: fir_status_distribution.submitted, color: STATUS_COLORS.submitted },
    { name: 'Acknowledged', value: fir_status_distribution.acknowledged, color: STATUS_COLORS.acknowledged },
    { name: 'Rejected', value: fir_status_distribution.rejected, color: STATUS_COLORS.rejected },
  ];

  return (
    <div className="admin-overview-container">
      {/* ── Low Confidence Alert Banner ────────────────────────────────────────── */}
      {summary.low_confidence_firs > 0 && (
        <div className="alert-banner warning">
          <div className="alert-banner-left">
            <AlertTriangle size={20} className="alert-icon" />
            <div>
              <strong>Action Required: {summary.low_confidence_firs} FIR Reports Flagged for Quality Review</strong>
              <p>Low confidence score detected (&lt;70%). Inspect extracted entities and legal section mappings.</p>
            </div>
          </div>
          <button className="admin-btn secondary sm" onClick={() => setActiveTab('firs')}>
            Review Reports
          </button>
        </div>
      )}

      {/* ── Metric Summary Cards Grid ────────────────────────────────────────── */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Registered Users</span>
            <div className="stat-icon-wrapper blue">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value">{summary.total_users}</div>
          <div className="stat-footer">
            <span className="stat-trend positive">
              <TrendingUp size={12} /> {summary.active_users} active
            </span>
            <span className="stat-subtext">Total accounts</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total AI Sessions</span>
            <div className="stat-icon-wrapper violet">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="stat-value">{summary.total_conversations}</div>
          <div className="stat-footer">
            <span className="stat-trend positive">
              <CheckCircle2 size={12} /> {summary.completed_conversations} completed
            </span>
            <span className="stat-subtext">Conversations count</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Generated FIR Reports</span>
            <div className="stat-icon-wrapper teal">
              <FileText size={18} />
            </div>
          </div>
          <div className="stat-value">{summary.total_fir_reports}</div>
          <div className="stat-footer">
            <span className="stat-trend positive">
              <ShieldCheck size={12} /> {fir_status_distribution.acknowledged} acknowledged
            </span>
            <span className="stat-subtext">Legal FIR reports</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">System Health & Uptime</span>
            <div className="stat-icon-wrapper emerald">
              <Activity size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>{system_health.uptime_percentage}%</div>
          <div className="stat-footer">
            <span className="status-badge-online">
              <span className="ping-dot" /> Operational
            </span>
            <span className="stat-subtext">FastAPI & PostgreSQL</span>
          </div>
        </div>
      </div>

      {/* ── Analytics Visualizations Row 1 ───────────────────────────────────── */}
      <div className="admin-charts-grid">
        {/* Daily Trends Area Chart */}
        <div className="chart-card span-2">
          <div className="chart-card-header">
            <div>
              <h3>AI Assist & FIR Generation Volume</h3>
              <p className="chart-subtitle">Daily conversation sessions vs FIR documents generated over last 7 days</p>
            </div>
            <button className="admin-btn ghost sm" onClick={loadData}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div className="chart-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily_trends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorFirs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#f8fafc',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  }}
                />
                <Area type="monotone" dataKey="conversations" name="Conversations" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorConvs)" />
                <Area type="monotone" dataKey="fir_generated" name="FIRs Generated" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorFirs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FIR Status Pie Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3>FIR Status Distribution</h3>
              <p className="chart-subtitle">Breakdown by current workflow stage</p>
            </div>
          </div>
          <div className="chart-body" style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#f8fafc',
                  }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Analytics Visualizations Row 2 ───────────────────────────────────── */}
      <div className="admin-charts-grid" style={{ marginTop: 24 }}>
        {/* Top Crime Types Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3>Top Categorized Offenses</h3>
              <p className="chart-subtitle">BNS & IPC Crime type breakdown</p>
            </div>
          </div>
          <div className="chart-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={crime_type_distribution} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="crime_type" type="category" stroke="#cbd5e1" fontSize={11} width={130} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" name="Reports" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health Component Status & Audit Stream */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3>System Components & Audit Stream</h3>
              <p className="chart-subtitle">Real-time status of services</p>
            </div>
          </div>
          <div className="system-status-list">
            <div className="status-item">
              <div className="status-item-left">
                <Database size={16} className="text-blue" />
                <span>PostgreSQL DB Cluster</span>
              </div>
              <span className="status-pill green">{system_health.db_connection}</span>
            </div>

            <div className="status-item">
              <div className="status-item-left">
                <Cpu size={16} className="text-violet" />
                <span>NESYA NLP Pipeline Engine</span>
              </div>
              <span className="status-pill green">{system_health.nlp_pipeline}</span>
            </div>

            <div className="status-item">
              <div className="status-item-left">
                <ShieldCheck size={16} className="text-teal" />
                <span>BNS Legal Rule Engine</span>
              </div>
              <span className="status-pill green">{system_health.rule_engine}</span>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, color: '#94a3b8', marginBottom: 12 }}>
              Recent Audit Activity
            </h4>
            <div className="recent-activity-feed">
              {recent_activity.slice(0, 3).map((item) => (
                <div key={item.id} className="feed-item">
                  <div className="feed-dot" />
                  <div className="feed-content">
                    <div className="feed-title">
                      <strong>{item.action}</strong> by <span>{item.user_email}</span>
                    </div>
                    <div className="feed-time">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · IP: {item.ip_address}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
