import { useMemo } from 'react';

export default function DashboardOverview({ pcs, sessions, settings, cafeId }) {
  const now = Date.now();
  const activeSessions = sessions.filter(s => s.status === 'active');
  const waitingSessions = sessions.filter(s => s.status === 'waiting');
  const endedToday = sessions.filter(s => {
    if (s.status !== 'ended') return false;
    const d = new Date(s.startedAt || s.createdAt);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });

  const revenueToday = useMemo(() =>
    endedToday.reduce((sum, s) => sum + (s.price || 0), 0),
    [endedToday]
  );

  const activePcs = pcs.filter(p => p.status === 'active').length;
  const lockedPcs = pcs.filter(p => p.status === 'locked').length;
  const onlinePcs = pcs.filter(p => p.lastSeen && (now - p.lastSeen) < 90000).length;

  return (
    <div className="section-gap">
      {/* Stats Row */}
      <div className="grid-4">
        <div className="stat-card cyan">
          <div className="stat-label">Active Sessions</div>
          <div className="stat-value cyan">{activeSessions.length}</div>
          <div className="stat-sub">{waitingSessions.length} waiting for PC</div>
          <div className="stat-icon">🎮</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Online PCs</div>
          <div className="stat-value green">{onlinePcs}</div>
          <div className="stat-sub">{activePcs} in use, {lockedPcs} locked</div>
          <div className="stat-icon">🖥️</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Sessions Today</div>
          <div className="stat-value orange">{endedToday.length + activeSessions.length}</div>
          <div className="stat-sub">{endedToday.length} completed</div>
          <div className="stat-icon">📋</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Revenue Today</div>
          <div className="stat-value purple">₹{revenueToday}</div>
          <div className="stat-sub">From {endedToday.length} sessions</div>
          <div className="stat-icon">💰</div>
        </div>
      </div>

      {/* Active Sessions Quick View */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🟢 Active Sessions</h3>
          <span className="badge badge-active">{activeSessions.length} Running</span>
        </div>
        {activeSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💤</div>
            <div className="empty-state-title">No active sessions</div>
            <div className="empty-state-sub">Go to Session Generator to start a new session.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>PC</th>
                  <th>Time Left</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.slice(0, 5).map(s => {
                  const remaining = s.endsAt ? Math.max(0, s.endsAt - now) : 0;
                  const mins = Math.floor(remaining / 60000);
                  const secs = Math.floor((remaining % 60000) / 1000);
                  const urgent = remaining < 5 * 60000;
                  return (
                    <tr key={s.id}>
                      <td className="font-mono">{s.phone}</td>
                      <td><span className="badge badge-active">{s.pcId || '—'}</span></td>
                      <td style={{ color: urgent ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                      </td>
                      <td className="text-green font-mono">₹{s.price || 0}</td>
                      <td><span className="badge badge-active">Active</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PC Status Grid */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🖥️ PC Status Overview</h3>
          <span className="text-sm text-muted">{pcs.length} total PCs</span>
        </div>
        {pcs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🖥️</div>
            <div className="empty-state-title">No PCs registered</div>
            <div className="empty-state-sub">Client PCs will appear here when they connect.</div>
          </div>
        ) : (
          <div className="pc-grid">
            {pcs.map(pc => {
              const online = pc.lastSeen && (now - pc.lastSeen) < 90000;
              const dotClass = pc.status === 'active' ? 'dot-active' : pc.status === 'locked' ? 'dot-locked' : online ? 'dot-active' : 'dot-idle';
              return (
                <div key={pc.id} className={`pc-card ${pc.status}`}>
                  <div className="pc-header">
                    <div className="pc-icon">🖥️</div>
                    <div>
                      <div className="pc-name">{pc.name || pc.id}</div>
                      <div className="pc-last-seen">{online ? '🟢 Online' : '⚫ Offline'}</div>
                    </div>
                    <span className={`badge badge-${pc.status || 'idle'}`} style={{ marginLeft: 'auto' }}>
                      <span className={`status-dot ${dotClass}`} />
                      {pc.status || 'idle'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client URL */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔗 Client PC Setup URL</h3>
        </div>
        <p className="text-muted text-sm mb-4">Share this URL with all client PCs. They will auto-register on first launch.</p>
        <div className="url-display">
          {window.location.origin}/client?cafe={cafeId}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/client?cafe=${cafeId}`)}
        >
          📋 Copy URL
        </button>
      </div>
    </div>
  );
}
