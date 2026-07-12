import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import './AdminPages.css';

export default function StaffManagement() {
  const [staff, setStaff] = useState([
    { id: 1, name: 'Nurse Rifkatu Gyang', role: 'CHEW / Nurse', status: 'On-Duty', phone: '0803 123 4567', email: 'rifkatu.g@cliniq.org' },
    { id: 2, name: 'Midwife Gladys Ponfa', role: 'Midwife', status: 'Off-Duty', phone: '0803 987 6543', email: 'gladys.p@cliniq.org' },
    { id: 3, name: 'Digi Officer Ngo Pam', role: 'Digitisation Officer', status: 'On-Duty', phone: '0706 555 4444', email: 'ngo.pam@cliniq.org' },
    { id: 4, name: 'Dr. Amina Sule', role: 'Remote Doctor (Cons.)', status: 'On-Duty', phone: '0812 333 4455', email: 'amina.sule@cliniq.org' }
  ]);

  const [newStaff, setNewStaff] = useState({ name: '', role: 'CHEW / Nurse', phone: '', email: '' });
  const [success, setSuccess] = useState('');

  const handleToggleDuty = (id) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'On-Duty' ? 'Off-Duty' : 'On-Duty' } : s));
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!newStaff.name.trim()) return;

    setStaff(prev => [
      ...prev,
      {
        id: Date.now(),
        name: newStaff.name,
        role: newStaff.role,
        status: 'Off-Duty',
        phone: newStaff.phone || '—',
        email: newStaff.email || '—'
      }
    ]);

    setNewStaff({ name: '', role: 'CHEW / Nurse', phone: '', email: '' });
    setSuccess('✅ Staff member added successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <AppLayout title="Staff Management">
      <div className="admin-page-container">
        
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">👥 Staff Directory & Shift Management</h1>
            <p className="admin-page-sub">Manage clinic staff registry, shift rosters, and assign duty statuses.</p>
          </div>
        </div>

        {success && (
          <div className="alert-success-banner" style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: 16, borderRadius: 12, marginBottom: 20, fontWeight: 600 }}>
            {success}
          </div>
        )}

        <div className="admin-double-grid">
          
          {/* Directory list */}
          <div className="card">
            <h2 className="panel-title-lg">Clinic Staff Directory</h2>
            <div className="staff-cards-vertical-list">
              {staff.map(s => (
                <div key={s.id} className="staff-profile-card">
                  <div className="staff-header-info">
                    <div>
                      <span className="profile-name-bold">{s.name}</span>
                      <span className="profile-role-sub">{s.role}</span>
                    </div>
                    <span className={`status-pill-badge ${s.status === 'On-Duty' ? 'on-duty' : 'off-duty'}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="profile-contact-details">
                    <span>📞 {s.phone}</span>
                    <span>✉️ {s.email}</span>
                  </div>
                  <div className="profile-card-action-bar">
                    <button className="btn-secondary btn-sm" onClick={() => handleToggleDuty(s.id)}>
                      🔄 Toggle Duty Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Staff form */}
          <div className="card">
            <h2 className="panel-title-lg">Register New Staff Member</h2>
            <form onSubmit={handleAddStaff} className="admin-form-stack">
              
              <div className="form-field">
                <label className="field-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter full name"
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label className="field-label">Assigned Role *</label>
                <select
                  className="form-select"
                  value={newStaff.role}
                  onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                >
                  <option value="CHEW / Nurse">CHEW / Nurse</option>
                  <option value="Midwife">Midwife</option>
                  <option value="Digitisation Officer">Digitisation Officer</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>

              <div className="form-field">
                <label className="field-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 0803 123 4567"
                  value={newStaff.phone}
                  onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. user@cliniq.org"
                  value={newStaff.email}
                  onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8 }}>
                Register Staff Member
              </button>

            </form>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
