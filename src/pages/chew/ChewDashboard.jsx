import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AppLayout from '../../components/AppLayout';
import './ChewDashboard.css';

function getTodayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-NG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function ChewDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ seen: 0, pending: 0, reviews: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const chewId = profile?.id;

  useEffect(() => {
    if (!chewId) return;
    fetchDashboardData();
  }, [chewId]);

  async function fetchDashboardData() {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    try {
      // Patients seen today
      const { count: seen } = await supabase
        .from('consultations')
        .select('id', { count: 'exact', head: true })
        .eq('chew_id', chewId)
        .eq('consultation_date', today);

      // Pending sync
      const { count: pending } = await supabase
        .from('consultations')
        .select('id', { count: 'exact', head: true })
        .eq('chew_id', chewId)
        .eq('synced', false);

      // Reviews received today — join through consultations
      const { data: myConsults } = await supabase
        .from('consultations')
        .select('id')
        .eq('chew_id', chewId);

      const myIds = (myConsults || []).map(c => c.id);
      let reviews = 0;
      if (myIds.length > 0) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('doctor_reviews')
          .select('id', { count: 'exact', head: true })
          .in('consultation_id', myIds)
          .gte('created_at', todayStart.toISOString());
        reviews = count || 0;
      }

      setStats({ seen: seen || 0, pending: pending || 0, reviews });

      // Recent 5 consultations
      const { data: recentData } = await supabase
        .from('consultations')
        .select(`
          id, consultation_date, chief_complaint, doctor_review_status,
          patients (full_name)
        `)
        .eq('chew_id', chewId)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecent(recentData || []);
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'CHEW';

  const actionCards = [
    {
      id: 'new-consultation',
      label: 'New Consultation',
      className: 'action-card-consultation',
      route: '/chew/consultation/new',
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
    },
    {
      id: 'patient-records',
      label: 'Patient Records',
      className: 'action-card-records',
      route: '/chew/patients',
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      id: 'code-red',
      label: 'Code Red Alert',
      className: 'action-card-codered',
      route: '/chew/code-red',
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
    },
    {
      id: 'my-learning',
      label: 'My Learning',
      className: 'action-card-learning',
      route: '/chew/learning',
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      ),
    },
  ];

  function statusBadge(status) {
    const map = {
      pending: { label: 'Pending Review', cls: 'badge-pending' },
      reviewed: { label: 'Reviewed', cls: 'badge-reviewed' },
      correction_sent: { label: 'Correction Received', cls: 'badge-correction' },
    };
    return map[status] || { label: status, cls: 'badge-pending' };
  }

  return (
    <AppLayout>
      <div className="dashboard-content">

        {/* Welcome banner */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h1 className="welcome-greeting">{getTodayGreeting()}, {firstName}! 👋</h1>
            <p className="welcome-date">{formatDate()}</p>
          </div>
          <div className="welcome-avatar">
            {firstName.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="sections-gap">
          {/* 2x2 Action cards */}
          <section className="action-section">
            <div className="action-grid">
              {actionCards.map(card => (
                <button
                  key={card.id}
                  id={card.id}
                  className={`action-card ${card.className}`}
                  onClick={() => navigate(card.route)}
                >
                  <div className="action-icon">{card.icon}</div>
                  <span className="action-label">{card.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Today at a glance */}
          <section className="glance-section">
            <h2 className="section-title">Today at a Glance</h2>
            <div className="glance-row">
              <div className="stat-card">
                <span className="glance-number">{loading ? '—' : stats.seen}</span>
                <span className="glance-label">Patients Seen</span>
              </div>
              <div className="stat-card">
                <span className="glance-number">{loading ? '—' : stats.pending}</span>
                <span className="glance-label">Pending Sync</span>
              </div>
              <div className="stat-card">
                <span className="glance-number">{loading ? '—' : stats.reviews}</span>
                <span className="glance-label">Reviews In</span>
              </div>
            </div>
          </section>

          {/* Recent consultations */}
          <section className="recent-section">
            <h2 className="section-title">Recent Consultations</h2>

            {loading ? (
              <div className="loading-placeholder">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton skeleton-row-loader" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <h3 className="empty-state-title">No consultations yet today</h3>
                <p className="empty-state-subtitle">Tap New Consultation to get started.</p>
              </div>
            ) : (
              <div className="recent-list">
                {recent.map(c => {
                  const badge = statusBadge(c.doctor_review_status);
                  return (
                    <button
                      key={c.id}
                      className="recent-item"
                      onClick={() => navigate(`/chew/consultation/${c.id}`)}
                    >
                      <div className="recent-item-top">
                        <span className="recent-patient">
                          {c.patients?.full_name || 'Unknown Patient'}
                        </span>
                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="recent-item-bottom">
                        <span className="recent-complaint">{c.chief_complaint}</span>
                        <span className="recent-date">
                          {new Date(c.consultation_date).toLocaleDateString('en-NG', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
