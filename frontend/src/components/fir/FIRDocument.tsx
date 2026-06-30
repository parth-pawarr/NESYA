import React from 'react';
import {
  FileText, User, MapPin, Clock, Gavel, AlertTriangle,
  Shield, Users, Package
} from 'lucide-react';
import type { FIRDocument } from '../../services/api';
import FIRActions from './FIRActions';

interface Props {
  fir: FIRDocument;
  onRegenerate?: () => void;
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const cls = pct >= 70 ? 'high' : pct >= 45 ? 'medium' : 'low';
  return (
    <span className={`confidence-badge ${cls}`}>
      {pct}%
    </span>
  );
}

export default function FIRDocument({ fir, onRegenerate }: Props) {
  return (
    <div className="fir-panel">
      {/* Panel Header */}
      <div className="fir-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} style={{ color: 'var(--violet-400)' }} />
          <span className="fir-panel-title">Generated FIR</span>
        </div>
        <FIRActions fir={fir} onRegenerate={onRegenerate} />
      </div>

      {/* Document */}
      <div className="fir-content">
        <div className="fir-document">
          {/* Document Header */}
          <div className="fir-doc-header">
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, opacity: 0.9 }}>
              GOVERNMENT OF INDIA
            </div>
            <h2>First Information Report</h2>
            <div className="fir-number">{fir.fir_number}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              {fir.date_of_report}
            </div>
          </div>

          {/* Complainant */}
          <div className="fir-section">
            <div className="fir-section-title">
              <User size={12} /> Complainant Details
            </div>
            <div className="fir-field">
              <span className="fir-field-label">Full Name</span>
              <span className="fir-field-value">{fir.complainant_name}</span>
            </div>
            <div className="fir-field">
              <span className="fir-field-label">Contact</span>
              <span className="fir-field-value">{fir.complainant_contact}</span>
            </div>
            <div className="fir-field">
              <span className="fir-field-label">Police Station</span>
              <span className="fir-field-value">{fir.police_station}</span>
            </div>
          </div>

          {/* Incident */}
          <div className="fir-section">
            <div className="fir-section-title">
              <AlertTriangle size={12} /> Incident Details
            </div>
            <div className="fir-field">
              <span className="fir-field-label">Nature of Crime</span>
              <span className="fir-field-value" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {fir.crime_type}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="fir-field">
                <span className="fir-field-label">
                  <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                  Date
                </span>
                <span className="fir-field-value">{fir.incident_date || 'Not specified'}</span>
              </div>
              <div className="fir-field">
                <span className="fir-field-label">Time</span>
                <span className="fir-field-value">{fir.incident_time || 'Not specified'}</span>
              </div>
            </div>
            <div className="fir-field">
              <span className="fir-field-label">
                <MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />
                Location ({fir.location_type})
              </span>
              <span className="fir-field-value">{fir.incident_location || 'Not specified'}</span>
            </div>
            <div className="fir-field">
              <span className="fir-field-label">Accused / Suspect</span>
              <span className="fir-field-value">{fir.accused_details}</span>
            </div>
          </div>

          {/* Description */}
          <div className="fir-section">
            <div className="fir-section-title">
              <FileText size={12} /> Description of Incident
            </div>
            <p className="fir-description">{fir.description}</p>
          </div>

          {/* Witnesses */}
          {fir.witness_details?.length > 0 && (
            <div className="fir-section">
              <div className="fir-section-title">
                <Users size={12} /> Witnesses
              </div>
              {fir.witness_details.map((w, i) => (
                <div key={i} className="fir-field">
                  <span className="fir-field-value">• {w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Property */}
          {fir.property_details?.length > 0 && (
            <div className="fir-section">
              <div className="fir-section-title">
                <Package size={12} /> Property Involved
              </div>
              <div className="fir-field">
                <span className="fir-field-label">Items</span>
                <span className="fir-field-value">{fir.property_details.join(', ')}</span>
              </div>
              {fir.financial_loss && (
                <div className="fir-field">
                  <span className="fir-field-label">Estimated Value</span>
                  <span className="fir-field-value" style={{ color: 'var(--warning)' }}>
                    {fir.financial_loss}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Legal Sections */}
          <div className="fir-section">
            <div className="fir-section-title">
              <Gavel size={12} /> Applicable Legal Sections
            </div>
            {fir.legal_sections.map((sec, i) => (
              <div key={i} className="legal-section-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="legal-section-id">{sec.section_id}</span>
                  <ConfidenceBadge value={sec.confidence} />
                </div>
                <div className="legal-section-title">{sec.title}</div>
                <div className="legal-section-meta">
                  ⚖️ {sec.punishment}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                  {sec.explanation}
                </div>
              </div>
            ))}
          </div>

          {/* Quality Flags */}
          {fir.quality_flags?.length > 0 && (
            <div className="fir-section">
              <div className="fir-section-title">
                <Shield size={12} /> Quality Assessment
              </div>
              {fir.quality_flags.map((flag, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>
                    ⚠ {flag.flag_type?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{flag.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                    → {flag.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="fir-section" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Overall Confidence
                </div>
                <ConfidenceBadge value={fir.overall_confidence} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Status</div>
                <span style={{
                  fontSize: 11,
                  color: 'var(--success)',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}>
                  {fir.processing_status}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
              Generated by NESYA AI Legal Assistant · Not a substitute for legal advice
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
