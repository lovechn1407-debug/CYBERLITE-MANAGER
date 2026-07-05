import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing-page grid-bg">
      <div className="landing-grid" />
      <div className="landing-glow-1" />
      <div className="landing-glow-2" />

      <div className="landing-content">
        <div className="landing-badge">
          <span>🖥️</span>
          <span>CYBERCAFE MANAGEMENT SUITE</span>
        </div>

        <h1 className="landing-title">
          <span className="gradient-text">Cyber Lite</span>
          <br />
          Manager
        </h1>

        <p className="landing-sub">
          Professional cybercafe PC management. Control sessions, monitor PCs,
          and deliver seamless customer experiences — all in real-time.
        </p>

        <div className="landing-cards">
          <Link to="/host/login" className="landing-card host-card animate-appear">
            <div className="lc-icon host">🏠</div>
            <div className="lc-title">Host Panel</div>
            <p className="lc-desc">
              Manage cafe admins, subscriptions,<br />and platform settings.
            </p>
            <div className="lc-arrow">→</div>
          </Link>

          <Link to="/admin/login" className="landing-card admin-card animate-appear" style={{ animationDelay: '0.08s' }}>
            <div className="lc-icon admin">⚡</div>
            <div className="lc-title">Admin Panel</div>
            <p className="lc-desc">
              Control PCs, manage sessions,<br />monitor real-time activity.
            </p>
            <div className="lc-arrow">→</div>
          </Link>

          <Link to="/client" className="landing-card client-card animate-appear" style={{ animationDelay: '0.16s' }}>
            <div className="lc-icon client">💻</div>
            <div className="lc-title">Client PC</div>
            <p className="lc-desc">
              Customer login screen with<br />4-digit code entry.
            </p>
            <div className="lc-arrow">→</div>
          </Link>
        </div>

        <p className="text-muted text-sm">
          Powered by Firebase Realtime Database &nbsp;·&nbsp; Built for modern cybercafes
        </p>
      </div>
    </div>
  );
}
