import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import './AdminPages.css';

export default function DigitisationProgress() {
  const [targetWeekly, setTargetWeekly] = useState(150);
  const [editingTarget, setEditingTarget] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSaveTarget = () => {
    setEditingTarget(false);
    setSuccess('🎯 Weekly target updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <AppLayout title="Digitisation Progress">
      <div className="admin-page-container">
        
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">📷 Historical Record Digitisation Progress</h1>
            <p className="admin-page-sub">Monitor digitization targets, scan outputs, and paper backlog indices.</p>
          </div>
        </div>

        {success && (
          <div className="alert-success-banner" style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: 16, borderRadius: 12, marginBottom: 20, fontWeight: 600 }}>
            {success}
          </div>
        )}

        <div className="admin-double-grid">
          
          {/* Target and speed graphs */}
          <div className="card">
            <h2 className="panel-title-lg">Digitisation Speed vs Target</h2>
            
            <div className="target-summary-box">
              <div className="target-metric-item">
                <span className="target-label">Weekly Progress</span>
                <span className="target-value">94 / {targetWeekly}</span>
                <span className="target-subtext">Records scanned</span>
              </div>
              <div className="target-metric-item">
                <span className="target-label">Target Completion</span>
                <span className="target-value">78%</span>
                <span className="target-subtext">Of 1,530 backlog folders</span>
              </div>
            </div>

            <div className="speed-track-visualization">
              <div className="speed-percentage-bar">
                <div className="speed-bar-track">
                  <div className="speed-bar-fill" style={{ width: `${(94 / targetWeekly) * 100}%`, backgroundColor: '#0E7C7B' }} />
                </div>
                <span className="speed-percent-lbl">{Math.round((94 / targetWeekly) * 100)}% of Weekly Target</span>
              </div>
            </div>

            <div className="target-settings-edit" style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              {editingTarget ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={targetWeekly}
                    onChange={e => setTargetWeekly(parseInt(e.target.value) || 0)}
                    style={{ width: 100 }}
                  />
                  <button className="btn-primary" onClick={handleSaveTarget}>Save</button>
                  <button className="btn-secondary" onClick={() => setEditingTarget(false)}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="current-target-lbl">Weekly target: <strong>{targetWeekly} records</strong></span>
                  <button className="btn-secondary btn-sm" onClick={() => setEditingTarget(true)}>Edit Target</button>
                </div>
              )}
            </div>
          </div>

          {/* Records categories distribution */}
          <div className="card">
            <h2 className="panel-title-lg">Historical Records Distribution</h2>
            <div className="distribution-details-list">
              {[
                { type: 'Paediatric Immunisation Cards', count: 450, total: 500, status: 'Near Complete', pct: 90, color: '#16A34A' },
                { type: 'Maternal ANC Folders', count: 320, total: 400, status: 'In Progress', pct: 80, color: '#1B4F8A' },
                { type: 'General Outpatient Notes', count: 434, total: 630, status: 'In Progress', pct: 69, color: '#D97706' }
              ].map((item, idx) => (
                <div key={idx} className="dist-category-card">
                  <div className="dist-meta-row">
                    <span className="category-title-lbl">{item.type}</span>
                    <span className="category-status-tag" style={{ color: item.color }}>{item.status}</span>
                  </div>
                  <div className="dist-progress-strip">
                    <div className="track-bar-thin">
                      <div className="fill-bar-thin" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                    </div>
                    <span className="category-ratio-lbl">{item.count} / {item.total} ({item.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
