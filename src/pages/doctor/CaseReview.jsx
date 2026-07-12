import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AppLayout from '../../components/AppLayout';
import './CaseReview.css';

function getAge(dob) {
  if (!dob) return '—';
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CaseReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success' | 'error'
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({ diagnosis: '', note: '' });

  useEffect(() => {
    if (id) fetchReviewData();
  }, [id]);

  async function fetchReviewData() {
    setLoading(true);
    try {
      const { data: consultationData, error } = await supabase
        .from('consultations').select('*').eq('id', id).single();

      if (error || !consultationData) { setLoading(false); return; }

      const [patientRes, historyRes, labRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', consultationData.patient_id).maybeSingle(),
        supabase
          .from('consultations')
          .select('consultation_date, chew_provisional_diagnosis, drugs_prescribed')
          .eq('patient_id', consultationData.patient_id)
          .neq('id', consultationData.id)
          .order('consultation_date', { ascending: false }),
        supabase.from('lab_results').select('*').eq('consultation_id', consultationData.id)
          .order('date_of_test', { ascending: false }),
      ]);

      setConsultation(consultationData);
      setPatient(patientRes.data || null);
      setHistory(historyRes.data || []);
      setLabResults(labRes.data || []);
    } catch (err) {
      console.error('Case review error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    try {
      // Update consultation status directly — this is the source of truth
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ doctor_review_status: 'reviewed' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Best-effort log to doctor_reviews (may fail if table/RLS issue — don't block)
      await supabase.from('doctor_reviews').insert([{
        consultation_id: id,
        doctor_id: profile?.id,
        decision: 'approved',
      }]).then(({ error }) => { if (error) console.warn('doctor_reviews insert warning:', error.message); });

      setMessageType('success');
      setMessage('✓ Consultation approved. The CHEW has been notified.');
      // Refresh local consultation state to reflect reviewed status
      setConsultation(prev => prev ? { ...prev, doctor_review_status: 'reviewed' } : prev);
      // Navigate back after short delay so user sees the confirmation
      setTimeout(() => navigate('/doctor/dashboard'), 1800);
    } catch (err) {
      console.error('Approve error:', err);
      setMessageType('error');
      setMessage(`Approval failed: ${err.message || 'Unknown error'}. Please try again.`);
    }
  }

  async function handleCorrectionSubmit(e) {
    e.preventDefault();
    try {
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ doctor_review_status: 'correction_sent' })
        .eq('id', id);
      if (updateError) throw updateError;

      await supabase.from('doctor_reviews').insert([{
        consultation_id: id, doctor_id: profile?.id, decision: 'corrected',
        correct_diagnosis: correctionForm.diagnosis, comments_for_chew: correctionForm.note,
      }]).then(({ error }) => { if (error) console.warn('doctor_reviews insert warning:', error.message); });

      await supabase.from('simulated_sms_inbox').insert([{
        recipient_role: 'chew', message_type: 'doctor_correction',
        message_text: `Dr ${profile?.full_name || 'Doctor'} reviewed your consultation for ${patient?.full_name || 'patient'} on ${formatDate(consultation?.consultation_date)}. Correction: ${correctionForm.diagnosis}. Note: ${correctionForm.note}.`,
      }]).then(({ error }) => { if (error) console.warn('SMS inbox insert warning:', error.message); });

      setMessageType('success');
      setMessage('✓ Correction sent. The CHEW will see it in the learning centre.');
      setShowCorrectionForm(false);
      setConsultation(prev => prev ? { ...prev, doctor_review_status: 'correction_sent' } : prev);
      setTimeout(() => navigate('/doctor/dashboard'), 1800);
    } catch (err) {
      console.error('Correction error:', err);
      setMessageType('error');
      setMessage(`Correction failed: ${err.message || 'Unknown error'}. Please try again.`);
    }
  }

  async function handleUrgentFollowUp() {
    try {
      await supabase.from('doctor_reviews').insert([{
        consultation_id: id, doctor_id: profile?.id, decision: 'urgent_followup',
      }]).then(({ error }) => { if (error) console.warn('doctor_reviews insert warning:', error.message); });

      await supabase.from('simulated_sms_inbox').insert([{
        recipient_role: 'chew', message_type: 'general',
        message_text: `URGENT: Dr ${profile?.full_name || 'Doctor'} has flagged patient ${patient?.full_name || 'patient'} for urgent follow-up.`,
      }]).then(({ error }) => { if (error) console.warn('SMS inbox insert warning:', error.message); });

      setMessageType('success');
      setMessage('⚑ Urgent follow-up flagged. The CHEW has been alerted.');
    } catch (err) {
      console.error('Urgent follow-up error:', err);
      setMessageType('error');
      setMessage(`Could not flag follow-up: ${err.message || 'Unknown error'}.`);
    }
  }


  if (loading) {
    return (
      <AppLayout showBack backTo="/doctor/dashboard" title="Case Review">
        <div className="case-review-loading">
          <div className="inline-spinner large-spinner" />
          <p>Loading case details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!consultation) {
    return (
      <AppLayout showBack backTo="/doctor/dashboard" title="Case Review">
        <div className="error-alert">Case not found.</div>
      </AppLayout>
    );
  }

  const aiSuggestion = consultation.ai_diagnosis_suggestion || null;
  const symptoms = consultation.associated_symptoms || [];

  return (
    <AppLayout showBack backTo="/doctor/dashboard" title="Case Review">
      <div className="case-review-page">

        {message && (
          <div className={`review-feedback-banner ${messageType === 'error' ? 'error-banner' : 'success-banner'}`}>
            {message}
          </div>
        )}

        {/* Patient Demographics */}
        <section className="review-card card">
          <h2 className="review-section-title">Patient Demographics</h2>
          <div className="demographics-grid">
            <div className="demo-item">
              <span className="demo-label">Full Name</span>
              <span className="demo-val">{patient?.full_name || 'Unknown'}</span>
            </div>
            <div className="demo-item">
              <span className="demo-label">Age</span>
              <span className="demo-val">{getAge(patient?.date_of_birth)} yrs</span>
            </div>
            <div className="demo-item">
              <span className="demo-label">Sex</span>
              <span className="demo-val">{patient?.sex === 'M' ? 'Male' : patient?.sex === 'F' ? 'Female' : '—'}</span>
            </div>
            <div className="demo-item">
              <span className="demo-label">Blood Group</span>
              <span className="demo-val">{patient?.blood_group || '—'}</span>
            </div>
            <div className="demo-item">
              <span className="demo-label">LGA</span>
              <span className="demo-val">{patient?.lga || '—'}</span>
            </div>
            <div className="demo-item">
              <span className="demo-label">State</span>
              <span className="demo-val">{patient?.state || '—'}</span>
            </div>
          </div>

          <div className="alert-info-boxes">
            <div className="info-box-alert danger-box">
              <span className="info-box-label">Known Allergies</span>
              <span className="info-box-val">{patient?.known_allergies || 'None recorded'}</span>
            </div>
            <div className="info-box-alert warning-box">
              <span className="info-box-label">Chronic Conditions</span>
              <span className="info-box-val">{patient?.chronic_conditions || 'None recorded'}</span>
            </div>
          </div>
        </section>

        {/* Patient History */}
        <section className="review-card card">
          <h2 className="review-section-title">Patient Visit History</h2>
          {history.length === 0 ? (
            <p className="muted-text">No previous consultations found.</p>
          ) : (
            <div className="history-timeline">
              {history.map((entry) => (
                <div className="history-item" key={entry.consultation_date + entry.chew_provisional_diagnosis}>
                  <div className="history-dot" />
                  <div className="history-content">
                    <span className="history-date">{formatDate(entry.consultation_date)}</span>
                    <span className="history-dx">{entry.chew_provisional_diagnosis || 'No diagnosis noted'}</span>
                    <span className="history-drugs">{entry.drugs_prescribed || 'No drug notes'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Current Consultation */}
        <section className="review-card card">
          <h2 className="review-section-title">Current Consultation</h2>
          <div className="consultation-summary-grid">
            <div className="cs-item">
              <span className="cs-label">Chief Complaint</span>
              <span className="cs-val">{consultation.chief_complaint || '—'}</span>
            </div>
            <div className="cs-item">
              <span className="cs-label">Duration</span>
              <span className="cs-val">{consultation.duration_days ? `${consultation.duration_days} days` : '—'}</span>
            </div>
          </div>

          {symptoms.length > 0 && (
            <div className="symptom-chips">
              {symptoms.map(sym => <span className="chip" key={sym}>{sym}</span>)}
            </div>
          )}

          <div className="vitals-display-grid">
            {[
              ['Temperature', consultation.temperature],
              ['Blood Pressure', consultation.blood_pressure],
              ['Pulse', consultation.pulse_rate],
              ['Resp Rate', consultation.respiratory_rate],
              ['Weight', consultation.weight],
            ].map(([label, value]) => (
              <div className="vital-display-item" key={label}>
                <span className="vital-disp-label">{label}</span>
                <span className="vital-disp-val">{value || '—'}</span>
              </div>
            ))}
          </div>
        </section>

        {/* AI Diagnosis Section */}
        <section className="review-card card">
          <h2 className="review-section-title">AI Diagnosis Suggestions</h2>
          {aiSuggestion?.differentials?.length ? (
            <div className="ai-differentials-list">
              {aiSuggestion.differentials.map((diff) => (
                <div className="ai-diff-item" key={diff.rank}>
                  <div className="ai-diff-header">
                    <span className="ai-diff-rank">#{diff.rank}</span>
                    <strong className="ai-diff-condition">{diff.condition}</strong>
                    <span className="ai-diff-confidence">{diff.confidence}%</span>
                  </div>
                  <div className="ai-progress-bar">
                    <div className="ai-progress-fill" style={{ width: `${diff.confidence}%` }} />
                  </div>
                  <p className="ai-diff-reasoning">{diff.reasoning}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-text">No AI diagnosis available yet.</p>
          )}
        </section>

        {/* CHEW Provisional Diagnosis */}
        <section className="review-card card">
          <h2 className="review-section-title">CHEW Provisional Diagnosis</h2>
          <p className="chew-diagnosis-text">{consultation.chew_provisional_diagnosis || 'No provisional diagnosis recorded'}</p>
          <p className="chew-drugs-text">
            <strong>Drugs prescribed:</strong> {consultation.drugs_prescribed || 'None'}
          </p>
        </section>

        {/* Lab Results */}
        <section className="review-card card">
          <h2 className="review-section-title">Lab Results</h2>
          {labResults.length === 0 ? (
            <p className="muted-text">No lab results available.</p>
          ) : (
            <div className="lab-results-list">
              {labResults.map((result) => (
                <div className="lab-result-item" key={result.id}>
                  <div className="lab-result-header">
                    <strong>{result.test_type}</strong>
                    <span className="lab-result-date">{formatDate(result.date_of_test)}</span>
                  </div>
                  <p className="lab-result-values">{result.result_values}</p>
                  <p className="lab-interpretation">{result.ai_interpretation}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Review Action Buttons */}
        <section className="review-actions-row">
          <button id="approve-case-btn" className="btn-success review-action-btn" onClick={handleApprove}>
            ✓ Approve
          </button>
          <button id="send-correction-btn" className="btn-warning review-action-btn" onClick={() => setShowCorrectionForm(p => !p)}>
            ✎ Send Correction
          </button>
          <button id="flag-urgent-btn" className="btn-danger review-action-btn" onClick={handleUrgentFollowUp}>
            ⚑ Flag Urgent
          </button>
        </section>

        {/* Correction Form */}
        {showCorrectionForm && (
          <section className="correction-form-wrap card">
            <h3 className="correction-form-title">Submit Correction</h3>
            <form onSubmit={handleCorrectionSubmit} className="correction-form">
              <div className="form-field">
                <label className="field-label">Correct Diagnosis</label>
                <input
                  className="form-input"
                  value={correctionForm.diagnosis}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, diagnosis: e.target.value })}
                  placeholder="e.g. Malaria with anaemia"
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label">Educational Note for CHEW</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={correctionForm.note}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, note: e.target.value })}
                  placeholder="Explain the reasoning for the correction..."
                  required
                />
              </div>
              <div className="correction-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCorrectionForm(false)}>Cancel</button>
                <button type="submit" className="btn-warning">Submit Correction</button>
              </div>
            </form>
          </section>
        )}

      </div>
    </AppLayout>
  );
}
