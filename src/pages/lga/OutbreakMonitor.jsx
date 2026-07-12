import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { useDemoRole } from '../../context/DemoRoleContext';
import './LgaPages.css';

export default function OutbreakMonitor() {
  const { currentUser } = useDemoRole();
  const [alerts, setAlerts] = useState([
    { id: 1, facility: 'Langtang North PHC', disease: 'Cholera Suspect', count: 3, date: 'Today, 08:30 AM', severity: 'critical', details: 'Severe watery diarrhoea and dehydration. Patients shared water source in Ward 3.', status: 'Active' },
    { id: 2, facility: 'Panyam PHC', disease: 'Measles Spike', count: 5, date: 'Yesterday', severity: 'warning', details: 'Fever, cough, conjunctivitis, maculopapular rash. paeditric cohort.', status: 'Active' },
    { id: 3, facility: 'Gindiri PHC', disease: 'Lassa Fever Suspect', count: 1, date: '3 days ago', severity: 'critical', details: 'Adult male presenting with unexplained bleeding and high fever. Isolation protocol active.', status: 'Investigating' }
  ]);

  const [simulating, setSimulating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Trigger a mock warning
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
              {alerts.map(a => (
                <div key={a.id} className={`alert-detail-card ${a.severity}`}>
                  <div className="alert-header-row">
                    <span className="alert-facility-name">🏢 {a.facility}</span>
                    <span className={`status-badge-pill ${a.severity}`}>{a.severity.toUpperCase()}</span>
                  </div>
                  <div className="alert-meta-details">
                    <span className="disease-badge"><strong>Disease:</strong> {a.disease}</span>
                    <span className="count-badge"><strong>Cases:</strong> {a.count}</span>
                    <span className="date-badge">⏱️ {a.date}</span>
                  </div>
                  <p className="alert-text-body">{a.details}</p>
                  <div className="alert-action-strip">
                    <span className="investigation-status">Status: <strong>{a.status}</strong></span>
                    <button className="btn-secondary btn-sm" onClick={() => {
                      alert(`Reviewing detailed lab records and contact tracing lists for ${a.disease} at ${a.facility}.`);
                    }}>Contact Trace</button>
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
