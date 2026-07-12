import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { useDemoRole } from '../../context/DemoRoleContext';
import { supabase } from '../../lib/supabase';
import './DigitisationProgress.css';

export default function DigitisationProgress() {
  const { currentUser } = useDemoRole();
  const [scansToday, setScansToday] = useState(0);
  const [scansHistory, setScansHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const targetDaily = 20;

  useEffect(() => {
    // Get count today from localStorage or default to a demo baseline
    const localToday = parseInt(localStorage.getItem('cliniq_officer_scans_today') || '14');
    setScansToday(localToday);

    // Load recent retrospective scans
    async function loadScans() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('consultations')
          .select('id, consultation_date, chief_complaint, patient_id, patients(full_name)')
          .eq('is_retrospective', true)
          .order('created_at', { ascending: false })
          .limit(10);
        setScansHistory(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadScans();
  }, []);

  const progressPct = Math.round((scansToday / targetDaily) * 100);

  return (
    <AppLayout title="Digitisation Progress">
      <div className="digi-progress-container">
        
        <div className="digi-progress-header">
          <div>
            <span className="digi-eyebrow">Performance & Target Tracking</span>
            <h1 className="digi-title">My Digitisation Progress</h1>
            <p className="digi-sub">Monitor your daily scan count, target completion status, and review recent uploads.</p>
          </div>
        </div>

        <div className="digi-double-grid">
          
          {/* Target card */}
          <div className="card">
            <h2 className="panel-title-lg">Daily Scans Target</h2>
            <div className="progress-summary-box">
              <div className="circle-progress-bar">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="8"/>
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#0E7C7B"
                    strokeWidth="8"
                    strokeDasharray={`${(scansToday / targetDaily) * 263.8} 263.8`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
                    style={{ fontSize: 18, fontWeight: 900, fill: '#0F172A' }}>
                    {progressPct}%
                  </text>
                </svg>
              </div>
              <div className="target-progress-text">
                <span className="metric-headline">{scansToday} / {targetDaily}</span>
                <span className="metric-label">Completed Scans Today</span>
                <span className="metric-sub">{targetDaily - scansToday > 0 ? `${targetDaily - scansToday} more to reach target` : '🎉 Target achieved!'}</span>
              </div>
            </div>
          </div>

          {/* History list */}
          <div className="card">
            <h2 className="panel-title-lg">Recent Scans</h2>
            {loading ? (
              <div className="progress-loading">
                <div className="inline-spinner" />
                <span>Loading recent scans...</span>
              </div>
            ) : scansHistory.length === 0 ? (
              <div className="no-history-box text-center">
                <p>No records scanned yet today.</p>
              </div>
            ) : (
              <div className="history-vertical-list">
                {scansHistory.map((item, idx) => (
                  <div key={idx} className="history-row-item">
                    <div>
                      <span className="history-patient-name">{item.patients?.full_name || 'Patient File'}</span>
                      <span className="history-details">{item.chief_complaint} · {item.consultation_date}</span>
                    </div>
                    <span className="sync-badge">Digitised</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
