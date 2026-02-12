import React, { useState } from 'react';
import { COLORS } from '../../constants/brand.js';

const inputStyle = {
  width: 80, padding: '6px 8px', borderRadius: 4,
  border: `1px solid ${COLORS.borderLight}`, background: COLORS.bgInput,
  color: COLORS.textPrimary, fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
  outline: 'none', textAlign: 'center',
};

export default function StartOverlay({ onCreate }) {
  const [length, setLength] = useState('4');

  function handleCreate() {
    const len = parseFloat(length);
    if (!len || len <= 0) return;
    onCreate(len);
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.85)', zIndex: 50,
    }}>
      <div style={{
        background: COLORS.bgCard, borderRadius: 12, padding: 28,
        border: `1px solid ${COLORS.borderLight}`,
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
        textAlign: 'center', maxWidth: 320,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          <span style={{ color: '#fff' }}>Struct</span>
          <span style={{ color: COLORS.green }}>SOLVE</span>
        </div>
        <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 20 }}>
          Start by creating a horizontal beam
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>Length:</span>
          <input type="number" value={length} onChange={e => setLength(e.target.value)}
            style={inputStyle} min="0.1" step="0.5" autoFocus />
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>m</span>
        </div>

        <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 16 }}>
          Node A &rarr; Pin support &middot; Node B &rarr; No support
        </div>

        <button onClick={handleCreate} style={{
          padding: '10px 28px', borderRadius: 8, border: 'none',
          background: COLORS.greenDark, color: '#fff', fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
          onMouseOver={e => e.target.style.boxShadow = `0 0 20px ${COLORS.greenGlow}`}
          onMouseOut={e => e.target.style.boxShadow = 'none'}
        >
          Create &rarr;
        </button>
      </div>
    </div>
  );
}
