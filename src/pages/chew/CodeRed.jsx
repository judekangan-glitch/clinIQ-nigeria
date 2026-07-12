import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDemoRole } from '../../context/DemoRoleContext';
import { useConnectivity } from '../../hooks/useConnectivity';
import AppLayout from '../../components/AppLayout';
import './CodeRed.css';

export default function CodeRed() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { currentUser } = useDemoRole();
  const online = useConnectivity();
  const [searchParams] = useSearchParams();

  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [description, setDescription] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const initialPatientId = searchParams.get('patient');

  useEffect(() => {
    if (!initialPatientId) return;
    async function loadPatient() {
      const { data } = await supabase.from('patients').select('*').eq('id', initialPatientId).maybeSingle();
      if (data) setSelectedPatient(data);
    }
    loadPatient();
  }, [initialPatientId]);

  useEffect(() => {
    if (!patientQuery.trim()) {
      setPatientResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, date_of_birth, sex, lga')
        .or(`full_name.ilike.%${patientQuery}%,phone_number.ilike.%${patientQuery}%`)
        .limit(10);
      setPatientResults(data || []);
    }, 250);

    return () => clearTimeout(timer);
  }, [patientQuery]);

  const summaryText = useMemo(() => {
    if (!selectedPatient) return '';
    return `Patient ${selectedPatient.full_name} needs urgent attention.`;
  }, [selectedPatient]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPatient) {
      setMessage('Please select a patient first.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const payload = {
        patient_id: selectedPatient.id,
        chew_id: profile?.id || null,
        phc_id: profile?.phc_id || null,
        description: description.trim() || summaryText,
        temperature: temperature || null,
        blood_pressure: bloodPressure || null,
        pulse_rate: pulseRate || null,
        channel: online ? 'app' : 'sms_simulated',
      };

      // Best effort remote insert (in case RLS allows it)
      const { data, error } = await supabase.from('code_red_alerts').insert([payload]).select();
      if (error) {
        console.warn('Supabase code_red_alerts insert warning:', error.message);
      }

      // Always save locally to support instant role switching / demo fallback
      const localAlerts = JSON.parse(localStorage.getItem('cliniq_demo_alerts') || '[]');
      const newAlert = {
        id: data?.[0]?.id || `demo-alert-${Date.now()}`,
        patient_id: selectedPatient.id,
        chew_id: profile?.id || 'demo-chew',
        phc_id: profile?.phc_id || 'demo-phc',
        description: description.trim() || summaryText,
        temperature: temperature || null,
        blood_pressure: bloodPressure || null,
        pulse_rate: pulseRate || null,
        created_at: new Date().toISOString(),
        doctor_response_at: null,
        patient: {
          full_name: selectedPatient.full_name,
        },
        phc: {
          name: currentUser?.phc || 'Langtang North PHC',
        }
      };
      localAlerts.push(newAlert);
      localStorage.setItem('cliniq_demo_alerts', JSON.stringify(localAlerts));

      if (!online) {
        await supabase.from('simulated_sms_inbox').insert([
          {
            recipient_role: 'doctor',
            message_type: 'code_red',
            message_text: `CLINIQ CODE RED: Patient ${selectedPatient.full_name}, ${selectedPatient.sex || 'Unknown'} at ${profile?.phc_id || 'PHC'}. Emergency: ${payload.description}. Vitals: Temp ${payload.temperature || 'N/A'}, BP ${payload.blood_pressure || 'N/A'}, PR ${payload.pulse_rate || 'N/A'}. Contact CHEW immediately.`,
          },
        ]).then(({ error: smsError }) => { if (smsError) console.warn('SMS insert error:', smsError.message); });
      }

      setMessage(online ? 'Code Red alert sent to the doctor dashboard.' : 'Code Red SMS sent to the doctor inbox.');
    } catch (error) {
      console.error('Code red submission error:', error);
      setMessage('Unable to send the alert right now.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout showBack backTo="/chew/dashboard" title="Code Red Alert">
      <div className="code-red-page">
        <div className="code-red-banner">CODE RED EMERGENCY ALERT</div>
        <p className="warning-text">This will immediately alert the on-call doctor. Only use for genuine emergencies.</p>

        <form className="code-red-form" onSubmit={handleSubmit}>
          <label className="field-label">
            <span>Select patient</span>
          <input className="form-input" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder="Search by name or phone" />
            {patientResults.length > 0 && (
              <div className="search-results">
                {patientResults.map((patient) => (
                  <button key={patient.id} type="button" className="result-pill" onClick={() => { setSelectedPatient(patient); setPatientQuery(patient.full_name); }}>
                    {patient.full_name}
                  </button>
                ))}
              </div>
            )}
          </label>

          {selectedPatient && <div className="selected-patient">Selected: {selectedPatient.full_name}</div>}

          <label className="field-label">
            <span>Describe the emergency in one sentence</span>
            <textarea className="form-textarea" maxLength={140} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the emergency briefly" required />
          </label>

          <div className="vitals-row">
            <label className="field-label">
              <span>Temperature</span>
              <input className="form-input" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="39.2" />
            </label>
            <label className="field-label">
              <span>Blood Pressure</span>
              <input className="form-input" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} placeholder="100/60" />
            </label>
            <label className="field-label">
              <span>Pulse Rate</span>
              <input className="form-input" value={pulseRate} onChange={(e) => setPulseRate(e.target.value)} placeholder="110" />
            </label>
          </div>

          <button className="code-red-submit" type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'SEND CODE RED ALERT'}
          </button>

          {message && <div className="code-red-message">{message}</div>}
        </form>
      </div>
    </AppLayout>
  );
}
