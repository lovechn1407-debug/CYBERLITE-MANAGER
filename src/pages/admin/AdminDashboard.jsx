import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import DashboardOverview from '../../components/admin/DashboardOverview';
import PCList from '../../components/admin/PCList';
import SessionGenerator from '../../components/admin/SessionGenerator';
import SessionList from '../../components/admin/SessionList';
import NotificationPanel from '../../components/admin/NotificationPanel';
import Settings from '../../components/admin/Settings';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'pcs', icon: '🖥️', label: 'PC Management' },
  { id: 'generator', icon: '🎮', label: 'Session Generator' },
  { id: 'sessions', icon: '📋', label: 'Session List' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

const TAB_TITLES = {
  dashboard: 'Dashboard',
  pcs: 'PC Management',
  generator: 'Session Generator',
  sessions: 'Active Sessions',
  notifications: 'Notifications',
  settings: 'Settings',
};

export default function AdminDashboard() {
  const { currentUser, role, adminData, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pcs, setPcs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [cafeId, setCafeId] = useState(null);

  useEffect(() => {
    if (!loading && (!currentUser || role !== 'admin')) {
      navigate('/admin/login');
    } else if (currentUser) {
      setCafeId(currentUser.uid);
    }
  }, [currentUser, role, loading, navigate]);

  // Listen to PCs
  useEffect(() => {
    if (!cafeId) return;
    const unsub = onValue(ref(db, `cafes/${cafeId}/pcs`), snap => {
      const data = snap.val() || {};
      setPcs(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
    return unsub;
  }, [cafeId]);

  // Listen to Sessions
  useEffect(() => {
    if (!cafeId) return;
    const unsub = onValue(ref(db, `cafes/${cafeId}/sessions`), snap => {
      const data = snap.val() || {};
      setSessions(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
    return unsub;
  }, [cafeId]);

  // Listen to settings
  useEffect(() => {
    if (!cafeId) return;
    const unsub = onValue(ref(db, `cafes/${cafeId}/settings`), snap => {
      setSettings(snap.val() || {});
    });
    return unsub;
  }, [cafeId]);

  if (loading || !cafeId || !settings) {
    return <div className="loader-wrap"><div className="spinner" /><p className="text-muted text-sm">Loading admin panel...</p></div>;
  }

  const activeSessions = sessions.filter(s => s.status === 'active');
  const waitingSessions = sessions.filter(s => s.status === 'waiting');
  const activePcs = pcs.filter(p => p.status === 'active');

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div className="sidebar-logo-text">Cyber <span>Lite</span></div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Management</div>
          {NAV_ITEMS.slice(0, 5).map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              id={`nav-${item.id}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.id === 'sessions' && waitingSessions.length > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--orange)',
                  color: '#000',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 'var(--r-full)',
                }}>
                  {waitingSessions.length}
                </span>
              )}
            </div>
          ))}

          <div className="nav-section-label" style={{ marginTop: 8 }}>System</div>
          <div
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            id="nav-settings"
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item" onClick={() => { logout(); navigate('/admin/login'); }} id="admin-signout">
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Sign Out</span>
          </div>
          <div style={{ padding: '8px 12px 0', fontSize: '0.72rem', color: 'var(--text-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {settings?.cafeName || 'My Cafe'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="page-header">
          <h2 className="page-title">
            {TAB_TITLES[activeTab]}
          </h2>
          <div className="flex items-center gap-3">
            <span style={{ padding: '4px 12px', background: 'var(--green-dim)', color: 'var(--green)', borderRadius: 'var(--r-full)', fontSize: '0.78rem', fontWeight: 600 }}>
              <span className="status-dot dot-active" style={{ marginRight: 6 }} />
              {activePcs.length} Active PCs
            </span>
            <span className="text-sm text-muted">{adminData?.cafeName || settings?.cafeName}</span>
          </div>
        </div>

        <div className="page-body">
          {activeTab === 'dashboard' && (
            <DashboardOverview pcs={pcs} sessions={sessions} settings={settings} cafeId={cafeId} />
          )}
          {activeTab === 'pcs' && (
            <PCList pcs={pcs} sessions={sessions} cafeId={cafeId} />
          )}
          {activeTab === 'generator' && (
            <SessionGenerator cafeId={cafeId} pcs={pcs} settings={settings} />
          )}
          {activeTab === 'sessions' && (
            <SessionList sessions={sessions} pcs={pcs} cafeId={cafeId} />
          )}
          {activeTab === 'notifications' && (
            <NotificationPanel pcs={pcs} cafeId={cafeId} />
          )}
          {activeTab === 'settings' && (
            <Settings cafeId={cafeId} settings={settings} />
          )}
        </div>
      </main>
    </div>
  );
}
