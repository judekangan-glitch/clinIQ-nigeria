import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AppLayout from '../../components/AppLayout';
import './MyLearning.css';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

const MODULES = [
  {
    id: 'malaria',
    title: 'Malaria Case Management',
    category: 'Clinical',
    duration: '8 min',
    color: '#DC2626',
    icon: '🦟',
    content: `Malaria is the leading cause of morbidity in Nigeria, responsible for 60% of outpatient visits at PHCs.\n\n**Recognition**: Fever (>38°C), chills, headache, vomiting, joint pain. In severe cases: altered consciousness, convulsions, severe anaemia.\n\n**Diagnosis**: Use RDT (Rapid Diagnostic Test) before treatment. Do not treat without confirmation.\n\n**Treatment (Uncomplicated)**:\n- Adults: Artemether-Lumefantrine 80/480mg: 4 tabs at 0h, 8h, 24h, 36h, 48h, 60h\n- Children: weight-based dosing per the national protocol\n- Add paracetamol 1g 8-hourly for fever\n\n**Treatment (Severe)**: Refer IMMEDIATELY with IV artesunate if available. Send Code Red.\n\n**Prevention**: Promote ITN use, indoor residual spraying, and IPT for pregnant women.`,
  },
  {
    id: 'anc',
    title: 'Antenatal Care Protocols',
    category: 'Maternal Health',
    duration: '10 min',
    color: '#0E7C7B',
    icon: '🤰',
    content: `Focused ANC (4 visits minimum, WHO now recommends 8 contacts).\n\n**Visit Schedule**:\n- 1st contact: <12 weeks — Registration, blood tests, iron/folic acid\n- 2nd: 20 weeks — Anomaly scan (refer to hospital)\n- 3rd: 26 weeks — Glucose screening\n- 4th: 30 weeks — Review, birth planning\n- 5th-8th: 34–40 weeks — Weekly monitoring\n\n**At Each Visit**: BP, weight, fundal height, foetal heart rate, urine dip, symptoms review.\n\n**Danger Signs → Refer IMMEDIATELY**: Severe headache + visual disturbance (pre-eclampsia), vaginal bleeding, severe abdominal pain, reduced foetal movement, convulsions.`,
  },
  {
    id: 'hypertension',
    title: 'Hypertension Management',
    category: 'Non-Communicable Disease',
    duration: '7 min',
    color: '#7C3AED',
    icon: '🩺',
    content: `Hypertension affects 1 in 4 adults in Nigeria and is the leading cause of stroke.\n\n**Diagnosis**: BP ≥140/90 mmHg on 2 separate visits.\n\n**Classification**:\n- Grade 1: 140–159 / 90–99\n- Grade 2: 160–179 / 100–109\n- Grade 3: ≥180 / ≥110 (EMERGENCY → Refer)\n\n**Lifestyle**: Reduce salt (<5g/day), quit smoking, exercise 30min/day, weight loss.\n\n**First-line Treatment** (for PHC CHEWs — confirm with doctor):\n- Amlodipine 5mg once daily\n- Lisinopril 5mg once daily if diabetic\n\n**Monitor**: BP at every visit. Check renal function every 6 months.`,
  },
  {
    id: 'dehydration',
    title: 'Dehydration & Oral Rehydration',
    category: 'Paediatrics',
    duration: '5 min',
    color: '#1B4F8A',
    icon: '💧',
    content: `Diarrhoeal disease kills 70,000 Nigerian children under 5 annually. Most deaths are preventable.\n\n**Assessment**:\n- Mild (<5% loss): Thirsty, normal eyes, normal skin turgor → ORS\n- Moderate (5–10%): Sunken eyes, reduced skin turgor, restless → ORS + monitor\n- Severe (>10%): Very sunken eyes, limp, unconscious → IV fluids + IMMEDIATE REFERRAL\n\n**ORS Recipe** (if packet unavailable): 1 litre clean water + 6 teaspoons sugar + ½ teaspoon salt.\n\n**Zinc**: Give zinc 20mg/day for 10 days in all children with diarrhoea — reduces severity by 25%.\n\n**Continue feeding**: Do not stop breastfeeding. Food is medicine.`,
  },
  {
    id: 'documentation',
    title: 'Clinical Documentation Best Practices',
    category: 'Professional Skills',
    duration: '6 min',
    color: '#D97706',
    icon: '📝',
    content: `Good documentation protects the patient AND the CHEW.\n\n**SOAP Format**:\n- **S**ubjective: What the patient tells you (complaints, duration, history)\n- **O**bjective: What you measure (vitals, examination findings)\n- **A**ssessment: Your provisional diagnosis\n- **P**lan: Treatment given, referral, follow-up instructions\n\n**Key Rules**:\n- Write legibly. Use ink, not pencil.\n- Date and sign every entry.\n- Never leave blank spaces — write N/A if not applicable.\n- Record all drugs given: name, dose, route, frequency, duration.\n- Document any referrals made and the reason.\n\n**In ClinIQ**: Each consultation you record is reviewed by the doctor. Accurate notes lead to accurate feedback.`,
  },
];

