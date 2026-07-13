import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDemoRole } from '../../context/DemoRoleContext';
import { supabase } from '../../lib/supabase';
import AppLayout from '../../components/AppLayout';
import './DoctorDashboard.css';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatRelativeTime(value) {
  if (!value) return '—';
  const diffMins = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${Math.round(diffMins / 60)}h ago`;
}

function getAge(dob) {
  if (!dob) return '—';
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { currentUser } = useDemoRole();

  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ pending: 0, reviewedToday: 0, codeRedToday: 0 });
  const [pendingCases, setPendingCases] = useState([]);
  const [reviewedCases, setReviewedCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [profile?.id]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const [pendingRes, reviewedRes, codeRedRes, alertsRes] = await Promise.all([
        supabase
          .from('consultations')
          .select('id, consultation_date, chief_complaint, doctor_review_status, patient_id, chew_id, phc_id')
          .eq('doctor_review_status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('doctor_reviews')
          .select('consultation_id')
          .eq('doctor_id', profile.id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
        supabase
          .from('code_red_alerts')
          .select('id')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
        supabase
          .from('code_red_alerts')
          .select('id, consultation_id, created_at, patient_id, phc_id, description, temperature, blood_pressure, pulse_rate')
          .is('doctor_response_at', null)
          .order('created_at', { ascending: false }),
      ]);

      const pendingData = pendingRes.data || [];
      const reviewedData = reviewedRes.data || [];
      const alertsData = alertsRes.data || [];

      const enrichCase = async (consultation) => {
        const [patientRes, chewRes, phcRes] = await Promise.all([
          supabase.from('patients').select('full_name, date_of_birth, sex').eq('id', consultation.patient_id).maybeSingle(),
          supabase.from('users').select('full_name').eq('id', consultation.chew_id).maybeSingle(),
          supabase.from('phcs').select('name').eq('id', consultation.phc_id).maybeSingle(),
        ]);
        return { ...consultation, patient: patientRes.data || null, chew: chewRes.data || null, phc: phcRes.data || null };
      };

      const pendingEnriched = await Promise.all(pendingData.map(enrichCase));
      const [reviewedConsultations, allConsultations] = await Promise.all([
        supabase
          .from('consultations')
          .select('id, consultation_date, chief_complaint, doctor_review_status, patient_id, chew_id, phc_id')
          .in('id', reviewedData.map(item => item.consultation_id))
          .order('created_at', { ascending: false }),
        supabase
          .from('consultations')
          .select('id, consultation_date, chief_complaint, doctor_review_status, patient_id, chew_id, phc_id')
          .order('created_at', { ascending: false }),
      ]);

      const reviewedEnriched = await Promise.all((reviewedConsultations.data || []).map(enrichCase));
      const allEnriched = await Promise.all((allConsultations.data || []).map(enrichCase));

      // Fetch remote alerts
      const remoteAlertEnriched = await Promise.all(alertsData.map(async (alert) => {
        const [patientRes, phcRes] = await Promise.all([
          supabase.from('patients').select('full_name, phone_number').eq('id', alert.patient_id).maybeSingle(),
          supabase.from('phcs').select('name').eq('id', alert.phc_id).maybeSingle(),
        ]);
        return { ...alert, patient: patientRes.data || null, phc: phcRes.data || null };
      }));

      // Fetch local fallback alerts
      const localAlerts = JSON.parse(localStorage.getItem('cliniq_demo_alerts') || '[]');
      const activeLocalAlerts = localAlerts.filter(a => !a.doctor_response_at);

      // Merge alerts (prioritise local object patient info to avoid DB fetches for mock alerts)
      const mergedAlertsMap = new Map();
      remoteAlertEnriched.forEach(a => mergedAlertsMap.set(a.id, a));
      activeLocalAlerts.forEach(a => mergedAlertsMap.set(a.id, a));
      const mergedAlerts = Array.from(mergedAlertsMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPendingCases(pendingEnriched);
      setReviewedCases(reviewedEnriched);
      setAllCases(allEnriched);
      setActiveAlerts(mergedAlerts);
      setSummary({
        pending: pendingData.length,
        reviewedToday: reviewedData.length,
        codeRedToday: (codeRedRes.data || []).length + activeLocalAlerts.length,
      });
    } catch (error) {
      console.error('Doctor dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveAlert(alertId) {
    try {
      // Mark alert as responded in DB
      await supabase
        .from('code_red_alerts')
        .update({ doctor_response_at: new Date().toISOString() })
        .eq('id', alertId)
        .then(({ error }) => { if (error) console.warn('Alert update error:', error.message); });

      // Also mark as responded in localStorage
      const localAlerts = JSON.parse(localStorage.getItem('cliniq_demo_alerts') || '[]');
      const updatedLocalAlerts = localAlerts.map(a => 
        a.id === alertId ? { ...a, doctor_response_at: new Date().toISOString() } : a
      );
      localStorage.setItem('cliniq_demo_alerts', JSON.stringify(updatedLocalAlerts));

      // Remove from local state immediately
      setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
      setSelectedAlert(null);
    } catch (err) {
      console.error(err);
    }
  }

  const visibleCases = activeTab === 'pending' ? pendingCases : activeTab === 'reviewed' ? reviewedCases : allCases;

  const doctorNavItems = [
    { label: 'Dashboard', path: '/doctor/dashboard', icon: '🏠' },
    { label: 'All Cases', path: '/doctor/cases', icon: '📋' },
  ];

  return (
    <AppLayout title="Doctor Dashboard" navItems={doctorNavItems}>
      <div className="doctor-dashboard-page">

        {/* Greeting Header */}
        <header className="doctor-header">
          <div>
            <p className="eyebrow-label">Doctor Review Dashboard</p>
            <h1 className="doctor-name">{currentUser?.name || `Dr. ${profile?.full_name || 'Doctor'}`}</h1>
            <p className="doctor-subtitle">
              {currentUser?.specialty || profile?.specialty || 'General Practice'} · {currentUser?.hospital || profile?.hospital_name || 'ClinIQ Network'}
            </p>
          </div>
        </header>

        {/* Summary Stat Cards */}
        <section className="doctor-stat-strip" aria-label="Doctor summary statistics">
          <div className="doc-stat-card doc-stat-pending">
            <span className="doc-stat-number">{summary.pending}</span>
            <span className="doc-stat-label">Awaiting Review</span>
          </div>
          <div className="doc-stat-card doc-stat-reviewed">
            <span className="doc-stat-number">{summary.reviewedToday}</span>
            <span className="doc-stat-label">Reviewed Today</span>
          </div>
          <div className="doc-stat-card doc-stat-alerts">
            <span className="doc-stat-number">{summary.codeRedToday}</span>
            <span className="doc-stat-label">Code Reds Today</span>
          </div>
        </section>

        {/* Active Code Red Alerts Banner */}
        {activeAlerts.length > 0 && (
          <section className="active-alerts-banner" aria-label="Active code red alerts">
            <div className="alerts-header">
              <div className="alert-icon-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h2 className="alerts-title">Active Code Red Alerts</h2>
                <p className="alerts-count">{activeAlerts.length} alert(s) require immediate action</p>
              </div>
            </div>
            <div className="alert-items-list">
              {activeAlerts.map((alert) => (
                <div className="alert-item-row" key={alert.id}>
                  <div className="alert-patient-info">
                    <span className="alert-patient-name">{alert.patient?.full_name || 'Unknown patient'}</span>
                    <span className="alert-phc">{alert.phc?.name || 'PHC'} · {formatRelativeTime(alert.created_at)}</span>
                    {alert.description && (
                      <span style={{ fontSize: 12, color: '#991B1B', marginTop: 2, display: 'block', fontStyle: 'italic' }}>
                        {alert.description}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-danger alert-respond-btn"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    Respond
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cases Tab Filter */}
        <section className="cases-section">
          <div className="tab-bar">
            {['pending', 'reviewed', 'all'].map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'pending' ? 'Pending Review' : tab === 'reviewed' ? 'Reviewed Today' : 'All Cases'}
              </button>
            ))}
          </div>

          <div className="case-list">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="case-card skeleton-card">
                  <div className="sk-line sk-name" />
                  <div className="sk-line sk-meta" />
                  <div className="sk-line sk-complaint" />
                </div>
              ))
            ) : visibleCases.length === 0 ? (
              <div className="empty-state">
                <p>No cases in this view.</p>
              </div>
            ) : (
              visibleCases.map((consultation) => (
                <article className="case-card" key={consultation.id}>
                  <div className="case-main">
                    <div className="case-patient-row">
                      <h3 className="case-patient-name">{consultation.patient?.full_name || 'Unknown patient'}</h3>
                      <span className={`badge ${consultation.doctor_review_status === 'pending' ? 'badge-warning' : 'badge-success'}`}>
                        {consultation.doctor_review_status === 'pending' ? 'Pending' : 'Reviewed'}
                      </span>
                    </div>
                    <div className="case-meta-row">
                      <span>{getAge(consultation.patient?.date_of_birth)} yrs · {consultation.patient?.sex || '—'}</span>
                      <span>{consultation.phc?.name || 'PHC'}</span>
                      <span>{formatDate(consultation.consultation_date)}</span>
                    </div>
                    <p className="case-complaint">{consultation.chief_complaint || 'No complaint recorded'}</p>
                  </div>
                  <button
                    className="btn-primary case-review-btn"
                    onClick={() => navigate(`/doctor/cases/${consultation.id}`)}
                  >
                    Review
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

      </div>

      {/* ─── Code Red Response Modal ─── */}
      {selectedAlert && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-hover)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
              <h2 style={{ fontSize: 18, color: 'var(--color-danger)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                🚨 Respond to Code Red
              </h2>
              <button onClick={() => setSelectedAlert(null)} style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--color-text-muted)', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <div><strong>Patient Name:</strong> <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>{selectedAlert.patient?.full_name || 'Unknown Patient'}</span></div>
              <div><strong>Location:</strong> {selectedAlert.phc?.name || 'PHC'}</div>
              <div><strong>Vitals:</strong> Temp: {selectedAlert.temperature ? `${selectedAlert.temperature}°C` : '—'} · BP: {selectedAlert.blood_pressure || '—'} · Pulse: {selectedAlert.pulse_rate ? `${selectedAlert.pulse_rate} bpm` : '—'}</div>
              {selectedAlert.description && (
                <div style={{ marginTop: 6, fontStyle: 'italic', color: '#991B1B', background: '#FFF1F2', padding: 10, borderRadius: 8, border: '1px solid #FECDD3' }}>
                  "{selectedAlert.description}"
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Communication Channels</span>
              
              <a href={`tel:${selectedAlert.patient?.phone_number || '+2348000000000'}`} className="btn-secondary" style={{ width: '100%', textDecoration: 'none', display: 'flex', justifyContent: 'center', gap: 8 }}>
                📞 Normal Phone Call
              </a>

              <a 
                href={`https://wa.me/${(selectedAlert.patient?.phone_number || '+2348000000000').replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Emergency Response: Hello, this is Dr. ${currentUser?.name || 'Doctor'} responding to the Code Red alert. Patient: ${selectedAlert.patient?.full_name || 'Unknown'}. Vitals: Temp ${selectedAlert.temperature || '—'}°C, BP ${selectedAlert.blood_pressure || '—'}, Pulse ${selectedAlert.pulse_rate || '—'}. Description: ${selectedAlert.description || 'Immediate consultation needed.'}`)}`}
                target="_blank" 
                rel="noreferrer" 
                className="btn-primary" 
                style={{ width: '100%', background: '#25D366', borderColor: '#25D366', textDecoration: 'none', display: 'flex', justifyContent: 'center', gap: 8 }}
              >
                💬 WhatsApp Chat & Message
              </a>

              <a 
                href={`https://wa.me/${(selectedAlert.patient?.phone_number || '+2348000000000').replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Please join a WhatsApp video call immediately for patient emergency consultation: ${selectedAlert.patient?.full_name || 'Unknown'}`)}`}
                target="_blank" 
                rel="noreferrer" 
                className="btn-primary" 
                style={{ width: '100%', background: '#0E7C7B', borderColor: '#0E7C7B', textDecoration: 'none', display: 'flex', justifyContent: 'center', gap: 8 }}
              >
                📹 WhatsApp Video Call
              </a>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              <button 
                className="btn-danger" 
                style={{ flex: 1 }} 
                onClick={() => handleResolveAlert(selectedAlert.id)}
              >
                Clear & Resolve Alert
              </button>
              <button 
                className="btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => {
                  // Resolve alert and navigate to consultation detail review
                  handleResolveAlert(selectedAlert.id);
                  if (selectedAlert.consultation_id) {
                    navigate(`/doctor/cases/${selectedAlert.consultation_id}`);
                  }
                }}
              >
                Resolve & Review Case
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
