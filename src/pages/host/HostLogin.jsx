import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ref, get, set } from 'firebase/database';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function HostLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const snap = await get(ref(db, 'host/profile'));
      if (snap.exists()) {
        const host = snap.val();
        if (host.email === email && host.password === password) {
          login({
            uid: 'host_root',
            email: email,
            role: 'host'
          });
          navigate('/host/dashboard');
        } else {
          setError('Invalid email or password.');
        }
      } else {
        setError('No host profile found. Please register via Setup Host Account.');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSetupHost(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Check if host already exists
      const snap = await get(ref(db, 'host/profile'));
      if (snap.exists()) {
        setError('A host account already exists. Please login instead.');
        setSetupMode(false);
        setLoading(false);
        return;
      }
      
      const hostData = {
        email: email,
        password: password,
        createdAt: Date.now(),
      };
      await set(ref(db, 'host/profile'), hostData);
      
      login({
        uid: 'host_root',
        email: email,
        role: 'host'
      });
      navigate('/host/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="auth-page grid-bg">
      <div className="auth-card animate-appear">
        <div className="auth-logo">
          <div className="auth-logo-icon">🏠</div>
          <div>
            <div className="auth-logo-text">Cyber <span>Lite</span> Manager</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-4)', marginTop: 2 }}>HOST PORTAL</div>
          </div>
        </div>

        <h2 className="auth-title">{setupMode ? 'Setup Host Account' : 'Host Login'}</h2>
        <p className="auth-sub">{setupMode
          ? 'Create the master host account for this platform.'
          : 'Sign in to manage cafes and subscriptions.'}</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={setupMode ? handleSetupHost : handleLogin}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="host@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              id="host-email"
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
              id="host-password"
            />
          </div>
          <button
            className="btn btn-purple btn-lg w-full"
            type="submit"
            disabled={loading}
            id="host-submit-btn"
          >
            {loading ? <><span className="spinner spinner-sm" /> Processing...</> :
              setupMode ? '🚀 Create Host Account' : '🔐 Sign In as Host'}
          </button>
        </form>

        <div className="auth-divider" style={{ marginTop: 20 }}>
          <span>{setupMode ? 'Already have an account?' : 'First time setup?'}</span>
        </div>
        <button
          className="btn btn-ghost w-full"
          onClick={() => { setSetupMode(!setupMode); setError(''); }}
          style={{ marginTop: 8 }}
          id="host-toggle-mode"
        >
          {setupMode ? 'Go to Login' : '⚡ Setup Host Account'}
        </button>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/" className="text-muted text-sm">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
