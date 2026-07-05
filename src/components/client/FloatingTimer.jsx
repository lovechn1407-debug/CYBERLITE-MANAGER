import React, { useState, useEffect } from 'react';

export default function FloatingTimer({ endsAt, phone, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [minimized, setMinimized] = useState(false);

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

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  
  const isCritical = timeLeft < 2 * 60 * 1000; // 2 minutes left
  const isWarning = timeLeft < 5 * 60 * 1000; // 5 minutes left

  const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const timerClass = `floating-timer ${isCritical ? 'critical' : isWarning ? 'warning' : ''} ${minimized ? 'minimized' : ''}`;

  return (
    <div className={timerClass}>
      <button 
        type="button" 
        className="ft-minimize" 
        onClick={() => setMinimized(!minimized)}
        title={minimized ? "Expand timer" : "Minimize timer"}
      >
        {minimized ? '⤢' : '⤡'}
      </button>

      {minimized ? (
        <span className={`ft-time ${isCritical ? 'critical' : isWarning ? 'warning' : ''}`} style={{ fontSize: '1rem' }}>
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
