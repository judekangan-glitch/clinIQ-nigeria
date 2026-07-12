import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import './LgaPages.css';

export default function SupplyAlerts() {
  const [supplies, setSupplies] = useState([
    { item: 'Malaria RDT Kits', category: 'Diagnostics', stock: 45, unit: 'Boxes', status: 'critical', details: 'Critical deficit at Langtang North PHC due to sudden surge.' },
    { item: 'Oral Rehydration Salts (ORS)', category: 'Therapeutics', stock: 120, unit: 'Sachets', status: 'warning', details: 'Low stock at Dengi PHC. Outbreak buffer protocol recommended.' },
    { item: 'ACT (Artemether-Lumefantrine)', category: 'Antimalarials', stock: 800, unit: 'Tablets', status: 'good', details: 'Adequate stock levels across all zones.' },
    { item: 'Pentavalent Vaccine', category: 'Immunisation', stock: 10, unit: 'Vials', status: 'critical', details: 'Stockout risk at Mangu PHC. Distribution delivery delayed.' }
  ]);

  const [simulating, setSimulating] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSimulateRestock = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      setSupplies(prev => prev.map(s => s.status === 'critical' ? { ...s, stock: s.stock + 150, status: 'good', details: 'Supplies replenished from Central Depot.' } : s));
      setSuccess('📦 Stock transfer order dispatched! replenishment delivery estimated in 24 hours.');
      setTimeout(() => setSuccess(''), 4000);
    }, 1500);
  };

  return (
    <AppLayout title="Supply Alerts">
      <div className="lga-page-container">
        
        <div className="lga-page-header">
          <div>
            <h1 className="lga-page-title">📦 Drug & Vaccine Supply Alerts</h1>
            <p className="lga-page-sub">Track real-time inventory levels, deficits, and coordinate restocking transfers.</p>
          </div>
          <button className="btn-primary" onClick={handleSimulateRestock} disabled={simulating}>
            {simulating ? 'Processing...' : '⚡ Order Stock Replenishment'}
          </button>
        </div>

        {success && (
          <div className="alert-success-banner" style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: 16, borderRadius: 12, marginBottom: 20, fontWeight: 600 }}>
            {success}
          </div>
        )}

        <div className="lga-double-grid">
          
          {/* Inventory status grid list */}
          <div className="card">
            <h2 className="panel-title-lg">Sentinel Supply Tracker</h2>
            <div className="supplies-stacked-list">
              {supplies.map((s, idx) => (
                <div key={idx} className={`supply-status-card ${s.status}`}>
                  <div className="supply-card-top">
                    <div>
                      <span className="supply-item-title">{s.item}</span>
                      <span className="supply-cat-lbl">{s.category}</span>
                    </div>
                    <span className={`status-badge-pill ${s.status}`}>{s.status.toUpperCase()}</span>
                  </div>
                  <p className="supply-details-text">{s.details}</p>
                  <div className="supply-footer">
                    <span>Current Stock: <strong>{s.stock} {s.unit}</strong></span>
                    {s.status !== 'good' && (
                      <button className="btn-secondary btn-sm" onClick={() => {
                        alert(`Re-routing emergency buffer allocation of ${s.item} to facility.`);
                      }}>Emergency Dispatch</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supply forecast summary widget */}
          <div className="lga-aside">
            <div className="card">
              <h2 className="panel-title-lg">Supply Forecast</h2>
              <div className="forecast-stat-box">
                <span className="forecast-metric">48 Hours</span>
                <span className="forecast-lbl">Average response time for depot order fulfilment</span>
              </div>
              <div className="forecast-details">
                <p><strong>DEPOT RUN SCHEDULE:</strong> Tuesday & Thursday mornings.</p>
                <p><strong>ALERT THRESHOLD:</strong> Sentinel triggers are activated when facility stock levels fall below 3 days of average daily consumption (ADC).</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
