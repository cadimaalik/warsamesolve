import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants/brand.js';
import { getMemberLength } from '../utils/geometry.js';

const inputStyle = {
  width: '100%', padding: '5px 8px', borderRadius: 4,
  border: `1px solid ${COLORS.borderLight}`, background: COLORS.bgInput,
  color: COLORS.textPrimary, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle = { fontSize: 10, color: COLORS.textDim, marginBottom: 2, fontWeight: 600 };

const toggleBtn = (active) => ({
  flex: 1, padding: '5px 0', borderRadius: 4, border: `1px solid ${COLORS.borderLight}`,
  background: active ? COLORS.greenDark : 'transparent',
  color: active ? '#fff' : COLORS.textMuted,
  fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
});

export default function MemberDetail({ member, nodes, onUpdate, onDelete, onClose }) {
  const [realDx, setRealDx] = useState(String(member.realDx || 0));
  const [realDy, setRealDy] = useState(String(member.realDy || 0));
  const [eiFactor, setEiFactor] = useState(String(member.EI_factor));

  useEffect(() => {
    setRealDx(String(member.realDx || 0));
    setRealDy(String(member.realDy || 0));
    setEiFactor(String(member.EI_factor));
  }, [member.id, member.realDx, member.realDy, member.EI_factor]);

  const startNode = nodes.find(n => n.id === member.startNodeId);
  const endNode = nodes.find(n => n.id === member.endNodeId);
  const computedLength = getMemberLength(member);

  function commitRealDx() {
    const v = parseFloat(realDx);
    if (!isNaN(v) && v !== (member.realDx || 0)) onUpdate(member.id, { realDx: v });
  }

  function commitRealDy() {
    const v = parseFloat(realDy);
    if (!isNaN(v) && v !== (member.realDy || 0)) onUpdate(member.id, { realDy: v });
  }

  function commitEI() {
    const v = parseFloat(eiFactor);
    if (v && v > 0 && v !== member.EI_factor) onUpdate(member.id, { EI_factor: v });
  }

  function handleKey(e, commitFn) {
    if (e.key === 'Enter') commitFn();
  }

  return (
    <div style={{
      marginBottom: 16, padding: 12, background: COLORS.bgCard, borderRadius: 8,
      borderLeft: `3px solid ${COLORS.green}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary }}>
          Member {startNode?.id || '?'}&rarr;{endNode?.id || '?'}
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: COLORS.textDim,
          fontSize: 16, cursor: 'pointer', padding: '0 4px',
        }}>&times;</button>
      </div>

      {/* Real-world displacement */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Real Displacement (m)</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: COLORS.textDim, marginBottom: 2 }}>dx</div>
            <input type="number" value={realDx} onChange={e => setRealDx(e.target.value)}
              onBlur={commitRealDx} onKeyDown={e => handleKey(e, commitRealDx)}
              style={inputStyle} step="0.1" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: COLORS.textDim, marginBottom: 2 }}>dy</div>
            <input type="number" value={realDy} onChange={e => setRealDy(e.target.value)}
              onBlur={commitRealDy} onKeyDown={e => handleKey(e, commitRealDy)}
              style={inputStyle} step="0.1" />
          </div>
        </div>
        <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
          Length: {computedLength}m
        </div>
      </div>

      {/* Type */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Type</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={toggleBtn(member.type === 'frame')}
            onClick={() => onUpdate(member.id, { type: 'frame' })}>Frame</button>
          <button style={toggleBtn(member.type === 'truss')}
            onClick={() => onUpdate(member.id, { type: 'truss' })}>Truss</button>
        </div>
      </div>

      {/* EI Factor */}
      {member.type === 'frame' && (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>EI Factor</div>
          <input type="number" value={eiFactor} onChange={e => setEiFactor(e.target.value)}
            onBlur={commitEI} onKeyDown={e => handleKey(e, commitEI)}
            style={inputStyle} min="0.1" step="1" />
        </div>
      )}

      {/* Connection at start */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Connection at {startNode?.id || 'start'}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={toggleBtn(!member.startHinge)}
            onClick={() => onUpdate(member.id, { startHinge: false })}>Rigid</button>
          <button style={toggleBtn(member.startHinge)}
            onClick={() => onUpdate(member.id, { startHinge: true })}>Hinge</button>
        </div>
      </div>

      {/* Connection at end */}
      <div style={{ marginBottom: 10 }}>
        <div style={labelStyle}>Connection at {endNode?.id || 'end'}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={toggleBtn(!member.endHinge)}
            onClick={() => onUpdate(member.id, { endHinge: false })}>Rigid</button>
          <button style={toggleBtn(member.endHinge)}
            onClick={() => onUpdate(member.id, { endHinge: true })}>Hinge</button>
        </div>
      </div>

      {/* Delete */}
      <button onClick={() => onDelete(member.id)} style={{
        width: '100%', padding: '7px', borderRadius: 6, border: `1px solid #7f1d1d`,
        background: 'rgba(220,38,38,0.1)', color: '#f87171', fontSize: 11,
        cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
      }}>Delete Member</button>
    </div>
  );
}
