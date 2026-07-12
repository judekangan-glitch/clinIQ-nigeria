import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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

  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ pending: 0, reviewedToday: 0, codeRedToday: 0 });
  const [pendingCases, setPendingCases] = useState([]);
  const [reviewedCases, setReviewedCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);

  useEffect(() => {
    if (profile?.id) fetchDashboardData();
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
          .select('id, consultation_id, created_at, patient_id, phc_id')
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

      const alertEnriched = await Promise.all(alertsData.map(async (alert) => {
        const [patientRes, phcRes] = await Promise.all([
          supabase.from('patients').select('full_name').eq('id', alert.patient_id).maybeSingle(),
          supabase.from('phcs').select('name').eq('id', alert.phc_id).maybeSingle(),
        ]);
        return { ...alert, patient: patientRes.data || null, phc: phcRes.data || null };
      }));

      setPendingCases(pendingEnriched);
      setReviewedCases(reviewedEnriched);
      setAllCases(allEnriched);
      setActiveAlerts(alertEnriched);
      setSummary({
        pending: pendingData.length,
        reviewedToday: reviewedData.length,
        codeRedToday: (codeRedRes.data || []).length,
      });
    } catch (error) {
      console.error('Doctor dashboard error:', error);
    } finally {
      setLoading(false);
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
            <h1 className="doctor-name">Dr. {profile?.full_name || 'Doctor'}</h1>
            <p className="doctor-subtitle">
              {profile?.specialty || 'Primary Health Care'} · {profile?.hospital_name || 'ClinIQ Network'}
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
                  </div>
                  <button
                    className="btn-danger alert-respond-btn"
                    onClick={() => alert.consultation_id
                      ? navigate(`/doctor/cases/${alert.consultation_id}`)
                      : navigate('/doctor/dashboard')
                    }
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
    </AppLayout>
  );
}
