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

const DIAGONALS = ['NE', 'SE', 'SW', 'NW'];
const DIAG_SIGNS = { NE: { sx: 1, sy: -1 }, SE: { sx: 1, sy: 1 }, SW: { sx: -1, sy: 1 }, NW: { sx: -1, sy: -1 } };
const CARDINAL_DIR = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

export default function LengthInput({ direction, onConfirm, onCancel }) {
  const isDiag = DIAGONALS.includes(direction);

  const [length, setLength] = useState('4');
  const [dx, setDx] = useState('3');
  const [dy, setDy] = useState('3');
  const [angleMode, setAngleMode] = useState(false);
  const [angle, setAngle] = useState('45');
  const [type, setType] = useState('frame');
  const [eiFactor, setEiFactor] = useState('1');
  const [startConn, setStartConn] = useState('rigid');
  const [newSupport, setNewSupport] = useState(null);

  const computedLen = isDiag && !angleMode
    ? Math.sqrt((parseFloat(dx) || 0) ** 2 + (parseFloat(dy) || 0) ** 2)
    : 0;

  const angleDx = isDiag && angleMode
    ? (parseFloat(length) || 0) * Math.cos((parseFloat(angle) || 0) * Math.PI / 180)
    : 0;
  const angleDy = isDiag && angleMode
    ? (parseFloat(length) || 0) * Math.sin((parseFloat(angle) || 0) * Math.PI / 180)
    : 0;

  function handleSubmit() {
    let len, rdx = 0, rdy = 0;
    if (isDiag) {
      const signs = DIAG_SIGNS[direction];
      if (angleMode) {
        len = parseFloat(length) || 0;
        rdx = Math.abs(angleDx) * signs.sx;
        rdy = Math.abs(angleDy) * signs.sy;
      } else {
        len = computedLen;
        rdx = (parseFloat(dx) || 0) * signs.sx;
        rdy = (parseFloat(dy) || 0) * signs.sy;
      }
    } else {
      len = parseFloat(length) || 0;
      const [cx, cy] = CARDINAL_DIR[direction] || [0, 0];
      rdx = cx * len;
      rdy = cy * len;
    }
    if (!len || len <= 0) return;
    onConfirm({
      length: Math.round(len * 100) / 100,
      realDx: Math.round(rdx * 100) / 100,
      realDy: Math.round(rdy * 100) / 100,
      type,
      eiFactor: parseFloat(eiFactor) || 1,
      startHinge: type === 'truss' ? true : startConn === 'hinge',
      newNodeSupport: newSupport,
    });
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10, fontWeight: 600 }}>
        New member &middot; {direction}
      </div>

      {/* Length — cardinal vs diagonal */}
      {!isDiag ? (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>Length (m)</div>
          <NumberInput value={length} onChange={setLength} min="0.1" autoFocus />
        </div>
      ) : !angleMode ? (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Horizontal (m)</div>
              <NumberInput value={dx} onChange={setDx} min="0" autoFocus />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Vertical (m)</div>
              <NumberInput value={dy} onChange={setDy} min="0" />
            </div>
          </div>
          <div style={{ fontSize: 11, color: COLORS.green, marginBottom: 6, fontWeight: 600 }}>
            Length: {computedLen ? computedLen.toFixed(2) : '0'}m
          </div>
          <button onClick={() => setAngleMode(true)} style={{
            background: 'none', border: 'none', color: COLORS.textDim, fontSize: 10,
            cursor: 'pointer', textDecoration: 'underline', padding: 0, marginBottom: 8,
            fontFamily: "'JetBrains Mono', monospace",
          }}>Switch to angle mode</button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Length (m)</div>
              <NumberInput value={length} onChange={setLength} min="0.1" autoFocus />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Angle (&deg;)</div>
              <NumberInput value={angle} onChange={setAngle} min="0" />
            </div>
          </div>
          <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 6 }}>
            dx={angleDx.toFixed(2)}m &middot; dy={angleDy.toFixed(2)}m
          </div>
          <button onClick={() => setAngleMode(false)} style={{
            background: 'none', border: 'none', color: COLORS.textDim, fontSize: 10,
            cursor: 'pointer', textDecoration: 'underline', padding: 0, marginBottom: 8,
            fontFamily: "'JetBrains Mono', monospace",
          }}>Switch to dx/dy mode</button>
        </>
      )}

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
          <NumberInput value={eiFactor} onChange={setEiFactor} min="0.1" />
        </div>
      )}

      {/* Connection at starting node (frame only — truss is always hinged) */}
      {type === 'frame' && (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>Connection at Start</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={toggleBtn(startConn === 'rigid')} onClick={() => setStartConn('rigid')}>Rigid</button>
            <button style={toggleBtn(startConn === 'hinge')} onClick={() => setStartConn('hinge')}>Hinge</button>
          </div>
        </div>
      )}

      {/* Support at new node */}
      <div style={{ marginBottom: 10 }}>
        <div style={labelStyle}>Support at New Node</div>
        <SupportGrid value={newSupport} onChange={setNewSupport} trussMode={type === 'truss'} />
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
