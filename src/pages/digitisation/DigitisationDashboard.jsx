import AppLayout from '../../components/AppLayout';
import { useDemoRole } from '../../context/DemoRoleContext';

export default function DigitisationDashboard() {
  const { currentUser } = useDemoRole();

  return (
    <AppLayout title="Digitisation Officer">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Digitisation Officer</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
            {currentUser.name}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
            {currentUser.phc}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Scanned Today', value: '18', color: '#0E7C7B' },
            { label: 'This Week', value: '94', color: '#1B4F8A' },
            { label: 'Total Scanned', value: '1,204', color: '#16A34A' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', borderTop: `4px solid ${stat.color}` }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 12px' }}>
            Scan New Record
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
            Take a photo of a paper record to digitise it and add it to the system.
          </p>
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '14px' }}
            onClick={() => {}}
          >
            📷 Open Camera to Scan
          </button>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 12px' }}>
            Recent Scans — Today
          </h2>
          {[
            { name: 'Rifkatu Gyang', date: '2024-01-15', type: 'Consultation Note' },
            { name: 'Ibrahim Musa', date: '2024-01-14', type: 'Lab Result' },
            { name: 'Comfort Dung', date: '2024-01-13', type: 'Antenatal Card' },
            { name: 'Musa Pwodak', date: '2024-01-12', type: 'Immunisation Card' },
          ].map(item => (
            <div key={item.name + item.date} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid var(--color-border)',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.type} · {item.date}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#0E7C7B',
                background: '#F0FDFA', padding: '3px 10px', borderRadius: 999, border: '1px solid #99F6E4',
              }}>
                ✓ Done
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
