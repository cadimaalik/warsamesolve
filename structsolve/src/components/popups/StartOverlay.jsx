import React, { useState } from 'react';
import { COLORS } from '../../constants/brand.js';
import SupportGrid from './SupportGrid.jsx';
import NumberInput from '../NumberInput.jsx';

const toggleBtn = (active) => ({
  flex: 1, padding: '6px 0', borderRadius: 4, border: `1px solid ${COLORS.borderLight}`,
  background: active ? COLORS.greenDark : 'transparent',
  color: active ? '#fff' : COLORS.textMuted,
  fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
});

const labelStyle = { fontSize: 10, color: COLORS.textDim, marginBottom: 3, fontWeight: 600 };

export default function StartOverlay({ onCreate }) {
  const [length, setLength] = useState('4');
  const [orientation, setOrientation] = useState('horizontal');
  const [type, setType] = useState('frame');
  const [supportA, setSupportA] = useState('pin');
  const [supportB, setSupportB] = useState(null);

  function handleCreate() {
    const len = parseFloat(length);
    if (!len || len <= 0) return;
    onCreate({ length: len, orientation, type, supportA, supportB });
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(253,246,238,0.85)', zIndex: 50,
    }}>
      <div style={{
        background: COLORS.bgCard, borderRadius: 12, padding: 24,
        border: `1px solid ${COLORS.borderLight}`,
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
        maxWidth: 340, width: '100%',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img src="/structsolve/logo.svg" alt="StructSOLVE" style={{ height: 48, marginBottom: 8 }} />
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            <span style={{ color: '#fff' }}>Struct</span>
            <span style={{ color: COLORS.green }}>SOLVE</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.textDim }}>
            Create your first member
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Orientation</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={toggleBtn(orientation === 'horizontal')} onClick={() => setOrientation('horizontal')}>Horizontal</button>
            <button style={toggleBtn(orientation === 'vertical')} onClick={() => setOrientation('vertical')}>Vertical</button>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Length (m)</div>
          <NumberInput value={length} onChange={setLength} min="0.1" autoFocus />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Member Type</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={toggleBtn(type === 'frame')} onClick={() => setType('frame')}>Frame</button>
            <button style={toggleBtn(type === 'truss')} onClick={() => setType('truss')}>Truss</button>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Support at Node A</div>
          <SupportGrid value={supportA} onChange={setSupportA} trussMode={type === 'truss'} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Support at Node B</div>
          <SupportGrid value={supportB} onChange={setSupportB} trussMode={type === 'truss'} />
        </div>

        <button onClick={handleCreate} style={{
          width: '100%', padding: '10px', borderRadius: 8, border: 'none',
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
