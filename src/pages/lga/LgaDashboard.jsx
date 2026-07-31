import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { useDemoRole } from '../../context/DemoRoleContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './LgaDashboard.css';

function formatRelative(v) {
  if (!v) return '—';
  const diff = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

export default function LgaDashboard() {
  const { currentUser } = useDemoRole();
  const navigate = useNavigate();

  const [statsData, setStatsData] = useState({ consultations: null, alerts: null, phcs: null });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchLiveStats();
  }, []);

  async function fetchLiveStats() {
    setStatsLoading(true);
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [consultRes, alertRes, recentAlertRes] = await Promise.all([
        supabase.from('consultations').select('id, phc_id', { count: 'exact' })
          .gte('created_at', weekAgo),
        supabase.from('code_red_alerts').select('id', { count: 'exact' })
          .is('doctor_response_at', null),
        supabase.from('code_red_alerts')
          .select('id, created_at, description, temperature, blood_pressure')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Count distinct PHC IDs in the consultation result
      const phcSet = new Set((consultRes.data || []).map(c => c.phc_id).filter(Boolean));

      setStatsData({
        consultations: consultRes.count ?? 0,
        alerts: alertRes.count ?? 0,
        phcs: phcSet.size,
      });

      setRecentAlerts(recentAlertRes.data || []);
    } catch (err) {
      console.error('LGA stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  }

  const stats = [
    {
      label: 'Active PHCs Reporting',
      value: statsLoading ? '…' : `${statsData.phcs ?? '—'}`,
      change: 'This week',
      color: '#1B4F8A',
      icon: '🏥',
    },
    {
      label: 'Consultations (7 days)',
      value: statsLoading ? '…' : (statsData.consultations ?? '—').toLocaleString(),
      change: 'Live count',
      color: '#0E7C7B',
      icon: '👥',
    },
    {
      label: 'Unresolved Code Reds',
      value: statsLoading ? '…' : (statsData.alerts ?? '—'),
      change: statsData.alerts > 0 ? `${statsData.alerts} awaiting doctor` : 'All clear',
      color: statsData.alerts > 0 ? '#DC2626' : '#16A34A',
      icon: '🚨',
    },
    {
      label: 'Vaccine Inventory Level',
      value: '88%',
      change: 'Normal levels',
      color: '#16A34A',
      icon: '📦',
    },
  ];

  return (
    <AppLayout title="LGA Health Officer Dashboard">
      <div className="lga-dashboard-container">
        
        {/* Header Greeting */}
        <div className="lga-dashboard-header">
          <div>
            <span className="lga-eyebrow">LGA Health Command Centre</span>
            <h1 className="lga-title">Welcome, {currentUser.name}</h1>
            <p className="lga-sub">{currentUser.lga} LGA · {currentUser.state} State Dashboard</p>
          </div>
          <div className="lga-header-actions">
            <button className="btn-secondary" onClick={() => navigate('/lga/outbreaks')}>
              ⚠️ View Outbreaks
            </button>
            <button className="btn-primary" onClick={() => navigate('/lga/trends')}>
              📈 Analysis Tool
            </button>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="lga-stats-grid">
          {stats.map(stat => (
            <div key={stat.label} className="lga-stat-card card" style={{ borderTop: `4px solid ${stat.color}` }}>
              <div className="lga-stat-icon-wrap" style={{ backgroundColor: stat.color + '15', color: stat.color }}>
                {stat.icon}
              </div>
              <div className="lga-stat-info">
                <span className="lga-stat-val">{stat.value}</span>
                <span className="lga-stat-label">{stat.label}</span>
                <span className="lga-stat-change" style={{ color: stat.color }}>{stat.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN VISUALIZATIONS SECTION */}
        <div className="lga-grid-main">
          
          {/* DISEASE INCIDENCE & TREND CHART */}
          <div className="lga-panel card">
            <div className="lga-panel-header">
              <h2 className="lga-panel-title">Monthly Disease Incidence</h2>
              <span className="lga-panel-legend">
                <span className="legend-dot malaria"></span> Malaria
                <span className="legend-dot cholera"></span> Cholera
                <span className="legend-dot measles"></span> Measles
              </span>
            </div>
            
            {/* SVG Interactive Line / Area Chart */}
            <div className="lga-chart-container">
              <svg viewBox="0 0 500 200" className="lga-svg-chart">
                {/* Grid Lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4" />
                <line x1="40" y1="70" x2="480" y2="70" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4" />
                <line x1="40" y1="120" x2="480" y2="120" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4" />
                <line x1="40" y1="170" x2="480" y2="170" stroke="#E2E8F0" strokeWidth="1" />
                
                {/* Malaria Line (Primary/Teal) */}
                <path d="M 40 100 Q 120 70, 200 120 T 360 50 T 480 30" fill="none" stroke="#0E7C7B" strokeWidth="3" />
                <path d="M 40 100 Q 120 70, 200 120 T 360 50 T 480 30 L 480 170 L 40 170 Z" fill="#0E7C7B10" />

                {/* Cholera Line (Danger/Red) */}
                <path d="M 40 160 Q 120 162, 200 150 T 360 90 T 480 140" fill="none" stroke="#DC2626" strokeWidth="2.5" />
                
                {/* Measles Line (Warning/Amber) */}
                <path d="M 40 150 Q 120 130, 200 140 T 360 130 T 480 80" fill="none" stroke="#D97706" strokeWidth="2" />

                {/* Data Points */}
                <circle cx="200" cy="120" r="4" fill="#0E7C7B" />
                <circle cx="360" cy="50" r="4" fill="#0E7C7B" />
                <circle cx="360" cy="90" r="4" fill="#DC2626" />

                {/* Chart Labels */}
                <text x="35" y="175" className="chart-axis-text" textAnchor="end">0</text>
                <text x="35" y="125" className="chart-axis-text" textAnchor="end">100</text>
                <text x="35" y="75" className="chart-axis-text" textAnchor="end">200</text>
                <text x="35" y="25" className="chart-axis-text" textAnchor="end">300</text>

                <text x="40" y="190" className="chart-axis-text" textAnchor="middle">Jan</text>
                <text x="128" y="190" className="chart-axis-text" textAnchor="middle">Feb</text>
                <text x="216" y="190" className="chart-axis-text" textAnchor="middle">Mar</text>
                <text x="304" y="190" className="chart-axis-text" textAnchor="middle">Apr</text>
                <text x="392" y="190" className="chart-axis-text" textAnchor="middle">May</text>
                <text x="480" y="190" className="chart-axis-text" textAnchor="middle">Jun</text>
              </svg>
            </div>
          </div>

          {/* ACTIVE OUTBREAKS BANNER */}
          <div className="lga-panel card">
            <div className="lga-panel-header">
              <h2 className="lga-panel-title">Recent Code Red Alerts</h2>
              <button className="btn-link" onClick={() => navigate('/lga/outbreaks')}>View All</button>
            </div>
            <div className="lga-alert-list">
              {recentAlerts.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>
                  {statsLoading ? 'Loading alerts...' : '✅ No unresolved Code Red alerts'}
                </p>
              ) : (
                recentAlerts.map((alert) => (
                  <div key={alert.id} className="lga-alert-item critical">
                    <div className="lga-alert-top">
                      <span className="alert-phc">🚨 Code Red</span>
                      <span className="alert-date">{formatRelative(alert.created_at)}</span>
                    </div>
                    <div className="alert-disease-row">
                      <span className="alert-tag">{alert.description?.slice(0, 60) || 'Emergency alert'}</span>
                      <span className="alert-badge">CODE RED</span>
                    </div>
                    {alert.blood_pressure && (
                      <p className="alert-desc">BP: {alert.blood_pressure} · Temp: {alert.temperature}°C</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* PHC DIGITISATION PROGRESS & STOCK WATCH */}
        <div className="lga-grid-sub">
          
          <div className="lga-panel card">
            <h2 className="lga-panel-title">PHC Digitisation & Reporting Status</h2>
            <div className="lga-table-wrapper">
              <table className="lga-table">
                <thead>
                  <tr>
                    <th>PHC Facility Name</th>
                    <th>Submissions</th>
                    <th>Accuracy</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Langtang North PHC', count: 324, acc: '98%', status: 'active', color: '#16A34A' },
                    { name: 'Panyam PHC', count: 184, acc: '95%', status: 'active', color: '#16A34A' },
                    { name: 'Gindiri PHC', count: 142, acc: '90%', status: 'active', color: '#16A34A' },
                    { name: 'Dengi PHC', count: 88, acc: '72%', status: 'delayed', color: '#D97706' },
                    { name: 'Mangu PHC', count: 12, acc: '45%', status: 'critical', color: '#DC2626' }
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="row-facility-name">{row.name}</td>
                      <td>{row.count}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{row.acc}</span>
                          <div className="acc-bar-bg">
                            <div className="acc-bar-fill" style={{ width: row.acc, backgroundColor: row.color }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${row.status}`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
