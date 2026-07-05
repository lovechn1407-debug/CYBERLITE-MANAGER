import React, { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
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

export default function Settings({ cafeId, settings }) {
  const [cafeName, setCafeName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [pricePerSlot, setPricePerSlot] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setCafeName(settings.cafeName || '');
      setLogoUrl(settings.logoUrl || '');
      setPricePerSlot(settings.pricePerSlot || {});
    }
  }, [settings]);

  const handlePriceChange = (slotVal, price) => {
    setPricePerSlot(prev => ({
      ...prev,
      [slotVal]: Number(price)
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await update(ref(db, `cafes/${cafeId}/settings`), {
        cafeName,
        logoUrl,
        pricePerSlot
      });
      // Also sync cafe name to host record for visual dashboard integration
      await update(ref(db, `host/admins/${cafeId}`), {
        cafeName
      });
      alert('Settings updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSaveSettings} className="section-gap">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🏪 Cafe Information</h3>
        </div>
        <div className="section-gap">
          <div className="input-group">
            <label className="input-label">Cafe Display Name</label>
            <input 
              className="input" 
              placeholder="e.g. Star Cyber Cafe" 
              value={cafeName}
              onChange={e => setCafeName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Logo / Image URL</label>
            <input 
              className="input" 
              placeholder="https://example.com/logo.png" 
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">💰 Price Package Settings</h3>
          <span className="text-sm text-muted">Set specific pricing in INR (₹) for each time duration slot</span>
        </div>
        <div className="price-grid">
          {TIME_SLOTS.map(slot => {
            const val = slot.value.toString();
            const currentPrice = pricePerSlot[val] || 0;
            return (
              <div key={slot.value} className="price-input-row">
                <span className="price-input-label">{slot.label}</span>
                <input 
                  type="number"
                  min={0}
                  className="price-input-field" 
                  placeholder="₹"
                  value={currentPrice}
                  onChange={e => handlePriceChange(val, e.target.value)}
                  required
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-right">
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? <span className="spinner spinner-sm" /> : '💾 Save Settings Configuration'}
        </button>
      </div>
    </form>
  );
}
