import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../hooks/useConnectivity';
import AppLayout from '../../components/AppLayout';
import { geminiVision } from '../../lib/gemini';
import { saveConsultationOffline, savePhotoOffline } from '../../utils/offlineQueue';
import './NewConsultation.css';

const SYMPTOMS_LIST = [
  'Fever', 'Headache', 'Vomiting', 'Diarrhoea', 'Body pain',
  'Cough', 'Difficulty breathing', 'Abdominal pain', 'Convulsion',
  'Rash', 'Swelling', 'Weakness'
];

export default function NewConsultation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const online = useConnectivity();

  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState(null);

  // Step 1 states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Step 2 states
  const [entryMethod, setEntryMethod] = useState(''); // 'scan' or 'manual'

  // Step 3A: Scan states
  const [photo, setPhoto] = useState(null); // base64 string
  const [photoFile, setPhotoFile] = useState(null); // File object
  const [scanning, setScanning] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [uncertainFields, setUncertainFields] = useState([]); // track null fields from OCR

  // Form states (common for 3A and 3B)
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

  // Load patient from URL if present
  const urlPatientId = searchParams.get('patient');
  useEffect(() => {
    if (urlPatientId) {
      fetchPatientById(urlPatientId);
    }
  }, [urlPatientId]);

  async function fetchPatientById(id) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        setPatient(data);
        setStep(2);
      }
    } catch (err) {
      console.error('Error fetching patient by id:', err);
    }
  }

  // Patient search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
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

  // Handle Photo selection
  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  }

  // Process OCR scanning using Gemini Vision API
  async function runOcr() {
    if (!photo) return;
    setScanning(true);
    setOcrError('');
    setUncertainFields([]);

    const base64Clean = photo.split(',')[1];

    if (!online) {
      // Save for background sync
      savePhotoOffline(patient.id, base64Clean);
      setScanning(false);
      setEntryMethod('manual'); // fallback to manual edit form directly
      setStep(3);
      alert('You are offline. The paper note will be processed once internet is restored. Please fill in the details manually.');
      return;
    }

    try {
      const prompt = `You are a medical note reader trained on Nigerian PHC consultation formats. Read the handwritten clinical note in this image carefully. Extract all clinical information and return it as a JSON object with exactly these fields: chief_complaint (string describing the main complaint), duration_days (integer number of days or null if not mentioned), associated_symptoms (array of strings listing all other symptoms mentioned), temperature (string with value and unit or null), blood_pressure (string in format systolic/diastolic or null), pulse_rate (string with value or null), respiratory_rate (string with value or null), weight (string with value and unit or null), provisional_diagnosis (string or null), investigations_ordered (array of strings or empty array), drugs_prescribed (string listing all drugs with doses or null). Handle these Nigerian PHC abbreviations: c/o means complaint of, H/O means history of, O/E means on examination, Imp means impression or provisional diagnosis, Inv means investigations, Rx means prescription or drugs. Return only the JSON object with no other text no explanation and no markdown formatting.`;
      
      const response = await geminiVision(base64Clean, 'image/jpeg', prompt);
      const cleanJson = response.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);

      // Pre-fill form from OCR results
      setFormData({
        chiefComplaint: data.chief_complaint || '',
        durationDays: data.duration_days || '',
        associatedSymptoms: data.associated_symptoms || [],
        otherSymptom: '',
        temperature: data.temperature || '',
        tempUnit: 'C',
        bloodPressure: data.blood_pressure || '',
        pulseRate: data.pulse_rate || '',
        respiratoryRate: data.respiratory_rate || '',
        weight: data.weight || '',
        provisionalDiagnosis: data.provisional_diagnosis || '',
        drugsPrescribed: data.drugs_prescribed || '',
      });

      // Track empty or null fields to highlight them in yellow
      const uncertain = [];
      if (!data.chief_complaint) uncertain.push('chiefComplaint');
      if (!data.duration_days) uncertain.push('durationDays');
      if (!data.temperature) uncertain.push('temperature');
      if (!data.blood_pressure) uncertain.push('bloodPressure');
      setUncertainFields(uncertain);

      setStep(3);
    } catch (err) {
      console.error(err);
      setOcrError('Failed to read handwritten note. Please try manual entry or retake photo.');
    } finally {
      setScanning(false);
    }
  }

  // Handle manual input values
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  // Checkbox toggle handler
  function toggleSymptom(symptom) {
    setFormData(prev => {
      const list = prev.associatedSymptoms.includes(symptom)
        ? prev.associatedSymptoms.filter(s => s !== symptom)
        : [...prev.associatedSymptoms, symptom];
      return { ...prev, associatedSymptoms: list };
    });
  }

  // Save / Submit Consultation
  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.chiefComplaint || !formData.durationDays) {
      alert('Please fill out required fields.');
      return;
    }

    const finalSymptoms = [...formData.associatedSymptoms];
    if (formData.otherSymptom.trim()) {
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
      temperature: formData.temperature ? `${formData.temperature}°${formData.tempUnit}` : null,
      blood_pressure: formData.bloodPressure || null,
      pulse_rate: formData.pulseRate ? `${formData.pulseRate} bpm` : null,
      respiratory_rate: formData.respiratoryRate ? `${formData.respiratoryRate} bpm` : null,
      weight: formData.weight ? `${formData.weight} kg` : null,
      chew_provisional_diagnosis: formData.provisionalDiagnosis || null,
      drugs_prescribed: formData.drugsPrescribed || null,
      doctor_review_status: 'pending',
      is_retrospective: false
    };

    try {
      if (online) {
        const { data, error } = await supabase
          .from('consultations')
          .insert([{ ...consultData, synced: true }])
          .select()
          .single();

        if (error) throw error;
        // Proceed to AI Diagnosis screen
        navigate(`/chew/consultation/${data.id}/diagnosis`);
      } else {
        // Save offline
        const item = saveConsultationOffline(consultationData);
        navigate(`/chew/consultation/${item.id}/diagnosis?offline=true`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit consultation. Storing offline...');
      const item = saveConsultationOffline(consultData);
      navigate(`/chew/consultation/${item.id}/diagnosis?offline=true`);
    }
  }

  function getAge(dob) {
    if (!dob) return '—';
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  return (
    <AppLayout showBack backTo="/chew/dashboard" title="New Consultation">
      <div className="consult-wizard">
        
        {/* Progress bar */}
        <div className="wizard-progress" aria-label="Consultation wizard progress">
          <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="progress-line" />
          <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className="progress-line" />
          <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>3</div>
          <div className="progress-line" />
          <div className={`step-indicator ${step >= 4 ? 'active' : ''}`}>4</div>
        </div>

        {/* STEP 1: Select Patient */}
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
                  onClick={() => {
                    setPatient(p);
                    setStep(2);
                  }}
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

        {/* STEP 2: Choose Entry Method */}
        {step === 2 && (
          <div className="wizard-step step-method-select">
            <h2 className="step-title">Choose Entry Method</h2>
            
            <div className="methods-grid">
              <button
                className="method-card card-scan"
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
                <span className="method-desc">Take a photo of your paper consultation note. We will read it automatically.</span>
              </button>

              <button
                className="method-card card-manual"
                onClick={() => {
                  setEntryMethod('manual');
                  setStep(3);
                }}
              >
                <div className="method-icon-circle">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                <span className="method-name">Type Manually</span>
                <span className="method-desc">Enter consultation details by typing.</span>
              </button>
            </div>

            {entryMethod === 'scan' && (
              <div className="camera-trigger-wrap">
                <label className="btn-primary camera-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                  Choose / Take Photo
                </label>

                {photo && (
                  <div className="photo-preview-wrap">
                    <img src={photo} alt="Captured Note" className="photo-preview" />
                    <div className="photo-actions">
                      <button className="btn-secondary" onClick={() => setPhoto(null)}>Retake</button>
                      <button className="btn-primary" onClick={runOcr} disabled={scanning}>
                        {scanning ? 'Reading...' : 'Use This Photo'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {scanning && (
              <div className="ocr-scanning-loading">
                <div className="inline-spinner" />
                <span>Reading your note. Please wait...</span>
              </div>
            )}

            {ocrError && <div className="error-alert">{ocrError}</div>}
            
            <div className="wizard-back-wrap">
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            </div>
          </div>
        )}

        {/* STEP 3: Input Form */}
        {step === 3 && (
          <div className="wizard-step step-form">
            <h2 className="step-title">Consultation Entry</h2>
            
            {!online && <div className="badge badge-offline offline-form-badge">Offline mode. Local data input.</div>}
            
            {entryMethod === 'scan' && photo && (
              <div className="scan-layout-preview">
                <details className="photo-collapsible">
                  <summary>View Paper Note Photo</summary>
                  <img src={photo} alt="Original note reference" className="collapsed-photo" />
                </details>
              </div>
            )}

            <form className="consult-form card" onSubmit={e => { e.preventDefault(); setStep(4); }}>
              <div className={`form-field ${uncertainFields.includes('chiefComplaint') ? 'uncertain' : ''}`}>
                <label className="field-label">Chief Complaint *</label>
                <input
                  name="chiefComplaint"
                  className="form-input"
                  placeholder="Main reason for visit"
                  value={formData.chiefComplaint}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={`form-field ${uncertainFields.includes('durationDays') ? 'uncertain' : ''}`}>
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
                  <div className={`form-field ${uncertainFields.includes('temperature') ? 'uncertain' : ''}`}>
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
                      <select name="tempUnit" className="form-select unit-select" value={formData.tempUnit} onChange={handleInputChange}>
                        <option value="C">°C</option>
                        <option value="F">°F</option>
                      </select>
                    </div>
                  </div>

                  <div className={`form-field ${uncertainFields.includes('bloodPressure') ? 'uncertain' : ''}`}>
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
                <label className="field-label">What do you think this is? (Provisional Diagnosis)</label>
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

        {/* STEP 4: Review and Submit */}
        {step === 4 && (
          <div className="wizard-step step-review">
            <h2 className="step-title">Review Details</h2>
            
            <div className="summary-card card">
              <div className="summary-header">
                <h3 className="patient-name">{patient?.full_name}</h3>
                <span className="patient-meta-desc">{getAge(patient?.date_of_birth)} yrs · {patient?.sex === 'M' ? 'Male' : 'Female'}</span>
              </div>

              <div className="summary-grid">
                <div className="summary-row">
                  <span className="sum-label">Chief Complaint:</span>
                  <span className="sum-val">{formData.chiefComplaint}</span>
                </div>
                <div className="summary-row">
                  <span className="sum-label">Duration:</span>
                  <span className="sum-val">{formData.durationDays} days</span>
                </div>
                <div className="summary-row">
                  <span className="sum-label">Associated Symptoms:</span>
                  <span className="sum-val">{formData.associatedSymptoms.join(', ') || 'None'}</span>
                </div>
                <div className="summary-row">
                  <span className="sum-label">Temperature:</span>
                  <span className="sum-val">{formData.temperature ? `${formData.temperature}°${formData.tempUnit}` : '—'}</span>
                </div>
                <div className="summary-row">
                  <span className="sum-label">Blood Pressure:</span>
                  <span className="sum-val">{formData.bloodPressure || '—'}</span>
                </div>
                <div className="summary-row">
                  <span className="sum-label">Pulse Rate:</span>
                  <span className="sum-val">{formData.pulseRate ? `${formData.pulseRate} bpm` : '—'}</span>
                </div>
                <div className="summary-row">
                  <span className="sum-label">Resp Rate:</span>
                  <span className="sum-val">{formData.respiratoryRate ? `${formData.respiratoryRate} bpm` : '—'}</span>
                </div>
                <div className="summary-row">
                  <span className="sum-label">Weight:</span>
                  <span className="sum-val">{formData.weight ? `${formData.weight} kg` : '—'}</span>
                </div>
                <div className="summary-row">
                  <span className="sum-label">Provisional Diagnosis:</span>
                  <span className="sum-val">{formData.provisionalDiagnosis || '—'}</span>
                </div>
                <div className="summary-row">
                  <span className="sum-label">Prescribed Drugs:</span>
                  <span className="sum-val">{formData.drugsPrescribed || '—'}</span>
                </div>
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn-secondary" onClick={() => setStep(3)}>Edit</button>
              <button className="btn-primary submit-btn" onClick={handleSubmit}>
                Submit Consultation
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
