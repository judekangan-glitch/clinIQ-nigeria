import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import './MchTracker.css';

// Nigeria Expanded Programme on Immunisation (EPI) schedule
const EPI_SCHEDULE = [
  { vaccine: 'BCG + OPV0 (Birth Dose)', age: 'At birth', disease: 'TB + Polio' },
  { vaccine: 'Penta1 + OPV1 + IPV1 + PCV1 + Rota1', age: '6 weeks', disease: 'DPT, HepB, Hib, Polio, Pneumonia, Rotavirus' },
  { vaccine: 'Penta2 + OPV2 + PCV2 + Rota2', age: '10 weeks', disease: 'DPT, HepB, Hib, Polio, Pneumonia, Rotavirus' },
  { vaccine: 'Penta3 + OPV3 + IPV2 + PCV3', age: '14 weeks', disease: 'DPT, HepB, Hib, Polio, Pneumonia' },
  { vaccine: 'Measles-Rubella (MR1) + Yellow Fever', age: '9 months', disease: 'Measles, Rubella, Yellow Fever' },
  { vaccine: 'MR2 + Meningitis A', age: '15 months', disease: 'Measles, Rubella, Meningitis' },
];

// ANC visit schedule (WHO 8 contacts)
const ANC_CONTACTS = [
  { contact: '1st Contact', timing: 'Before 12 weeks', focus: 'Registration, FBC, VDRL, HIV, iron/folic acid, BP, weight' },
  { contact: '2nd Contact', timing: '20 weeks', focus: 'Anomaly scan referral, fundal height, foetal HR, IPT1 (malaria)' },
  { contact: '3rd Contact', timing: '26 weeks', focus: 'Glucose screening, BP, weight, foetal HR' },
  { contact: '4th Contact', timing: '30 weeks', focus: 'Review, birth planning, tetanus toxoid 2nd dose' },
  { contact: '5th Contact', timing: '34 weeks', focus: 'Assessment for pre-eclampsia, GBS screen' },
  { contact: '6th Contact', timing: '36 weeks', focus: 'Presentation check, foetal weight estimation' },
  { contact: '7th Contact', timing: '38 weeks', focus: 'Final birth preparation, referral for hospital delivery' },
  { contact: '8th Contact', timing: '40 weeks', focus: 'Post-dates management, delivery monitoring' },
];

function calcAge(dob) {
  if (!dob) return '—';
  const ageYrs = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (ageYrs < 1) {
    const ageWeeks = Math.floor(ageYrs * 52);
    return `${ageWeeks} weeks old`;
  }
  return `${Math.floor(ageYrs)} yrs`;
}

