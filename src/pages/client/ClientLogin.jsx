import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ref, get, update, set, onValue, remove } from 'firebase/database';
import { db } from '../../firebase';
import Modal from '../../components/shared/Modal';

export default function ClientLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [cafeId, setCafeId] = useState(localStorage.getItem('clm_cafe_id') || '');
  const [pcId, setPcId] = useState(localStorage.getItem('clm_pc_id') || '');
  const [pcName, setPcName] = useState(localStorage.getItem('clm_pc_name') || '');

  const [isRegistered, setIsRegistered] = useState(false);
  const [tempPCName, setTempPCName] = useState('');
  const [tempCafeId, setTempCafeId] = useState('');

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Settings bypass password from database settings node
  const [settings, setSettings] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Handle URL query parameters if present
  useEffect(() => {
    const urlCafe = searchParams.get('cafe');
    if (urlCafe) {
      setCafeId(urlCafe);
      localStorage.setItem('clm_cafe_id', urlCafe);
    }
  }, [searchParams]);

  // Load settings once cafeId is set
  useEffect(() => {
    if (cafeId) {
      const unsub = onValue(ref(db, `cafes/${cafeId}/settings`), (snap) => {
        setSettings(snap.val() || {});
      });
      return unsub;
    }
  }, [cafeId]);

  // Check registration status
  useEffect(() => {
    if (cafeId && pcId && pcName) {
      setIsRegistered(true);
      // Let admin know PC is online/ping
      const pingPC = async () => {
        try {
          await update(ref(db, `cafes/${cafeId}/pcs/${pcId}`), {
            lastSeen: Date.now(),
            status: 'idle'
          });
        } catch (e) {
          console.error('Ping failed:', e);
        }
      };
      pingPC();
      const interval = setInterval(pingPC, 45000);
      return () => clearInterval(interval);
    }
  }, [cafeId, pcId, pcName]);

  // Lock terminal if running inside native Electron wrapper
  useEffect(() => {
    if (isRegistered && window.electronAPI) {
      window.electronAPI.lock();
    }
  }, [isRegistered]);

  const handleRegisterPC = async (e) => {
    e.preventDefault();
    const finalCafeId = cafeId || tempCafeId.trim();
    const finalPCName = tempPCName.trim();

    if (!finalCafeId || !finalPCName) {
      alert('Please fill out all registration fields.');
      return;
    }

    setLoading(true);
    try {
      // Validate cafe exists
      const cafeSettingsSnap = await get(ref(db, `cafes/${finalCafeId}/settings`));
      if (!cafeSettingsSnap.exists()) {
        alert('Invalid Cafe ID. Please verify your Admin Dashboard ID.');
        setLoading(false);
        return;
      }

      const generatedPCId = 'PC_' + Math.floor(1000 + Math.random() * 9000);
      
      // Save PC details in Firebase
      await set(ref(db, `cafes/${finalCafeId}/pcs/${generatedPCId}`), {
        name: finalPCName,
        status: 'idle',
        lastSeen: Date.now(),
        ip: 'Web Browser'
      });

      // Save local storage
      localStorage.setItem('clm_cafe_id', finalCafeId);
      localStorage.setItem('clm_pc_id', generatedPCId);
      localStorage.setItem('clm_pc_name', finalPCName);

      setCafeId(finalCafeId);
      setPcId(generatedPCId);
      setPcName(finalPCName);
      setIsRegistered(true);
    } catch (err) {
      console.error(err);
      alert('Failed to register PC: ' + err.message);
    }
    setLoading(false);
  };

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  // Check pin logic when pin hits 4 digits
  useEffect(() => {
    if (pin.length === 4) {
      verifyPIN();
    }
  }, [pin]);

  const verifyPIN = async () => {
    setLoading(true);
    setStatusMessage('Checking PIN Code...');
    setPinError(false);

    try {
      // Fetch all sessions for this cafe
      const sessionsSnap = await get(ref(db, `cafes/${cafeId}/sessions`));
      if (!sessionsSnap.exists()) {
        throw new Error('No active slots found. Contact Admin.');
      }

      const sessionsData = sessionsSnap.val();
      // Look for a session with code matching 'pin' and status 'waiting'
      const matchedSessionEntry = Object.entries(sessionsData).find(
        ([_, s]) => s.code === pin && s.status === 'waiting'
      );

      if (!matchedSessionEntry) {
        throw new Error('Invalid PIN or code already used.');
      }

      const [sessionId, session] = matchedSessionEntry;
      const durationMs = session.timeMinutes * 60 * 1000;
      const startTime = Date.now();
      const endTime = startTime + durationMs;

      // Update Session details in database
      const updates = {};
      updates[`cafes/${cafeId}/sessions/${sessionId}/status`] = 'active';
      updates[`cafes/${cafeId}/sessions/${sessionId}/pcId`] = pcName;
      updates[`cafes/${cafeId}/sessions/${sessionId}/startedAt`] = startTime;
      updates[`cafes/${cafeId}/sessions/${sessionId}/endsAt`] = endTime;

      // Update PC status to active
      updates[`cafes/${cafeId}/pcs/${pcId}/status`] = 'active';

      await update(ref(db), updates);

      setPinSuccess(true);
      setStatusMessage('Login Successful!');
      
      // Store session data locally
      localStorage.setItem('clm_active_session_id', sessionId);

      if (window.electronAPI) {
        window.electronAPI.unlock();
      }

      setTimeout(() => {
        navigate(`/client/session?cafe=${cafeId}&pc=${pcId}`);
      }, 1000);

    } catch (err) {
      console.error(err);
      setPinError(true);
      setStatusMessage(err.message || 'Error occurred.');
      setPin('');
    }
    setLoading(false);
  };

  // Setting panel password verification
  const handleOpenSettings = () => {
    const entered = prompt('Enter Admin Settings Bypass Password:');
    if (entered === null) return;
    
    const correctPassword = settings?.bypassPassword || 'admin123';
    if (entered === correctPassword) {
      setShowSettingsMenu(true);
    } else {
      alert('Incorrect bypass password!');
    }
  };

  // Action: Disable PC client (quits app)
  const handleDisableClient = () => {
    if (window.confirm('Disable locking client and exit native app?')) {
      if (window.electronAPI && window.electronAPI.exitApp) {
        window.electronAPI.exitApp();
      } else {
        alert('Exit command triggered (Only available inside native PC client app).');
      }
    }
  };

  // Action: Unlock PC (minimize kiosk)
  const handleUnlockClient = () => {
    if (window.confirm('Bypass lock screen and unlock this PC?')) {
      if (window.electronAPI) {
        window.electronAPI.unlock();
        alert('PC Unlocked. Settings closed.');
        setShowSettingsMenu(false);
      } else {
        alert('Unlock command triggered (Only available inside native PC client app).');
      }
    }
  };

  // Action: Rename PC
  const handleChangePCName = async () => {
    const newName = prompt('Enter new PC Name:', pcName);
    if (!newName || !newName.trim()) return;

    try {
      setLoading(true);
      await update(ref(db, `cafes/${cafeId}/pcs/${pcId}`), {
        name: newName.trim()
      });
      localStorage.setItem('clm_pc_name', newName.trim());
      setPcName(newName.trim());
      alert('PC renamed successfully.');
    } catch (e) {
      alert('Rename failed: ' + e.message);
    }
    setLoading(false);
  };

  // Action: Unregister client PC
  const handleUnregisterPC = async () => {
    if (window.confirm('Are you sure you want to unregister this PC? This will clear local config and reset PC connection.')) {
      setLoading(true);
      try {
        await remove(ref(db, `cafes/${cafeId}/pcs/${pcId}`));
      } catch (e) {
        console.error('Delete failed:', e);
      }
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isRegistered) {
    return (
      <div className="client-page">
        <div className="client-bg-grid" />
        <div className="client-glow" />
        <div className="pin-card animate-appear">
          <div className="text-center mb-6">
            <h2>💻 Register Client PC</h2>
            <p className="text-muted text-sm mt-2">Connect this terminal to your cafe database</p>
          </div>

          <form onSubmit={handleRegisterPC} className="section-gap">
            {!cafeId && (
              <div className="input-group">
                <label className="input-label">Admin Cafe ID</label>
                <input 
                  className="input" 
                  placeholder="Paste admin UID here" 
                  value={tempCafeId}
                  onChange={e => setTempCafeId(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Terminal / PC Name</label>
              <input 
                className="input" 
                placeholder="e.g. PC-01" 
                value={tempPCName}
                onChange={e => setTempPCName(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? 'Connecting...' : '🔌 Register & Connect'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="client-page">
      <div className="client-bg-grid" />
      <div className="client-glow" />

      {/* Sleek High-Contrast Light Box Redesign (Problem 1) */}
      <div className="white-lock-card animate-appear">
        {/* Settings gear icon trigger */}
        <button 
          type="button" 
          className="lock-settings-btn" 
          onClick={handleOpenSettings}
          title="Admin Settings"
        >
          ⚙️
        </button>

        <div className="text-center" style={{ marginBottom: 20 }}>
          <div className="cafe-display-title">{settings?.cafeName || 'CYBERCAFE'}</div>
          <div className="pc-display-title">{pcName}</div>
          <p className="lock-subtitle">Terminal Locked · Enter Login PIN Code</p>
        </div>

        <div className="pin-display">
          {[0, 1, 2, 3].map((index) => {
            const digit = pin[index] || '';
            const isFilled = digit !== '';
            return (
              <div 
                key={index} 
                className={`pin-box-white ${isFilled ? 'filled' : ''} ${pinError ? 'error' : ''}`}
              >
                {isFilled ? '●' : ''}
              </div>
            );
          })}
        </div>

        <div style={{ minHeight: 20, textAlign: 'center', marginBottom: 10 }}>
          {statusMessage && (
            <p className={pinError ? 'text-red text-xs font-bold' : pinSuccess ? 'text-green text-xs font-bold' : 'text-cyan text-xs font-bold'}>
              {statusMessage}
            </p>
          )}
        </div>

        <div className="numpad numpad-white">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} type="button" className="numpad-btn-white" onClick={() => handleKeyPress(num)} disabled={loading}>
              {num}
            </button>
          ))}
          <button type="button" className="numpad-btn-white del" onClick={handleClear} disabled={loading}>
            C
          </button>
          <button type="button" className="numpad-btn-white" onClick={() => handleKeyPress(0)} disabled={loading}>
            0
          </button>
          <button type="button" className="numpad-btn-white del" onClick={handleDelete} disabled={loading}>
            ⌫
          </button>
        </div>
      </div>

      {/* Local administrative settings modal */}
      <Modal show={showSettingsMenu} onClose={() => setShowSettingsMenu(false)} title={`🛠️ Terminal Settings: ${pcName}`}>
        <div className="section-gap" style={{ padding: '10px 0' }}>
          <p className="text-muted text-sm">
            Administrative maintenance functions. Changes will sync to your cafe admin database in real-time.
          </p>

          <div className="flex flex-col gap-3" style={{ marginTop: 12 }}>
            <button 
              type="button" 
              className="btn btn-ghost w-full justify-between"
              onClick={handleChangePCName}
              disabled={loading}
            >
              <span>✏️ Change PC Name</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--cyan)' }}>Currently: {pcName}</span>
            </button>

            <button 
              type="button" 
              className="btn btn-orange w-full"
              onClick={handleUnlockClient}
            >
              🔓 Unlock PC Kiosk Mode (Minimize Lock)
            </button>

            <button 
              type="button" 
              className="btn btn-purple w-full"
              onClick={handleDisableClient}
            >
              🔌 Disable client (Exit native locker)
            </button>

            <div className="divider" style={{ margin: '10px 0' }} />

            <button 
              type="button" 
              className="btn btn-red w-full"
              onClick={handleUnregisterPC}
              disabled={loading}
            >
              ⚠️ Unregister client PC (Reset config)
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
