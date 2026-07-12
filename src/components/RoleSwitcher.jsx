import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoRole, DEMO_USERS } from '../context/DemoRoleContext';
import './RoleSwitcher.css';

const ROLES = [
  {
    value: 'chew',
    name: 'CHEW / Nurse',
    description: 'Frontline health worker at PHC',
    color: '#1B4F8A',
    icon: '🩺',
  },
  {
    value: 'doctor',
    name: 'Remote Doctor',
    description: 'Reviews consultations and Code Red alerts',
    color: '#7C3AED',
    icon: '👨‍⚕️',
  },
  {
    value: 'lga_officer',
    name: 'LGA Health Officer',
    description: 'Monitors outbreaks and PHC performance',
    color: '#D97706',
    icon: '📊',
  },
  {
    value: 'admin',
    name: 'PHC Administrator',
    description: 'Manages staff and digitisation progress',
    color: '#DC2626',
    icon: '🛡️',
  },
  {
    value: 'digitisation_officer',
    name: 'Digitisation Officer',
    description: 'Scans and digitises historical paper records',
    color: '#0E7C7B',
    icon: '📷',
  },
];

export default function RoleSwitcher() {
  const { demoRole, currentUser, switchRole, toastMessage, toastVisible } = useDemoRole();
  const [panelOpen, setPanelOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const navigate = useNavigate();

  function openPanel() { setPanelOpen(true); setClosing(false); }

  function closePanel() {
    setClosing(true);
    setTimeout(() => { setPanelOpen(false); setClosing(false); }, 300);
  }

  function handleRoleSelect(roleValue) {
    if (roleValue === demoRole) { closePanel(); return; }
    switchRole(roleValue);
    closePanel();
    const user = DEMO_USERS[roleValue];
    if (user?.homePath) {
      setTimeout(() => navigate(user.homePath), 320); // wait for panel slide-down
    }
  }

  return (
    <>
      {/* ── Toast notification ─────────────────────────────────────────────── */}
      {toastVisible && (
        <div className="rs-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

      {/* ── Floating "Switch Role" button ──────────────────────────────────── */}
      <button
        id="switch-role-btn"
        className="rs-fab"
        onClick={openPanel}
        aria-label="Switch demo role"
      >
        <span
          className="rs-fab-dot"
          style={{ background: currentUser.roleColor }}
        />
        <span className="rs-fab-label">Switch Role</span>
        <svg className="rs-fab-chevron" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* ── Backdrop + Panel ───────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div
            className={`rs-backdrop ${closing ? 'rs-backdrop--hiding' : ''}`}
            onClick={closePanel}
            aria-hidden="true"
          />
          <div
            className={`rs-panel ${closing ? 'rs-panel--closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Switch dashboard view"
          >
            {/* Panel header */}
            <div className="rs-panel-header">
              <div className="rs-panel-drag-handle" />
              <h2 className="rs-panel-title">Switch Dashboard View</h2>
              <p className="rs-panel-sub">Demo mode: switch between roles instantly</p>
            </div>

            {/* Role rows */}
            <div className="rs-role-list">
              {ROLES.map((role) => {
                const isActive = role.value === demoRole;
                return (
                  <button
                    key={role.value}
                    className={`rs-role-row ${isActive ? 'rs-role-row--active' : ''}`}
                    onClick={() => handleRoleSelect(role.value)}
                    aria-pressed={isActive}
                    id={`role-option-${role.value}`}
                  >
                    {/* Left: coloured circle */}
                    <span
                      className="rs-role-icon-circle"
                      style={{ background: role.color }}
                      aria-hidden="true"
                    >
                      <span className="rs-role-emoji">{role.icon}</span>
                    </span>

                    {/* Middle: name + description */}
                    <span className="rs-role-info">
                      <span className="rs-role-name">{role.name}</span>
                      <span className="rs-role-desc">{role.description}</span>
                    </span>

                    {/* Right: checkmark if active */}
                    {isActive && (
                      <svg className="rs-role-check" width="20" height="20" viewBox="0 0 24 24"
                        fill="none" stroke="#1B4F8A" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cancel */}
            <button className="rs-cancel-btn" onClick={closePanel}>Cancel</button>
          </div>
        </>
      )}
    </>
  );
}
