import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ChewLayout from './ChewLayout';
import './PatientProfile.css';

function calcAge(dob) {
  if (!dob) return '—';
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function statusBadge(status) {
  const map = {
    pending: { label: 'Pending Review', cls: 'badge-pending' },
    reviewed: { label: 'Reviewed', cls: 'badge-reviewed' },
    correction_sent: { label: 'Correction Received', cls: 'badge-correction' },
  };
  return map[status] || { label: status, cls: 'badge-pending' };
}

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatient();
  }, [id]);

  async function fetchPatient() {
    setLoading(true);
    try {
      const { data: p } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();
      setPatient(p);

      const { data: c } = await supabase
        .from('consultations')
        .select('id, consultation_date, chief_complaint, chew_provisional_diagnosis, drugs_prescribed, doctor_review_status')
        .eq('patient_id', id)
        .order('consultation_date', { ascending: false });
      setConsultations(c || []);
    } catch (err) {
      console.error('Patient profile error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ChewLayout showBack title="Patient Profile">
        <div className="profile-loading">
          <div className="spinner-lg" />
          <p>Loading patient record...</p>
        </div>
      </ChewLayout>
    );
  }

  if (!patient) {
    return (
      <ChewLayout showBack title="Patient Profile">
        <div className="profile-not-found">
          <p>Patient not found.</p>
          <button onClick={() => navigate('/chew/patients')}>Back to Search</button>
        </div>
      </ChewLayout>
    );
  }

  const age = calcAge(patient.date_of_birth);
  const sexLabel = patient.sex === 'M' ? 'Male' : patient.sex === 'F' ? 'Female' : '—';

  return (
    <ChewLayout showBack backTo="/chew/patients" title="Patient Profile">
      <div className="profile-page">

        {/* Patient header */}
        <div className="profile-hero">
          <div className="profile-avatar-lg">
            {patient.full_name.charAt(0).toUpperCase()}
          </div>
          <h1 className="profile-name">{patient.full_name}</h1>
          <div className="profile-chips">
            <span className="profile-chip">{age} yrs</span>
            <span className="profile-chip">{sexLabel}</span>
            {patient.blood_group && (
              <span className="profile-chip blood-chip">{patient.blood_group}</span>
            )}
            {patient.lga && <span className="profile-chip">{patient.lga}</span>}
            {patient.food_zone && (
              <span className="profile-chip zone-chip">
                {patient.food_zone.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            )}
          </div>
        </div>

        <div className="profile-body">

          {/* Allergies */}
          <div className={`info-box ${patient.known_allergies && patient.known_allergies !== 'None' ? 'allergy-box' : 'none-box'}`}>
            <div className="info-box-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Known Allergies</span>
            </div>
            <p className="info-box-content">
              {patient.known_allergies || 'None recorded'}
            </p>
          </div>

          {/* Chronic conditions */}
          <div className={`info-box ${patient.chronic_conditions && patient.chronic_conditions !== 'None' ? 'chronic-box' : 'none-box'}`}>
            <div className="info-box-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span>Chronic Conditions</span>
            </div>
            <p className="info-box-content">
              {patient.chronic_conditions || 'None recorded'}
            </p>
          </div>

          {/* Contact info */}
          {patient.phone_number && (
            <div className="contact-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.27 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>{patient.phone_number}</span>
            </div>
          )}

          {/* Consultation history */}
          <div className="consult-history">
            <h2 className="section-heading">Consultation History</h2>

            {consultations.length === 0 ? (
              <div className="empty-history">
                <p>No consultations recorded yet.</p>
              </div>
            ) : (
              <div className="consult-list">
                {consultations.map((c, i) => {
                  const badge = statusBadge(c.doctor_review_status);
                  return (
                    <button
                      key={c.id}
                      className="consult-history-item"
                      onClick={() => navigate(`/chew/consultation/${c.id}`)}
                    >
                      <div className="consult-timeline-dot" />
                      {i < consultations.length - 1 && <div className="consult-timeline-line" />}
                      <div className="consult-history-body">
                        <div className="consult-history-top">
                          <span className="consult-history-date">
                            {new Date(c.consultation_date).toLocaleDateString('en-NG', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                          <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        </div>
                        <p className="consult-history-complaint">{c.chief_complaint}</p>
                        {c.chew_provisional_diagnosis && (
                          <p className="consult-history-dx">
                            Dx: <strong>{c.chew_provisional_diagnosis}</strong>
                          </p>
                        )}
                        {c.drugs_prescribed && (
                          <p className="consult-history-rx">
                            Rx: {c.drugs_prescribed}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Fixed action button */}
        <div className="profile-action-bar">
          <button
            id="new-consultation-for-patient"
            className="new-consult-btn"
            onClick={() => navigate(`/chew/consultation/new?patient=${id}`)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            New Consultation for This Patient
          </button>
        </div>
      </div>
    </ChewLayout>
  );
}
