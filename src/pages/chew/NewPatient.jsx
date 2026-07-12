import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import { NIGERIA_STATES_LGA, STATE_TO_FOOD_ZONE } from '../../data/nigeriaData';
import './NewPatient.css';

export default function NewPatient() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    dob: '',
    sex: '',
    state: '',
    lga: '',
    bloodGroup: '',
    allergies: '',
    chronicConditions: '',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const states = Object.keys(NIGERIA_STATES_LGA).sort();
  const lgas = formData.state ? NIGERIA_STATES_LGA[formData.state].sort() : [];

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset LGA if State changes
      ...(name === 'state' ? { lga: '' } : {}),
    }));
  }

  /** Generate a hospital number like CLINIQ-2025-04821 */
  function generateHospitalNumber() {
    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000); // 5-digit
    return `CLINIQ-${year}-${rand}`;
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Full Name is required.');
      return;
    }

    setSaving(true);

    try {
      // Auto-assign food zone
      const foodZone = STATE_TO_FOOD_ZONE[formData.state] || 'north_central';

      const patientData = {
        full_name: formData.fullName.trim(),
        phone_number: formData.phoneNumber.trim() || null,
        date_of_birth: formData.dob || null,
        sex: formData.sex || null,
        state: formData.state || null,
        lga: formData.lga || null,
        food_zone: foodZone,
        blood_group: formData.bloodGroup || null,
        known_allergies: formData.allergies.trim() || 'None',
        chronic_conditions: formData.chronicConditions.trim() || 'None',
        phc_id: profile?.phc_id || null,
        hospital_number: generateHospitalNumber(),
      };

      const { data, error: insertError } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('A patient with this phone number already exists.');
        }

        if (insertError.status === 403 || insertError.code === '42501') {
          throw new Error(
            'Failed to save patient: database row-level security prevents this action. Please update Supabase policies for the patients table.'
          );
        }

        throw insertError;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('from') === 'consultation') {
        navigate(`/chew/consultation/new?patient=${data.id}`);
      } else {
        navigate(`/chew/patients/${data.id}`);
      }
    } catch (err) {
      console.error('Save patient error:', err);
      setError(err.message || 'Failed to save patient. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout showBack backTo="/chew/patients" title="Register Patient">
      <div className="new-patient-page">
        <form onSubmit={handleSave} className="new-patient-form card">
          {error && <div className="error-alert" role="alert">{error}</div>}

          <div className="form-field">
            <label htmlFor="fullName" className="field-label">Full Name *</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="form-input"
              placeholder="Enter patient's full name"
              value={formData.fullName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="phoneNumber" className="field-label">Phone Number</label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              className="form-input"
              placeholder="e.g. 08031234567"
              value={formData.phoneNumber}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="dob" className="field-label">Date of Birth</label>
            <input
              id="dob"
              name="dob"
              type="date"
              className="form-input"
              value={formData.dob}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field">
            <span className="field-label">Sex</span>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="sex"
                  value="M"
                  checked={formData.sex === 'M'}
                  onChange={handleInputChange}
                  className="radio-input"
                />
                Male
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="sex"
                  value="F"
                  checked={formData.sex === 'F'}
                  onChange={handleInputChange}
                  className="radio-input"
                />
                Female
              </label>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="state" className="field-label">State</label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="">Select State</option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="lga" className="field-label">LGA</label>
              <select
                id="lga"
                name="lga"
                value={formData.lga}
                onChange={handleInputChange}
                className="form-select"
                disabled={!formData.state}
              >
                <option value="">Select LGA</option>
                {lgas.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="bloodGroup" className="field-label">Blood Group</label>
            <select
              id="bloodGroup"
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="">Select Blood Group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="allergies" className="field-label">Known Allergies</label>
            <textarea
              id="allergies"
              name="allergies"
              className="form-textarea"
              placeholder="List known food or drug allergies (or leave blank for None)"
              value={formData.allergies}
              onChange={handleInputChange}
              rows={2}
            />
          </div>

          <div className="form-field">
            <label htmlFor="chronicConditions" className="field-label">Chronic Conditions</label>
            <textarea
              id="chronicConditions"
              name="chronicConditions"
              className="form-textarea"
              placeholder="e.g. Hypertension, Diabetes (or leave blank for None)"
              value={formData.chronicConditions}
              onChange={handleInputChange}
              rows={2}
            />
          </div>

          <div className="form-action">
            <button
              id="save-patient-btn"
              type="submit"
              className="btn-primary save-patient-btn"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="inline-spinner" style={{ borderTopColor: '#ffffff' }} />
                  Saving...
                </>
              ) : 'Save Patient'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
