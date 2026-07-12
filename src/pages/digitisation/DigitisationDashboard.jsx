import { useState, useRef } from 'react';
import AppLayout from '../../components/AppLayout';
import { useDemoRole } from '../../context/DemoRoleContext';
import { supabase } from '../../lib/supabase';
import NoteScan from '../../components/NoteScan';
import './Digitisation.css';

export default function DigitisationDashboard() {
  const { currentUser } = useDemoRole();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [scanStep, setScanStep] = useState('patient_select'); // 'patient_select' | 'scanner' | 'success'
  const [successMsg, setSuccessMsg] = useState('');

  // Patient search (debounced-like search)
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, date_of_birth, sex, hospital_number')
        .ilike('full_name', `%${query}%`)
        .limit(5);
      setSearchResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setScanStep('scanner');
  };

  const handleScanConfirm = async (extracted) => {
    try {
      // Map extracted data to consultation format
      const consultData = {
        patient_id: selectedPatient.id,
        chew_id: currentUser?.id || null,
        phc_id: currentUser?.phc_id || null,
        consultation_date: new Date().toISOString().slice(0, 10),
        chief_complaint: extracted.chief_complaint || 'Digitised Historical Record',
        duration_days: parseInt(extracted.duration_days, 10) || 1,
        associated_symptoms: extracted.associated_symptoms || [],
        temperature: extracted.temperature || null,
        blood_pressure: extracted.blood_pressure || null,
        pulse_rate: extracted.pulse_rate || null,
        respiratory_rate: extracted.respiratory_rate || null,
        weight: extracted.weight || null,
        chew_provisional_diagnosis: extracted.provisional_diagnosis || null,
        drugs_prescribed: extracted.drugs_prescribed || null,
        doctor_review_status: 'reviewed', // Pre-reviewed since it is an archive
        is_retrospective: true,
        synced: true
      };

      const { error } = await supabase.from('consultations').insert([consultData]);
      if (error) throw error;

      // Update locally logged scan counts
      const currentScanned = parseInt(localStorage.getItem('cliniq_officer_scans_today') || '0') + 1;
      localStorage.setItem('cliniq_officer_scans_today', currentScanned.toString());

      setSuccessMsg(`✓ Successfully digitised and archived record for ${selectedPatient.full_name}!`);
      setScanStep('success');
      setSelectedPatient(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error(err);
      alert('Failed to save digitised record to consultation archives. Please try again.');
    }
  };

  return (
    <AppLayout title="Digitise Records">
      <div className="digi-workspace-container">
        
        <div className="digi-header">
          <div>
            <span className="digi-eyebrow">Medical Record Digitisation Workspace</span>
            <h1 className="digi-title">Scan Paper Records</h1>
            <p className="digi-sub">Search for a patient file, then photograph and digitise their historical consultation sheets.</p>
          </div>
        </div>

        {/* ── STEP 1: PATIENT SELECTION ── */}
        {scanStep === 'patient_select' && (
          <div className="card max-width-600">
            <h2 className="panel-title-lg">1. Choose Patient Profile</h2>
            <div className="form-field">
              <label className="field-label">Search Patient Name / Phone</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search patient..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>

            {searching && (
              <div className="searching-indicator">
                <div className="inline-spinner" />
                <span>Searching archives...</span>
              </div>
            )}

            <div className="search-results-vertical">
              {searchResults.map(p => (
                <button key={p.id} className="patient-result-row" onClick={() => handleSelectPatient(p)}>
                  <div>
                    <span className="p-result-name">{p.full_name}</span>
                    <span className="p-result-meta">{p.sex === 'M' ? 'Male' : 'Female'} · {p.hospital_number || 'No hospital number'}</span>
                  </div>
                  <span className="select-row-chevron">→</span>
                </button>
              ))}
              {searchQuery && searchResults.length === 0 && !searching && (
                <div className="no-results-box">
                  <p>No patient profile found with that name.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: RUN WORKSPACE SCANNER ── */}
        {scanStep === 'scanner' && (
          <div className="digi-scanner-wrapper">
            <div className="selected-patient-banner card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="label-sm-grey">Digitising record for:</span>
                  <h3 className="patient-banner-name">{selectedPatient.full_name}</h3>
                  <span className="patient-banner-meta">🏥 Hospital No: {selectedPatient.hospital_number || '—'}</span>
                </div>
                <button className="btn-secondary btn-sm" onClick={() => setScanStep('patient_select')}>
                  Change Patient
                </button>
              </div>
            </div>

            <div className="scanner-component-wrap card">
              <NoteScan
                onConfirm={handleScanConfirm}
                onSkip={() => setScanStep('patient_select')}
              />
            </div>
          </div>
        )}

        {/* ── STEP 3: SUCCESS ── */}
        {scanStep === 'success' && (
          <div className="card text-center max-width-600">
            <span style={{ fontSize: 48 }}>✅</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '12px 0 6px', color: 'var(--color-text-primary)' }}>
              Record Digitised Successfully
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 20 }}>
              {successMsg}
            </p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setScanStep('patient_select')}>
              Digitise Another Record
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
