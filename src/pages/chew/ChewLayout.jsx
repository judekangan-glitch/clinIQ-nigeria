import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ConnectivityBanner from '../../components/ConnectivityBanner';
import './ChewLayout.css';

export default function ChewLayout({ children, title, showBack = false, backTo }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'CHEW';

  return (
    <div className="chew-layout">
      <ConnectivityBanner />

      <header className="chew-header">
        <div className="chew-header-left">
          {showBack ? (
            <button
              className="back-btn"
              onClick={() => backTo ? navigate(backTo) : navigate(-1)}
              aria-label="Go back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
          ) : (
            <div className="header-logo">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="9" fill="#1B4F8A"/>
                <path d="M20 14v12M14 20h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <div className="header-logo-text">
                <span className="header-brand">ClinIQ</span>
                <span className="header-user">Hi, {firstName}</span>
              </div>
            </div>
          )}
          {title && showBack && <span className="header-title">{title}</span>}
        </div>

        <div className="chew-header-right">
          <button
            className="header-icon-btn"
            onClick={() => navigate('/chew/sms')}
            aria-label="SMS Inbox"
            title="SMS Inbox"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button
            className="header-icon-btn logout-btn"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="chew-main">
        {children}
      </main>
    </div>
  );
}
