import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { geminiText } from '../../lib/gemini';
import { useConnectivity } from '../../hooks/useConnectivity';
import AppLayout from '../../components/AppLayout';
import './LabInterpreter.css';

const TEST_TYPES = [
  'Malaria RDT',
  'Malaria Blood Film',
  'Full Blood Count (FBC)',
  'Widal Test',
  'Blood Glucose (Fasting)',
  'Blood Glucose (Random)',
  'Urinalysis',
  'Sputum AFB (TB test)',
  'Pregnancy Test',
  'Liver Function Test',
  'Kidney Function Test',
  'Blood Group and Genotype'
];

function calcAge(dob) {
  if (!dob) return '—';
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function LabInterpreter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const online = useConnectivity();

  const consultationId = searchParams.get('consultation');
  const patientId = searchParams.get('patient');

  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Form states
  const [testType, setTestType] = useState('');
  const [resultValues, setResultValues] = useState('');
  const [dateOfTest, setDateOfTest] = useState(new Date().toISOString().slice(0, 10));

  // Result states
  const [interpreting, setInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (consultationId && patientId) {
      fetchInfo();
    } else {
      setLoadingInfo(false);
    }
  }, [consultationId, patientId]);

  async function fetchInfo() {
    try {
      if (consultationId.startsWith('temp-')) {
        // Handle offline loaded consultation
        const queue = JSON.parse(localStorage.getItem('cliniq_offline_consultations') || '[]');
        const localItem = queue.find(c => c.id === consultationId);
        if (localItem) setConsultation(localItem);

        const { data: p } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();
        if (p) setPatient(p);
      } else {
        const { data: c } = await supabase
          .from('consultations')
          .select('*')
          .eq('id', consultationId)
          .single();
        if (c) setConsultation(c);

        const { data: p } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();
        if (p) setPatient(p);
      }
    } catch (err) {
      console.error('Info load error:', err);
    } finally {
      setLoadingInfo(false);
    }
  }

  async function handleGetInterpretation(e) {
    e.preventDefault();
    setError('');
    setInterpretation(null);

    if (!testType) {
      setError('Please select a test type.');
      return;
    }
    if (!resultValues.trim()) {
      setError('Please enter the result values.');
      return;
    }

    setInterpreting(true);

    const pAge = patient ? calcAge(patient.date_of_birth) : 'Unknown';
    const pSex = patient?.sex || 'Unknown';
    const complaint = consultation?.chief_complaint || 'Not specified';
    const symptoms = consultation?.associated_symptoms?.join(', ') || 'None';

    const prompt = `You are a Medical Laboratory Scientist trained in Nigerian clinical practice. Interpret the laboratory results provided below in the context of the patient's symptoms and history. Use reference ranges from Ochei's Medical Laboratory Science calibrated for Nigerian patients. Do not merely flag abnormal values. Synthesise the lab results with the clinical presentation to give an actionable interpretation. Structure your response with these exact headings on separate lines: INTERPRETATION: (what the results show), CLINICAL SIGNIFICANCE: (what this means for the patient's condition), CRITICAL VALUES: (any values requiring urgent action, or write None if none), RECOMMENDED FOLLOW-UP TESTS: (additional tests to order, or write None if none). Keep total response under 250 words. Use plain language. Patient age: ${pAge}. Sex: ${pSex}. Chief complaint: ${complaint}. Symptoms: ${symptoms}. Test type: ${testType}. Result values: ${resultValues}.`;

    try {
      let rawResult = '';
      if (online) {
        rawResult = await geminiText(prompt);
      } else {
        // Offline mockup fallback for interpreting
        rawResult = `INTERPRETATION:\nResults show potential indications for ${testType} based on values: ${resultValues}.\nCLINICAL SIGNIFICANCE:\nRequires clinical correlation with patient symptoms.\nCRITICAL VALUES:\nNone.\nRECOMMENDED FOLLOW-UP TESTS:\nRepeat test under controlled clinical environment or escalate.`;
      }

      // Parse response into headings
      const sections = {
        interpretationText: '',
        clinicalSignificance: '',
        criticalValues: '',
        recommendedFollowUp: ''
      };

      const lines = rawResult.split('\n');
      let currentSection = '';

      lines.forEach(line => {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('INTERPRETATION:')) {
          currentSection = 'interpretationText';
          sections.interpretationText += cleanLine.replace('INTERPRETATION:', '').trim() + ' ';
        } else if (cleanLine.startsWith('CLINICAL SIGNIFICANCE:')) {
          currentSection = 'clinicalSignificance';
          sections.clinicalSignificance += cleanLine.replace('CLINICAL SIGNIFICANCE:', '').trim() + ' ';
        } else if (cleanLine.startsWith('CRITICAL VALUES:')) {
          currentSection = 'criticalValues';
          sections.criticalValues += cleanLine.replace('CRITICAL VALUES:', '').trim() + ' ';
        } else if (cleanLine.startsWith('RECOMMENDED FOLLOW-UP TESTS:')) {
          currentSection = 'recommendedFollowUp';
          sections.recommendedFollowUp += cleanLine.replace('RECOMMENDED FOLLOW-UP TESTS:', '').trim() + ' ';
        } else if (currentSection && cleanLine) {
          sections[currentSection] += cleanLine + ' ';
        }
      });

      setInterpretation(sections);

      // Save to Supabase lab_results table if online
      if (online && !consultationId.startsWith('temp-')) {
        const saveResult = {
          consultation_id: consultationId,
          patient_id: patientId,
          test_type: testType,
          result_values: resultValues,
          ai_interpretation: rawResult,
          date_of_test: dateOfTest
        };
        await supabase.from('lab_results').insert([saveResult]);
      } else {
        // Save locally offline
        const localResults = JSON.parse(localStorage.getItem('cliniq_offline_lab_results') || '[]');
        localResults.push({
          consultation_id: consultationId,
          patient_id: patientId,
          test_type: testType,
          result_values: resultValues,
          ai_interpretation: rawResult,
          date_of_test: dateOfTest,
          synced: false
        });
        localStorage.setItem('cliniq_offline_lab_results', JSON.stringify(localResults));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to interpret results. Please check your network and try again.');
    } finally {
      setInterpreting(false);
    }
  }

  return (
    <AppLayout showBack backTo={`/chew/consultation/${consultationId}/diagnosis`} title="Lab Interpreter">
      <div className="lab-interpreter-page">
        <header className="lab-header">
          <h2>Lab Result Interpreter</h2>
          {patient && (
            <p className="patient-context">
              Patient: <strong>{patient.full_name}</strong> ({calcAge(patient.date_of_birth)} yrs · {patient.sex === 'M' ? 'Male' : 'Female'})
            </p>
          )}
        </header>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleGetInterpretation} className="lab-form">
          <div className="form-field">
            <label htmlFor="testType" className="field-label">Select Test Type</label>
            <select
              id="testType"
              value={testType}
              onChange={e => setTestType(e.target.value)}
            className="form-select"
              required
            >
              <option value="">-- Choose Test --</option>
              {TEST_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="resultValues" className="field-label">
              Enter result values exactly as written on the result sheet
            </label>
            <textarea
              id="resultValues"
              value={resultValues}
              onChange={e => setResultValues(e.target.value)}
              placeholder="e.g. PCV 28%, WBC 8.4 x 10^9/L, Platelets 220 x 10^9/L..."
              className="form-textarea"
              rows={4}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="dateOfTest" className="field-label">Date of Test</label>
            <input
              id="dateOfTest"
              type="date"
              value={dateOfTest}
              onChange={e => setDateOfTest(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <button
            id="get-interpretation-btn"
            type="submit"
            className="btn-primary"
            disabled={interpreting}
          >
            {interpreting ? (
              <><span className="inline-spinner" /> Interpreting...</>
            ) : 'Get Interpretation'}
          </button>
        </form>

        {interpreting && (
          <div className="interpreting-loader">
            <div className="mini-spinner" />
            <span>Analysing lab report...</span>
          </div>
        )}

        {interpretation && (
          <div className="interpretation-result-card fade-in">
            <h3 className="result-card-title">Laboratory Report Analysis</h3>
            
            <div className="result-section">
              <span className="result-heading">INTERPRETATION</span>
              <p className="result-text">{interpretation.interpretationText || 'None'}</p>
            </div>

            <div className="result-section">
              <span className="result-heading">CLINICAL SIGNIFICANCE</span>
              <p className="result-text">{interpretation.clinicalSignificance || 'None'}</p>
            </div>

            <div className="result-section">
              <span className="result-heading">CRITICAL VALUES</span>
              <p className="result-text critical-alert">{interpretation.criticalValues || 'None'}</p>
            </div>

            <div className="result-section">
              <span className="result-heading">RECOMMENDED FOLLOW-UP TESTS</span>
              <p className="result-text">{interpretation.recommendedFollowUp || 'None'}</p>
            </div>

            <button
              className="btn-back-diagnosis"
              onClick={() => navigate(`/chew/consultation/${consultationId}/diagnosis`)}
            >
              Return to Diagnosis
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
