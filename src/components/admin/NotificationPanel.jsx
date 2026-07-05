import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove, push } from 'firebase/database';
import { db } from '../../firebase';

export default function NotificationPanel({ pcs, cafeId }) {
  const [allNotifications, setAllNotifications] = useState([]);
  const [selectedPCId, setSelectedPCId] = useState('all');
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    if (!cafeId) return;

    const notifRef = ref(db, `cafes/${cafeId}/notifications`);
    const unsub = onValue(notifRef, (snap) => {
      const data = snap.val() || {};
      const list = [];
      // Data is structured as: { pcId: { notifId: { message, timestamp, read, sender } } }
      Object.entries(data).forEach(([pcId, pcNotifs]) => {
        if (typeof pcNotifs === 'object') {
          Object.entries(pcNotifs).forEach(([notifId, details]) => {
            list.push({
              id: notifId,
              pcId,
              ...details
            });
          });
        }
      });

      // Sort by timestamp descending
      list.sort((a, b) => b.timestamp - a.timestamp);
      setAllNotifications(list);
    });

    return unsub;
  }, [cafeId]);

  const handleMarkRead = async (notif) => {
    try {
      await update(ref(db, `cafes/${cafeId}/notifications/${notif.pcId}/${notif.id}`), {
        read: true
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotif = async (notif) => {
    try {
      await remove(ref(db, `cafes/${cafeId}/notifications/${notif.pcId}/${notif.id}`));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    try {
      if (selectedPCId === 'all') {
        // Send to all connected PCs
        const promises = pcs.map(pc => {
          return push(ref(db, `cafes/${cafeId}/notifications/${pc.id}`), {
            message: replyMessage,
            type: 'broadcast',
            sender: 'admin',
            read: false,
            timestamp: Date.now()
          });
        });
        await Promise.all(promises);
        alert('Broadcast sent to all PCs.');
      } else {
        // Send to selected PC
        await push(ref(db, `cafes/${cafeId}/notifications/${selectedPCId}`), {
          message: replyMessage,
          type: 'alert',
          sender: 'admin',
          read: false,
          timestamp: Date.now()
        });
        alert('Message sent to client.');
      }
      setReplyMessage('');
    } catch (err) {
      console.error(err);
      alert('Error sending: ' + err.message);
    }
  };

  const filteredNotifications = allNotifications.filter(n => {
    if (selectedPCId === 'all') return true;
    return n.pcId === selectedPCId;
  });

  return (
    <div className="section-gap">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📣 Broadcast message or Reply</h3>
        </div>
        <form onSubmit={handleSendBroadcast} className="section-gap">
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Target PC</label>
              <select 
                className="input"
                value={selectedPCId}
                onChange={e => setSelectedPCId(e.target.value)}
              >
                <option value="all">📢 All PCs (Broadcast)</option>
                {pcs.map(pc => (
                  <option key={pc.id} value={pc.id}>{pc.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Quick Templates</label>
              <select 
                className="input" 
                onChange={(e) => setReplyMessage(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Select template...</option>
                <option value="Welcome to Cyber Lite! Your session has started.">Welcome Message</option>
                <option value="Please keep your noise levels low. Thank you.">House Rules</option>
                <option value="Cafe closing in 15 minutes. Please wrap up your sessions.">Closing Alert</option>
                <option value="Need assistance? An admin is on their way.">Assistance Reply</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Message Content</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Type your alert or reply message here..."
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Send Message Alert
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔔 Client Alert History</h3>
          <span className="badge badge-waiting">{allNotifications.filter(n => !n.read).length} Unread</span>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No notifications</div>
            <div className="empty-state-sub">Help requests and chat messages from clients will appear here.</div>
          </div>
        ) : (
          <div className="notif-list">
            {filteredNotifications.map((notif) => {
              const pc = pcs.find(p => p.id === notif.pcId);
              const pcName = pc ? pc.name : notif.pcId;
              const isFromClient = notif.sender === 'client' || notif.type === 'help';
              return (
                <div 
                  key={notif.id} 
                  className="notif-item animate-appear"
                  style={{ 
                    borderLeft: isFromClient ? '4px solid var(--orange)' : '4px solid var(--cyan)',
                    opacity: notif.read ? 0.75 : 1
                  }}
                >
                  <div className="notif-icon">
                    {isFromClient ? '🙋‍♂️' : '📢'}
                  </div>
                  <div className="notif-content">
                    <div className="flex justify-between items-center">
                      <strong style={{ fontSize: '0.9rem' }}>
                        {isFromClient ? `${pcName} (Client Request)` : `Sent to ${pcName}`}
                      </strong>
                      {!notif.read && isFromClient && (
                        <span className="badge badge-waiting">New Request</span>
                      )}
                    </div>
                    <p className="notif-msg mt-2" style={{ color: 'var(--text-2)' }}>{notif.message}</p>
                    <div className="notif-time">{new Date(notif.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2" style={{ alignSelf: 'center' }}>
                    {!notif.read && isFromClient && (
                      <button className="btn btn-green btn-sm" onClick={() => handleMarkRead(notif)}>✓ Read</button>
                    )}
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeleteNotif(notif)}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
