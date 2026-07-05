import React, { useState, useEffect, useRef } from 'react';

export default function FloatingTimer({ endsAt, phone, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, endsAt - now);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.ft-minimize')) return;
    setDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return;
      let newX = e.clientX - dragStart.current.x;
      let newY = e.clientY - dragStart.current.y;

      // Keep inside window bounds
      newX = Math.max(0, Math.min(newX, window.innerWidth - (widgetRef.current?.offsetWidth || 150)));
      newY = Math.max(0, Math.min(newY, window.innerHeight - (widgetRef.current?.offsetHeight || 80)));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  
  const isCritical = timeLeft < 2 * 60 * 1000; // 2 minutes left
  const isWarning = timeLeft < 5 * 60 * 1000; // 5 minutes left

  const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const timerClass = `floating-timer ${isCritical ? 'critical' : isWarning ? 'warning' : ''} ${minimized ? 'minimized' : ''}`;

  return (
    <div 
      ref={widgetRef}
      className={timerClass}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <button 
        type="button" 
        className="ft-minimize" 
        onClick={() => setMinimized(!minimized)}
        title={minimized ? "Expand timer" : "Minimize timer"}
      >
        {minimized ? '⤢' : '⤡'}
      </button>

      {minimized ? (
        <span className={`ft-time ${isCritical ? 'critical' : isWarning ? 'warning' : ''}`} style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          ⏱ {timeString}
        </span>
      ) : (
        <>
          <span className="ft-label">REMAINING TIME</span>
          <span className={`ft-time ${isCritical ? 'critical' : isWarning ? 'warning' : ''}`}>
            {timeString}
          </span>
          <span className="ft-phone">{phone}</span>
        </>
      )}
    </div>
  );
}
