import React, { useState, useEffect } from 'react';
import { ref, push, set } from 'firebase/database';
import { db } from '../../firebase';

const TIME_SLOTS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hr' },
  { value: 120, label: '2 hr' },
  { value: 180, label: '3 hr' },
  { value: 300, label: '5 hr' },
];

export default function SessionGenerator({ cafeId, pcs, settings }) {
  const [phone, setPhone] = useState('');
  const [selectedTime, setSelectedTime] = useState(60); // default 1 hour
  const [price, setPrice] = useState(0);
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);

  const pricePerSlot = settings?.pricePerSlot || {};

  useEffect(() => {
    // Calculate price based on settings config
    const rawPrice = pricePerSlot[selectedTime.toString()] || 0;
    setPrice(rawPrice);
  }, [selectedTime, pricePerSlot]);

  const generate4DigitCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      alert('Please enter a valid phone number.');
      return;
    }
    setLoading(true);

    try {
      const code = generate4DigitCode();
      const sessionsRef = ref(db, `cafes/${cafeId}/sessions`);
      const newSessionRef = push(sessionsRef);

      const sessionData = {
        id: newSessionRef.key,
        phone: phone,
        timeMinutes: selectedTime,
        price: price,
        code: code,
        status: 'waiting', // waiting for customer client login
        createdAt: Date.now(),
        pcId: '', // not assigned yet
        startedAt: null,
        endsAt: null
      };

      await set(newSessionRef, sessionData);
      setGeneratedCode(code);
      // Reset input form
      setPhone('');
    } catch (err) {
      console.error(err);
      alert('Error creating session: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="sg-layout">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🎮 Generate New Session</h3>
        </div>
        <form onSubmit={handleCreateSession} className="section-gap">
          <div className="input-group">
            <label className="input-label">Customer Phone Number</label>
            <input 
              type="tel"
              className="input input-phone"
              placeholder="e.g. 9876543210"
              maxLength={10}
              minLength={10}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <div>
            <label className="input-label mb-2" style={{ display: 'block' }}>Select Duration</label>
            <div className="time-grid">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  className={`time-btn ${selectedTime === slot.value ? 'selected' : ''}`}
                  onClick={() => setSelectedTime(slot.value)}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          <div className="price-display">
            <span className="price-label">Calculated Price</span>
            <span className="price-value">₹{price}</span>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
          >
            {loading ? <span className="spinner spinner-sm" /> : '⚡ Assign & Generate Access Code'}
          </button>
        </form>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="card-header">
          <h3 className="card-title">🔑 Access Code Generator</h3>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {generatedCode ? (
            <div className="code-display w-full animate-appear">
              <span className="code-label">Access Pin Code</span>
              <div className="code-digits">{generatedCode}</div>
              <p className="code-sub">Enter this 4-digit code on any idle computer screen to unlock and start the session.</p>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setGeneratedCode('')}
                style={{ marginTop: 12 }}
              >
                Clear Pin
              </button>
            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: '60px 0' }}>
              <div className="code-empty">🔒</div>
              <p className="text-sm">Access code will appear here after clicking "Assign & Generate Access Code"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
