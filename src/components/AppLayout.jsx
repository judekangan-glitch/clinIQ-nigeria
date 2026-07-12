import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoRole } from '../context/DemoRoleContext';
import { useConnectivity } from '../hooks/useConnectivity';
import RoleSwitcher from './RoleSwitcher';
import './AppLayout.css';

/* ─────────────────────────────────────────────────────────────────────
   Role-specific navigation definitions
   ───────────────────────────────────────────────────────────────────── */
const NAV_ITEMS = {
  chew: [
    { label: 'Dashboard', path: '/chew/dashboard', icon: '🏠' },
    { label: 'New Consultation', path: '/chew/consultation/new', icon: '➕' },
    { label: 'Patient Records', path: '/chew/patients', icon: '📁' },
    { label: 'Code Red Alert', path: '/chew/code-red', icon: '🚨', danger: true },
    { label: 'Lab Interpreter', path: '/chew/lab-interpreter', icon: '🧪' },
    { label: 'My Learning', path: '/chew/learning', icon: '🎓' },
  ],
  doctor: [
    { label: 'Dashboard', path: '/doctor/dashboard', icon: '🏠' },
    { label: 'Pending Reviews', path: '/doctor/dashboard', icon: '📋', badge: 'pending' },
    { label: 'All Cases', path: '/doctor/dashboard', icon: '📄' },
    { label: 'Code Red Alerts', path: '/doctor/dashboard', icon: '🚨', danger: true },
  ],
  lga_officer: [
    { label: 'Dashboard', path: '/lga/dashboard', icon: '🏠' },
    { label: 'Outbreak Monitor', path: '/lga/outbreaks', icon: '⚠️' },
    { label: 'Disease Trends', path: '/lga/trends', icon: '📈' },
    { label: 'PHC Performance', path: '/lga/performance', icon: '📊' },
    { label: 'Supply Alerts', path: '/lga/supplies', icon: '📦' },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '🏠' },
    { label: 'Staff Management', path: '/admin/staff', icon: '👥' },
    { label: 'Digitisation Progress', path: '/admin/digitisation', icon: '📷' },
    { label: 'PHC Settings', path: '/admin/settings', icon: '⚙️' },
  ],
  digitisation_officer: [
    { label: 'Scan Records', path: '/digitisation/scan', icon: '📷' },
    { label: 'My Progress', path: '/digitisation/scan', icon: '✅' },
  ],
};

export default function AppLayout({ children, title, showBack = false, backTo, navItems: propNavItems }) {
  const { logout } = useAuth();
  const { currentUser } = useDemoRole();
  const navigate = useNavigate();
  const location = useLocation();
  const online = useConnectivity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const getInitials = () => {
    const name = currentUser?.name || '';
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const role = currentUser?.role || 'chew';
  const roleColor = currentUser?.roleColor || '#1B4F8A';
  const currentNavItems = propNavItems || NAV_ITEMS[role] || NAV_ITEMS.chew;

  const isActivePath = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="app-layout">
      {/* ─── Header ────────────────────────────────────────────────────── */}
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
          {/* Connectivity */}
          <div className="header-connectivity">
            <span className={`connectivity-dot ${online ? 'online' : 'offline'}`} />
            <span className="connectivity-text">{online ? 'Online' : 'Offline'}</span>
          </div>

          {/* Notification bell */}
          <button className="header-bell" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>

          {/* User avatar + role badge */}
          <div className="header-profile">
            <div
              className="user-avatar"
              style={{ background: roleColor }}
              title={currentUser?.name || 'User'}
            >
              {getInitials()}
            </div>
            <span className="role-badge">{currentUser?.roleLabel || ''}</span>
          </div>
        </div>
      </header>

      {/* ─── Main wrapper ───────────────────────────────────────────────── */}
      <div className="app-main-wrapper">
        {/* Desktop Sidebar */}
        <aside className="app-sidebar">
          <div className="sidebar-scrollable">
            {/* Role pill at top of sidebar */}
            <div className="sidebar-role-pill" style={{ borderColor: roleColor, color: roleColor }}>
              <span
                className="sidebar-role-dot"
                style={{ background: roleColor }}
              />
              {currentUser?.roleLabel}
            </div>

            <div className="sidebar-section">
              <span className="sidebar-section-label">Navigation</span>
              <nav className="sidebar-nav">
                {currentNavItems.map((item) => (
                  <button
                    key={item.label}
                    className={`nav-item ${isActivePath(item.path) ? 'active' : ''} ${item.danger ? 'nav-item--danger' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <span className="nav-icon nav-emoji-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">!</span>
                    )}
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

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <span className="drawer-title">Menu</span>
                <button className="drawer-close" onClick={() => setMobileMenuOpen(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="drawer-body">
                <div className="drawer-profile-info">
                  <div
                    className="drawer-avatar"
                    style={{ background: roleColor }}
                  >
                    {getInitials()}
                  </div>
                  <div className="drawer-profile-details">
                    <span className="drawer-name">{currentUser?.name || 'User'}</span>
                    <span className="drawer-badge" style={{ background: roleColor + '22', color: roleColor }}>
                      {currentUser?.roleLabel}
                    </span>
                  </div>
                </div>

                <nav className="drawer-nav">
                  {currentNavItems.map((item) => (
                    <button
                      key={item.label}
                      className={`drawer-nav-item ${isActivePath(item.path) ? 'active' : ''} ${item.danger ? 'nav-item--danger' : ''}`}
                      onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                    >
                      <span className="nav-icon nav-emoji-icon">{item.icon}</span>
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

        {/* Main Content */}
        <main className="app-main-content">
          <div className="app-container">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <button
          className={`bottom-nav-btn ${isActivePath('/chew/dashboard') || isActivePath('/doctor/dashboard') || isActivePath('/lga/dashboard') || isActivePath('/admin/dashboard') || isActivePath('/digitisation/scan') ? 'active' : ''}`}
          onClick={() => navigate(currentUser?.homePath || '/')}
          aria-label="Home"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          <span className="bottom-nav-label">Home</span>
        </button>

        {role === 'chew' && (
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
        )}

        {role === 'chew' && (
          <button
            className={`bottom-nav-btn ${isActivePath('/chew/code-red') ? 'active' : ''}`}
            onClick={() => navigate('/chew/code-red')}
            aria-label="Code Red"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86" />
              <line x1="12" y1="8" x2="12" y2="12" />
            </svg>
            <span className="bottom-nav-label">Alerts</span>
          </button>
        )}

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

      {/* ─── Role Switcher FAB (always visible) ─────────────────────────── */}
      <RoleSwitcher />
    </div>
  );
}
