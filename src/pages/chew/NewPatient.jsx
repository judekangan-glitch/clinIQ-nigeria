import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ChewLayout from './ChewLayout';
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
    <ChewLayout showBack backTo="/chew/patients" title="Register Patient">
      <div className="new-patient-page">
        <form onSubmit={handleSave} className="new-patient-form">
          {error && <div className="error-alert">{error}</div>}

          <div className="form-field">
            <label htmlFor="fullName" className="field-label">Full Name *</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="field-input"
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
              className="field-input"
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
              className="field-input"
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
                className="field-select"
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
                className="field-select"
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
              className="field-select"
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
              className="field-textarea"
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
              className="field-textarea"
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
              className={`save-patient-btn ${saving ? 'loading' : ''}`}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Patient'}
            </button>
          </div>
        </form>
      </div>
    </ChewLayout>
  );
}