export default function MyLearning() {
  const { profile } = useAuth();
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(null);
  const [completedModules, setCompletedModules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cliniq_completed_modules') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetchCorrections();
  }, [profile?.id]);

  async function fetchCorrections() {
    setLoading(true);
    try {
      // Fetch doctor corrections sent to this CHEW's consultations
      const { data: consultIds } = await supabase
        .from('consultations')
        .select('id')
        .eq('doctor_review_status', 'correction_sent')
        .eq('chew_id', profile?.id || '')
        .order('consultation_date', { ascending: false })
        .limit(20);

      if (consultIds && consultIds.length > 0) {
        const ids = consultIds.map(c => c.id);
        const { data: reviews } = await supabase
          .from('doctor_reviews')
          .select('*, consultations(consultation_date, chief_complaint, chew_provisional_diagnosis, patient_id, patients(full_name))')
          .in('consultation_id', ids)
          .eq('decision', 'corrected')
          .order('created_at', { ascending: false });
        setCorrections(reviews || []);
      } else {
        // Demo: show a sample correction if no real data
        setCorrections([]);
      }
    } catch (err) {
      console.error('My Learning fetch error:', err);
      setCorrections([]);
    } finally {
      setLoading(false);
    }
  }

  function markComplete(moduleId) {
    const updated = completedModules.includes(moduleId)
      ? completedModules.filter(id => id !== moduleId)
      : [...completedModules, moduleId];
    setCompletedModules(updated);
    localStorage.setItem('cliniq_completed_modules', JSON.stringify(updated));
  }

  const completedCount = MODULES.filter(m => completedModules.includes(m.id)).length;

  return (
    <AppLayout title="My Learning" showBack backTo="/chew/dashboard">
      <div className="learning-page">

        {/* Hero */}
        <div className="learning-hero">
          <div className="learning-hero-text">
            <p className="learning-eyebrow">Clinical Education</p>
            <h1 className="learning-title">My Learning Centre</h1>
            <p className="learning-subtitle">
              Study clinical modules and review doctor feedback on your cases.
            </p>
          </div>
          <div className="learning-progress-ring">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="#E2E8F0" strokeWidth="6"/>
              <circle
                cx="36" cy="36" r="30" fill="none"
                stroke="#1B4F8A" strokeWidth="6"
                strokeDasharray={`${(completedCount / MODULES.length) * 188.5} 188.5`}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
              />
              <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: 15, fontWeight: 800, fill: '#0F172A' }}>
                {completedCount}/{MODULES.length}
              </text>
            </svg>
            <span className="ring-label">Done</span>
          </div>
        </div>

        {/* Doctor Feedback */}
        <section className="learning-section">
          <h2 className="section-title">📋 Doctor Feedback on Your Cases</h2>
          {loading ? (
            <div className="learning-loading">
              <div className="inline-spinner" />
              <span>Loading feedback...</span>
            </div>
          ) : corrections.length === 0 ? (
            <div className="feedback-empty card">
              <span style={{ fontSize: 32 }}>✅</span>
              <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: '8px 0 4px' }}>
                No corrections yet
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                When a doctor corrects one of your consultations, you'll see the learning note here.
              </p>
            </div>
          ) : (
            <div className="feedback-list">
              {corrections.map((review) => {
                const consult = review.consultations;
                const patientName = consult?.patients?.full_name || 'Unknown Patient';
                return (
                  <div className="feedback-card card" key={review.id}>
                    <div className="feedback-card-header">
                      <span className="feedback-badge">Doctor Correction</span>
                      <span className="feedback-date">{formatDate(review.created_at)}</span>
                    </div>
                    <p className="feedback-patient">Patient: <strong>{patientName}</strong></p>
                    <div className="feedback-compare-grid">
                      <div className="feedback-col">
                        <span className="feedback-col-label">Your Diagnosis</span>
                        <p className="feedback-col-value chew-val">{consult?.chew_provisional_diagnosis || '—'}</p>
                      </div>
                      <div className="feedback-col">
                        <span className="feedback-col-label">Doctor's Correction</span>
                        <p className="feedback-col-value doctor-val">{review.correct_diagnosis || '—'}</p>
                      </div>
                    </div>
                    {review.comments_for_chew && (
                      <div className="feedback-note">
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Doctor's Note:</span>
                        <p style={{ fontSize: 14, color: '#78350F', margin: '4px 0 0' }}>{review.comments_for_chew}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Clinical Modules */}
        <section className="learning-section">
          <h2 className="section-title">📚 Clinical Modules</h2>
          <div className="modules-list">
            {MODULES.map((mod) => {
              const done = completedModules.includes(mod.id);
              return (
                <div key={mod.id} className={`module-card card ${done ? 'module-done' : ''}`}>
                  <div className="module-card-main" onClick={() => setActiveModule(activeModule?.id === mod.id ? null : mod)}>
                    <span
                      className="module-icon-circle"
                      style={{ background: mod.color + '22', border: `2px solid ${mod.color}44` }}
                    >
                      <span style={{ fontSize: 22 }}>{mod.icon}</span>
                    </span>
                    <div className="module-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="module-title">{mod.title}</span>
                        {done && <span className="module-done-badge">✓ Done</span>}
                      </div>
                      <span className="module-meta">
                        <span className="module-category" style={{ color: mod.color }}>{mod.category}</span>
                        <span> · {mod.duration} read</span>
                      </span>
                    </div>
                    <svg className={`module-chevron ${activeModule?.id === mod.id ? 'open' : ''}`}
                      width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>

                  {/* Expanded content */}
                  {activeModule?.id === mod.id && (
                    <div className="module-content">
                      <div className="module-divider" />
                      {mod.content.split('\n').map((line, i) => {
                        if (!line.trim()) return <br key={i} />;
                        // Simple bold processing
                        const parts = line.split(/(\*\*[^*]+\*\*)/g);
                        return (
                          <p key={i} style={{ margin: '4px 0', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-primary)' }}>
                            {parts.map((part, j) =>
                              part.startsWith('**') && part.endsWith('**')
                                ? <strong key={j}>{part.slice(2, -2)}</strong>
                                : part
                            )}
                          </p>
                        );
                      })}
                      <button
                        className={`module-mark-btn ${done ? 'module-mark-done' : ''}`}
                        style={{ borderColor: mod.color, color: done ? '#fff' : mod.color, background: done ? mod.color : 'transparent' }}
                        onClick={() => markComplete(mod.id)}
                      >
                        {done ? '✓ Mark as Incomplete' : 'Mark as Complete'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
