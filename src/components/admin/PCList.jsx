import React, { useState } from 'react';
import { ref, update, push } from 'firebase/database';
import { db } from '../../firebase';
import Modal from '../shared/Modal';

export default function PCList({ pcs, sessions, cafeId }) {
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [selectedPC, setSelectedPC] = useState(null);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifPC, setNotifPC] = useState(null);

  const now = Date.now();

  const handleLockUnlock = async (pc) => {
    const nextStatus = pc.status === 'locked' ? 'idle' : 'locked';
    try {
      await update(ref(db, `cafes/${cafeId}/pcs/${pc.id}`), {
        status: nextStatus
      });
      // Send notification system command to client
      await push(ref(db, `cafes/${cafeId}/notifications/${pc.id}`), {
        message: `Your PC has been ${nextStatus === 'locked' ? 'manually locked' : 'unlocked'} by the administrator.`,
        type: nextStatus === 'locked' ? 'lock' : 'unlock',
        timestamp: Date.now()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifMessage.trim() || !notifPC) return;
    try {
      await push(ref(db, `cafes/${cafeId}/notifications/${notifPC.id}`), {
        message: notifMessage,
        type: 'alert',
        timestamp: Date.now()
      });
      setShowNotifModal(false);
      setNotifMessage('');
      setNotifPC(null);
      alert('Notification sent to client PC.');
    } catch (err) {
      console.error(err);
    }
  };

  const openScreenShare = (pc) => {
    setSelectedPC(pc);
    setShowScreenModal(true);
  };

  return (
    <div className="section-gap">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🖥️ Connected PCs</h3>
          <span className="badge badge-active">{pcs.length} Registered</span>
        </div>

        {pcs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🖥️</div>
            <div className="empty-state-title">No client PCs connected</div>
            <div className="empty-state-sub">Open the client panel URL on customer computers to connect them.</div>
          </div>
        ) : (
          <div className="pc-grid">
            {pcs.map((pc) => {
              const online = pc.lastSeen && (now - pc.lastSeen) < 90000;
              const activeSession = sessions.find(s => s.pcId === pc.id && s.status === 'active');
              return (
                <div key={pc.id} className={`pc-card ${pc.status || 'idle'} ${online ? 'online' : 'offline'}`}>
                  <div className="pc-header">
                    <div className="pc-icon">🖥️</div>
                    <div>
                      <div className="pc-name">{pc.name}</div>
                      <div className="pc-last-seen">
                        {online ? <span className="text-green">● Online</span> : <span className="text-muted">● Offline</span>}
                        {pc.ip && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--text-4)' }}>({pc.ip})</span>}
                      </div>
                    </div>
                    <span className={`badge badge-${pc.status || 'idle'}`} style={{ marginLeft: 'auto' }}>
                      {pc.status || 'idle'}
                    </span>
                  </div>

                  <div className="pc-session-info">
                    {activeSession ? (
                      <>
                        <div>Active Session: <strong>{activeSession.phone}</strong></div>
                        <div style={{ marginTop: 4 }}>Price: <strong className="text-green">₹{activeSession.price}</strong></div>
                      </>
                    ) : (
                      <span className="text-muted">No active session running</span>
                    )}
                  </div>

                  <div className="pc-actions">
                    <button 
                      className={`btn btn-sm ${pc.status === 'locked' ? 'btn-green' : 'btn-orange'}`}
                      onClick={() => handleLockUnlock(pc)}
                      disabled={!online}
                    >
                      {pc.status === 'locked' ? 'Unlock PC' : 'Lock PC'}
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setNotifPC(pc);
                        setShowNotifModal(true);
                      }}
                      disabled={!online}
                    >
                      🔔 Message
                    </button>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => openScreenShare(pc)}
                      disabled={!online || pc.status !== 'active'}
                    >
                      🖥️ View Screen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Screen Share View Modal */}
      <Modal show={showScreenModal} onClose={() => { setShowScreenModal(false); setSelectedPC(null); }} title={`Screen View: ${selectedPC?.name || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="screen-video" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
            {selectedPC?.screenData ? (
              <img 
                src={selectedPC.screenData} 
                alt="Client screen stream" 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
              />
            ) : (
              <div className="screen-status">
                <span className="spinner spinner-sm" style={{ marginBottom: 12 }} /><br />
                Waiting for screen broadcast permission from {selectedPC?.name}...
              </div>
            )}
          </div>
          <p className="text-muted text-xs">
            Note: For web-based screen monitoring, the customer on the client computer must accept the browser's "Share Screen" dialog request once the session begins.
          </p>
        </div>
      </Modal>

      {/* Notification Modal */}
      <Modal show={showNotifModal} onClose={() => { setShowNotifModal(false); setNotifPC(null); }} title={`Send Message to ${notifPC?.name}`}>
        <form onSubmit={handleSendNotification} className="section-gap">
          <div className="input-group">
            <label className="input-label">Message Content</label>
            <input 
              className="input" 
              placeholder="e.g. Your session will end in 5 minutes. Please save your work." 
              value={notifMessage}
              onChange={e => setNotifMessage(e.target.value)}
              required
            />
          </div>
          <div className="modal-footer" style={{ marginTop: 0, paddingTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setShowNotifModal(false); setNotifPC(null); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">Send Message</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