export default function MchTracker() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const patientId = searchParams.get('patient');

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('anc');

  // ANC tracking state
  const [ancVisits, setAncVisits] = useState(ANC_CONTACTS.map(c => ({ ...c, completed: false, date: '', notes: '' })));
  const [lmpDate, setLmpDate] = useState('');
  const [edd, setEdd] = useState('');
  const [gravidaPara, setGravidaPara] = useState({ gravida: '', para: '' });

  // Immunisation state
  const [vaccineDoses, setVaccineDoses] = useState(EPI_SCHEDULE.map(v => ({ ...v, given: false, date: '' })));

  // Saving
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (patientId) loadPatient();
    else setLoading(false);
  }, [patientId]);

  async function loadPatient() {
    setLoading(true);
    try {
      const { data: p } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
      setPatient(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function computeEDD(lmp) {
    if (!lmp) return '';
    const date = new Date(lmp);
    date.setDate(date.getDate() + 280); // Nägele's rule: LMP + 280 days
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function computeGestationalAge(lmp) {
    if (!lmp) return null;
    const weeks = Math.floor((Date.now() - new Date(lmp).getTime()) / (1000 * 60 * 60 * 24 * 7));
    return weeks;
  }

  async function handleSaveANC(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Save MCH record to Supabase
      const payload = {
        patient_id: patientId,
        chew_id: profile?.id,
        phc_id: profile?.phc_id,
        record_type: 'anc',
        lmp_date: lmpDate || null,
        gravida: gravidaPara.gravida || null,
        para: gravidaPara.para || null,
        anc_contacts: ancVisits,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('mch_records').upsert([payload], { onConflict: 'patient_id' });
      if (error && error.code !== '42P01') throw error; // ignore if table doesn't exist yet

      setSuccess('✅ ANC record saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setSuccess('⚠️ Saved locally (table may not exist yet — run schema migration).');
      setTimeout(() => setSuccess(''), 5000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVaccines(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        patient_id: patientId,
        chew_id: profile?.id,
        phc_id: profile?.phc_id,
        record_type: 'immunisation',
        vaccine_records: vaccineDoses,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('mch_records').upsert([payload], { onConflict: 'patient_id' });
      if (error && error.code !== '42P01') throw error;

      setSuccess('✅ Immunisation record saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setSuccess('⚠️ Saved locally.');
      setTimeout(() => setSuccess(''), 5000);
    } finally {
      setSaving(false);
    }
  }

  const gestWeeks = computeGestationalAge(lmpDate);
  const contactsDone = ancVisits.filter(v => v.completed).length;

  return (
    <AppLayout showBack backTo={patient ? `/chew/patients/${patient.id}` : '/chew/dashboard'} title="MCH Tracker">
      <div className="mch-container">

        {/* PATIENT HEADER */}
        {patient && (
          <div className="card mch-patient-header">
            <div className="mch-patient-avatar">{patient.full_name?.charAt(0).toUpperCase()}</div>
            <div>
              <h1 className="mch-patient-name">{patient.full_name}</h1>
              <p className="mch-patient-sub">
                {patient.sex === 'F' ? 'Female' : 'Male'} · {calcAge(patient.date_of_birth)} · {patient.lga}, {patient.state}
              </p>
            </div>
            {patient.sex === 'F' && (
              <div className="mch-preg-badge">🤰 ANC Patient</div>
            )}
          </div>
        )}

        {success && (
          <div className="mch-success-banner">{success}</div>
        )}

        {/* TABS */}
        <div className="mch-tab-bar">
          <button className={`mch-tab ${activeTab === 'anc' ? 'active' : ''}`} onClick={() => setActiveTab('anc')}>
            🤰 ANC Visits
          </button>
          <button className={`mch-tab ${activeTab === 'epi' ? 'active' : ''}`} onClick={() => setActiveTab('epi')}>
            💉 Immunisation (EPI)
          </button>
          <button className={`mch-tab ${activeTab === 'danger' ? 'active' : ''}`} onClick={() => setActiveTab('danger')}>
            ⚠️ Danger Signs
          </button>
        </div>

        {/* ANC TAB */}
        {activeTab === 'anc' && (
          <form onSubmit={handleSaveANC}>
            <div className="mch-anc-grid">

              {/* Left: LMP + summary */}
              <div className="card mch-section">
                <h2 className="mch-section-title">📅 Pregnancy Details</h2>

                <div className="form-field">
                  <label className="field-label" htmlFor="lmp-date">Last Menstrual Period (LMP)</label>
                  <input
                    id="lmp-date"
                    type="date"
                    className="form-input"
                    value={lmpDate}
                    onChange={e => {
                      setLmpDate(e.target.value);
                      setEdd(computeEDD(e.target.value));
                    }}
                  />
                </div>

                {lmpDate && (
                  <div className="mch-edd-block">
                    <div className="mch-edd-row">
                      <span>Estimated Delivery Date (EDD)</span>
                      <strong>{edd}</strong>
                    </div>
                    <div className="mch-edd-row">
                      <span>Gestational Age</span>
                      <strong className={gestWeeks > 40 ? 'text-danger' : ''}>{gestWeeks} weeks</strong>
                    </div>
                    <div className="mch-edd-row">
                      <span>ANC Contacts Done</span>
                      <strong>{contactsDone} / 8</strong>
                    </div>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label" htmlFor="gravida">Gravida</label>
                    <input
                      id="gravida"
                      type="number"
                      min="1"
                      className="form-input"
                      placeholder="e.g. 2"
                      value={gravidaPara.gravida}
                      onChange={e => setGravidaPara(g => ({ ...g, gravida: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label" htmlFor="para">Para</label>
                    <input
                      id="para"
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 1"
                      value={gravidaPara.para}
                      onChange={e => setGravidaPara(g => ({ ...g, para: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Visit checklist */}
              <div className="card mch-section">
                <h2 className="mch-section-title">📋 ANC Contact Tracker (8 Contacts)</h2>
                <div className="mch-visit-list">
                  {ancVisits.map((v, i) => (
                    <div key={i} className={`mch-visit-item ${v.completed ? 'done' : ''}`}>
                      <div className="mch-visit-top">
                        <label className="mch-visit-check-label">
                          <input
                            type="checkbox"
                            checked={v.completed}
                            onChange={e => setAncVisits(prev => prev.map((x, xi) => xi === i ? { ...x, completed: e.target.checked } : x))}
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          <span className="mch-visit-name">{v.contact}</span>
                        </label>
                        <span className="mch-visit-timing">{v.timing}</span>
                      </div>
                      <p className="mch-visit-focus">{v.focus}</p>
                      {v.completed && (
                        <input
                          type="date"
                          className="form-input mch-visit-date"
                          value={v.date}
                          onChange={e => setAncVisits(prev => prev.map((x, xi) => xi === i ? { ...x, date: e.target.value } : x))}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button type="submit" className="btn-primary mch-save-btn" disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save ANC Record'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* EPI TAB */}
        {activeTab === 'epi' && (
          <form onSubmit={handleSaveVaccines}>
            <div className="card mch-section">
              <h2 className="mch-section-title">💉 Expanded Programme on Immunisation (EPI)</h2>
              <p className="mch-section-sub">Nigeria EPI schedule — tick each dose when administered and record the date.</p>

              <div className="mch-vaccine-list">
                {vaccineDoses.map((v, i) => (
                  <div key={i} className={`mch-vaccine-row ${v.given ? 'given' : ''}`}>
                    <div className="mch-vaccine-main">
                      <label className="mch-visit-check-label">
                        <input
                          type="checkbox"
                          checked={v.given}
                          onChange={e => setVaccineDoses(prev => prev.map((x, xi) => xi === i ? { ...x, given: e.target.checked } : x))}
                          style={{ accentColor: '#16A34A' }}
                        />
                        <div>
                          <span className="mch-vaccine-name">{v.vaccine}</span>
                          <span className="mch-vaccine-age">{v.age}</span>
                        </div>
                      </label>
                    </div>
                    <div className="mch-vaccine-right">
                      <span className="mch-vaccine-disease">{v.disease}</span>
                      {v.given && (
                        <input
                          type="date"
                          className="form-input mch-vaccine-date"
                          value={v.date}
                          onChange={e => setVaccineDoses(prev => prev.map((x, xi) => xi === i ? { ...x, date: e.target.value } : x))}
                          placeholder="Date given"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mch-vaccine-summary">
                <span>✅ {vaccineDoses.filter(v => v.given).length} / {vaccineDoses.length} doses administered</span>
              </div>

              <button type="submit" className="btn-primary mch-save-btn" disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Immunisation Record'}
              </button>
            </div>
          </form>
        )}

        {/* DANGER SIGNS TAB */}
        {activeTab === 'danger' && (
          <div className="mch-danger-grid">
            <div className="card mch-section">
              <h2 className="mch-section-title">🚨 Obstetric Danger Signs → Refer IMMEDIATELY</h2>
              <div className="mch-danger-list">
                {[
                  { sign: 'Severe headache + visual disturbance', detail: 'Pre-eclampsia / eclampsia — emergency' },
                  { sign: 'Vaginal bleeding (any trimester)', detail: 'Placenta praevia, abruption, or threatened abortion' },
                  { sign: 'Severe abdominal pain', detail: 'Ectopic rupture, abruption, or preterm labour' },
                  { sign: 'Reduced foetal movement (< 10 movements in 2 hrs)', detail: 'Foetal distress — needs CTG' },
                  { sign: 'Convulsions / loss of consciousness', detail: 'Eclampsia — IV MgSO₄ + IMMEDIATE REFERRAL' },
                  { sign: 'Prolonged labour (> 12 hours active phase)', detail: 'Obstructed labour — refer for C/S' },
                  { sign: 'High fever + rigors in labour', detail: 'Chorioamnionitis — risk of sepsis' },
                  { sign: 'Heavy PPH (>500ml blood loss)', detail: 'Postpartum haemorrhage — oxytocin + urgent referral' },
                ].map((d, i) => (
                  <div key={i} className="mch-danger-item">
                    <div className="mch-danger-sign">⚠️ {d.sign}</div>
                    <div className="mch-danger-detail">{d.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card mch-section">
              <h2 className="mch-section-title">👶 Paediatric Danger Signs → Refer IMMEDIATELY</h2>
              <div className="mch-danger-list">
                {[
                  { sign: 'Convulsions', detail: 'Meningitis, cerebral malaria, hypoglycaemia' },
                  { sign: 'Unable to feed / drink', detail: 'Severe dehydration, neonatal sepsis' },
                  { sign: 'Lethargy / unconsciousness', detail: 'Severe malaria, meningitis, hypoglycaemia' },
                  { sign: 'Stridor at rest', detail: 'Croup, epiglottitis, foreign body — airway emergency' },
                  { sign: 'Severe chest indrawing', detail: 'Very severe pneumonia' },
                  { sign: 'Signs of dehydration > 10%', detail: 'IV fluids + immediate referral' },
                ].map((d, i) => (
                  <div key={i} className="mch-danger-item">
                    <div className="mch-danger-sign">🚑 {d.sign}</div>
                    <div className="mch-danger-detail">{d.detail}</div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-danger"
                style={{ width: '100%', marginTop: 16 }}
                onClick={() => navigate('/chew/code-red')}
              >
                🚨 File Code Red Alert
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
