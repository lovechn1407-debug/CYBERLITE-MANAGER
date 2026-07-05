import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/shared/Modal';

const PLANS = [
  { id: 'basic', name: 'Basic', price: '₹999', pcs: '10 PCs', color: 'green' },
  { id: 'pro', name: 'Pro', price: '₹1,999', pcs: '30 PCs', color: 'cyan' },
  { id: 'enterprise', name: 'Enterprise', price: '₹4,999', pcs: 'Unlimited', color: 'purple' },
];

const PLAN_DURATION = {
  '1month': 30,
  '3months': 90,
  '6months': 180,
  '1year': 365,
};

export default function HostDashboard() {
  const { currentUser, role, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [form, setForm] = useState({ cafeName: '', email: '', password: '', plan: 'basic', duration: '1month' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!loading && (!currentUser || role !== 'host')) {
      navigate('/host/login');
    }
  }, [currentUser, role, loading, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const adminsRef = ref(db, 'host/admins');
    const unsub = onValue(adminsRef, snap => {
      const data = snap.val() || {};
      setAdmins(Object.entries(data).map(([uid, v]) => ({ uid, ...v })));
    });
    return unsub;
  }, [currentUser]);

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const days = PLAN_DURATION[form.duration];
      const expiry = Date.now() + days * 24 * 3600 * 1000;

      if (editAdmin) {
        // Update existing admin (no password change via this flow)
        await update(ref(db, `host/admins/${editAdmin.uid}`), {
          cafeName: form.cafeName,
          plan: form.plan,
          planExpiry: expiry,
          status: 'active',
        });
        // Also update cafe settings name
        await update(ref(db, `cafes/${editAdmin.uid}/settings`), {
          cafeName: form.cafeName,
          plan: form.plan,
        });
      } else {
        // Check if email already used by another admin
        const duplicate = admins.find(a => a.email.toLowerCase() === form.email.toLowerCase());
        if (duplicate) {
          setError('An admin account with this email already exists.');
          setFormLoading(false);
          return;
        }

        const uid = 'admin_' + Math.floor(100000 + Math.random() * 900000).toString();

        const adminData = {
          uid,
          email: form.email,
          password: form.password,
          cafeName: form.cafeName,
          plan: form.plan,
          planExpiry: expiry,
          status: 'active',
          createdAt: Date.now(),
        };
        await set(ref(db, `host/admins/${uid}`), adminData);

        // Initialize cafe settings
        await set(ref(db, `cafes/${uid}/settings`), {
          cafeName: form.cafeName,
          plan: form.plan,
          pricePerSlot: { '5': 10, '10': 20, '20': 35, '30': 50, '45': 70, '60': 90, '90': 130, '120': 170, '180': 240, '300': 380 },
          createdAt: Date.now(),
        });
      }

      setShowModal(false);
      setForm({ cafeName: '', email: '', password: '', plan: 'basic', duration: '1month' });
      setEditAdmin(null);
    } catch (err) {
      setFormError(err.message);
    }
    setFormLoading(false);
  }

  async function handleSuspend(admin) {
    const newStatus = admin.status === 'active' ? 'suspended' : 'active';
    await update(ref(db, `host/admins/${admin.uid}`), { status: newStatus });
  }

  async function handleDelete(admin) {
    if (!window.confirm(`Delete ${admin.cafeName}? This cannot be undone.`)) return;
    await remove(ref(db, `host/admins/${admin.uid}`));
  }

  function openEdit(admin) {
    setEditAdmin(admin);
    setForm({ cafeName: admin.cafeName, email: admin.email, password: '', plan: admin.plan, duration: '1month' });
    setFormError('');
    setShowModal(true);
  }

  function openCreate() {
    setEditAdmin(null);
    setForm({ cafeName: '', email: '', password: '', plan: 'basic', duration: '1month' });
    setFormError('');
    setShowModal(true);
  }

  const activeAdmins = admins.filter(a => a.status === 'active').length;
  const expiredAdmins = admins.filter(a => a.planExpiry < Date.now()).length;

  const filtered = admins.filter(a =>
    a.cafeName?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;

  return (
    <div className="host-layout">
      <header className="host-header">
        <div className="flex items-center gap-3">
          <div className="auth-logo-icon" style={{ width: 36, height: 36, fontSize: '1rem' }}>🏠</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
              Cyber <span className="text-cyan">Lite</span> Manager
            </div>
            <div className="text-xs text-muted">HOST PORTAL</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{currentUser?.email}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/host/login'); }} id="host-signout">
            Sign Out
          </button>
        </div>
      </header>

      <div className="host-body">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '0.04em' }}>
              Cafe <span className="text-cyan">Dashboard</span>
            </h1>
            <p className="text-muted text-sm mt-2">Manage all registered cybercafe admins and their subscriptions.</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate} id="host-add-admin-btn">
            + Add New Cafe
          </button>
        </div>

        {/* Stats */}
        <div className="host-stats">
          <div className="stat-card cyan">
            <div className="stat-label">Total Cafes</div>
            <div className="stat-value cyan">{admins.length}</div>
            <div className="stat-sub">All registered</div>
            <div className="stat-icon">🏪</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Active</div>
            <div className="stat-value green">{activeAdmins}</div>
            <div className="stat-sub">Running subscriptions</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">Expired</div>
            <div className="stat-value orange">{expiredAdmins}</div>
            <div className="stat-sub">Need renewal</div>
            <div className="stat-icon">⚠️</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Suspended</div>
            <div className="stat-value purple">{admins.filter(a => a.status === 'suspended').length}</div>
            <div className="stat-sub">Access blocked</div>
            <div className="stat-icon">🚫</div>
          </div>
        </div>

        {/* Search + Table */}
        <div className="card" style={{ marginTop: 0 }}>
          <div className="card-header">
            <h3 className="card-title">Registered Cafes</h3>
            <input
              className="input"
              style={{ maxWidth: 260, padding: '8px 14px' }}
              placeholder="🔍 Search cafes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="host-search"
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cafe Name</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🏪</div>
                      <div className="empty-state-title">No cafes yet</div>
                      <div className="empty-state-sub">Click "Add New Cafe" to get started.</div>
                    </div>
                  </td></tr>
                )}
                {filtered.map(admin => {
                  const expired = admin.planExpiry < Date.now();
                  const statusLabel = admin.status === 'suspended' ? 'suspended' :
                    expired ? 'expired' : 'active';
                  return (
                    <tr key={admin.uid}>
                      <td><strong>{admin.cafeName}</strong></td>
                      <td className="text-muted font-mono" style={{ fontSize: '0.82rem' }}>{admin.email}</td>
                      <td>
                        <span className={`badge badge-${admin.plan}`}>
                          {PLANS.find(p => p.id === admin.plan)?.name || admin.plan}
                        </span>
                      </td>
                      <td className="text-sm">
                        {admin.planExpiry
                          ? new Date(admin.planExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td>
                        <span className={`badge badge-${statusLabel}`}>
                          <span className={`status-dot dot-${statusLabel === 'active' ? 'active' : statusLabel === 'expired' ? 'idle' : 'locked'}`} />
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(admin)}>Edit</button>
                          <button
                            className={`btn btn-sm ${admin.status === 'active' ? 'btn-orange' : 'btn-green'}`}
                            onClick={() => handleSuspend(admin)}
                          >
                            {admin.status === 'active' ? 'Suspend' : 'Restore'}
                          </button>
                          <button className="btn btn-red btn-sm" onClick={() => handleDelete(admin)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title={editAdmin ? 'Edit Cafe Admin' : 'Add New Cafe Admin'}>
        <form onSubmit={handleCreateAdmin}>
          {formError && <div className="auth-error mb-4">{formError}</div>}
          <div className="section-gap">
            <div className="input-group">
              <label className="input-label">Cafe Name</label>
              <input className="input" placeholder="e.g. Star Cyber Cafe" value={form.cafeName}
                onChange={e => setForm(f => ({ ...f, cafeName: e.target.value }))} required id="admin-cafename" />
            </div>
            {!editAdmin && <>
              <div className="input-group">
                <label className="input-label">Admin Email</label>
                <input className="input" type="email" placeholder="admin@cafe.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required id="admin-email" />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input className="input" type="password" placeholder="Min 6 characters" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} id="admin-password" />
              </div>
            </>}

            <div>
              <div className="input-label mb-2">Subscription Plan</div>
              <div className="plan-grid">
                {PLANS.map(p => (
                  <div
                    key={p.id}
                    className={`plan-card ${form.plan === p.id ? `selected ${p.id}` : ''}`}
                    onClick={() => setForm(f => ({ ...f, plan: p.id }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`plan-name text-${p.color}`}>{p.name}</div>
                    <div className="plan-price" style={{ color: `var(--${p.color})` }}>{p.price}<span>/mo</span></div>
                    <div className="plan-features">{p.pcs}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Duration</label>
              <select className="input" value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} id="admin-duration">
                <option value="1month">1 Month</option>
                <option value="3months">3 Months</option>
                <option value="6months">6 Months</option>
                <option value="1year">1 Year</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={formLoading} id="admin-save-btn">
              {formLoading ? <><span className="spinner spinner-sm" /> Saving...</> :
                editAdmin ? 'Update Admin' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
