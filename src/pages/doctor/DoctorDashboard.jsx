import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ConnectivityBanner from '../../components/ConnectivityBanner';
import './DoctorDashboard.css';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatRelativeTime(value) {
  if (!value) return '—';
  const then = new Date(value).getTime();
  const now = Date.now();
  const diffMins = Math.max(1, Math.round((now - then) / 60000));
  if (diffMins < 60) return `${diffMins}m ago`;
  const hrs = Math.round(diffMins / 60);
  return `${hrs}h ago`;
}

function getAge(dob) {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
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
    if (profile?.id) {
      fetchDashboardData();
    }
  }, [profile?.id]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

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
      const codeRedData = codeRedRes.data || [];
      const alertsData = alertsRes.data || [];

      const enrichCase = async (consultation) => {
        const [patientRes, chewRes, phcRes] = await Promise.all([
          supabase.from('patients').select('full_name, date_of_birth, sex').eq('id', consultation.patient_id).maybeSingle(),
          supabase.from('users').select('full_name').eq('id', consultation.chew_id).maybeSingle(),
          supabase.from('phcs').select('name').eq('id', consultation.phc_id).maybeSingle(),
        ]);

        return {
          ...consultation,
          patient: patientRes.data || null,
          chew: chewRes.data || null,
          phc: phcRes.data || null,
        };
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
        return {
          ...alert,
          patient: patientRes.data || null,
          phc: phcRes.data || null,
        };
      }));

      setPendingCases(pendingEnriched);
      setReviewedCases(reviewedEnriched);
      setAllCases(allEnriched);
      setActiveAlerts(alertEnriched);
      setSummary({
        pending: pendingData.length,
        reviewedToday: reviewedData.length,
        codeRedToday: codeRedData.length,
      });
    } catch (error) {
      console.error('Doctor dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }

  const visibleCases = activeTab === 'pending'
    ? pendingCases
    : activeTab === 'reviewed'
      ? reviewedCases
      : allCases;

  return (
    <div className="doctor-dashboard-page">
      <ConnectivityBanner />

      <header className="doctor-dashboard-header">
        <div>
          <p className="eyebrow">Doctor Review Dashboard</p>
          <h1>{profile?.full_name || 'Doctor'}</h1>
          <p className="doctor-subtitle">{profile?.specialty || 'Primary Health Care'} at {profile?.hospital_name || 'ClinIQ Network'}</p>
        </div>
      </header>

      <section className="summary-strip" aria-label="Doctor summary">
        <div className="summary-card">
          <span className="summary-label">Awaiting Review</span>
          <strong>{summary.pending}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Reviewed Today</span>
          <strong>{summary.reviewedToday}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Code Reds Today</span>
          <strong>{summary.codeRedToday}</strong>
        </div>
      </section>

      {activeAlerts.length > 0 && (
        <section className="alert-banner" aria-label="Active code red alerts">
          <div>
            <h2>Active Code Red Alerts</h2>
            <p>{activeAlerts.length} alert(s) need immediate review.</p>
          </div>
          <div className="alert-list">
            {activeAlerts.map((alert) => (
              <div className="alert-item" key={alert.id}>
                <div>
                  <strong>{alert.patient?.full_name || 'Unknown patient'}</strong>
                  <div>{alert.phc?.name || 'PHC'} · {formatRelativeTime(alert.created_at)}</div>
                </div>
                <button className="btn-primary small" onClick={() => alert.consultation_id ? navigate(`/doctor/cases/${alert.consultation_id}`) : navigate('/doctor/dashboard')}>
                  Respond
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-tabs">
        <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>Pending Review</button>
        <button className={activeTab === 'reviewed' ? 'active' : ''} onClick={() => setActiveTab('reviewed')}>Reviewed Today</button>
        <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>All Cases</button>
      </section>

      <section className="case-list">
        {loading ? (
          <div className="empty-state">Loading cases...</div>
        ) : visibleCases.length === 0 ? (
          <div className="empty-state">No cases in this view.</div>
        ) : (
          visibleCases.map((consultation) => (
            <article className="case-card" key={consultation.id}>
              <div className="case-main">
                <div className="case-patient-row">
                  <h3>{consultation.patient?.full_name || 'Unknown patient'}</h3>
                  <span className="pill">{getAge(consultation.patient?.date_of_birth)} yrs · {consultation.patient?.sex || '—'}</span>
                </div>
                <div className="case-meta">
                  <span>{consultation.phc?.name || 'PHC'}</span>
                  <span>{consultation.chew?.full_name || 'CHEW'}</span>
                  <span>{formatDate(consultation.consultation_date)}</span>
                </div>
                <p className="case-complaint">{consultation.chief_complaint || 'No complaint recorded'}</p>
              </div>
              <button className="btn-primary review-btn" onClick={() => navigate(`/doctor/cases/${consultation.id}`)}>
                Review
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
