import AppLayout from '../../components/AppLayout';
import { useDemoRole } from '../../context/DemoRoleContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { currentUser } = useDemoRole();
  const navigate = useNavigate();

  const metrics = [
    { label: 'Total Registered Staff', value: '14', detail: '10 clinical, 4 admin', color: '#1B4F8A', icon: '👥' },
    { label: 'Digitised Paper Records', value: '1,204', detail: '94 this week', color: '#0E7C7B', icon: '📷' },
    { label: 'Pending Folders Left', value: '326', detail: 'Target: Q3 completion', color: '#D97706', icon: '📁' },
    { label: 'Active Patients in catchment', value: '3,842', detail: '+42 new this month', color: '#16A34A', icon: '🏥' }
  ];

  const dutyStaff = [
    { name: 'Nurse Rifkatu Gyang', role: 'CHEW / Nurse', shift: 'Morning (08:00 - 16:00)', active: true },
    { name: 'Midwife Gladys Ponfa', role: 'Midwife', shift: 'Night Duty (16:00 - 08:00)', active: false },
    { name: 'Digi Officer Ngo Pam', role: 'Digitisation Officer', shift: 'Day Shift', active: true }
  ];

  return (
    <AppLayout title="PHC Admin Dashboard">
      <div className="admin-dashboard-container">
        
        {/* Header Greeting */}
        <div className="admin-dashboard-header">
          <div>
            <span className="admin-eyebrow">Primary Health Care Facility Management</span>
            <h1 className="admin-title">Welcome, {currentUser.name}</h1>
            <p className="admin-sub">{currentUser.phc}</p>
          </div>
          <div className="admin-header-actions">
            <button className="btn-secondary" onClick={() => navigate('/admin/staff')}>
              👥 Manage Staff
            </button>
            <button className="btn-primary" onClick={() => navigate('/admin/settings')}>
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="admin-stats-grid">
          {metrics.map((m, idx) => (
            <div key={idx} className="admin-stat-card card" style={{ borderTop: `4px solid ${m.color}` }}>
              <div className="admin-stat-icon-circle" style={{ backgroundColor: m.color + '12', color: m.color }}>
                {m.icon}
              </div>
              <div className="admin-stat-info">
                <span className="admin-stat-val">{m.value}</span>
                <span className="admin-stat-label">{m.label}</span>
                <span className="admin-stat-detail">{m.detail}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CORE DETAILS GRID */}
        <div className="admin-grid-main">
          
          {/* Active staff on shift */}
          <div className="card">
            <div className="panel-header-row">
              <h2 className="admin-panel-title">On-Duty Roster & Shifts</h2>
              <button className="btn-link" onClick={() => navigate('/admin/staff')}>Roster</button>
            </div>
            <div className="admin-list-container">
              {dutyStaff.map((s, idx) => (
                <div key={idx} className="staff-duty-row-card">
                  <div className="staff-meta-col">
                    <span className="staff-avatar-sm">{s.name.split(' ').map(n=>n[0]).join('')}</span>
                    <div>
                      <span className="staff-name-lbl">{s.name}</span>
                      <span className="staff-role-lbl">{s.role}</span>
                    </div>
                  </div>
                  <div className="staff-shift-col">
                    <span className="shift-time-lbl">{s.shift}</span>
                    <span className={`on-duty-badge ${s.active ? 'active' : 'inactive'}`}>
                      {s.active ? 'On-Duty' : 'Off-Duty'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Digitisation milestones */}
          <div className="card">
            <div className="panel-header-row">
              <h2 className="admin-panel-title">Digitisation Pipeline</h2>
              <button className="btn-link" onClick={() => navigate('/admin/digitisation')}>Details</button>
            </div>
            <div className="progress-analysis-box">
              <div className="overall-percent-box">
                <span className="overall-pct">78%</span>
                <span className="overall-lbl">Historical files digitised</span>
              </div>
              <div className="progress-stack-vertical">
                <div className="progress-row-status">
                  <span className="prog-label">Paediatric cards</span>
                  <div className="prog-track-bar">
                    <div className="prog-fill-bar" style={{ width: '90%', backgroundColor: '#16A34A' }} />
                  </div>
                  <span className="prog-pct-val">90%</span>
                </div>
                <div className="progress-row-status">
                  <span className="prog-label">Antenatal folders</span>
                  <div className="prog-track-bar">
                    <div className="prog-fill-bar" style={{ width: '80%', backgroundColor: '#1B4F8A' }} />
                  </div>
                  <span className="prog-pct-val">80%</span>
                </div>
                <div className="progress-row-status">
                  <span className="prog-label">General consult notes</span>
                  <div className="prog-track-bar">
                    <div className="prog-fill-bar" style={{ width: '65%', backgroundColor: '#D97706' }} />
                  </div>
                  <span className="prog-pct-val">65%</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
