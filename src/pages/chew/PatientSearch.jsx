import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AppLayout from '../../components/AppLayout';
import './PatientSearch.css';

function calcAge(dob) {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function PatientSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await supabase
        .from('patients')
        .select(`
          id, full_name, hospital_number, date_of_birth, sex, lga, phone_number,
          consultations (consultation_date)
        `)
        .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,hospital_number.ilike.%${q}%,lga.ilike.%${q}%`)
        .order('full_name')
        .limit(30);

      // Attach last consultation date
      const enriched = (data || []).map(p => {
        const dates = (p.consultations || [])
          .map(c => c.consultation_date)
          .sort()
          .reverse();
        return { ...p, last_visit: dates[0] || null };
      });
      setResults(enriched);
    } catch (err) {
      console.error('Patient search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <AppLayout showBack backTo="/chew/dashboard" title="Patient Records">
      <div className="patient-search-page">

        {/* Search bar */}
        <div className="search-bar-wrap">
          <div className="search-bar">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              id="patient-search-input"
              type="text"
              className="search-input"
              placeholder="Search by Hospital #, Name, Phone, or LGA..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              autoComplete="off"
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery('')} aria-label="Clear search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="search-results">
          {loading && (
            <div className="search-loading">
              <div className="inline-spinner" />
              <span>Searching...</span>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                </svg>
              </div>
              <h3 className="empty-state-title">No patients found for "{query}"</h3>
              <p className="empty-state-subtitle">Check the spelling or register a new patient below.</p>
            </div>
          )}

          {!loading && !searched && (
            <div className="empty-state select-prompt">
              <div className="empty-state-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
              <h3 className="empty-state-title">Search Patients</h3>
              <p className="empty-state-subtitle">Type a name or phone number to find a patient.</p>
            </div>
          )}

          {results.map(patient => (
            <button
              key={patient.id}
              className="patient-result-card"
              onClick={() => navigate(`/chew/patients/${patient.id}`)}
            >
              <div className="patient-avatar">
                {patient.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="patient-info">
                <span className="patient-name">{patient.full_name}</span>
                <div className="patient-meta">
                  <span className="meta-chip">
                    {calcAge(patient.date_of_birth)} yrs
                  </span>
                  <span className="meta-chip">
                    {patient.sex === 'M' ? 'Male' : patient.sex === 'F' ? 'Female' : '—'}
                  </span>
                  {patient.lga && (
                    <span className="meta-chip">{patient.lga}</span>
                  )}
                </div>
                {patient.last_visit && (
                  <span className="last-visit">
                    Last visit: {new Date(patient.last_visit).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <svg className="chevron-right" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Add Patient button */}
        <div className="add-patient-bar">
          <button
            id="add-new-patient-btn"
            className="btn-success add-patient-btn"
            onClick={() => navigate('/chew/patients/new')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add New Patient
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
