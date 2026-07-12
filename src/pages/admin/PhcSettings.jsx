import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { supabase } from '../../lib/supabase';
import './AdminPages.css';

const DEMO_PATIENTS = [
  { full_name: 'Rifkatu Gyang', phone_number: '08031112222', date_of_birth: '1998-04-12', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'Asthma' },
  { full_name: 'Ibrahim Musa', phone_number: '08032223333', date_of_birth: '1984-08-22', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O-', known_allergies: 'Penicillin', chronic_conditions: 'None' },
  { full_name: 'Comfort Dung', phone_number: '08033334444', date_of_birth: '2022-11-05', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'A+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Musa Pwodak', phone_number: '08034445555', date_of_birth: '2025-06-15', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Amina Bello', phone_number: '08035556666', date_of_birth: '2007-02-18', sex: 'F', state: 'Kano', lga: 'Fagge', food_zone: 'sudano_sahelian', blood_group: 'B+', known_allergies: 'Sulfa drugs', chronic_conditions: 'Sickle Cell Trait' },
  { full_name: 'Bala Yakubu', phone_number: '08036667777', date_of_birth: '1972-10-30', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'AB+', known_allergies: 'None', chronic_conditions: 'Hypertension, Diabetes' },
  { full_name: 'Ladi Musa', phone_number: '08037778888', date_of_birth: '1995-05-14', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Pam Dung', phone_number: '08038889999', date_of_birth: '1964-03-24', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'Aspirin', chronic_conditions: 'Osteoarthritis' },
  { full_name: 'Yusuf Abubakar', phone_number: '08039990000', date_of_birth: '2023-01-10', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'B-', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Zainab Usman', phone_number: '08031113333', date_of_birth: '2011-09-05', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'A-', known_allergies: 'None', chronic_conditions: 'Sickle Cell disease' },
  { full_name: 'Gyang Davou', phone_number: '08032224444', date_of_birth: '2018-07-29', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'AB-', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Asabe Ibrahim', phone_number: '08033335555', date_of_birth: '1978-12-14', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'Hypertension' },
  { full_name: 'Chidi Okechukwu', phone_number: '08034446666', date_of_birth: '1991-01-11', sex: 'M', state: 'Enugu', lga: 'Udi', food_zone: 'south_east', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Ngozi Okafor', phone_number: '08035557777', date_of_birth: '2000-06-08', sex: 'F', state: 'Anambra', lga: 'Awka South', food_zone: 'south_east', blood_group: 'A+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Emeka Nwosu', phone_number: '08036668888', date_of_birth: '2020-04-18', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'B+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Funmi Adesina', phone_number: '08037779999', date_of_birth: '2004-09-21', sex: 'F', state: 'Lagos', lga: 'Ikeja', food_zone: 'south_west', blood_group: 'O-', known_allergies: 'Penicillin', chronic_conditions: 'None' },
  { full_name: 'Tunde Balogun', phone_number: '08038880000', date_of_birth: '1976-11-03', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'AB+', known_allergies: 'None', chronic_conditions: 'Hypertension' },
  { full_name: 'Halima Sani', phone_number: '08039991111', date_of_birth: '2024-03-12', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'Malnutrition suspect' },
  { full_name: 'Balarabe Haruna', phone_number: '08031114444', date_of_birth: '2025-08-01', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'A+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Maryam Shehu', phone_number: '08032225555', date_of_birth: '1993-10-15', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'Pregnancy' },
  { full_name: 'Elizabeth John', phone_number: '08033336666', date_of_birth: '1999-07-25', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'B-', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Stephen Monday', phone_number: '08034447777', date_of_birth: '1981-05-30', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Grace Sunday', phone_number: '08035558888', date_of_birth: '2008-08-14', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'AB-', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Sunday Pam', phone_number: '08036669999', date_of_birth: '2014-02-12', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Talatu Danladi', phone_number: '08037770000', date_of_birth: '1988-12-25', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'A+', known_allergies: 'None', chronic_conditions: 'Peptic Ulcer' },
  { full_name: 'Kabiru Garba', phone_number: '08038881111', date_of_birth: '1997-03-01', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Fatima Dahiru', phone_number: '08039992222', date_of_birth: '2021-09-18', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'B+', known_allergies: 'None', chronic_conditions: 'None' },
  { full_name: 'Shehu Shagari', phone_number: '08031115555', date_of_birth: '1956-07-20', sex: 'M', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'Osteoarthritis, Cataracts' },
  { full_name: 'Lami Gyang', phone_number: '08032226666', date_of_birth: '1966-04-10', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'B-', known_allergies: 'None', chronic_conditions: 'Diabetes, Neuropathy' },
  { full_name: 'Victoria Samuel', phone_number: '08033337777', date_of_birth: '2002-09-02', sex: 'F', state: 'Plateau', lga: 'Langtang North', food_zone: 'north_central', blood_group: 'O+', known_allergies: 'None', chronic_conditions: 'None' }
];

export default function PhcSettings() {
  const [settings, setSettings] = useState({
    facilityName: 'Langtang North PHC',
    alertPhone: '0803 123 4567',
    lowStockThreshold: 50,
    tempWarningThreshold: 38.5,
    autoSyncOffline: true
  });
  const [success, setSuccess] = useState('');
  const [seeding, setSeeding] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('cliniq_phc_settings', JSON.stringify(settings));
    setSuccess('⚙️ Settings updated and saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSeedPatients = async () => {
    setSeeding(true);
    setSuccess('');
    try {
      // Helper function to generate structured hospital numbers like CLINIQ-2025-XXXXX
      const getNum = (idx) => {
        const year = new Date().getFullYear();
        const num = 10000 + idx;
        return `CLINIQ-${year}-${num}`;
      };

      const payload = DEMO_PATIENTS.map((p, idx) => ({
        ...p,
        hospital_number: getNum(idx),
        phc_id: null // set to null to avoid foreign key errors!
      }));

      // Safely upsert on conflict of phone_number so it never fails if clicked multiple times
      const { error } = await supabase
        .from('patients')
        .upsert(payload, { onConflict: 'phone_number' });

      if (error) throw error;

      setSuccess('🎉 30 Demo Patients with diverse conditions and generated Hospital Numbers onboarded successfully!');
    } catch (err) {
      console.error(err);
      setSuccess(`❌ Seeding failed: ${err.message || 'database error'}`);
    } finally {
      setSeeding(false);
      setTimeout(() => setSuccess(''), 6000);
    }
  };

  return (
    <AppLayout title="PHC Settings">
      <div className="admin-page-container">
        
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">⚙️ Facility Settings & Configuration</h1>
            <p className="admin-page-sub">Configure clinic operation policies, stock alert margins, and local offline thresholds.</p>
          </div>
        </div>

        {success && (
          <div className="alert-success-banner" style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: 16, borderRadius: 12, marginBottom: 20, fontWeight: 600 }}>
            {success}
          </div>
        )}

        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 className="panel-title-lg">Clinic Operating Configuration</h2>
          <form onSubmit={handleSaveSettings} className="admin-form-stack">
            
            <div className="form-field">
              <label className="field-label">Clinic Facility Name</label>
              <input
                type="text"
                className="form-input"
                value={settings.facilityName}
                onChange={e => setSettings({ ...settings, facilityName: e.target.value })}
                required
              />
            </div>

            <div className="form-field">
              <label className="field-label">Emergency Broadcast Contact Number</label>
              <input
                type="tel"
                className="form-input"
                value={settings.alertPhone}
                onChange={e => setSettings({ ...settings, alertPhone: e.target.value })}
                placeholder="e.g. 0803 123 4567"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Low Stock Trigger Alert Threshold (Boxes/Vials)</label>
              <input
                type="number"
                className="form-input"
                value={settings.lowStockThreshold}
                onChange={e => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 0 })}
                min="5"
              />
              <span className="field-help-text">Triggers a supply alert when inventory levels fall below this value.</span>
            </div>

            <div className="form-field">
              <label className="field-label">Fever Alarm Threshold (°C)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={settings.tempWarningThreshold}
                onChange={e => setSettings({ ...settings, tempWarningThreshold: parseFloat(e.target.value) || 38.0 })}
                min="35"
                max="42"
              />
              <span className="field-help-text">Vitals inputs higher than this will trigger diagnostic warnings.</span>
            </div>

            <div className="form-field checkbox-field">
              <label className="checkbox-label-settings">
                <input
                  type="checkbox"
                  checked={settings.autoSyncOffline}
                  onChange={e => setSettings({ ...settings, autoSyncOffline: e.target.checked })}
                />
                <span>Automatically sync offline consultation queues immediately when network is restored</span>
              </label>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 12 }}>
              Save Clinic Configuration
            </button>

          </form>
        </div>

        {/* Seeding Section */}
        <div className="card" style={{ maxWidth: 600, margin: '20px auto 0', borderTop: '4px solid var(--color-secondary)' }}>
          <h2 className="panel-title-lg">Demographic Data Utility</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.45, marginBottom: 16 }}>
            Onboard 30 highly realistic local patients prepopulated with custom Nigerian names, ages, food zones, blood groups, known allergies, and chronic conditions to test the search indexing and clinical workflows.
          </p>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)' }}
            onClick={handleSeedPatients}
            disabled={seeding}
          >
            {seeding ? 'Generating & Uploading Profiles...' : '✨ Populate 30 Demo Patients'}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
