import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConnectivityBanner from '../components/ConnectivityBanner';
import './Login.css';

const ROLE_ROUTES = {
  chew: '/chew/dashboard',
  doctor: '/doctor/dashboard',
  lga_officer: '/lga/dashboard',
  admin: '/admin/dashboard',
  digitisation_officer: '/admin/digitisation',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(phone.trim(), password);
      // Profile is loaded by AuthContext; navigate based on role
      // We wait for profile via a small poll (AuthContext triggers re-render)
      // The App router will redirect once profile is set.
    } catch (err) {
      console.error('Login error:', err);
      setError('Incorrect phone number or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <ConnectivityBanner />

      <div className="login-container">
        {/* Logo & branding */}
        <div className="login-brand">
          <div className="login-logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="var(--color-primary)"/>
              <path d="M20 8C13.4 8 8 13.4 8 20s5.4 12 12 12 12-5.4 12-12S26.6 8 20 8z" fill="none" stroke="white" strokeWidth="2"/>
              <path d="M20 14v12M14 20h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="login-title">ClinIQ Nigeria</h1>
          <p className="login-tagline">
            Bringing the doctor to every village, through intelligence.
          </p>
        </div>

        {/* Login form */}
        <form className="login-form" onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label htmlFor="phone-number" className="form-label">Phone Number</label>
            <input
              id="phone-number"
              type="tel"
              className="form-input"
              placeholder="e.g. 08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error" role="alert" aria-live="polite">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            className={`btn-primary login-btn ${loading ? 'loading' : ''}`}
            disabled={loading || !phone || !password}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>

          <p className="login-footer-text">
            Forgot password? Contact your PHC administrator.
          </p>
        </form>

        {/* Decorative bottom */}
        <div className="login-footer-brand">
          <span>JayKayDee Tech</span>
          <span className="dot-sep">·</span>
          <span>Powered by Gemini AI</span>
        </div>
      </div>
    </div>
  );
}
