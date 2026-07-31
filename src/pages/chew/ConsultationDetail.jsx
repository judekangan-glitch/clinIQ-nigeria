import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AppLayout from '../../components/AppLayout';
import './ConsultationDetail.css';

function formatDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatRelative(v) {
  if (!v) return '';
  const diff = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}
function calcAge(dob) {
  if (!dob) return '—';
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function ConsultationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null);
  const [doctorReview, setDoctorReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: c, error: cErr } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (cErr || !c) { setError('Consultation not found.'); setLoading(false); return; }
      setConsultation(c);

      const [pRes, drRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', c.patient_id).maybeSingle(),
        supabase.from('doctor_reviews').select('*').eq('consultation_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      setPatient(pRes.data || null);
      setDoctorReview(drRes.data || null);
    } catch (err) {
      console.error(err);
      setError('Failed to load consultation.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout showBack title="Consultation Detail">
        <div className="cd-loading">
          <div className="inline-spinner" style={{ width: 40, height: 40 }} />
          <p>Loading consultation...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !consultation) {
    return (
      <AppLayout showBack title="Consultation Detail">
        <div className="empty-state">
          <h3 className="empty-state-title">{error || 'Not found'}</h3>
          <button className="btn-primary" onClick={() => navigate('/chew/dashboard')}>Back to Dashboard</button>
        </div>
      </AppLayout>
    );
  }

  const vitals = [
    { label: 'Temperature', value: consultation.temperature ? `${consultation.temperature}°C` : '—', icon: '🌡️' },
    { label: 'Blood Pressure', value: consultation.blood_pressure || '—', icon: '💉' },
    { label: 'Pulse Rate', value: consultation.pulse_rate ? `${consultation.pulse_rate} bpm` : '—', icon: '💓' },
    { label: 'Resp. Rate', value: consultation.respiratory_rate ? `${consultation.respiratory_rate}/min` : '—', icon: '🫁' },
    { label: 'Weight', value: consultation.weight ? `${consultation.weight} kg` : '—', icon: '⚖️' },
  ];

  const statusStyles = {
    pending: { bg: '#FEF9C3', color: '#92400E', label: 'Pending Doctor Review' },
    reviewed: { bg: '#D1FAE5', color: '#065F46', label: 'Doctor Reviewed ✓' },
    correction_sent: { bg: '#FEE2E2', color: '#991B1B', label: 'Correction Sent' },
  };
  const statusStyle = statusStyles[consultation.doctor_review_status] || statusStyles.pending;

  const symptoms = Array.isArray(consultation.associated_symptoms)
    ? consultation.associated_symptoms
    : (consultation.associated_symptoms ? [consultation.associated_symptoms] : []);

  const aiDiff = consultation.ai_diagnosis_suggestion?.differentials || [];

  return (
    <AppLayout showBack backTo={patient ? `/chew/patients/${patient.id}` : '/chew/dashboard'} title="Consultation Detail">
      <div className="cd-container">

        {/* STATUS BANNER */}
        <div className="cd-status-banner" style={{ background: statusStyle.bg, color: statusStyle.color }}>
          <span>{statusStyle.label}</span>
          <span className="cd-status-date">{formatRelative(consultation.created_at)}</span>
        </div>

        {/* PATIENT HEADER */}
        {patient && (
          <div className="cd-patient-header card">
            <div className="cd-patient-avatar">{patient.full_name?.charAt(0).toUpperCase()}</div>
            <div className="cd-patient-meta">
              <h1 className="cd-patient-name">{patient.full_name}</h1>
              <div className="cd-patient-chips">
                <span className="cd-chip">{calcAge(patient.date_of_birth)} yrs</span>
                <span className="cd-chip">{patient.sex === 'M' ? 'Male' : 'Female'}</span>
                {patient.blood_group && <span className="cd-chip">{patient.blood_group}</span>}
                {patient.hospital_number && <span className="cd-chip">{patient.hospital_number}</span>}
              </div>
              <p className="cd-consult-date">📅 {formatDate(consultation.consultation_date)}</p>
            </div>
          </div>
        )}

        <div className="cd-main-grid">
          <div className="cd-left-col">

            {/* CHIEF COMPLAINT */}
            <div className="card cd-section">
              <h2 className="cd-section-title">🗣️ Chief Complaint</h2>
              <p className="cd-complaint-text">{consultation.chief_complaint || '—'}</p>
              {consultation.duration_days && (
                <p className="cd-duration-text">Duration: <strong>{consultation.duration_days} day{consultation.duration_days > 1 ? 's' : ''}</strong></p>
              )}
            </div>

            {/* SYMPTOMS */}
            {symptoms.length > 0 && (
              <div className="card cd-section">
                <h2 className="cd-section-title">🤒 Associated Symptoms</h2>
                <div className="cd-symptom-tags">
                  {symptoms.map(s => <span key={s} className="cd-symptom-tag">{s}</span>)}
                </div>
                {consultation.other_symptom && (
                  <p className="cd-other-symptom">Other: {consultation.other_symptom}</p>
                )}
              </div>
            )}

            {/* VITALS */}
            <div className="card cd-section">
              <h2 className="cd-section-title">📊 Vitals Recorded</h2>
              <div className="cd-vitals-grid">
                {vitals.map(v => (
                  <div key={v.label} className="cd-vital-item">
                    <span className="cd-vital-icon">{v.icon}</span>
                    <span className="cd-vital-val">{v.value}</span>
                    <span className="cd-vital-label">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DIAGNOSIS */}
            <div className="card cd-section">
              <h2 className="cd-section-title">🩺 Provisional Diagnosis</h2>
              <p className="cd-diagnosis-text">
                {consultation.chew_provisional_diagnosis || <em>Not recorded</em>}
              </p>
            </div>

            {/* DRUGS */}
            {consultation.drugs_prescribed && (
              <div className="card cd-section">
                <h2 className="cd-section-title">💊 Drugs / Treatment Prescribed</h2>
                <p className="cd-drugs-text">{consultation.drugs_prescribed}</p>
              </div>
            )}

          </div>

          <div className="cd-right-col">

            {/* AI DIAGNOSIS */}
            {aiDiff.length > 0 && (
              <div className="card cd-section cd-ai-section">
                <h2 className="cd-section-title">🤖 AI Differential Diagnosis</h2>
                <div className="cd-ai-list">
                  {aiDiff.slice(0, 3).map((d, i) => (
                    <div key={i} className="cd-ai-item">
                      <div className="cd-ai-item-top">
                        <span className="cd-ai-rank">#{i + 1}</span>
                        <span className="cd-ai-condition">{d.condition}</span>
                        <span className="cd-ai-conf">{d.confidence}</span>
                      </div>
                      {d.reasoning && <p className="cd-ai-reasoning">{d.reasoning}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DOCTOR REVIEW */}
            <div className="card cd-section">
              <h2 className="cd-section-title">👨‍⚕️ Doctor's Review</h2>
              {doctorReview ? (
                <div className="cd-review-block">
                  <div className="cd-review-date">{formatDate(doctorReview.created_at)}</div>
                  {doctorReview.verdict && (
                    <div className={`cd-verdict-pill ${doctorReview.verdict}`}>
                      {doctorReview.verdict === 'approved' ? '✅ Diagnosis Approved' : '✏️ Correction Sent'}
                    </div>
                  )}
                  {doctorReview.corrected_diagnosis && (
                    <div className="cd-review-field">
                      <span className="cd-review-label">Corrected Diagnosis:</span>
                      <span className="cd-review-value">{doctorReview.corrected_diagnosis}</span>
                    </div>
                  )}
                  {doctorReview.doctor_notes && (
                    <div className="cd-review-field">
                      <span className="cd-review-label">Doctor's Notes:</span>
                      <p className="cd-review-notes">{doctorReview.doctor_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="cd-pending-review">⏳ No doctor review yet. This consultation is awaiting review.</p>
              )}
            </div>

            {/* ACTIONS */}
            <div className="cd-action-buttons">
              <button
                className="btn-primary"
                onClick={() => navigate(`/chew/nutrition?patient=${consultation.patient_id}&consultation=${id}`)}
              >
                🥗 View Nutrition Plan
              </button>
              <button
                className="btn-secondary"
                onClick={() => navigate(`/chew/referral/new?patient=${consultation.patient_id}&consultation=${id}`)}
              >
                📋 Create Referral
              </button>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
