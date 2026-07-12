import { useState, useRef, useEffect } from 'react';
import './NoteScan.css';

/* ─────────────────────────────────────────────────────────────────────
   NoteScan Component
   Handles: camera capture / file upload → OCR via Gemini → editable form
   ───────────────────────────────────────────────────────────────────── */

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;

const PROMPT = `You are a medical note reader trained on Nigerian PHC consultation formats. Read the handwritten clinical note in this image carefully. Extract all clinical information and return it as a JSON object with exactly these fields:
{
  "chief_complaint": "string describing the main complaint or null",
  "duration_days": "number of days as integer or null",
  "associated_symptoms": ["array", "of", "symptom", "strings"],
  "temperature": "string with value and unit or null",
  "blood_pressure": "string in systolic/diastolic format or null",
  "pulse_rate": "string with value or null",
  "respiratory_rate": "string with value or null",
  "weight": "string with value and unit or null",
  "provisional_diagnosis": "string or null",
  "investigations_ordered": ["array of investigation strings"],
  "drugs_prescribed": "string listing all drugs with doses or null"
}
Handle these Nigerian PHC abbreviations: c/o means complaint of, H/O means history of, O/E means on examination, Imp means impression or diagnosis, Inv means investigations, Rx means prescription.
Return ONLY the JSON object. No explanation. No markdown. No code blocks. Just the raw JSON.`;

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });

