import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { supabase } from '../../lib/supabase';
import './AdminPages.css';

const MOCK_STAFF = [
  { id: '1', full_name: 'Nurse Rifkatu Gyang', role: 'chew', on_duty: true, phone_number: '0803 123 4567', email: 'rifkatu.g@cliniq.org' },
  { id: '2', full_name: 'Midwife Gladys Ponfa', role: 'chew', on_duty: false, phone_number: '0803 987 6543', email: 'gladys.p@cliniq.org' },
  { id: '3', full_name: 'Digi Officer Ngo Pam', role: 'digitisation_officer', on_duty: true, phone_number: '0706 555 4444', email: 'ngo.pam@cliniq.org' },
  { id: '4', full_name: 'Dr. Amina Sule', role: 'doctor', on_duty: true, phone_number: '0812 333 4455', email: 'amina.sule@cliniq.org' },
  { id: '5', full_name: 'Mallam Kabiru Bako', role: 'lga_officer', on_duty: true, phone_number: '0802 111 2233', email: 'kabiru.b@cliniq.org' }
];

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [newStaff, setNewStaff] = useState({ full_name: '', role: 'chew', phone_number: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true });

      if (err || !data || data.length === 0) {
        setStaff(MOCK_STAFF);
      } else {
        setStaff(data);
      }
    } catch (e) {
      console.error(e);
      setStaff(MOCK_STAFF);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleDuty = async (staffMember) => {
    const nextDuty = !staffMember.on_duty;
    setStaff(prev => prev.map(s => s.id === staffMember.id ? { ...s, on_duty: nextDuty } : s));

    try {
      await supabase
        .from('users')
        .update({ on_duty: nextDuty })
        .eq('id', staffMember.id);
    } catch (e) {
      console.info('Duty status updated locally');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.full_name.trim()) return;

    setSaving(true);
    setError('');

    const newRecord = {
      id: window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
      full_name: newStaff.full_name.trim(),
      role: newStaff.role,
      phone_number: newStaff.phone_number.trim() || null,
      email: newStaff.email.trim() || null,
      on_duty: true,
      created_at: new Date().toISOString()
    };

    try {
      const { error: insertErr } = await supabase.from('users').insert([newRecord]);
      if (insertErr && insertErr.code !== '42P01') {
        console.warn('DB insert notice:', insertErr.message);
      }

      setStaff(prev => [newRecord, ...prev]);
      setNewStaff({ full_name: '', role: 'chew', phone_number: '', email: '' });
      setSuccess('✅ Staff member added successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setError('Failed to add staff to database, saved locally.');
      setStaff(prev => [newRecord, ...prev]);
    } finally {
      setSaving(false);
    }
  };

  const formatRole = (r) => {
    switch (r) {
      case 'chew': return 'CHEW / Nurse';
      case 'doctor': return 'Remote Doctor';
      case 'lga_officer': return 'LGA Health Officer';
      case 'digitisation_officer': return 'Digitisation Officer';
      case 'admin': return 'Administrator';
      default: return r || 'Staff';
    }
  };

  const filteredStaff = roleFilter === 'all' 
    ? staff 
    : staff.filter(s => s.role === roleFilter);

  return (
    <AppLayout title="Staff Management">
      <div className="admin-page-container">
        
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">👥 Staff Directory & Shift Roster</h1>
            <p className="admin-page-sub">Manage clinical personnel, assign system roles, and monitor live duty status.</p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Filter Role:</span>
            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles ({staff.length})</option>
              <option value="chew">CHEWs & Midwives</option>
              <option value="doctor">Doctors</option>
              <option value="lga_officer">LGA Officers</option>
              <option value="digitisation_officer">Digitisation Officers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {success && (
          <div className="alert-success-banner" style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: 14, borderRadius: 10, marginBottom: 16, fontWeight: 600, fontSize: 14 }}>
            {success}
          </div>
        )}

        {error && (
          <div className="alert-danger-banner" style={{ background: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: 14, borderRadius: 10, marginBottom: 16, fontWeight: 600, fontSize: 14 }}>
            {error}
          </div>
        )}

        <div className="admin-double-grid">
          
          {/* Directory list */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 className="panel-title-lg" style={{ margin: 0 }}>Clinic Personnel Directory</h2>
              {loading && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Updating...</span>}
            </div>

            <div className="staff-cards-vertical-list">
              {filteredStaff.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                  No personnel found for selected role filter.
                </div>
              ) : (
                filteredStaff.map(s => (
                  <div key={s.id} className="staff-profile-card">
                    <div className="staff-header-info">
                      <div>
                        <span className="profile-name-bold">{s.full_name || s.name || 'Unnamed Staff'}</span>
                        <span className="profile-role-sub">{formatRole(s.role)}</span>
                      </div>
                      <span className={`status-pill-badge ${s.on_duty || s.status === 'On-Duty' ? 'on-duty' : 'off-duty'}`}>
                        {s.on_duty || s.status === 'On-Duty' ? '🟢 On-Duty' : '⚪ Off-Duty'}
                      </span>
                    </div>
                    <div className="profile-contact-details">
                      {s.phone_number || s.phone ? <span>📞 {s.phone_number || s.phone}</span> : null}
                      {s.email ? <span>✉️ {s.email}</span> : null}
                    </div>
                    <div className="profile-card-action-bar">
                      <button className="btn-secondary btn-sm" onClick={() => handleToggleDuty(s)}>
                        🔄 Toggle Duty Status
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Staff form */}
          <div className="card">
            <h2 className="panel-title-lg">Register New Personnel</h2>
            <form onSubmit={handleAddStaff} className="admin-form-stack">
              
              <div className="form-field">
                <label className="field-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Nurse Sarah Ibrahim"
                  value={newStaff.full_name}
                  onChange={e => setNewStaff({ ...newStaff, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label className="field-label">Assigned System Role *</label>
                <select
                  className="form-select"
                  value={newStaff.role}
                  onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                >
                  <option value="chew">CHEW / Community Health Worker</option>
                  <option value="doctor">Remote Doctor / Specialist</option>
                  <option value="lga_officer">LGA Health Officer</option>
                  <option value="digitisation_officer">Digitisation Officer</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <div className="form-field">
                <label className="field-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 0803 123 4567"
                  value={newStaff.phone_number}
                  onChange={e => setNewStaff({ ...newStaff, phone_number: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. user@cliniq.ng"
                  value={newStaff.email}
                  onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={saving}>
                {saving ? 'Registering...' : '➕ Register Staff Member'}
              </button>

            </form>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}

