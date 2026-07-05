import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const snap = await get(ref(db, 'host/admins'));
      if (!snap.exists()) {
        setError('No registered cafes found.');
        setLoading(false);
        return;
      }

      const adminsData = snap.val();
      const matchedEntry = Object.entries(adminsData).find(
        ([_, admin]) => admin.email.toLowerCase() === email.toLowerCase() && admin.password === password
      );

      if (!matchedEntry) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      const [adminId, adminData] = matchedEntry;

      if (adminData.status === 'suspended') {
        setError('Your account has been suspended. Please contact your host.');
        setLoading(false);
        return;
      }

      if (adminData.planExpiry < Date.now()) {
        setError('Your subscription has expired. Please contact your host to renew.');
        setLoading(false);
        return;
      }

      login({
        uid: adminId,
        email: adminData.email,
        role: 'admin',
        adminData: adminData
      });

      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="auth-page grid-bg">
      <div className="auth-card animate-appear">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <div>
            <div className="auth-logo-text">Cyber <span>Lite</span> Manager</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-4)', marginTop: 2 }}>ADMIN PORTAL</div>
          </div>
        </div>

        <h2 className="auth-title">Admin Login</h2>
        <p className="auth-sub">Sign in to manage your cybercafe operations.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="admin@cafe.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              id="admin-login-email"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              id="admin-login-password"
            />
          </div>
          <button
            className="btn btn-primary btn-lg w-full"
            type="submit"
            disabled={loading}
            id="admin-login-btn"
          >
            {loading
              ? <><span className="spinner spinner-sm" /> Signing in...</>
              : '🔐 Sign In to Admin Panel'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/" className="text-muted text-sm">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
