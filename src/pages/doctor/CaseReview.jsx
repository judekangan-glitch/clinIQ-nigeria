import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ConnectivityBanner from '../../components/ConnectivityBanner';
import './CaseReview.css';

function getAge(dob) {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
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
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({ diagnosis: '', note: '' });

  useEffect(() => {
    if (id) {
      fetchReviewData();
    }
  }, [id]);

  async function fetchReviewData() {
    setLoading(true);
    try {
      const { data: consultationData, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !consultationData) {
        setLoading(false);
        return;
      }

      const [patientRes, historyRes, labRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', consultationData.patient_id).maybeSingle(),
        supabase
          .from('consultations')
          .select('consultation_date, chew_provisional_diagnosis, drugs_prescribed')
          .eq('patient_id', consultationData.patient_id)
          .neq('id', consultationData.id)
          .order('consultation_date', { ascending: false }),
        supabase.from('lab_results').select('*').eq('consultation_id', consultationData.id).order('date_of_test', { ascending: false }),
      ]);

      setConsultation(consultationData);
      setPatient(patientRes.data || null);
      setHistory(historyRes.data || []);
      setLabResults(labRes.data || []);
    } catch (error) {
      console.error('Case review error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    try {
      await supabase.from('doctor_reviews').insert([{ consultation_id: id, doctor_id: profile?.id, decision: 'approved' }]);
      await supabase.from('consultations').update({ doctor_review_status: 'reviewed' }).eq('id', id);
      setMessage('Approved. The CHEW has been notified.');
    } catch (error) {
      console.error('Approve error:', error);
      setMessage('Approval could not be saved.');
    }
  }

  async function handleCorrectionSubmit(e) {
    e.preventDefault();
    try {
      await supabase.from('doctor_reviews').insert([
        {
          consultation_id: id,
          doctor_id: profile?.id,
          decision: 'corrected',
          correct_diagnosis: correctionForm.diagnosis,
          comments_for_chew: correctionForm.note,
        },
      ]);
      await supabase.from('consultations').update({ doctor_review_status: 'correction_sent' }).eq('id', id);
      await supabase.from('simulated_sms_inbox').insert([
        {
          recipient_role: 'chew',
          message_type: 'doctor_correction',
          message_text: `Dr ${profile?.full_name || 'Doctor'} has reviewed your consultation for ${patient?.full_name || 'the patient'} on ${formatDate(consultation?.consultation_date)}. Correction: ${correctionForm.diagnosis}. Note: ${correctionForm.note}. Please review in your Learning section.`,
        },
      ]);
      setMessage('Correction sent. The CHEW will see it in the learning centre.');
      setShowCorrectionForm(false);
    } catch (error) {
      console.error('Correction error:', error);
      setMessage('Correction could not be saved.');
    }
  }

  async function handleUrgentFollowUp() {
    try {
      await supabase.from('doctor_reviews').insert([{ consultation_id: id, doctor_id: profile?.id, decision: 'urgent_followup' }]);
      await supabase.from('simulated_sms_inbox').insert([
        {
          recipient_role: 'chew',
          message_type: 'general',
          message_text: `URGENT: Dr ${profile?.full_name || 'Doctor'} has flagged patient ${patient?.full_name || 'the patient'} at ${patient?.lga || 'PHC'} for urgent follow-up. Please check immediately.`,
        },
      ]);
      setMessage('Urgent follow-up flagged.');
    } catch (error) {
      console.error('Urgent follow-up error:', error);
      setMessage('The urgent follow-up could not be saved.');
    }
  }

  if (loading) {
    return <div className="case-review-page"><ConnectivityBanner /><div className="loading-card">Loading review...</div></div>;
  }

  if (!consultation) {
    return <div className="case-review-page"><ConnectivityBanner /><div className="loading-card">Case not found.</div></div>;
  }

  const aiSuggestion = consultation.ai_diagnosis_suggestion || null;
  const symptoms = consultation.associated_symptoms || [];

  return (
    <div className="case-review-page">
      <ConnectivityBanner />
      <button className="back-btn" onClick={() => navigate('/doctor/dashboard')}>
        ← Back to doctor dashboard
      </button>

      {message && <div className="review-success">{message}</div>}

      <section className="review-card">
        <h2>Patient Demographics</h2>
        <div className="demographics-grid">
          <div><strong>Full name</strong><p>{patient?.full_name || 'Unknown'}</p></div>
          <div><strong>Age</strong><p>{getAge(patient?.date_of_birth)} yrs</p></div>
          <div><strong>Sex</strong><p>{patient?.sex || '—'}</p></div>
          <div><strong>Blood group</strong><p>{patient?.blood_group || '—'}</p></div>
          <div><strong>LGA</strong><p>{patient?.lga || '—'}</p></div>
          <div><strong>State</strong><p>{patient?.state || '—'}</p></div>
        </div>
        <div className="info-boxes">
          <div className="info-box red">Known Allergies<br />{patient?.known_allergies || 'None recorded'}</div>
          <div className="info-box orange">Chronic Conditions<br />{patient?.chronic_conditions || 'None recorded'}</div>
        </div>
      </section>

      <section className="review-card">
        <h2>Patient History</h2>
        <div className="timeline-list">
          {history.length === 0 ? <p>No previous consultations found.</p> : history.map((entry) => (
            <div className="timeline-item" key={entry.consultation_date + entry.chew_provisional_diagnosis}>
              <strong>{formatDate(entry.consultation_date)}</strong>
              <p>{entry.chew_provisional_diagnosis || 'No diagnosis noted'}</p>
              <small>{entry.drugs_prescribed || 'No drug notes'}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="review-card">
        <h2>Current Consultation</h2>
        <div className="current-consultation-grid">
          <div><strong>Chief complaint</strong><p>{consultation.chief_complaint || '—'}</p></div>
          <div><strong>Duration</strong><p>{consultation.duration_days ? `${consultation.duration_days} days` : '—'}</p></div>
        </div>
        <div className="chip-row">
          {(symptoms || []).map((symptom) => <span className="chip" key={symptom}>{symptom}</span>)}
        </div>
        <div className="vitals-grid">
          <div><strong>Temperature</strong><p>{consultation.temperature || '—'}</p></div>
          <div><strong>Blood Pressure</strong><p>{consultation.blood_pressure || '—'}</p></div>
          <div><strong>Pulse</strong><p>{consultation.pulse_rate || '—'}</p></div>
          <div><strong>Respiratory Rate</strong><p>{consultation.respiratory_rate || '—'}</p></div>
          <div><strong>Weight</strong><p>{consultation.weight || '—'}</p></div>
          <div><strong>State</strong><p>{patient?.state || '—'}</p></div>
        </div>
      </section>

      <section className="review-card">
        <h2>AI Diagnosis</h2>
        {aiSuggestion?.differentials?.length ? (
          aiSuggestion.differentials.map((diff) => (
            <div className="diagnosis-card" key={diff.rank}>
              <div className="diagnosis-header">
                <strong>{diff.condition}</strong>
                <span>{diff.confidence}% confidence</span>
              </div>
              <div className="progress-bar"><div style={{ width: `${diff.confidence}%` }} /></div>
              <p>{diff.reasoning}</p>
            </div>
          ))
        ) : (
          <p>No AI diagnosis available yet.</p>
        )}
      </section>

      <section className="review-card">
        <h2>CHEW Provisional Diagnosis</h2>
        <p>{consultation.chew_provisional_diagnosis || 'No provisional diagnosis recorded'}</p>
        <p><strong>Drugs prescribed:</strong> {consultation.drugs_prescribed || 'None'}</p>
      </section>

      <section className="review-card">
        <h2>Lab Results</h2>
        {labResults.length === 0 ? <p>No lab results available.</p> : labResults.map((result) => (
          <div className="lab-card" key={result.id}>
            <div className="diagnosis-header">
              <strong>{result.test_type}</strong>
              <span>{formatDate(result.date_of_test)}</span>
            </div>
            <p>{result.result_values}</p>
            <small>{result.ai_interpretation}</small>
          </div>
        ))}
      </section>

      <section className="review-actions">
        <button className="btn-success" onClick={handleApprove}>Approve</button>
        <button className="btn-warning" onClick={() => setShowCorrectionForm(prev => !prev)}>Send Correction</button>
        <button className="btn-danger" onClick={handleUrgentFollowUp}>Flag Urgent Follow-up</button>
      </section>

      {showCorrectionForm && (
        <form className="correction-form" onSubmit={handleCorrectionSubmit}>
          <label>
            <span>Correct Diagnosis</span>
            <input value={correctionForm.diagnosis} onChange={(e) => setCorrectionForm({ ...correctionForm, diagnosis: e.target.value })} required />
          </label>
          <label>
            <span>Educational note for the CHEW</span>
            <textarea rows="4" value={correctionForm.note} onChange={(e) => setCorrectionForm({ ...correctionForm, note: e.target.value })} required />
          </label>
          <button className="btn-warning" type="submit">Submit Correction</button>
        </form>
      )}
    </div>
  );
}