// ── Chip input sub-component ──────────────────────────────────────────
function ChipInput({ items, onChange, placeholder }) {
  const [inputVal, setInputVal] = useState('');

  function addChip() {
    const trimmed = inputVal.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInputVal('');
  }

  function removeChip(item) {
    onChange(items.filter((i) => i !== item));
  }

  return (
    <div className="chip-input-wrap">
      <div className="chips-list">
        {items.map((item) => (
          <span className="chip" key={item}>
            {item}
            <button
              type="button"
              className="chip-remove"
              aria-label={`Remove ${item}`}
              onClick={() => removeChip(item)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="chip-add-row">
        <input
          className="form-input chip-add-input"
          placeholder={placeholder}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addChip();
            }
          }}
        />
        <button type="button" className="btn-secondary chip-add-btn" onClick={addChip}>
          Add
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function NoteScan({ onConfirm, onSkip }) {
  // scanStep: 'choose' | 'preview' | 'processing' | 'review' | 'error' | 'offline'
  const [scanStep, setScanStep] = useState('choose');

  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [ocrError, setOcrError] = useState('');

  // Extracted / editable form fields
  const [fields, setFields] = useState({
    chief_complaint: '',
    duration_days: '',
    associated_symptoms: [],
    temperature: '',
    blood_pressure: '',
    pulse_rate: '',
    respiratory_rate: '',
    weight: '',
    provisional_diagnosis: '',
    investigations_ordered: [],
    drugs_prescribed: '',
  });
  // Which fields came back null from OCR?
  const [nullFields, setNullFields] = useState([]);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Offline pending-scan processor (runs once on mount) ─────────────
  useEffect(() => {
    async function processPending() {
      if (!navigator.onLine) return;
      const pending = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cliniq_pending_scan_')) {
          pending.push(key);
        }
      }
      for (const key of pending) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item.base64 && item.mimeType) {
            await callGemini(null, item.base64, item.mimeType);
          }
          localStorage.removeItem(key);
        } catch {
          // leave for next attempt
        }
      }
    }
    processPending();
  }, []);

  // ── Image selection handlers ─────────────────────────────────────────
  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setScanStep('preview');
  }

  function resetToChoose() {
    setImageFile(null);
    setImagePreviewUrl('');
    setOcrError('');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    setScanStep('choose');
  }

  // ── Gemini API call ──────────────────────────────────────────────────
  async function callGemini(file, existingBase64 = null, existingMime = null) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env.local file.'
      );
    }

    const base64 = existingBase64 || (await toBase64(file));
    // PDF needs to be sent as application/pdf; images as-is
    const mimeType = existingMime || file?.type || 'image/jpeg';
    const safeMime = mimeType === 'application/pdf' ? 'application/pdf' : mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: safeMime,
                  data: base64,
                },
              },
              { text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(
        errBody?.error?.message || `Gemini API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) throw new Error('Gemini returned an empty response. The image may be unreadable.');
    const cleanText = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    try {
      return JSON.parse(cleanText);
    } catch {
      throw new Error('Could not parse the extracted note. The AI response was not valid JSON.');
    }
  }

  // ── Process note handler ─────────────────────────────────────────────
  async function handleProcessNote() {
    // Offline handling
    if (!navigator.onLine) {
      try {
        const base64 = await toBase64(imageFile);
        const key = `cliniq_pending_scan_${Date.now()}`;
        localStorage.setItem(
          key,
          JSON.stringify({ base64, mimeType: imageFile.type || 'image/jpeg' })
        );
      } catch {
        // ignore storage errors
      }
      setScanStep('offline');
      return;
    }

    setScanStep('processing');
    setOcrError('');

    try {
      const extracted = await callGemini(imageFile);

      // Track null fields
      const nulled = [];
      const fieldKeys = [
        'chief_complaint', 'duration_days', 'temperature',
        'blood_pressure', 'pulse_rate', 'respiratory_rate',
        'weight', 'provisional_diagnosis', 'drugs_prescribed',
      ];
      fieldKeys.forEach((k) => {
        if (extracted[k] === null || extracted[k] === undefined || extracted[k] === '') {
          nulled.push(k);
        }
      });
      setNullFields(nulled);

      setFields({
        chief_complaint: extracted.chief_complaint || '',
        duration_days: extracted.duration_days ?? '',
        associated_symptoms: Array.isArray(extracted.associated_symptoms)
          ? extracted.associated_symptoms
          : [],
        temperature: extracted.temperature || '',
        blood_pressure: extracted.blood_pressure || '',
        pulse_rate: extracted.pulse_rate || '',
        respiratory_rate: extracted.respiratory_rate || '',
        weight: extracted.weight || '',
        provisional_diagnosis: extracted.provisional_diagnosis || '',
        investigations_ordered: Array.isArray(extracted.investigations_ordered)
          ? extracted.investigations_ordered
          : [],
        drugs_prescribed: extracted.drugs_prescribed || '',
      });

      setScanStep('review');
    } catch (err) {
      console.error('OCR error:', err);
      setOcrError(err.message || 'Could not read the note automatically. Please try again.');
      setScanStep('error');
    }
  }

  function handleSimulateScan() {
    setNullFields(['respiratory_rate', 'weight']);
    setFields({
      chief_complaint: 'Fever, headache and severe body pains',
      duration_days: 3,
      associated_symptoms: ['Fever', 'Headache', 'Body pain'],
      temperature: '38.5',
      blood_pressure: '120/80',
      pulse_rate: '78',
      respiratory_rate: '',
      weight: '',
      provisional_diagnosis: 'Uncomplicated Malaria',
      investigations_ordered: ['Malaria RDT', 'Blood Film'],
      drugs_prescribed: 'Artemether-Lumefantrine 80/480mg twice daily for 3 days',
    });
    setScanStep('review');
  }

  // ── Field change handler ─────────────────────────────────────────────
  function handleFieldChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear null highlight once user edits the field
    setNullFields((prev) => prev.filter((f) => f !== name));
  }

  function isNull(fieldName) {
    return nullFields.includes(fieldName);
  }

  // ── Confirm and submit ───────────────────────────────────────────────
  function handleConfirm(e) {
    e.preventDefault();
    onConfirm({
      chiefComplaint: fields.chief_complaint,
      durationDays: fields.duration_days,
      associatedSymptoms: fields.associated_symptoms,
      temperature: fields.temperature,
      bloodPressure: fields.blood_pressure,
      pulseRate: fields.pulse_rate,
      respiratoryRate: fields.respiratory_rate,
      weight: fields.weight,
      provisionalDiagnosis: fields.provisional_diagnosis,
      investigationsOrdered: fields.investigations_ordered,
      drugsPrescribed: fields.drugs_prescribed,
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════

  /* ── STEP 1: Choose ─────────────────────────────────────────────── */
  if (scanStep === 'choose') {
    return (
      <div className="notescan-wrap">
        <p className="notescan-hint">
          Take a photo of your paper note or upload an image/PDF file.
          ClinIQ will read it automatically.
        </p>

        <div className="notescan-choice-row">
          {/* Camera option */}
          <button
            type="button"
            className="notescan-choice-btn"
            id="take-photo-btn"
            onClick={() => cameraInputRef.current?.click()}
          >
            <span className="notescan-choice-icon">
              {/* Camera icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </span>
            <span className="notescan-choice-label">Take Photo</span>
            <span className="notescan-choice-sub">Use device camera</span>
          </button>

          {/* File upload option */}
          <button
            type="button"
            className="notescan-choice-btn"
            id="upload-file-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="notescan-choice-icon">
              {/* Upload icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            </span>
            <span className="notescan-choice-label">Upload File</span>
            <span className="notescan-choice-sub">Image or PDF</span>
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleFileSelected}
          aria-label="Take photo using camera"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={handleFileSelected}
          aria-label="Upload file from device"
        />

        <button
          type="button"
          className="btn-link notescan-skip"
          onClick={onSkip}
        >
          Skip — I'll type manually
        </button>
      </div>
    );
  }

  /* ── STEP 2: Preview ────────────────────────────────────────────── */
  if (scanStep === 'preview') {
    return (
      <div className="notescan-wrap">
        <div className="notescan-preview-box">
          <img
            src={imagePreviewUrl}
            alt="Selected note"
            className="notescan-preview-img"
          />
        </div>
        <div className="notescan-preview-actions">
          <button type="button" className="btn-secondary" onClick={resetToChoose}>
            Retake / Change
          </button>
          <button type="button" className="btn-primary" id="process-note-btn" onClick={handleProcessNote}>
            Process Note
          </button>
        </div>
      </div>
    );
  }

  /* ── STEP 3: Processing ─────────────────────────────────────────── */
  if (scanStep === 'processing') {
    return (
      <div className="notescan-wrap">
        <div className="notescan-processing-card">
          <div className="inline-spinner notescan-spinner" />
          <p className="notescan-processing-title">Reading your handwritten note...</p>
          <p className="notescan-processing-sub">This usually takes 5 to 10 seconds.</p>
        </div>
      </div>
    );
  }

  /* ── STEP 4: Review (side-by-side) ─────────────────────────────── */
  if (scanStep === 'review') {
    return (
      <div className="notescan-wrap">
        <div className="notescan-review-layout">
          {/* Left: original image */}
          <div className="notescan-original-col">
            <p className="notescan-col-label">Your Original Note</p>
            <img
              src={imagePreviewUrl}
              alt="Original consultation note"
              className="notescan-original-img"
            />
          </div>

          {/* Right: editable form */}
          <div className="notescan-form-col">
            <p className="notescan-col-label">Extracted Details — Review &amp; Edit</p>

            <form className="notescan-form" onSubmit={handleConfirm}>

              <div className={`form-field ${isNull('chief_complaint') ? 'uncertain' : ''}`}>
                <label className="field-label">Chief Complaint</label>
                <input
                  name="chief_complaint"
                  className="form-input"
                  placeholder={isNull('chief_complaint') ? 'Not found in note — please fill in' : ''}
                  value={fields.chief_complaint}
                  onChange={handleFieldChange}
                />
              </div>

              <div className={`form-field ${isNull('duration_days') ? 'uncertain' : ''}`}>
                <label className="field-label">Duration (days)</label>
                <input
                  name="duration_days"
                  type="number"
                  className="form-input"
                  placeholder={isNull('duration_days') ? 'Not found in note — please fill in' : ''}
                  value={fields.duration_days}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Associated Symptoms</label>
                <ChipInput
                  items={fields.associated_symptoms}
                  onChange={(val) => setFields((prev) => ({ ...prev, associated_symptoms: val }))}
                  placeholder="Add symptom and press Enter or Add"
                />
              </div>

              <div className={`form-field ${isNull('temperature') ? 'uncertain' : ''}`}>
                <label className="field-label">Temperature</label>
                <input
                  name="temperature"
                  className="form-input"
                  placeholder={isNull('temperature') ? 'Not found in note — please fill in' : 'e.g. 37.5°C'}
                  value={fields.temperature}
                  onChange={handleFieldChange}
                />
              </div>

              <div className={`form-field ${isNull('blood_pressure') ? 'uncertain' : ''}`}>
                <label className="field-label">Blood Pressure</label>
                <input
                  name="blood_pressure"
                  className="form-input"
                  placeholder={isNull('blood_pressure') ? 'Not found in note — please fill in' : 'e.g. 120/80'}
                  value={fields.blood_pressure}
                  onChange={handleFieldChange}
                />
              </div>

              <div className={`form-field ${isNull('pulse_rate') ? 'uncertain' : ''}`}>
                <label className="field-label">Pulse Rate</label>
                <input
                  name="pulse_rate"
                  className="form-input"
                  placeholder={isNull('pulse_rate') ? 'Not found in note — please fill in' : 'e.g. 72 bpm'}
                  value={fields.pulse_rate}
                  onChange={handleFieldChange}
                />
              </div>

              <div className={`form-field ${isNull('respiratory_rate') ? 'uncertain' : ''}`}>
                <label className="field-label">Respiratory Rate</label>
                <input
                  name="respiratory_rate"
                  className="form-input"
                  placeholder={isNull('respiratory_rate') ? 'Not found in note — please fill in' : 'e.g. 18 bpm'}
                  value={fields.respiratory_rate}
                  onChange={handleFieldChange}
                />
              </div>

              <div className={`form-field ${isNull('weight') ? 'uncertain' : ''}`}>
                <label className="field-label">Weight</label>
                <input
                  name="weight"
                  className="form-input"
                  placeholder={isNull('weight') ? 'Not found in note — please fill in' : 'e.g. 70 kg'}
                  value={fields.weight}
                  onChange={handleFieldChange}
                />
              </div>

              <div className={`form-field ${isNull('provisional_diagnosis') ? 'uncertain' : ''}`}>
                <label className="field-label">Provisional Diagnosis</label>
                <input
                  name="provisional_diagnosis"
                  className="form-input"
                  placeholder={isNull('provisional_diagnosis') ? 'Not found in note — please fill in' : ''}
                  value={fields.provisional_diagnosis}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Investigations Ordered</label>
                <ChipInput
                  items={fields.investigations_ordered}
                  onChange={(val) => setFields((prev) => ({ ...prev, investigations_ordered: val }))}
                  placeholder="Add investigation and press Enter or Add"
                />
              </div>

              <div className={`form-field ${isNull('drugs_prescribed') ? 'uncertain' : ''}`}>
                <label className="field-label">Drugs Prescribed</label>
                <textarea
                  name="drugs_prescribed"
                  className="form-textarea"
                  rows={3}
                  placeholder={isNull('drugs_prescribed') ? 'Not found in note — please fill in' : ''}
                  value={fields.drugs_prescribed}
                  onChange={handleFieldChange}
                />
              </div>

              {nullFields.length > 0 && (
                <p className="notescan-null-hint">
                  ⚠ Fields with a yellow left border were not found in the note. Please fill them in.
                </p>
              )}

              <div className="notescan-review-actions">
                <button type="button" className="btn-secondary" onClick={resetToChoose}>
                  Retake / Change
                </button>
                <button type="submit" className="btn-primary" id="confirm-submit-btn">
                  Confirm and Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── STEP 5: Error ──────────────────────────────────────────────── */
  if (scanStep === 'error') {
    return (
      <div className="notescan-wrap">
        <div className="notescan-error-card">
          <div className="notescan-error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="notescan-error-msg">{ocrError}</p>
          <div className="notescan-error-actions" style={{ flexDirection: 'column', gap: '8px', width: '100%' }}>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={resetToChoose}>
                Try Again
              </button>
              <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={onSkip}>
                Fill in Manually
              </button>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)' }}
              onClick={handleSimulateScan}
            >
              ✨ Simulate Scan (Demo Mode)
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── STEP 6: Offline ────────────────────────────────────────────── */
  if (scanStep === 'offline') {
    return (
      <div className="notescan-wrap">
        <div className="notescan-offline-card">
          <div className="notescan-offline-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
          </div>
          <p className="notescan-offline-msg">
            <strong>You are offline.</strong> Your photo has been saved. The note will be read
            automatically when you reconnect.
          </p>
          <button type="button" className="btn-primary" onClick={onSkip}>
            Fill in Manually Now
          </button>
        </div>
      </div>
    );
  }

  return null;
}
