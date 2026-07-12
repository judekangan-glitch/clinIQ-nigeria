import { createContext, useContext, useState, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────────
   DemoRoleContext
   Provides the current demo role and pre-set user data for showcase
   ───────────────────────────────────────────────────────────────────── */

export const DEMO_USERS = {
  chew: {
    role: 'chew',
    name: 'Nurse Rifkatu Gyang',
    phc: 'Langtang North PHC',
    lga: 'Langtang North',
    initials: 'RG',
    roleLabel: 'CHEW / Nurse',
    roleColor: '#1B4F8A',
    homePath: '/chew/dashboard',
  },
  doctor: {
    role: 'doctor',
    name: 'Dr Amina Sule',
    specialty: 'General Practice',
    hospital: 'Jos University Teaching Hospital',
    initials: 'AS',
    roleLabel: 'Remote Doctor',
    roleColor: '#7C3AED',
    homePath: '/doctor/dashboard',
  },
  lga_officer: {
    role: 'lga_officer',
    name: 'Officer Ladi Musa',
    lga: 'Langtang North',
    state: 'Plateau',
    initials: 'LM',
    roleLabel: 'LGA Health Officer',
    roleColor: '#D97706',
    homePath: '/lga/dashboard',
  },
  admin: {
    role: 'admin',
    name: 'Admin Bulus Pwajok',
    phc: 'Langtang North PHC',
    initials: 'BP',
    roleLabel: 'PHC Administrator',
    roleColor: '#DC2626',
    homePath: '/admin/dashboard',
  },
  digitisation_officer: {
    role: 'digitisation_officer',
    name: 'Digi Officer Ngo Pam',
    phc: 'Langtang North PHC',
    initials: 'NP',
    roleLabel: 'Digitisation Officer',
    roleColor: '#0E7C7B',
    homePath: '/digitisation/scan',
  },
};

const DemoRoleContext = createContext(null);

export function DemoRoleProvider({ children }) {
  const [demoRole, setDemoRole] = useState('chew');
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  const switchRole = useCallback((role) => {
    setDemoRole(role);
    const user = DEMO_USERS[role];
    if (user) {
      showToast(`Switched to ${user.roleLabel} view`);
    }
  }, [showToast]);

  const currentUser = DEMO_USERS[demoRole] || DEMO_USERS.chew;

  return (
    <DemoRoleContext.Provider value={{ demoRole, currentUser, switchRole, toastMessage, toastVisible }}>
      {children}
    </DemoRoleContext.Provider>
  );
}

export function useDemoRole() {
  const ctx = useContext(DemoRoleContext);
  if (!ctx) throw new Error('useDemoRole must be used inside DemoRoleProvider');
  return ctx;
}
