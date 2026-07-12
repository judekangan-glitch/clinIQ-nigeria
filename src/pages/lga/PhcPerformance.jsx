import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import './LgaPages.css';

export default function PhcPerformance() {
  const [filterDelay, setFilterDelay] = useState(false);

  const phcs = [
    { name: 'Langtang North PHC', region: 'North', consultations: 324, compliance: 100, accuracy: 98, status: 'Compliant' },
    { name: 'Panyam PHC', region: 'Central', consultations: 184, compliance: 96, accuracy: 95, status: 'Compliant' },
    { name: 'Gindiri PHC', region: 'North', consultations: 142, compliance: 90, accuracy: 90, status: 'Compliant' },
    { name: 'Dengi PHC', region: 'East', consultations: 88, compliance: 75, accuracy: 72, status: 'Delayed' },
    { name: 'Mangu PHC', region: 'West', consultations: 12, compliance: 40, accuracy: 45, status: 'Delayed' }
  ];

  const displayedPhcs = filterDelay ? phcs.filter(p => p.status === 'Delayed') : phcs;

  return (
    <AppLayout title="PHC Performance">
      <div className="lga-page-container">
        
        <div className="lga-page-header">
          <div>
            <h1 className="lga-page-title">📊 Primary Health Care (PHC) Performance</h1>
            <p className="lga-page-sub">Track digitisation speed, diagnostic accuracy, and clinic reporting completeness.</p>
          </div>
          
          <div className="performance-actions">
            <button
              className={`btn-secondary ${filterDelay ? 'active-filter' : ''}`}
              onClick={() => setFilterDelay(!filterDelay)}
            >
              {filterDelay ? 'Show All PHCs' : '⚠️ Show Delayed Reports'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="panel-title-lg">Primary Health Care Reporting & Accuracy Index</h2>
          <div className="table-scroll-wrapper">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>PHC Facility</th>
                  <th>Region</th>
                  <th>Total Scanned</th>
                  <th>Reporting Rate</th>
                  <th>Diagnostic Accuracy</th>
                  <th>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedPhcs.map((p, idx) => (
                  <tr key={idx}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.region}</td>
                    <td>{p.consultations}</td>
                    <td>
                      <div className="acc-row-indicator">
                        <span>{p.compliance}%</span>
                        <div className="p-bar-track">
                          <div className="p-bar-fill" style={{ width: `${p.compliance}%`, backgroundColor: p.compliance > 80 ? '#16A34A' : p.compliance > 60 ? '#D97706' : '#DC2626' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="acc-row-indicator">
                        <span>{p.accuracy}%</span>
                        <div className="p-bar-track">
                          <div className="p-bar-fill" style={{ width: `${p.accuracy}%`, backgroundColor: p.accuracy > 85 ? '#1B4F8A' : p.accuracy > 65 ? '#D97706' : '#DC2626' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill-sub ${p.status.toLowerCase()}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
