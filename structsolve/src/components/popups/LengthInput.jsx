import React, { useState } from 'react';
import { COLORS } from '../../constants/brand.js';
import { SUPPORT_TYPES } from '../../constants/supports.js';

const inputStyle = {
  width: '100%', padding: '6px 8px', borderRadius: 4,
  border: `1px solid ${COLORS.borderLight}`, background: COLORS.bgInput,
  color: COLORS.textPrimary, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
  outline: 'none', boxSizing: 'border-box',
};

const toggleBtn = (active) => ({
  flex: 1, padding: '6px 0', borderRadius: 4, border: `1px solid ${COLORS.borderLight}`,
  background: active ? COLORS.greenDark : 'transparent',
  color: active ? '#fff' : COLORS.textMuted,
  fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
});

const labelStyle = { fontSize: 10, color: COLORS.textDim, marginBottom: 3, fontWeight: 600 };

export default function LengthInput({ direction, onConfirm, onCancel }) {
  const [length, setLength] = useState('4');
  const [type, setType] = useState('frame');
  const [eiFactor, setEiFactor] = useState('1');
  const [startConn, setStartConn] = useState('rigid');
  const [newSupport, setNewSupport] = useState(null);

  function handleSubmit() {
    const len = parseFloat(length);
    if (!len || len <= 0) return;
    onConfirm({
      length: len,
      type,
      eiFactor: parseFloat(eiFactor) || 1,
      startHinge: startConn === 'hinge',
      newNodeSupport: newSupport,
    });
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10, fontWeight: 600 }}>
        New member &middot; {direction}
      </div>

      {/* Length */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Length (m)</div>
        <input type="number" value={length} onChange={e => setLength(e.target.value)}
          style={inputStyle} min="0.1" step="0.1" autoFocus />
      </div>

      {/* Member type */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Member Type</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={toggleBtn(type === 'frame')} onClick={() => setType('frame')}>Frame</button>
          <button style={toggleBtn(type === 'truss')} onClick={() => setType('truss')}>Truss</button>
        </div>
      </div>

      {/* EI factor (only for frame) */}
      {type === 'frame' && (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>EI Factor</div>
          <input type="number" value={eiFactor} onChange={e => setEiFactor(e.target.value)}
            style={inputStyle} min="0.1" step="0.5" />
        </div>
      )}

      {/* Connection at starting node */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Connection at Start</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={toggleBtn(startConn === 'rigid')} onClick={() => setStartConn('rigid')}>Rigid</button>
          <button style={toggleBtn(startConn === 'hinge')} onClick={() => setStartConn('hinge')}>Hinge</button>
        </div>
      </div>

      {/* Support at new node */}
      <div style={{ marginBottom: 10 }}>
        <div style={labelStyle}>Support at New Node</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <button style={toggleBtn(newSupport === null)} onClick={() => setNewSupport(null)}>None</button>
          {Object.entries(SUPPORT_TYPES).map(([key, info]) => (
            <button key={key} style={toggleBtn(newSupport === key)}
              onClick={() => setNewSupport(key)}>
              {info.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
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
        }}>Create</button>
      </div>
    </div>
  );
}
