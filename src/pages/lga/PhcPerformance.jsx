import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { supabase } from '../../lib/supabase';
import './LgaPages.css';

// Fallback demo data (used when Supabase returns 0 records)
const DEMO_PHCS = [
  { name: 'Langtang North PHC', region: 'North', consultations: 324, compliance: 100, accuracy: 98, status: 'Compliant' },
  { name: 'Panyam PHC', region: 'Central', consultations: 184, compliance: 96, accuracy: 95, status: 'Compliant' },
  { name: 'Gindiri PHC', region: 'North', consultations: 142, compliance: 90, accuracy: 90, status: 'Compliant' },
  { name: 'Dengi PHC', region: 'East', consultations: 88, compliance: 75, accuracy: 72, status: 'Delayed' },
  { name: 'Mangu PHC', region: 'West', consultations: 12, compliance: 40, accuracy: 45, status: 'Delayed' },
];

export default function PhcPerformance() {
  const [filterDelay, setFilterDelay] = useState(false);
  const [phcs, setPhcs] = useState(DEMO_PHCS);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPhcData(); }, []);

  async function fetchPhcData() {
    setLoading(true);
    try {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Aggregate consultation counts by phc_id
      const { data: consults } = await supabase
        .from('consultations')
        .select('phc_id, doctor_review_status, synced')
        .gte('created_at', monthAgo);

      const { data: phcProfiles } = await supabase
        .from('users')
        .select('phc_id, phc_name')
        .not('phc_id', 'is', null);

      if (!consults || consults.length === 0) {
        // No real data yet — keep demo data
        setLoading(false);
        return;
      }

      // Group by phc_id
      const grouped = {};
      for (const c of consults) {
        if (!c.phc_id) continue;
        if (!grouped[c.phc_id]) {
          grouped[c.phc_id] = { total: 0, reviewed: 0, synced: 0 };
        }
        grouped[c.phc_id].total++;
        if (c.doctor_review_status === 'reviewed') grouped[c.phc_id].reviewed++;
        if (c.synced) grouped[c.phc_id].synced++;
      }

      // Build name lookup from profiles
      const nameLookup = {};
      for (const p of (phcProfiles || [])) {
        if (p.phc_id && p.phc_name) nameLookup[p.phc_id] = p.phc_name;
      }

      const livePhcs = Object.entries(grouped).map(([phcId, stats]) => {
        const compliance = stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 0;
        const accuracy = stats.total > 0 ? Math.round((stats.reviewed / stats.total) * 100) : 0;
        return {
          name: nameLookup[phcId] || `PHC ${phcId.slice(0, 8)}`,
          region: '—',
          consultations: stats.total,
          compliance,
          accuracy,
          status: compliance >= 80 ? 'Compliant' : 'Delayed',
        };
      }).sort((a, b) => b.consultations - a.consultations);

      if (livePhcs.length > 0) setPhcs(livePhcs);
    } catch (err) {
      console.error('PHC performance error:', err);
    } finally {
      setLoading(false);
    }
  }

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

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: 14 }}>
            Loading PHC performance data...
          </div>
        )}

        <div className="card">
          <h2 className="panel-title-lg">Primary Health Care Reporting & Accuracy Index</h2>
          <div className="table-scroll-wrapper">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>PHC Facility</th>
                  <th>Region</th>
                  <th>Consultations</th>
                  <th>Reporting Rate</th>
                  <th>Review Rate</th>
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

