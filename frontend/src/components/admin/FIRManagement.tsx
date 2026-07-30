import React, { useEffect, useState } from 'react';
import {
  Search, Filter, FileText, CheckCircle2, ShieldCheck, AlertTriangle,
  Eye, RefreshCw, X, Download, MapPin, Calendar, Scale, Cpu, User
} from 'lucide-react';
import {
  fetchAdminFIRReports, fetchFIRReportDetail, updateFIRStatus, type AdminFIRItem
} from '../../services/adminService';
import { useAdminStore } from '../../store/adminStore';

export default function FIRManagement() {
  const [reports, setReports] = useState<AdminFIRItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [page, setPage] = useState(1);

  // FIR Inspector Drawer State
  const { selectedFIRId, setSelectedFIRId, refreshKey, triggerRefresh } = useAdminStore();
  const [firDetail, setFirDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    const params: any = { page, limit: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (crimeType) params.crime_type = crimeType;

    const res = await fetchAdminFIRReports(params);
    setReports(res.items);
    setTotal(res.total);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, [search, statusFilter, crimeType, page, refreshKey]);

  // Load Detailed FIR Report
  useEffect(() => {
    if (selectedFIRId) {
      (async () => {
        setLoadingDetail(true);
        const data = await fetchFIRReportDetail(selectedFIRId);
        setFirDetail(data);
        setLoadingDetail(false);
      })();
    } else {
      setFirDetail(null);
    }
  }, [selectedFIRId]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateFIRStatus(id, newStatus);
    triggerRefresh();
    if (firDetail && firDetail.id === id) {
      setFirDetail({ ...firDetail, status: newStatus });
    }
  };

  const handleExportSingleFIR = (fir: any) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(fir, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${fir.fir_number || 'FIR_Report'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="admin-section-container">
      {/* ── Header Toolbar ───────────────────────────────────────────────────── */}
      <div className="section-toolbar">
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search FIRs by report #, complainant, station, or crime…"
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
              <option value="">All FIR Statuses</option>
              <option value="draft">Draft Reports</option>
              <option value="submitted">Submitted to Police</option>
              <option value="acknowledged">Acknowledged / Registered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <button className="admin-btn secondary icon-only" onClick={loadReports} title="Refresh FIR List">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── FIR Reports Table ────────────────────────────────────────────────── */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-loading">
            <RefreshCw size={24} className="spin-icon" />
            <p>Fetching FIR Reports Repository…</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="admin-empty-state">
            <FileText size={40} />
            <h3>No FIR Reports Found</h3>
            <p>No legal reports match your query filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>FIR Number</th>
                  <th>Complainant Name</th>
                  <th>Police Station</th>
                  <th>Crime Category</th>
                  <th>Confidence Score</th>
                  <th>Status</th>
                  <th>Generated Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const conf = Math.round((r.overall_confidence || 0.85) * 100);
                  const confClass = conf >= 85 ? 'high' : conf >= 70 ? 'medium' : 'low';

                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="fir-num-cell">
                          <FileText size={14} className="fir-icon" />
                          <span>{r.fir_number}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="user-name-text">{r.complainant_name}</div>
                          <div className="user-email-text">{r.complainant_contact}</div>
                        </div>
                      </td>
                      <td>
                        <div className="station-cell">
                          <MapPin size={12} /> {r.police_station}
                        </div>
                      </td>
                      <td>
                        <span className="crime-type-tag">{r.crime_type}</span>
                      </td>
                      <td>
                        <div className={`confidence-badge ${confClass}`}>
                          {confClass === 'low' && <AlertTriangle size={12} />}
                          <span>{conf}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge-pill fir-status-${r.status}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="date-cell">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : r.date_of_report}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          <button
                            className="admin-btn icon-only ghost"
                            onClick={() => setSelectedFIRId(r.id)}
                            title="Inspect Legal FIR Report"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="admin-btn icon-only ghost"
                            onClick={() => handleExportSingleFIR(r)}
                            title="Export JSON"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── FIR Report Detail Modal Drawer ─────────────────────────────────── */}
      {selectedFIRId && (
        <div className="admin-modal-overlay" onClick={() => setSelectedFIRId(null)}>
          <div className="admin-drawer extra-wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>Legal FIR Report Inspector</h3>
                <span className="drawer-subtitle">{firDetail?.fir_number || selectedFIRId}</span>
              </div>
              <button className="drawer-close-btn" onClick={() => setSelectedFIRId(null)}>
                <X size={18} />
              </button>
            </div>

            {loadingDetail || !firDetail ? (
              <div className="admin-drawer-loading">
                <RefreshCw size={24} className="spin-icon" />
                <p>Loading FIR Record & BNS Legal Mapping…</p>
              </div>
            ) : (
              <div className="drawer-body">
                {/* Workflow Status Bar & Controls */}
                <div className="workflow-status-bar">
                  <div className="status-current">
                    <span>Workflow Stage: </span>
                    <strong className={`status-pill fir-status-${firDetail.status}`}>
                      {firDetail.status.toUpperCase()}
                    </strong>
                  </div>

                  <div className="status-actions">
                    <button
                      className={`admin-btn sm ${firDetail.status === 'submitted' ? 'primary' : 'secondary'}`}
                      onClick={() => handleStatusChange(firDetail.id, 'submitted')}
                    >
                      Mark Submitted
                    </button>
                    <button
                      className={`admin-btn sm ${firDetail.status === 'acknowledged' ? 'success' : 'secondary'}`}
                      onClick={() => handleStatusChange(firDetail.id, 'acknowledged')}
                    >
                      Mark Acknowledged
                    </button>
                    <button
                      className={`admin-btn sm ${firDetail.status === 'rejected' ? 'danger' : 'secondary'}`}
                      onClick={() => handleStatusChange(firDetail.id, 'rejected')}
                    >
                      Mark Rejected
                    </button>
                    <button
                      className="admin-btn secondary sm icon-only"
                      onClick={() => handleExportSingleFIR(firDetail)}
                      title="Download JSON"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>

                {/* Grid 2 Columns: Details Left, Legal Right */}
                <div className="fir-inspection-grid">
                  {/* Left Column: Complainant & Incident */}
                  <div className="inspection-col">
                    <div className="inspection-block">
                      <h4><User size={16} /> Complainant & Location</h4>
                      <table className="info-kv-table">
                        <tbody>
                          <tr><td>Complainant:</td><td><strong>{firDetail.complainant?.name || firDetail.complainant_name}</strong></td></tr>
                          <tr><td>Contact Phone:</td><td>{firDetail.complainant?.contact || firDetail.complainant_contact}</td></tr>
                          <tr><td>Police Station:</td><td>{firDetail.crime?.police_station || firDetail.police_station}</td></tr>
                          <tr><td>Incident Location:</td><td>{firDetail.incident?.location || firDetail.incident_location}</td></tr>
                          <tr><td>Date & Time:</td><td>{firDetail.incident?.date} at {firDetail.incident?.time}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="inspection-block">
                      <h4><FileText size={16} /> Crime Description & Extracted Data</h4>
                      <p className="crime-desc-box">{firDetail.crime?.description || firDetail.description}</p>
                      
                      {firDetail.crime?.accused_details && (
                        <div style={{ marginTop: 12 }}>
                          <strong style={{ fontSize: 12, color: '#94a3b8' }}>Accused Details:</strong>
                          <p style={{ fontSize: 13, color: '#f8fafc', margin: '4px 0 0' }}>{firDetail.crime.accused_details}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: BNS Legal Mapping & Flags */}
                  <div className="inspection-col">
                    <div className="inspection-block">
                      <h4><Scale size={16} /> BNS Legal Sections Mapped</h4>
                      {firDetail.legal_sections && firDetail.legal_sections.length > 0 ? (
                        <div className="legal-sections-list">
                          {firDetail.legal_sections.map((sec: any, idx: number) => (
                            <div key={idx} className="legal-section-card">
                              <div className="legal-card-header">
                                <span className="section-code">{sec.section_id}</span>
                                <span className="section-confidence">{Math.round((sec.confidence || 0.9) * 100)}% Match</span>
                              </div>
                              <div className="section-title-text">{sec.title}</div>
                              <p className="section-explanation">{sec.explanation}</p>
                              {sec.punishment && (
                                <div className="punishment-tag">
                                  <strong>Punishment:</strong> {sec.punishment}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="empty-subtext">No specific legal sections mapped.</p>
                      )}
                    </div>

                    <div className="inspection-block">
                      <h4><Cpu size={16} /> Quality Flags & NLP Engine Confidence</h4>
                      <div className="confidence-overview-bar">
                        <span>Overall NLP Extraction Confidence:</span>
                        <strong>{Math.round((firDetail.overall_confidence || 0.85) * 100)}%</strong>
                      </div>

                      {firDetail.quality_flags && firDetail.quality_flags.length > 0 && (
                        <div className="quality-flags-list" style={{ marginTop: 12 }}>
                          {firDetail.quality_flags.map((flag: any, idx: number) => (
                            <div key={idx} className="flag-item">
                              <ShieldCheck size={14} className="text-teal" />
                              <div>
                                <strong>{flag.flag_type || 'QUALITY_FLAG'}</strong>
                                <div>{flag.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
