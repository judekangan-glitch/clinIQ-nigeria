import { Suspense, lazy, useEffect, Component } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoRoleProvider } from './context/DemoRoleContext';

// Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('React Error Boundary caught:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, Arial, sans-serif', padding: 20, textAlign: 'center', background: '#fff',
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: 12 }}>Application Error</h2>
          <p style={{ color: '#666', marginBottom: 16, maxWidth: 500 }}>
            {this.state.error?.message || 'An unexpected error occurred. Please refresh the page.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', background: '#1B4F8A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy-loaded pages
const Login                  = lazy(() => import('./pages/Login'));
const ChewDashboard          = lazy(() => import('./pages/chew/ChewDashboard'));
const PatientSearch          = lazy(() => import('./pages/chew/PatientSearch'));
const NewPatient             = lazy(() => import('./pages/chew/NewPatient'));
const PatientProfile         = lazy(() => import('./pages/chew/PatientProfile'));
const NewConsultation        = lazy(() => import('./pages/chew/NewConsultation'));
const AiDiagnosis            = lazy(() => import('./pages/chew/AiDiagnosis'));
const LabInterpreter         = lazy(() => import('./pages/chew/LabInterpreter'));
const CodeRed                = lazy(() => import('./pages/chew/CodeRed'));
const MyLearning             = lazy(() => import('./pages/chew/MyLearning'));
const Nutrition              = lazy(() => import('./pages/chew/Nutrition'));
const DoctorDashboard        = lazy(() => import('./pages/doctor/DoctorDashboard'));
const CaseReview             = lazy(() => import('./pages/doctor/CaseReview'));
const LgaDashboard           = lazy(() => import('./pages/lga/LgaDashboard'));
const OutbreakMonitor        = lazy(() => import('./pages/lga/OutbreakMonitor'));
const DiseaseTrends          = lazy(() => import('./pages/lga/DiseaseTrends'));
const PhcPerformance         = lazy(() => import('./pages/lga/PhcPerformance'));
const SupplyAlerts           = lazy(() => import('./pages/lga/SupplyAlerts'));
const AdminDashboard         = lazy(() => import('./pages/admin/AdminDashboard'));
const StaffManagement        = lazy(() => import('./pages/admin/StaffManagement'));
const DigitisationProgress   = lazy(() => import('./pages/admin/DigitisationProgress'));
const PhcSettings            = lazy(() => import('./pages/admin/PhcSettings'));
const DigitisationDashboard  = lazy(() => import('./pages/digitisation/DigitisationDashboard'));
const DigitisationProgressOfficer = lazy(() => import('./pages/digitisation/DigitisationProgress'));

// Role → default route map (for login redirect)
const ROLE_ROUTES = {
  chew: '/chew/dashboard',
  doctor: '/doctor/dashboard',
  lga_officer: '/lga/dashboard',
  admin: '/admin/dashboard',
  digitisation_officer: '/digitisation/scan',
};

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleRouter() {
  const { user, profile, loading, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isSupabaseConfigured) { navigate('/login', { replace: true }); return; }
    if (!user) { navigate('/login', { replace: true }); return; }
    if (profile) {
      const route = ROLE_ROUTES[profile.role] || '/chew/dashboard';
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
        width: 48, height: 48, border: '4px solid #e5e7eb',
        borderTopColor: '#1B4F8A', borderRadius: '50%',
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
        <DemoRoleProvider>
          <HashRouter>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />

                {/* Root redirect */}
                <Route path="/" element={<RoleRouter />} />

                {/* ── CHEW routes ──────────────────────────── */}
                <Route path="/chew" element={<Navigate to="/chew/dashboard" replace />} />
                <Route path="/chew/dashboard" element={<RequireAuth><ChewDashboard /></RequireAuth>} />
                <Route path="/chew/patients" element={<RequireAuth><PatientSearch /></RequireAuth>} />
                <Route path="/chew/patients/new" element={<RequireAuth><NewPatient /></RequireAuth>} />
                <Route path="/chew/patients/:id" element={<RequireAuth><PatientProfile /></RequireAuth>} />
                <Route path="/chew/consultation/new" element={<RequireAuth><NewConsultation /></RequireAuth>} />
                <Route path="/chew/consultation/:id/diagnosis" element={<RequireAuth><AiDiagnosis /></RequireAuth>} />
                <Route path="/chew/lab-interpreter" element={<RequireAuth><LabInterpreter /></RequireAuth>} />
                <Route path="/chew/code-red" element={<RequireAuth><CodeRed /></RequireAuth>} />
                <Route path="/chew/learning" element={<RequireAuth><MyLearning /></RequireAuth>} />
                <Route path="/chew/nutrition" element={<RequireAuth><Nutrition /></RequireAuth>} />

                {/* ── Doctor routes ─────────────────────────── */}
                <Route path="/doctor/dashboard" element={<RequireAuth><DoctorDashboard /></RequireAuth>} />
                <Route path="/doctor/cases/:id" element={<RequireAuth><CaseReview /></RequireAuth>} />
                <Route path="/doctor/*" element={<Navigate to="/doctor/dashboard" replace />} />

                {/* ── LGA Officer routes ────────────────────── */}
                <Route path="/lga/dashboard" element={<RequireAuth><LgaDashboard /></RequireAuth>} />
                <Route path="/lga/outbreaks" element={<RequireAuth><OutbreakMonitor /></RequireAuth>} />
                <Route path="/lga/trends" element={<RequireAuth><DiseaseTrends /></RequireAuth>} />
                <Route path="/lga/performance" element={<RequireAuth><PhcPerformance /></RequireAuth>} />
                <Route path="/lga/supplies" element={<RequireAuth><SupplyAlerts /></RequireAuth>} />
                <Route path="/lga/*" element={<Navigate to="/lga/dashboard" replace />} />

                {/* ── Admin routes ──────────────────────────── */}
                <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
                <Route path="/admin/staff" element={<RequireAuth><StaffManagement /></RequireAuth>} />
                <Route path="/admin/digitisation" element={<RequireAuth><DigitisationProgress /></RequireAuth>} />
                <Route path="/admin/settings" element={<RequireAuth><PhcSettings /></RequireAuth>} />
                <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />

                {/* ── Digitisation routes ───────────────────── */}
                <Route path="/digitisation/scan" element={<RequireAuth><DigitisationDashboard /></RequireAuth>} />
                <Route path="/digitisation/progress" element={<RequireAuth><DigitisationProgressOfficer /></RequireAuth>} />
                <Route path="/digitisation/*" element={<Navigate to="/digitisation/scan" replace />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </HashRouter>
        </DemoRoleProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
