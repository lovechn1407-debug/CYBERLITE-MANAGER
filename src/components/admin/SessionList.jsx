import React, { useState, useEffect } from 'react';
import { ref, update, remove } from 'firebase/database';
import { db } from '../../firebase';

export default function SessionList({ sessions, pcs, cafeId }) {
  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEndSession = async (session) => {
    if (!window.confirm(`Are you sure you want to end the session for ${session.phone}?`)) return;

    try {
      const updates = {};
      updates[`cafes/${cafeId}/sessions/${session.id}/status`] = 'ended';
      updates[`cafes/${cafeId}/sessions/${session.id}/endsAt`] = Date.now();

      // Release PC if assigned
      if (session.pcId) {
        updates[`cafes/${cafeId}/pcs/${session.pcId}/status`] = 'idle';
      }

      await update(ref(db), updates);
    } catch (e) {
      console.error(e);
      alert('Error ending session: ' + e.message);
    }
  };

  const handleExtendSession = async (session) => {
    const minsStr = prompt('Enter extra minutes to add to this session:', '30');
    if (!minsStr) return;
    const mins = parseInt(minsStr, 10);
    if (isNaN(mins) || mins <= 0) {
      alert('Please enter a valid positive number of minutes.');
      return;
    }

    try {
      const extensionMs = mins * 60 * 1000;
      let newEndsAt = Date.now() + extensionMs;

      if (session.status === 'active' && session.endsAt) {
        newEndsAt = session.endsAt + extensionMs;
      }

      const updates = {};
      updates[`cafes/${cafeId}/sessions/${session.id}/endsAt`] = newEndsAt;
      updates[`cafes/${cafeId}/sessions/${session.id}/timeMinutes`] = (session.timeMinutes || 0) + mins;
      
      // If ended, revive it
      if (session.status === 'ended') {
        updates[`cafes/${cafeId}/sessions/${session.id}/status`] = 'active';
        if (session.pcId) {
          updates[`cafes/${cafeId}/pcs/${session.pcId}/status`] = 'active';
        }
      }

      await update(ref(db), updates);
      alert(`Extended session by ${mins} minutes.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSessionRecord = async (session) => {
    if (!window.confirm('Delete this session record?')) return;
    try {
      await remove(ref(db, `cafes/${cafeId}/sessions/${session.id}`));
    } catch (e) {
      console.error(e);
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const waitingSessions = sessions.filter(s => s.status === 'waiting');
  const pastSessions = sessions.filter(s => s.status === 'ended');

  const renderTimer = (session) => {
    if (session.status === 'waiting') return <span className="text-muted">Not started</span>;
    if (session.status === 'ended') return <span className="text-muted">Expired / Ended</span>;

    const remaining = session.endsAt ? Math.max(0, session.endsAt - time) : 0;
    
    // Automatically flag or end if completed locally and not synced
    if (remaining === 0 && session.status === 'active') {
      return <span className="text-red font-bold">Time Expired</span>;
    }

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const urgent = remaining < 5 * 60000;

    return (
      <span style={{ color: urgent ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    );
  };

  return (
    <div className="section-gap">
      {/* Active Sessions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🟢 Active Session Monitoring</h3>
          <span className="badge badge-active">{activeSessions.length} active</span>
        </div>
        {activeSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🟢</div>
            <div className="empty-state-title">No active sessions</div>
            <div className="empty-state-sub">Valid customer codes will trigger sessions here.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phone Number</th>
                  <th>PIN Code</th>
                  <th>Assigned PC</th>
                  <th>Timer</th>
                  <th>Rate Paid</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.phone}</strong></td>
                    <td className="font-mono text-cyan">{s.code}</td>
                    <td>
                      <span className="badge badge-pro">{s.pcId || 'Not Assigned'}</span>
                    </td>
                    <td>{renderTimer(s)}</td>
                    <td className="text-green font-mono">₹{s.price}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleExtendSession(s)}>➕ Extend</button>
                        <button className="btn btn-red btn-sm" onClick={() => handleEndSession(s)}>🛑 Stop</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Waiting Sessions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⏳ Waiting Codes</h3>
          <span className="badge badge-waiting">{waitingSessions.length} waiting</span>
        </div>
        {waitingSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <div className="empty-state-title">No codes waiting</div>
            <div className="empty-state-sub">New codes generated from Generator will appear here.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phone Number</th>
                  <th>PIN Access Code</th>
                  <th>Purchased Time</th>
                  <th>Price</th>
                  <th>Date Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {waitingSessions.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.phone}</strong></td>
                    <td className="font-mono text-cyan" style={{ fontSize: '1rem', fontWeight: 'bold' }}>{s.code}</td>
                    <td>{s.timeMinutes} min</td>
                    <td className="text-green font-mono">₹{s.price}</td>
                    <td className="text-muted text-sm">{new Date(s.createdAt).toLocaleTimeString()}</td>
                    <td>
                      <button className="btn btn-red btn-sm" onClick={() => handleDeleteSessionRecord(s)}>Cancel Code</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Session History (Today)</h3>
          <span className="badge badge-ended">{pastSessions.length} ended</span>
        </div>
        {pastSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No completed sessions</div>
            <div className="empty-state-sub">All expired sessions will save here.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phone Number</th>
                  <th>Assigned PC</th>
                  <th>Total Time</th>
                  <th>Revenue</th>
                  <th>Started At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastSessions.slice(0, 10).map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.phone}</strong></td>
                    <td><span className="badge badge-idle">{s.pcId || 'N/A'}</span></td>
                    <td>{s.timeMinutes} min</td>
                    <td className="text-green font-mono">₹{s.price}</td>
                    <td className="text-muted text-sm">
                      {s.startedAt ? new Date(s.startedAt).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteSessionRecord(s)}>Delete Log</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
