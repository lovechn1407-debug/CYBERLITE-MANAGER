import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ref, onValue, update, push, set } from 'firebase/database';
import { db } from '../../firebase';
import FloatingTimer from '../../components/client/FloatingTimer';

export default function ClientSession() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cafeId = searchParams.get('cafe') || localStorage.getItem('clm_cafe_id');
  const pcId = searchParams.get('pc') || localStorage.getItem('clm_pc_id');
  const sessionId = localStorage.getItem('clm_active_session_id');

  const [session, setSession] = useState(null);
  const [pc, setPc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const screenIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Load Session and PC data
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.unlock();
      document.body.classList.add('electron-session-active');
    }

    if (!cafeId || !pcId || !sessionId) {
      navigate('/client');
      return;
    }

    // Monitor Session state
    const sessionRef = ref(db, `cafes/${cafeId}/sessions/${sessionId}`);
    const unsubSession = onValue(sessionRef, (snap) => {
      const data = snap.val();
      if (!data || data.status !== 'active') {
        // Session ended or changed
        handleSessionEnd();
      } else {
        setSession(data);
      }
      setLoading(false);
    });

    // Monitor PC lock state
    const pcRef = ref(db, `cafes/${cafeId}/pcs/${pcId}`);
    const unsubPc = onValue(pcRef, (snap) => {
      const data = snap.val();
      if (data) {
        setPc(data);
        if (data.status === 'locked') {
          handleSessionEnd();
        }
      }
    });

    // Setup active ping
    const pingInterval = setInterval(() => {
      update(ref(db, `cafes/${cafeId}/pcs/${pcId}`), {
        lastSeen: Date.now()
      });
    }, 30000);

    return () => {
      unsubSession();
      unsubPc();
      clearInterval(pingInterval);
      stopScreenSharing();
      document.body.classList.remove('electron-session-active');
    };
  }, [cafeId, pcId, sessionId]);

  // Request screen sharing on session startup (Rule Q1: A)
  useEffect(() => {
    if (session && !sharingScreen) {
      startScreenSharing();
    }
  }, [session]);

  const startScreenSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });

      setSharingScreen(true);

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      videoRef.current = video;

      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;

      // Start compression loop to firebase
      screenIntervalRef.current = setInterval(() => {
        captureAndUploadFrame();
      }, 4000); // Send frame every 4 seconds

    } catch (e) {
      console.warn("Screen share declined or failed:", e);
    }
  };

  const captureAndUploadFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Downscale target for base64 upload performance
    const targetWidth = 480;
    const targetHeight = (video.videoHeight / video.videoWidth) * targetWidth;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Compress canvas to JPEG image string
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5); // Quality 0.5

    // Write directly to database PC object
    update(ref(db, `cafes/${cafeId}/pcs/${pcId}`), {
      screenData: dataUrl
    });
  };

  const stopScreenSharing = () => {
    if (screenIntervalRef.current) {
      clearInterval(screenIntervalRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setSharingScreen(false);

    // Clean up DB field
    if (cafeId && pcId) {
      update(ref(db, `cafes/${cafeId}/pcs/${pcId}`), {
        screenData: null
      });
    }
  };

  const handleSessionEnd = async () => {
    stopScreenSharing();
    
    if (window.electronAPI) {
      window.electronAPI.lock();
    }
    
    try {
      const updates = {};
      updates[`cafes/${cafeId}/sessions/${sessionId}/status`] = 'ended';
      updates[`cafes/${cafeId}/sessions/${sessionId}/endsAt`] = Date.now();
      updates[`cafes/${cafeId}/pcs/${pcId}/status`] = 'locked'; // locks back PC
      updates[`cafes/${cafeId}/pcs/${pcId}/screenData`] = null;

      await update(ref(db), updates);
    } catch (e) {
      console.error(e);
    }

    localStorage.removeItem('clm_active_session_id');
    navigate('/client');
  };

  const handleCallAdmin = async () => {
    try {
      await push(ref(db, `cafes/${cafeId}/notifications/${pcId}`), {
        message: 'Assistance requested at terminal.',
        sender: 'client',
        type: 'help',
        read: false,
        timestamp: Date.now()
      });
      alert('Admin has been notified. Someone will assist you shortly.');
    } catch (e) {
      alert('Failed to send help call: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="loader-wrap">
        <div className="spinner" />
        <p className="text-muted text-sm">Launching session...</p>
      </div>
    );
  }

  if (window.electronAPI) {
    return session ? (
      <FloatingTimer 
        endsAt={session.endsAt} 
        phone={session.phone} 
        onExpire={handleSessionEnd} 
      />
    ) : null;
  }

  return (
    <div className="session-page">
      <div className="session-header">
        <div className="session-active-badge">
          <span className="status-dot dot-active" />
          <span>SESSION ACTIVE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{pc?.name || 'Client PC'}</span>
          <button className="btn btn-red btn-sm" onClick={handleSessionEnd}>
            🚪 Logout Session
          </button>
        </div>
      </div>

      <div className="session-body grid-bg">
        <div className="session-welcome">
          <h1 className="gradient-text mb-4" style={{ fontSize: '3rem', fontWeight: 'bold' }}>Welcome Customer</h1>
          <p className="text-muted mb-6">
            You are logged into terminal <strong>{pc?.name}</strong>. Feel free to use the computer. Your remaining session time is monitored via the floating widget.
          </p>
        </div>

        <div className="session-shortcuts">
          <div className="shortcut-card" onClick={handleCallAdmin}>
            <span className="shortcut-icon">🙋‍♂️</span>
            <span className="shortcut-label">Call Cafe Admin</span>
          </div>

          <a href="https://www.google.com" target="_blank" rel="noreferrer" className="shortcut-card">
            <span className="shortcut-icon">🌐</span>
            <span className="shortcut-label">Open Web Browser</span>
          </a>

          <a href="https://www.youtube.com" target="_blank" rel="noreferrer" className="shortcut-card">
            <span className="shortcut-icon">📺</span>
            <span className="shortcut-label">Watch YouTube</span>
          </a>

          <div className="shortcut-card" onClick={() => {
            if (sharingScreen) stopScreenSharing();
            else startScreenSharing();
          }}>
            <span className="shortcut-icon">{sharingScreen ? '🛑' : '🖥️'}</span>
            <span className="shortcut-label">{sharingScreen ? 'Stop Screen Share' : 'Start Screen Share'}</span>
          </div>
        </div>
      </div>

      {session && (
        <FloatingTimer 
          endsAt={session.endsAt} 
          phone={session.phone} 
          onExpire={handleSessionEnd} 
        />
      )}
    </div>
  );
}
