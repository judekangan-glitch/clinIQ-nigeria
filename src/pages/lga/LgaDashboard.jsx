import AppLayout from '../../components/AppLayout';
import { useDemoRole } from '../../context/DemoRoleContext';

export default function LgaDashboard() {
  const { currentUser } = useDemoRole();

  return (
    <AppLayout title="LGA Health Officer Dashboard">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>LGA Health Dashboard</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
            {currentUser.name}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
            {currentUser.lga} LGA · {currentUser.state} State
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Active PHCs', value: '12', color: '#1B4F8A' },
            { label: 'Outbreak Alerts', value: '2', color: '#DC2626' },
            { label: 'Cases This Week', value: '148', color: '#0E7C7B' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', borderTop: `4px solid ${stat.color}` }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 16px' }}>Disease Trends — Langtang North</h2>
          {[
            { disease: 'Malaria', cases: 72, pct: 80 },
            { disease: 'Respiratory Infections', cases: 34, pct: 38 },
            { disease: 'Diarrhoeal Disease', cases: 21, pct: 23 },
            { disease: 'Hypertension', cases: 15, pct: 17 },
          ].map(row => (
            <div key={row.disease} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.disease}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{row.cases} cases</span>
              </div>
              <div style={{ height: 6, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${row.pct}%`, background: 'linear-gradient(90deg, #0E7C7B, #0D9488)', borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
