import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { geminiText } from '../../lib/gemini';
import { useConnectivity } from '../../hooks/useConnectivity';
import ChewLayout from './ChewLayout';
import decisionTree from '../../data/decisionTree.json';
import './AiDiagnosis.css';

function calcAge(dob) {
  if (!dob) return '—';
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function parseBpHigh(bpStr) {
  if (!bpStr) return false;
  const match = bpStr.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    const sys = parseInt(match[1], 10);
    const dia = parseInt(match[2], 10);
    return sys >= 140 || dia >= 90;
  }
  return false;
}

export default function AiDiagnosis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const online = useConnectivity();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null);
  
  const [diagnosisData, setDiagnosisData] = useState(null);
  const [orderedInvestigations, setOrderedInvestigations] = useState([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    fetchConsultation();
  }, [id]);

  async function fetchConsultation() {
    setLoading(true);
    try {
      // Check if it's an offline consultation from temp ID
      if (id.startsWith('temp-') || searchParams.get('offline') === 'true') {
        setIsOfflineMode(true);
        // Load from localStorage queue
        const queue = JSON.parse(localStorage.getItem('cliniq_offline_consultations') || '[]');
        const localItem = queue.find(c => c.id === id);
        if (localItem) {
          setConsultation(localItem);
          // Fetch patient info
          const { data: p } = await supabase
            .from('patients')
            .select('*')
            .eq('id', localItem.patient_id)
            .single();
          setPatient(p);
          runOfflineDiagnostics(localItem, p);
        } else {
          setError('Consultation not found.');
          setLoading(false);
        }
        return;
      }

      // Online Supabase flow
      const { data: c, error: cErr } = await supabase
        .from('consultations')
        .select('*, patients(*)')
        .eq('id', id)
        .single();

      if (cErr || !c) throw new Error('Failed to load consultation.');
      setConsultation(c);
      setPatient(c.patients);

      // Check if diagnosis suggestion already exists in DB
      if (c.ai_diagnosis_suggestion) {
        setDiagnosisData(c.ai_diagnosis_suggestion);
        setLoading(false);
      } else {
        if (online) {
          runOnlineDiagnostics(c, c.patients);
        } else {
          setIsOfflineMode(true);
          runOfflineDiagnostics(c, c.patients);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading diagnostics.');
      setLoading(false);
    }
  }

  // Fallback offline decision tree rules matcher
  function runOfflineDiagnostics(cData, pData) {
    const pAge = calcAge(pData?.date_of_birth);
    const pSex = pData?.sex || 'M';
    const symptoms = (cData.associated_symptoms || []).map(s => s.toLowerCase());
    if (cData.chief_complaint) {
      symptoms.push(cData.chief_complaint.toLowerCase());
    }

    const isHigh = parseBpHigh(cData.blood_pressure);

    const matches = [];
    decisionTree.rules.forEach(rule => {
      // Count matching trigger symptoms
      let matchCount = 0;
      rule.trigger_symptoms.forEach(ts => {
        if (symptoms.some(s => s.includes(ts))) {
          matchCount++;
        }
      });

      let bpMatch = true;
      if (rule.blood_pressure_high && !isHigh) {
        bpMatch = false;
      }

      if (matchCount >= rule.min_match && bpMatch) {
        matches.push({
          condition: rule.condition.replace(/\b\w/g, l => l.toUpperCase()),
          confidence: rule.confidence,
          reasoning: `Matched symptoms: ${rule.trigger_symptoms.filter(ts => symptoms.some(s => s.includes(ts))).join(', ')}`,
          guidance: rule.guidance
        });
      }
    });

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    const differentials = matches.slice(0, 3).map((m, idx) => ({
      rank: idx + 1,
      condition: m.condition,
      confidence: m.confidence,
      reasoning: m.reasoning
    }));

    const mockData = {
      differentials,
      investigations: differentials.length > 0 ? ["Malaria RDT", "Urinalysis", "Full Blood Count"] : ["Refer to medical doctor"],
      treatment_guidance: differentials.length > 0 ? matches[0].guidance : "Assess vitals, support hydration, and consult doctor.",
      red_flags: isHigh ? ["Severe hypertension risk", "Severe headache"] : ["Uncontrolled fever for more than 7 days"]
    };

    setDiagnosisData(mockData);
    setLoading(false);
  }

  // Online Gemini API request
  async function runOnlineDiagnostics(cData, pData) {
    const pAge = calcAge(pData?.date_of_birth);
    const pSex = pData?.sex || 'F';
    const symptomsText = (cData.associated_symptoms || []).join(', ');

    const prompt = `You are a clinical decision support AI for Nigerian primary healthcare workers. A CHEW has submitted a patient consultation. Analyse the clinical data and provide a differential diagnosis. IMPORTANT RULES: Always prioritise Nigerian endemic diseases. The top 5 most common PHC conditions in Nigeria are malaria, typhoid fever, respiratory tract infection, hypertension, and diarrhoeal disease. Also consider: tuberculosis, sickle cell crisis, diabetes mellitus, urinary tract infection, skin infections, anaemia, and meningitis. Use the Nigerian Federal Ministry of Health Standard Treatment Guidelines as your reference. Return ONLY a valid JSON object with no other text using exactly this structure: { "differentials": [ { "rank": 1, "condition": "condition name", "confidence": 78, "reasoning": "one sentence explaining why" }, { "rank": 2, "condition": "condition name", "confidence": 15, "reasoning": "one sentence explaining why" }, { "rank": 3, "condition": "condition name", "confidence": 7, "reasoning": "one sentence explaining why" } ], "investigations": [ "investigation 1", "investigation 2" ], "treatment_guidance": "clear plain language first-line treatment for the top diagnosis", "red_flags": [ "any warning signs that would require immediate escalation" ] }. Patient data: Chief complaint: ${cData.chief_complaint}. Duration: ${cData.duration_days} days. Associated symptoms: ${symptomsText}. Temperature: ${cData.temperature || 'Not recorded'}. Blood pressure: ${cData.blood_pressure || 'Not recorded'}. Pulse rate: ${cData.pulse_rate || 'Not recorded'}. Age: ${pAge}. Sex: ${pSex}. Known chronic conditions: ${pData?.chronic_conditions || 'None'}. Known allergies: ${pData?.known_allergies || 'None'}.`;

    try {
      const response = await geminiText(prompt);
      const cleanJson = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Save suggestion in Supabase
      await supabase
        .from('consultations')
        .update({ ai_diagnosis_suggestion: parsed })
        .eq('id', cData.id);

      setDiagnosisData(parsed);
    } catch (err) {
      console.error(err);
      setError('AI Analysis failed. Running offline decision matching instead.');
      runOfflineDiagnostics(cData, pData);
    } finally {
      setLoading(false);
    }
  }

  // Ticking investigation saves selection back to the DB row or state
  async function handleInvestigationToggle(inv) {
    const updated = orderedInvestigations.includes(inv)
      ? orderedInvestigations.filter(item => item !== inv)
      : [...orderedInvestigations, inv];
    setOrderedInvestigations(updated);

    // Save ordered investigations updates if online and ID is valid
    if (online && !id.startsWith('temp-')) {
      try {
        await supabase
          .from('consultations')
          .update({
            ai_diagnosis_suggestion: {
              ...diagnosisData,
              ordered_investigations: updated
            }
          })
          .eq('id', id);
      } catch (err) {
        console.error('Failed to save ordered investigations:', err);
      }
    }
  }

  if (loading) {
    return (
      <ChewLayout showBack title="AI Analysis">
        <div className="ai-diagnosis-loading">
          <div className="spinner-pulsing" />
          <p className="loading-text">Analysing symptoms with AI. Please wait...</p>
        </div>
      </ChewLayout>
    );
  }

  const pAge = calcAge(patient?.date_of_birth);

  return (
    <ChewLayout showBack backTo="/chew/dashboard" title="AI Diagnosis Results">
      <div className="ai-diagnosis-page">
        {isOfflineMode && (
          <div className="offline-warning-banner">
            Offline mode. Simplified diagnosis shown. Full AI analysis will run automatically when you reconnect.
          </div>
        )}

        <header className="patient-diagnosis-header">
          <h1 className="p-header-title">{patient?.full_name}</h1>
          <p className="p-header-subtitle">{pAge} yrs · {patient?.sex === 'M' ? 'Male' : 'Female'} · AI Diagnosis Analysis</p>
        </header>

        {error && <div className="ocr-error-banner">{error}</div>}

        {diagnosisData && (
          <div className="diagnosis-results-wrap">
            
            {/* Differential Diagnosis section */}
            <section className="differentials-section">
              <h2 className="section-title">Differential Diagnosis</h2>
              <div className="differentials-list">
                {diagnosisData.differentials?.map((diff, index) => {
                  const isTop = index === 0;
                  return (
                    <div key={diff.rank} className={`diff-card ${isTop ? 'top-diff' : ''}`}>
                      <div className="diff-card-header">
                        <span className="diff-rank">#{diff.rank}</span>
                        <h3 className="diff-condition">{diff.condition}</h3>
                        <span className="diff-confidence">{diff.confidence}% confidence</span>
                      </div>
                      <div className="confidence-progress-bar">
                        <div className="progress-fill" style={{ width: `${diff.confidence}%` }} />
                      </div>
                      <p className="diff-reasoning">{diff.reasoning}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Recommended Investigations checklist */}
            <section className="investigations-section">
              <h2 className="section-title">Recommended Investigations</h2>
              <div className="investigations-list">
                {diagnosisData.investigations?.map(inv => (
                  <label key={inv} className="investigation-checkbox-row">
                    <input
                      type="checkbox"
                      checked={orderedInvestigations.includes(inv)}
                      onChange={() => handleInvestigationToggle(inv)}
                    />
                    <span>{inv}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Treatment Guidance section */}
            <section className="treatment-section">
              <h2 className="section-title">Treatment Guidance</h2>
              <div className="treatment-box">
                <p>{diagnosisData.treatment_guidance}</p>
              </div>
            </section>

            {/* Red Flags warning box */}
            {diagnosisData.red_flags && diagnosisData.red_flags.length > 0 && (
              <section className="red-flags-section">
                <div className="red-flags-box">
                  <div className="box-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>ESCALATION WARNING</span>
                  </div>
                  <ul className="red-flags-list">
                    {diagnosisData.red_flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
                
                {/* Emergency Code Red Activation Button */}
                <button
                  id="activate-code-red-btn"
                  className="code-red-btn"
                  onClick={() => navigate(`/chew/code-red?patient=${patient?.id}&consultation=${id}`)}
                >
                  SEND CODE RED ALERT
                </button>
              </section>
            )}

            {/* Bottom screen actions */}
            <div className="diagnosis-bottom-actions">
              <button
                id="view-nutrition-advice-btn"
                className="btn-secondary"
                onClick={() => navigate(`/chew/nutrition?consultation=${id}&patient=${patient?.id}`)}
              >
                View Nutrition Advice
              </button>
              <button
                id="add-lab-results-btn"
                className="btn-primary"
                onClick={() => navigate(`/chew/lab-interpreter?consultation=${id}&patient=${patient?.id}`)}
              >
                Add Lab Results
              </button>
            </div>
          </div>
        )}
      </div>
    </ChewLayout>
  );
}
