import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import './AdminPages.css';

export default function PhcSettings() {
  const [settings, setSettings] = useState({
    facilityName: 'Langtang North PHC',
    alertPhone: '0803 123 4567',
    lowStockThreshold: 50,
    tempWarningThreshold: 38.5,
    autoSyncOffline: true
  });
  const [success, setSuccess] = useState('');

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('cliniq_phc_settings', JSON.stringify(settings));
    setSuccess('⚙️ Settings updated and saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
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

      </div>
    </AppLayout>
  );
}
