import AppLayout from '../../components/AppLayout';
import { useDemoRole } from '../../context/DemoRoleContext';

export default function AdminDashboard() {
  const { currentUser } = useDemoRole();

  return (
    <AppLayout title="PHC Administrator Dashboard">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>PHC Administration</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
            {currentUser.name}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
            {currentUser.phc}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Staff Members', value: '14', color: '#1B4F8A' },
            { label: 'Digitised Records', value: '1,204', color: '#0E7C7B' },
            { label: 'Pending Records', value: '326', color: '#D97706' },
            { label: 'Consultations Today', value: '37', color: '#16A34A' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', borderTop: `4px solid ${stat.color}` }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 16px' }}>Staff Directory</h2>
          {[
            { name: 'Nurse Rifkatu Gyang', role: 'CHEW', status: 'Active' },
            { name: 'Nurse Yakubu Danladi', role: 'CHEW', status: 'Active' },
            { name: 'Digi Officer Ngo Pam', role: 'Digitisation', status: 'Active' },
            { name: 'Midwife Gladys Ponfa', role: 'Midwife', status: 'Active' },
          ].map(staff => (
            <div key={staff.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid var(--color-border)',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{staff.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{staff.role}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#16A34A',
                background: '#ECFDF5', padding: '3px 10px', borderRadius: 999, border: '1px solid #BBF7D0',
              }}>
                {staff.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
