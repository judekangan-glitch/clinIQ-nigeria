import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import './ReferralForm.css';

const REFERRAL_REASONS = [
  'Requires specialist opinion',
  'High severity / Code Red',
  'Investigation not available at PHC',
  'Surgical intervention required',
  'Obstetric emergency',
  'Paediatric intensive care needed',
  'Mental health specialist required',
  'Failed primary treatment — 2nd line needed',
  'Needs IV medication / admission',
];

const RECEIVING_FACILITIES = [
  'General Hospital Shendam',
  'General Hospital Pankshin',
  'Plateau State Specialist Hospital, Jos',
  'Federal Medical Centre, Jos',
  'ECWA Hospital, Miango',
  'Evangel Hospital, Jos',
  'St. Gerard\'s Hospital, Kaduna',
];

const URGENCY_OPTIONS = [
  { value: 'routine', label: 'Routine (within 48–72 hrs)', color: '#16A34A' },
  { value: 'urgent', label: 'Urgent (same day)', color: '#D97706' },
  { value: 'emergency', label: 'Emergency (immediate)', color: '#DC2626' },
];

export default function ReferralForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const patientId = searchParams.get('patient');
  const consultationId = searchParams.get('consultation');

  const [patient, setPatient] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    reason: '',
    customReason: '',
    receivingFacility: '',
    customFacility: '',
    urgency: 'routine',
    clinicalSummary: '',
    drugsSentWith: '',
    escortRequired: false,
  });

  useEffect(() => {
    loadData();
  }, [patientId, consultationId]);

  async function loadData() {
    setLoading(true);
    try {
      if (patientId) {
        const { data: p } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
        setPatient(p);
      }
      if (consultationId) {
        const { data: c } = await supabase.from('consultations').select('*').eq('id', consultationId).maybeSingle();
        setConsultation(c);
        if (c?.chew_provisional_diagnosis) {
          setForm(f => ({ ...f, clinicalSummary: `Diagnosis: ${c.chew_provisional_diagnosis}\nComplaint: ${c.chief_complaint || ''}` }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const reason = form.reason === 'Other' ? form.customReason : form.reason;
    const facility = form.receivingFacility === 'Other' ? form.customFacility : form.receivingFacility;

    if (!reason || !facility) {
      setError('Please fill in the referral reason and receiving facility.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        patient_id: patientId || null,
        consultation_id: consultationId || null,
        chew_id: profile?.id || null,
        phc_id: profile?.phc_id || null,
        reason,
        receiving_facility: facility,
        urgency: form.urgency,
        clinical_summary: form.clinicalSummary,
        drugs_sent_with: form.drugsSentWith,
        escort_required: form.escortRequired,
        status: 'pending',
        referred_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase.from('referrals').insert([payload]);

      if (insertErr) {
        // If table doesn't exist yet, show friendly message
        if (insertErr.code === '42P01') {
          throw new Error('The referrals table has not been created in Supabase yet. Please run the schema migration.');
        }
        throw insertErr;
      }

      setSaved(true);
      setTimeout(() => navigate(patient ? `/chew/patients/${patient.id}` : '/chew/dashboard'), 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save referral. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout showBack title="New Referral">
        <div className="rf-loading">
          <div className="inline-spinner" style={{ width: 36, height: 36 }} />
          <p>Loading patient data...</p>
        </div>
      </AppLayout>
    );
  }

  const urgencyObj = URGENCY_OPTIONS.find(u => u.value === form.urgency);

  return (
    <AppLayout showBack backTo={patient ? `/chew/patients/${patient.id}` : '/chew/dashboard'} title="New Referral">
      <div className="rf-container">

        {/* PATIENT CARD */}
        {patient && (
          <div className="card rf-patient-card">
            <div className="rf-patient-avatar">{patient.full_name?.charAt(0).toUpperCase()}</div>
            <div>
              <h2 className="rf-patient-name">{patient.full_name}</h2>
              <p className="rf-patient-sub">
                {patient.sex === 'M' ? 'Male' : 'Female'} · {patient.lga} LGA, {patient.state}
                {patient.hospital_number && ` · ${patient.hospital_number}`}
              </p>
              {consultation?.chew_provisional_diagnosis && (
                <p className="rf-dx-badge">Dx: {consultation.chew_provisional_diagnosis}</p>
              )}
            </div>
          </div>
        )}

        {saved && (
          <div className="rf-success-banner">
            ✅ Referral created successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="error-alert">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="rf-form card">
          <h2 className="rf-form-title">📋 Referral Details</h2>

          {/* URGENCY */}
          <div className="form-field">
            <span className="field-label">Urgency Level *</span>
            <div className="rf-urgency-group">
              {URGENCY_OPTIONS.map(u => (
                <button
                  key={u.value}
                  type="button"
                  className={`rf-urgency-btn ${form.urgency === u.value ? 'active' : ''}`}
                  style={form.urgency === u.value ? { borderColor: u.color, background: u.color + '15', color: u.color } : {}}
                  onClick={() => setForm({ ...form, urgency: u.value })}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* REASON */}
          <div className="form-field">
            <label className="field-label" htmlFor="ref-reason">Reason for Referral *</label>
            <select
              id="ref-reason"
              className="form-select"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              required
            >
              <option value="">Select reason...</option>
              {REFERRAL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="Other">Other (specify below)</option>
            </select>
            {form.reason === 'Other' && (
              <input
                type="text"
                className="form-input"
                style={{ marginTop: 8 }}
                placeholder="Describe reason for referral"
                value={form.customReason}
                onChange={e => setForm({ ...form, customReason: e.target.value })}
              />
            )}
          </div>

          {/* FACILITY */}
          <div className="form-field">
            <label className="field-label" htmlFor="ref-facility">Receiving Facility *</label>
            <select
              id="ref-facility"
              className="form-select"
              value={form.receivingFacility}
              onChange={e => setForm({ ...form, receivingFacility: e.target.value })}
              required
            >
              <option value="">Select facility...</option>
              {RECEIVING_FACILITIES.map(f => <option key={f} value={f}>{f}</option>)}
              <option value="Other">Other (specify below)</option>
            </select>
            {form.receivingFacility === 'Other' && (
              <input
                type="text"
                className="form-input"
                style={{ marginTop: 8 }}
                placeholder="Enter facility name"
                value={form.customFacility}
                onChange={e => setForm({ ...form, customFacility: e.target.value })}
              />
            )}
          </div>

          {/* CLINICAL SUMMARY */}
          <div className="form-field">
            <label className="field-label" htmlFor="rf-summary">Clinical Summary</label>
            <textarea
              id="rf-summary"
              className="form-textarea"
              rows={4}
              placeholder="Brief history, examination findings, diagnosis, and reason for referral..."
              value={form.clinicalSummary}
              onChange={e => setForm({ ...form, clinicalSummary: e.target.value })}
            />
          </div>

          {/* DRUGS SENT */}
          <div className="form-field">
            <label className="field-label" htmlFor="rf-drugs">Drugs / Items Sent with Patient</label>
            <input
              id="rf-drugs"
              type="text"
              className="form-input"
              placeholder="e.g. IV artesunate 120mg, ORS sachets"
              value={form.drugsSentWith}
              onChange={e => setForm({ ...form, drugsSentWith: e.target.value })}
            />
          </div>

          {/* ESCORT */}
          <div className="form-field">
            <label className="rf-escort-label">
              <input
                type="checkbox"
                checked={form.escortRequired}
                onChange={e => setForm({ ...form, escortRequired: e.target.checked })}
                className="rf-escort-check"
              />
              <span>Patient requires escort / ambulance</span>
            </label>
          </div>

          {/* PREVIEW */}
          <div className="rf-preview">
            <h3 className="rf-preview-title">Referral Preview</h3>
            <div className="rf-preview-row">
              <span>Urgency:</span>
              <span style={{ color: urgencyObj?.color, fontWeight: 700 }}>{urgencyObj?.label}</span>
            </div>
            <div className="rf-preview-row">
              <span>Destination:</span>
              <span>{(form.receivingFacility === 'Other' ? form.customFacility : form.receivingFacility) || '—'}</span>
            </div>
            <div className="rf-preview-row">
              <span>Reason:</span>
              <span>{(form.reason === 'Other' ? form.customReason : form.reason) || '—'}</span>
            </div>
          </div>

          <button type="submit" className="btn-primary rf-submit-btn" disabled={saving || saved}>
            {saving ? 'Saving Referral...' : '📤 Submit Referral'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
