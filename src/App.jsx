import { Suspense, lazy, useEffect, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Error Boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, Arial, sans-serif',
          padding: 20,
          textAlign: 'center',
          background: '#fff',
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: 12 }}>Application Error</h2>
          <p style={{ color: '#666', marginBottom: 16, maxWidth: 500 }}>
            {this.state.error?.message || 'An unexpected error occurred. Please refresh the page.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const Login = lazy(() => import('./pages/Login'));
const ChewDashboard = lazy(() => import('./pages/chew/ChewDashboard'));
const PatientSearch = lazy(() => import('./pages/chew/PatientSearch'));
const NewPatient = lazy(() => import('./pages/chew/NewPatient'));
const PatientProfile = lazy(() => import('./pages/chew/PatientProfile'));
const NewConsultation = lazy(() => import('./pages/chew/NewConsultation'));
const AiDiagnosis = lazy(() => import('./pages/chew/AiDiagnosis'));
const LabInterpreter = lazy(() => import('./pages/chew/LabInterpreter'));
const CodeRed = lazy(() => import('./pages/chew/CodeRed'));
const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const CaseReview = lazy(() => import('./pages/doctor/CaseReview'));

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
    <h2 style={{ color: 'var(--color-primary)' }}>Welcome, {profile?.full_name}</h2>
      <p style={{ color: '#6b7280' }}>Dashboard for role: <strong>{role}</strong></p>
      <p style={{ color: '#9ca3af', fontSize: 14 }}>This section will be built next.</p>
      <button
        onClick={handleLogout}
        style={{
          marginTop: 24, padding: '12px 28px', background: 'var(--color-primary)',
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
  const { user, profile, loading, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Always go to login if Supabase isn't configured
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured; redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (profile) {
      const route = ROLE_ROUTES[profile.role] || '/login';
      navigate(route, { replace: true });
    }
  }, [user, profile, loading, navigate, isSupabaseConfigured]);

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
        borderTopColor: 'var(--color-primary)',
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
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
