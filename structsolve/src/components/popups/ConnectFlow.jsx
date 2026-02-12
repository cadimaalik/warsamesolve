import React, { useState } from 'react';
import { COLORS } from '../../constants/brand.js';

const toggleBtn = (active) => ({
  flex: 1, padding: '6px 0', borderRadius: 4, border: `1px solid ${COLORS.borderLight}`,
  background: active ? COLORS.greenDark : 'transparent',
  color: active ? '#fff' : COLORS.textMuted,
  fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
});

const labelStyle = { fontSize: 10, color: COLORS.textDim, marginBottom: 3, fontWeight: 600 };
const inputStyle = {
  width: '100%', padding: '6px 8px', borderRadius: 4,
  border: `1px solid ${COLORS.borderLight}`, background: COLORS.bgInput,
  color: COLORS.textPrimary, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
  outline: 'none', boxSizing: 'border-box',
};

export default function ConnectFlow({ fromId, toId, autoLength, onConfirm, onCancel }) {
  const [type, setType] = useState('frame');
  const [eiFactor, setEiFactor] = useState('1');
  const [startConn, setStartConn] = useState('rigid');
  const [endConn, setEndConn] = useState('rigid');

  function handleSubmit() {
    onConfirm({
      type,
      eiFactor: parseFloat(eiFactor) || 1,
      startHinge: startConn === 'hinge',
      endHinge: endConn === 'hinge',
    });
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10, fontWeight: 600 }}>
        Connect {fromId} &rarr; {toId}
      </div>

      {/* Auto-calculated length (read-only) */}
      <div style={{ marginBottom: 10 }}>
        <div style={labelStyle}>Length (auto-calculated)</div>
        <div style={{
          padding: '6px 8px', borderRadius: 4, background: COLORS.bgInput,
          border: `1px solid ${COLORS.borderLight}`, fontSize: 13,
          color: COLORS.green, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {autoLength} m
        </div>
      </div>

      {/* Member type */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Member Type</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={toggleBtn(type === 'frame')} onClick={() => setType('frame')}>Frame</button>
          <button style={toggleBtn(type === 'truss')} onClick={() => setType('truss')}>Truss</button>
        </div>
      </div>

      {/* EI factor (frame only) */}
      {type === 'frame' && (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>EI Factor</div>
          <input type="number" value={eiFactor} onChange={e => setEiFactor(e.target.value)}
            style={inputStyle} min="0.1" step="0.5" />
        </div>
      )}

      {/* Connection at start node */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Connection at {fromId}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={toggleBtn(startConn === 'rigid')} onClick={() => setStartConn('rigid')}>Rigid</button>
          <button style={toggleBtn(startConn === 'hinge')} onClick={() => setStartConn('hinge')}>Hinge</button>
        </div>
      </div>

      {/* Connection at end node */}
      <div style={{ marginBottom: 10 }}>
        <div style={labelStyle}>Connection at {toId}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={toggleBtn(endConn === 'rigid')} onClick={() => setEndConn('rigid')}>Rigid</button>
          <button style={toggleBtn(endConn === 'hinge')} onClick={() => setEndConn('hinge')}>Hinge</button>
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
        }}>Connect</button>
      </div>
    </div>
  );
}
