import React, { useState } from 'react';
import { COLORS } from '../../constants/brand.js';
import NumberInput from '../NumberInput.jsx';

const labelStyle = { fontSize: 10, color: COLORS.textDim, marginBottom: 3, fontWeight: 600 };

const toggleBtn = (active) => ({
  flex: 1, padding: '5px 0', borderRadius: 4, border: `1px solid ${COLORS.borderLight}`,
  background: active ? COLORS.greenDark : 'transparent',
  color: active ? '#fff' : COLORS.textMuted,
  fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
});

export default function PointLoadInput({ member, startNodeId, endNodeId, memberLength, onApply, onCancel }) {
  const halfLen = Math.round((memberLength / 2) * 100) / 100;
  const [distance, setDistance] = useState(String(halfLen));
  const [refFrom, setRefFrom] = useState('start');
  const [fx, setFx] = useState('0');
  const [fy, setFy] = useState('0');
  const [moment, setMoment] = useState('0');

  const distFromStart = refFrom === 'start'
    ? parseFloat(distance) || 0
    : memberLength - (parseFloat(distance) || 0);

  function handleRefSwitch(ref) {
    const d = parseFloat(distance) || 0;
    setRefFrom(ref);
    setDistance(String(Math.round((memberLength - d) * 100) / 100));
  }

  function handleSubmit() {
    const d = distFromStart;
    if (d <= 0 || d >= memberLength) return;
    const loadFx = parseFloat(fx) || 0;
    const loadFy = parseFloat(fy) || 0;
    const loadM = parseFloat(moment) || 0;
    if (!loadFx && !loadFy && !loadM) return;
    onApply(d, { fx: loadFx, fy: loadFy, moment: loadM });
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10, fontWeight: 600 }}>
        Point Load on {startNodeId}&rarr;{endNodeId}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Distance from {refFrom === 'start' ? startNodeId : endNodeId} (m)</div>
        <NumberInput value={distance} onChange={setDistance} min="0.01" />
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <button style={toggleBtn(refFrom === 'start')} onClick={() => handleRefSwitch('start')}>
            from {startNodeId}
          </button>
          <button style={toggleBtn(refFrom === 'end')} onClick={() => handleRefSwitch('end')}>
            from {endNodeId}
          </button>
        </div>
        {(distFromStart <= 0 || distFromStart >= memberLength) && (
          <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
            Must be between 0 and {memberLength}m (not at endpoints)
          </div>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Fy (kN) &middot; positive &uarr; up</div>
        <NumberInput value={fy} onChange={setFy} allowNegative />
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Fx (kN) &middot; positive &rarr; right</div>
        <NumberInput value={fx} onChange={setFx} allowNegative />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={labelStyle}>M (kN&middot;m) &middot; positive &#8634; CCW</div>
        <NumberInput value={moment} onChange={setMoment} allowNegative />
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '8px', borderRadius: 6, border: `1px solid ${COLORS.borderLight}`,
          background: 'transparent', color: COLORS.textMuted, fontSize: 12, cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
        }}>Cancel</button>
        <button onClick={handleSubmit} style={{
          flex: 1, padding: '8px', borderRadius: 6, border: 'none',
          background: COLORS.greenDark, color: '#fff', fontSize: 12, cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
        }}>Apply</button>
      </div>
    </div>
  );
}
