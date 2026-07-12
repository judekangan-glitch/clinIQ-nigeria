import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnectivity } from '../hooks/useConnectivity';
import './AppLayout.css';

export default function AppLayout({ children, title, showBack = false, backTo }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const online = useConnectivity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Get initials for Avatar
  const getInitials = () => {
    if (!profile?.full_name) return 'U';
    const parts = profile.full_name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getRoleLabel = () => {
    if (!profile?.role) return '';
    const map = {
      chew: 'CHEW',
      doctor: 'Doctor',
      admin: 'Admin',
      lga_officer: 'LGA Officer',
      digitisation_officer: 'Digitisation'
    };
    return map[profile.role] || profile.role.toUpperCase();
  };

  const userRole = profile?.role || 'chew';

  // Navigation Items by Role
  const navItems = {
    chew: [
      {
        label: 'Home',
        path: '/chew/dashboard',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
      {
        label: 'Patients',
        path: '/chew/patients',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: 'Lab Interpreter',
        path: '/chew/lab-interpreter',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
      {
        label: 'Code Red',
        path: '/chew/code-red',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ),
      },
    ],
    doctor: [
      {
        label: 'Home',
        path: '/doctor/dashboard',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
    ],
  };

  const currentNavItems = navItems[userRole] || navItems.chew;

  const isActivePath = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-layout">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-left">
          {showBack ? (
            <button
              className="header-back-btn"
              onClick={() => backTo ? navigate(backTo) : navigate(-1)}
              aria-label="Go back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
          ) : (
            <button
              className="hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle sidebar"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          )}

          <div className="header-brand-wrap" onClick={() => navigate('/')}>
            <span className="header-brand-text">ClinIQ Nigeria</span>
          </div>

          {title && showBack && <span className="header-page-title">{title}</span>}
        </div>

        <div className="header-right">
          {/* Connectivity Indicator */}
          <div className="header-connectivity">
            <span className={`connectivity-dot ${online ? 'online' : 'offline'}`} />
            <span className="connectivity-text">{online ? 'Online' : 'Offline'}</span>
          </div>

          {/* Notification bell */}
          <button className="header-bell" aria-label="Notifications" title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>

          {/* User Profile */}
          <div className="header-profile">
            <div className="user-avatar" title={profile?.full_name || 'User Profile'}>
              {getInitials()}
            </div>
            <span className="role-badge">{getRoleLabel()}</span>
          </div>
        </div>
      </header>

      {/* ─── Main Wrapper ─────────────────────────────────────────────────── */}
      <div className="app-main-wrapper">
        {/* ─── Desktop Sidebar ────────────────────────────────────────────── */}
        <aside className="app-sidebar">
          <div className="sidebar-scrollable">
            <div className="sidebar-section">
              <span className="sidebar-section-label">Navigation</span>
              <nav className="sidebar-nav">
                {currentNavItems.map((item) => (
                  <button
                    key={item.path}
                    className={`nav-item ${isActivePath(item.path) ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="sidebar-section sidebar-bottom-section">
              <span className="sidebar-section-label">Account</span>
              <button className="nav-item logout-nav-item" onClick={handleLogout}>
                <span className="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </span>
                <span className="nav-label">Log Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ─── Mobile Drawer/Overlay ──────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <span className="drawer-title">Menu</span>
                <button className="drawer-close" onClick={() => setMobileMenuOpen(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="drawer-body">
                <div className="drawer-profile-info">
                  <div className="drawer-avatar">{getInitials()}</div>
                  <div className="drawer-profile-details">
                    <span className="drawer-name">{profile?.full_name || 'User'}</span>
                    <span className="drawer-email">{profile?.email || profile?.phone_number || ''}</span>
                    <span className="drawer-badge">{getRoleLabel()}</span>
                  </div>
                </div>

                <nav className="drawer-nav">
                  {currentNavItems.map((item) => (
                    <button
                      key={item.path}
                      className={`drawer-nav-item ${isActivePath(item.path) ? 'active' : ''}`}
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                    </button>
                  ))}
                  <button className="drawer-nav-item logout-nav-item" onClick={handleLogout}>
                    <span className="nav-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </span>
                    <span className="nav-label">Log Out</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* ─── Main Content Area ──────────────────────────────────────────── */}
        <main className="app-main-content">
          <div className="app-container">
            {children}
          </div>
        </main>
      </div>

      {/* ─── Mobile Bottom Nav Bar ────────────────────────────────────────── */}
      <nav className="mobile-bottom-nav">
        <button
          className={`bottom-nav-btn ${isActivePath('/chew/dashboard') || isActivePath('/doctor/dashboard') ? 'active' : ''}`}
          onClick={() => navigate('/')}
          aria-label="Home"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          <span className="bottom-nav-label">Home</span>
        </button>

        {userRole === 'chew' ? (
          <button
            className={`bottom-nav-btn ${isActivePath('/chew/patients') ? 'active' : ''}`}
            onClick={() => navigate('/chew/patients')}
            aria-label="Patients"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span className="bottom-nav-label">Patients</span>
          </button>
        ) : (
          <button
            className="bottom-nav-btn disabled-btn"
            disabled
            aria-label="Patients"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.3 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span className="bottom-nav-label" style={{ opacity: 0.3 }}>Patients</span>
          </button>
        )}

        <button
          className={`bottom-nav-btn ${isActivePath('/chew/code-red') ? 'active' : ''}`}
          onClick={() => navigate('/chew/code-red')}
          aria-label="Alerts"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86" />
            <line x1="12" y1="8" x2="12" y2="12" />
          </svg>
          <span className="bottom-nav-label">Alerts</span>
        </button>

        <button
          className="bottom-nav-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span className="bottom-nav-label">Menu</span>
        </button>
      </nav>
    </div>
  );
}
