import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ChewDashboard from './pages/chew/ChewDashboard';
import PatientSearch from './pages/chew/PatientSearch';
import NewPatient from './pages/chew/NewPatient';
import PatientProfile from './pages/chew/PatientProfile';
import NewConsultation from './pages/chew/NewConsultation';
import AiDiagnosis from './pages/chew/AiDiagnosis';
import LabInterpreter from './pages/chew/LabInterpreter';
import CodeRed from './pages/chew/CodeRed';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import CaseReview from './pages/doctor/CaseReview';

// ── Lazy placeholder dashboards (built in later sections) ─────────────
// These stubs allow the router to work now; they will be replaced.
function PlaceholderDash({ role }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  function handleLogout() {
    logout();
    navigate('/login');
  }
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 32, textAlign: 'center' }}>
      <h2 style={{ color: '#1B4F8A' }}>Welcome, {profile?.full_name}</h2>
      <p style={{ color: '#6b7280' }}>Dashboard for role: <strong>{role}</strong></p>
      <p style={{ color: '#9ca3af', fontSize: 14 }}>This section will be built next.</p>
      <button
        onClick={handleLogout}
        style={{
          marginTop: 24, padding: '12px 28px', background: '#1B4F8A',
          color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
          fontWeight: 700, fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        Log Out
      </button>
    </div>
  );
}

// ── Role-based redirect after login ──────────────────────────────────
const ROLE_ROUTES = {
  chew: '/chew/dashboard',
  doctor: '/doctor/dashboard',
  lga_officer: '/lga/dashboard',
  admin: '/admin/dashboard',
  digitisation_officer: '/admin/digitisation',
};

// Guard: redirect to login if not authenticated
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Guard: redirect authenticated users based on role, unauthenticated users to /login
function RoleRouter() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (profile) {
      const route = ROLE_ROUTES[profile.role] || '/login';
      navigate(route, { replace: true });
    }
  }, [user, profile, loading, navigate]);

  if (loading) return <LoadingScreen />;
  return null;
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, Arial, sans-serif', background: '#fff',
    }}>
      <div style={{
        width: 48, height: 48,
        border: '4px solid #e5e7eb',
        borderTopColor: '#1B4F8A',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }} />
      <p style={{ color: '#9ca3af', marginTop: 16, fontSize: 14 }}>Loading ClinIQ...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Root: redirect based on role */}
          <Route path="/" element={<RoleRouter />} />

          {/* CHEW routes (Section 2+) */}
          <Route path="/chew" element={<Navigate to="/chew/dashboard" replace />} />
          <Route path="/chew/dashboard" element={<RequireAuth><ChewDashboard /></RequireAuth>} />
          <Route path="/chew/patients" element={<RequireAuth><PatientSearch /></RequireAuth>} />
          <Route path="/chew/patients/new" element={<RequireAuth><NewPatient /></RequireAuth>} />
          <Route path="/chew/patients/:id" element={<RequireAuth><PatientProfile /></RequireAuth>} />
          <Route path="/chew/consultation/new" element={<RequireAuth><NewConsultation /></RequireAuth>} />
          <Route path="/chew/consultation/:id/diagnosis" element={<RequireAuth><AiDiagnosis /></RequireAuth>} />
          <Route path="/chew/lab-interpreter" element={<RequireAuth><LabInterpreter /></RequireAuth>} />
          <Route path="/chew/code-red" element={<RequireAuth><CodeRed /></RequireAuth>} />

          {/* Doctor routes */}
          <Route path="/doctor/dashboard" element={<RequireAuth><DoctorDashboard /></RequireAuth>} />
          <Route path="/doctor/cases/:id" element={<RequireAuth><CaseReview /></RequireAuth>} />
          <Route path="/doctor/*" element={<Navigate to="/doctor/dashboard" replace />} />

          {/* LGA Officer routes (Section 9+) */}
          <Route path="/lga/*" element={
            <RequireAuth><PlaceholderDash role="lga_officer" /></RequireAuth>
          } />

          {/* Admin routes (Section 11+) */}
          <Route path="/admin/*" element={
            <RequireAuth><PlaceholderDash role="admin" /></RequireAuth>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
