import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants/brand.js';
import { getMemberLength } from '../utils/geometry.js';
import NumberInput from './NumberInput.jsx';

const labelStyle = { fontSize: 10, color: COLORS.textDim, marginBottom: 2, fontWeight: 600 };

const toggleBtn = (active) => ({
  flex: 1, padding: '5px 0', borderRadius: 4, border: `1px solid ${COLORS.borderLight}`,
  background: active ? COLORS.greenDark : 'transparent',
  color: active ? '#fff' : COLORS.textMuted,
  fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
});

export default function MemberDetail({ member, nodes, onUpdate, onDelete, onClose }) {
  const [eiFactor, setEiFactor] = useState(String(member.EI_factor));

  useEffect(() => {
    setEiFactor(String(member.EI_factor));
  }, [member.id, member.EI_factor]);

  const startNode = nodes.find(n => n.id === member.startNodeId);
  const endNode = nodes.find(n => n.id === member.endNodeId);
  const computedLength = getMemberLength(member);
  const isTruss = member.type === 'truss';

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

      {/* Length (read-only) */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Length (m)</div>
        <div style={{
          padding: '5px 8px', borderRadius: 4, background: COLORS.bgInput,
          border: `1px solid ${COLORS.borderLight}`, fontSize: 12,
          color: COLORS.green, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {computedLength} m
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

      {/* EI Factor (frame only) */}
      {!isTruss && (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>EI Factor</div>
          <NumberInput value={eiFactor} onChange={v => {
            setEiFactor(v);
            const pv = parseFloat(v);
            if (pv && pv > 0 && pv !== member.EI_factor) onUpdate(member.id, { EI_factor: pv });
          }} min="0.1" />
        </div>
      )}

      {/* Connection at start (frame only — truss always hinged) */}
      {!isTruss && (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>Connection at {startNode?.id || 'start'}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={toggleBtn(!member.startHinge)}
              onClick={() => onUpdate(member.id, { startHinge: false })}>Rigid</button>
            <button style={toggleBtn(member.startHinge)}
              onClick={() => onUpdate(member.id, { startHinge: true })}>Hinge</button>
          </div>
        </div>
      )}

      {/* Connection at end (frame only) */}
      {!isTruss && (
        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Connection at {endNode?.id || 'end'}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={toggleBtn(!member.endHinge)}
              onClick={() => onUpdate(member.id, { endHinge: false })}>Rigid</button>
            <button style={toggleBtn(member.endHinge)}
              onClick={() => onUpdate(member.id, { endHinge: true })}>Hinge</button>
          </div>
        </div>
      )}

      {/* Delete */}
      <button onClick={() => onDelete(member.id)} style={{
        width: '100%', padding: '7px', borderRadius: 6, border: `1px solid #7f1d1d`,
        background: 'rgba(220,38,38,0.1)', color: '#f87171', fontSize: 11,
        cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
      }}>Delete Member</button>
    </div>
  );
}
