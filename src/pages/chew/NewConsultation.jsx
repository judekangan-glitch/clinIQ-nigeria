import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../hooks/useConnectivity';
import AppLayout from '../../components/AppLayout';
import NoteScan from '../../components/NoteScan';
import { saveConsultationOffline } from '../../utils/offlineQueue';
import './NewConsultation.css';

const SYMPTOMS_LIST = [
  'Fever', 'Headache', 'Vomiting', 'Diarrhoea', 'Body pain',
  'Cough', 'Difficulty breathing', 'Abdominal pain', 'Convulsion',
  'Rash', 'Swelling', 'Weakness',
];

export default function NewConsultation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const online = useConnectivity();

  // Wizard step: 1 = patient select, 2 = entry method, 3 = form, 4 = review
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState(null);

  // Step 1
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Step 2
  const [entryMethod, setEntryMethod] = useState(''); // 'scan' | 'manual'

  // Form data
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    durationDays: '',
    associatedSymptoms: [],
    otherSymptom: '',
    temperature: '',
    tempUnit: 'C',
    bloodPressure: '',
    pulseRate: '',
    respiratoryRate: '',
    weight: '',
    provisionalDiagnosis: '',
    drugsPrescribed: '',
  });

  // Load patient from URL ?patient=id
  const urlPatientId = searchParams.get('patient');
  useEffect(() => {
    if (urlPatientId) fetchPatientById(urlPatientId);
  }, [urlPatientId]);

  async function fetchPatientById(id) {
    try {
      const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
      if (!error && data) { setPatient(data); setStep(2); }
    } catch (err) {
      console.error('Error fetching patient:', err);
    }
  }

  // Patient search (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from('patients')
          .select('id, full_name, date_of_birth, sex, consultations(consultation_date)')
          .ilike('full_name', `%${searchQuery}%`)
          .limit(10);

        const enriched = (data || []).map(p => {
          const dates = (p.consultations || []).map(c => c.consultation_date).sort().reverse();
          return { ...p, last_visit: dates[0] || null };
        });
        setSearchResults(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function getAge(dob) {
    if (!dob) return '—';
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  // Called by NoteScan when user confirms extracted data
  function handleScanConfirm(extracted) {
    setFormData(prev => ({
      ...prev,
      chiefComplaint: extracted.chiefComplaint || '',
      durationDays: extracted.durationDays || '',
      associatedSymptoms: extracted.associatedSymptoms || [],
      temperature: extracted.temperature || '',
      bloodPressure: extracted.bloodPressure || '',
      pulseRate: extracted.pulseRate || '',
      respiratoryRate: extracted.respiratoryRate || '',
      weight: extracted.weight || '',
      provisionalDiagnosis: extracted.provisionalDiagnosis || '',
      drugsPrescribed: extracted.drugsPrescribed || '',
    }));
    setStep(4); // jump straight to review
  }

  // Called when user skips scan to manual entry
  function handleScanSkip() {
    setEntryMethod('manual');
    setStep(3);
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function toggleSymptom(symptom) {
    setFormData(prev => {
      const list = prev.associatedSymptoms.includes(symptom)
        ? prev.associatedSymptoms.filter(s => s !== symptom)
        : [...prev.associatedSymptoms, symptom];
      return { ...prev, associatedSymptoms: list };
    });
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.chiefComplaint || !formData.durationDays) {
      alert('Please fill in the Chief Complaint and Duration fields.');
      return;
    }

    const finalSymptoms = [...formData.associatedSymptoms];
    if (formData.otherSymptom?.trim()) {
      finalSymptoms.push(formData.otherSymptom.trim());
    }

    const consultData = {
      patient_id: patient.id,
      chew_id: profile?.id,
      phc_id: profile?.phc_id,
      consultation_date: new Date().toISOString().slice(0, 10),
      chief_complaint: formData.chiefComplaint,
      duration_days: parseInt(formData.durationDays, 10),
      associated_symptoms: finalSymptoms,
      temperature: formData.temperature ? `${formData.temperature}${formData.tempUnit === 'C' ? '°C' : '°F'}` : null,
      blood_pressure: formData.bloodPressure || null,
      pulse_rate: formData.pulseRate ? `${formData.pulseRate} bpm` : null,
      respiratory_rate: formData.respiratoryRate ? `${formData.respiratoryRate} bpm` : null,
      weight: formData.weight ? `${formData.weight} kg` : null,
      chew_provisional_diagnosis: formData.provisionalDiagnosis || null,
      drugs_prescribed: formData.drugsPrescribed || null,
      doctor_review_status: 'pending',
      is_retrospective: false,
    };

    try {
      if (online) {
        const { data, error } = await supabase
          .from('consultations')
          .insert([{ ...consultData, synced: true }])
          .select()
          .single();
        if (error) throw error;
        navigate(`/chew/consultation/${data.id}/diagnosis`);
      } else {
        const item = saveConsultationOffline(consultData);
        navigate(`/chew/consultation/${item.id}/diagnosis?offline=true`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit. Saving offline...');
      const item = saveConsultationOffline(consultData);
      navigate(`/chew/consultation/${item.id}/diagnosis?offline=true`);
    }
  }

  return (
    <AppLayout showBack backTo="/chew/dashboard" title="New Consultation">
      <div className="consult-wizard">

        {/* Progress bar */}
        <div className="wizard-progress" aria-label="Consultation wizard progress">
          {[1, 2, 3, 4].map((n, i, arr) => (
            <span key={n} style={{ display: 'contents' }}>
              <div className={`step-indicator ${step >= n ? 'active' : ''}`}>{n}</div>
              {i < arr.length - 1 && <div className="progress-line" />}
            </span>
          ))}
        </div>

        {/* ── STEP 1: Select Patient ─────────────────────────────── */}
        {step === 1 && (
          <div className="wizard-step step-patient-select">
            <h2 className="step-title">Select Patient</h2>
            <div className="form-field">
              <input
                type="text"
                className="form-input patient-search-input"
                placeholder="Search patient by name or phone number"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoComplete="off"
                id="patient-search-input"
              />
            </div>

            {searching && (
              <div className="spinner-msg">
                <div className="inline-spinner" />
                <span>Searching...</span>
              </div>
            )}

            <div className="patient-results-list">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  className="patient-select-card"
                  onClick={() => { setPatient(p); setStep(2); }}
                >
                  <span className="p-select-name">{p.full_name}</span>
                  <span className="p-select-meta">{getAge(p.date_of_birth)} yrs · {p.sex === 'M' ? 'Male' : 'Female'}</span>
                  {p.last_visit && <span className="p-select-visit">Last visit: {p.last_visit}</span>}
                </button>
              ))}
            </div>

            <div className="new-patient-link-wrap">
              <button
                type="button"
                className="btn-link"
                onClick={() => navigate('/chew/patients/new?from=consultation')}
              >
                Register New Patient
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Choose Entry Method ───────────────────────── */}
        {step === 2 && (
          <div className="wizard-step step-method-select">
            <h2 className="step-title">How do you want to enter this consultation?</h2>

            {/* Not yet chosen → show two method cards */}
            {!entryMethod && (
              <>
                <div className="methods-grid">
                  <button
                    className="method-card card-scan"
                    id="choose-scan-btn"
                    onClick={() => setEntryMethod('scan')}
                  >
                    <div className="method-icon-circle">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                    <span className="method-name">Scan Handwritten Note</span>
                    <span className="method-desc">Take a photo or upload your paper note. ClinIQ reads it automatically.</span>
                  </button>

                  <button
                    className="method-card card-manual"
                    id="choose-manual-btn"
                    onClick={() => { setEntryMethod('manual'); setStep(3); }}
                  >
                    <div className="method-icon-circle">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </div>
                    <span className="method-name">Type Manually</span>
                    <span className="method-desc">Enter consultation details by typing into the form.</span>
                  </button>
                </div>

                <div className="wizard-back-wrap">
                  <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
                </div>
              </>
            )}

            {/* Scan chosen → show NoteScan component */}
            {entryMethod === 'scan' && (
              <>
                <NoteScan
                  onConfirm={handleScanConfirm}
                  onSkip={handleScanSkip}
                />
                <div className="wizard-back-wrap" style={{ marginTop: '12px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setEntryMethod('')}
                  >
                    ← Back to method selection
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Manual Form ───────────────────────────────── */}
        {step === 3 && (
          <div className="wizard-step step-form">
            <h2 className="step-title">Consultation Entry</h2>

            {!online && (
              <div className="badge badge-offline offline-form-badge">
                Offline mode. Data will be saved locally.
              </div>
            )}

            <form
              className="consult-form card"
              onSubmit={e => { e.preventDefault(); setStep(4); }}
            >
              <div className="form-field">
                <label className="field-label">Chief Complaint *</label>
                <input
                  name="chiefComplaint"
                  className="form-input"
                  placeholder="Main reason for visit"
                  value={formData.chiefComplaint}
                  onChange={handleInputChange}
                  required
                  id="chief-complaint-input"
                />
              </div>

              <div className="form-field">
                <label className="field-label">How many days? *</label>
                <input
                  name="durationDays"
                  type="number"
                  className="form-input"
                  value={formData.durationDays}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-field">
                <span className="field-label">Associated Symptoms</span>
                <div className="checkbox-grid">
                  {SYMPTOMS_LIST.map(sym => (
                    <label key={sym} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.associatedSymptoms.includes(sym)}
                        onChange={() => toggleSymptom(sym)}
                      />
                      {sym}
                    </label>
                  ))}
                </div>
                <input
                  name="otherSymptom"
                  className="form-input other-symptom-input"
                  placeholder="Other symptoms (comma separated)"
                  value={formData.otherSymptom}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-vitals-section">
                <span className="vitals-title">Vitals</span>
                <div className="vitals-row">
                  <div className="form-field">
                    <label className="field-label">Temp</label>
                    <div className="input-group">
                      <input
                        name="temperature"
                        type="number"
                        step="0.1"
                        placeholder="37"
                        className="form-input"
                        value={formData.temperature}
                        onChange={handleInputChange}
                      />
                      <select
                        name="tempUnit"
                        className="form-select unit-select"
                        value={formData.tempUnit}
                        onChange={handleInputChange}
                      >
                        <option value="C">°C</option>
                        <option value="F">°F</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">BP (systolic/diastolic)</label>
                    <input
                      name="bloodPressure"
                      placeholder="e.g. 120/80"
                      className="form-input"
                      value={formData.bloodPressure}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="vitals-row">
                  <div className="form-field">
                    <label className="field-label">Pulse (bpm)</label>
                    <input
                      name="pulseRate"
                      type="number"
                      placeholder="72"
                      className="form-input"
                      value={formData.pulseRate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Resp Rate (bpm)</label>
                    <input
                      name="respiratoryRate"
                      type="number"
                      placeholder="18"
                      className="form-input"
                      value={formData.respiratoryRate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="vitals-row single-vital">
                  <div className="form-field">
                    <label className="field-label">Weight (kg)</label>
                    <input
                      name="weight"
                      type="number"
                      placeholder="70"
                      className="form-input"
                      value={formData.weight}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">Provisional Diagnosis</label>
                <input
                  name="provisionalDiagnosis"
                  className="form-input"
                  value={formData.provisionalDiagnosis}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Drugs given (if any)</label>
                <textarea
                  name="drugsPrescribed"
                  className="form-textarea"
                  value={formData.drugsPrescribed}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>

              <div className="wizard-actions">
                <button type="button" className="btn-secondary" onClick={() => setStep(2)}>Back</button>
                <button type="submit" className="btn-primary">Continue</button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 4: Review and Submit ─────────────────────────── */}
        {step === 4 && (
          <div className="wizard-step step-review">
            <h2 className="step-title">Review Details</h2>

            <div className="summary-card card">
              <div className="summary-header">
                <h3 className="patient-name">{patient?.full_name}</h3>
                <span className="patient-meta-desc">
                  {getAge(patient?.date_of_birth)} yrs · {patient?.sex === 'M' ? 'Male' : 'Female'}
                </span>
              </div>

              <div className="summary-grid">
                {[
                  ['Chief Complaint', formData.chiefComplaint],
                  ['Duration', `${formData.durationDays} day(s)`],
                  ['Associated Symptoms', formData.associatedSymptoms.join(', ') || 'None'],
                  ['Temperature', formData.temperature ? `${formData.temperature}°${formData.tempUnit}` : '—'],
                  ['Blood Pressure', formData.bloodPressure || '—'],
                  ['Pulse Rate', formData.pulseRate ? `${formData.pulseRate} bpm` : '—'],
                  ['Resp Rate', formData.respiratoryRate ? `${formData.respiratoryRate} bpm` : '—'],
                  ['Weight', formData.weight ? `${formData.weight} kg` : '—'],
                  ['Provisional Diagnosis', formData.provisionalDiagnosis || '—'],
                  ['Prescribed Drugs', formData.drugsPrescribed || '—'],
                ].map(([label, value]) => (
                  <div className="summary-row" key={label}>
                    <span className="sum-label">{label}:</span>
                    <span className="sum-val">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="wizard-actions">
              <button
                className="btn-secondary"
                onClick={() => setStep(entryMethod === 'scan' ? 2 : 3)}
              >
                Edit
              </button>
              <button
                id="submit-consultation-btn"
                className="btn-primary submit-btn"
                onClick={handleSubmit}
              >
                Submit Consultation
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
