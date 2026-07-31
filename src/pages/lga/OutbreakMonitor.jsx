import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { useDemoRole } from '../../context/DemoRoleContext';
import { supabase } from '../../lib/supabase';
import './LgaPages.css';

function formatRelative(v) {
  if (!v) return '—';
  const diff = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

export default function OutbreakMonitor() {
  const { currentUser } = useDemoRole();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { fetchAlerts(); }, []);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('code_red_alerts')
        .select('id, created_at, description, temperature, blood_pressure, pulse_rate, patient_id, phc_id')
        .order('created_at', { ascending: false })
        .limit(20);
      setAlerts(data || []);
    } catch (err) {
      console.error('Outbreak monitor error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleTriggerBroadcast = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      setSuccessMsg('⚠️ SMS Warning and Protocols broadcasted to all 20 local PHC clinics successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 1500);
  };

  return (
    <AppLayout title="Outbreak Monitor">
      <div className="lga-page-container">
        
        <div className="lga-page-header">
          <div>
            <h1 className="lga-page-title">⚠️ Disease Outbreak & Epidemic Monitor</h1>
            <p className="lga-page-sub">Monitor sentinel events, active risk indexing, and coordinate containment alerts.</p>
          </div>
          <button className="btn-danger" onClick={handleTriggerBroadcast} disabled={simulating}>
            {simulating ? 'Broadcasting...' : '🚨 Broadcast Containment Protocol'}
          </button>
        </div>

        {successMsg && (
          <div className="alert-success-banner" style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: 16, borderRadius: 12, marginBottom: 20, fontWeight: 600 }}>
            {successMsg}
          </div>
        )}

        <div className="lga-double-grid">
          
          {/* Active outbreaks list */}
          <div className="card">
            <h2 className="panel-title-lg">Active Sentinel Alerts</h2>
            <div className="alerts-vertical-list">
              {loading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '16px', textAlign: 'center' }}>Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
              <p style={{ fontSize: 28 }}>✅</p>
              <p style={{ fontWeight: 600 }}>No active Code Red alerts</p>
            </div>
          ) : alerts.map(a => (
            <div key={a.id} className="alert-detail-card critical">
              <div className="alert-header-row">
                <span className="alert-facility-name">🚨 Code Red Alert</span>
                <span className="status-badge-pill critical">CODE RED</span>
              </div>
              <div className="alert-meta-details">
                {a.temperature && <span className="disease-badge"><strong>Temp:</strong> {a.temperature}°C</span>}
                {a.blood_pressure && <span className="count-badge"><strong>BP:</strong> {a.blood_pressure}</span>}
                {a.pulse_rate && <span className="count-badge"><strong>Pulse:</strong> {a.pulse_rate} bpm</span>}
                <span className="date-badge">⏱️ {formatRelative(a.created_at)}</span>
              </div>
              <p className="alert-text-body">{a.description || 'Emergency alert filed by CHEW.'}</p>
              <div className="alert-action-strip">
                <span className="investigation-status">Status: <strong>Active</strong></span>
              </div>
            </div>
          ))}
            </div>
          </div>

          {/* Outbreak index & containment protocol widget */}
          <div className="lga-aside">
            
            <div className="card" style={{ marginBottom: 20 }}>
              <h2 className="panel-title-lg">Outbreak Risk Index</h2>
              
              <div className="risk-meter-wrapper">
                <div className="risk-level-circle high">
                  <span className="risk-num">72</span>
                  <span className="risk-txt">HIGH RISK</span>
                </div>
                <div className="risk-breakdown">
                  <p><strong>Primary Driver:</strong> Warm temperature anomaly & recent reports of flooding in Ward 3.</p>
                  <p><strong>Risk Level:</strong> Increased surveillance recommended for waterborne pathogens.</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="panel-title-lg">Containment Protocols Checklist</h2>
              <div className="checklist-list">
                {[
                  { t: 'Isolate suspected cases immediately', c: true },
                  { t: 'Establish safe clean water stations in Ward 3', c: false },
                  { t: 'Deploy oral rehydration salts (ORS) buffer inventory', c: true },
                  { t: 'Distribute cholera flyers in local languages', c: false }
                ].map((item, idx) => (
                  <label key={idx} className="checklist-item">
                    <input type="checkbox" defaultChecked={item.c} />
                    <span>{item.t}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}
