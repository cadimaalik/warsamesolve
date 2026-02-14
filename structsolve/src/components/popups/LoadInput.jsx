import React, { useState } from 'react';
import { COLORS } from '../../constants/brand.js';
import NumberInput from '../NumberInput.jsx';

const labelStyle = { fontSize: 10, color: COLORS.textDim, marginBottom: 3, fontWeight: 600 };

export default function LoadInput({ nodeId, currentLoads, onApply, onClose }) {
  const [fx, setFx] = useState(String(currentLoads?.fx || 0));
  const [fy, setFy] = useState(String(currentLoads?.fy || 0));
  const [moment, setMoment] = useState(String(currentLoads?.moment || 0));

  function handleSubmit() {
    onApply({
      fx: parseFloat(fx) || 0,
      fy: parseFloat(fy) || 0,
      moment: parseFloat(moment) || 0,
    });
    onClose();
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10, fontWeight: 600 }}>
        Loads at {nodeId}
      </div>

      {/* Fx */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Fx (kN) &middot; positive &rarr; right</div>
        <NumberInput value={fx} onChange={setFx} allowNegative />
      </div>

      {/* Fy */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Fy (kN) &middot; positive &uarr; up</div>
        <NumberInput value={fy} onChange={setFy} allowNegative />
      </div>

      {/* Moment */}
      <div style={{ marginBottom: 10 }}>
        <div style={labelStyle}>M (kN&middot;m) &middot; positive &#8634; CCW</div>
        <NumberInput value={moment} onChange={setMoment} allowNegative />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onClose} style={{
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
