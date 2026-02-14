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

const readOnlyField = {
  padding: '5px 8px', borderRadius: 4, background: COLORS.bgInput,
  border: `1px solid ${COLORS.borderLight}`, fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace",
};

export default function MemberDetail({ member, nodes, onUpdate, onDelete, onClose, globalAxialMode }) {
  const [eiFactor, setEiFactor] = useState(String(member.EI_factor));
  const [eaFactor, setEaFactor] = useState(String(member.EA_factor || 1));
  const [eaAbsolute, setEaAbsolute] = useState(String(member.EA_absolute || 200000));

  useEffect(() => {
    setEiFactor(String(member.EI_factor));
    setEaFactor(String(member.EA_factor || 1));
    setEaAbsolute(String(member.EA_absolute || 200000));
  }, [member.id, member.EI_factor, member.EA_factor, member.EA_absolute]);

  const startNode = nodes.find(n => n.id === member.startNodeId);
  const endNode = nodes.find(n => n.id === member.endNodeId);
  const computedLength = getMemberLength(member);
  const isTruss = member.type === 'truss';

  const axialStiffness = member.axialStiffness || 'rigid';
  const eaMode = member.EA_mode || 'relative';
  const isDeformable = isTruss || axialStiffness === 'deformable';
  const globalOverride = globalAxialMode && globalAxialMode !== 'mixed';

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
        <div style={{ ...readOnlyField, color: COLORS.green, fontWeight: 600 }}>
          {computedLength} m
        </div>
      </div>

      {/* Type (read-only) */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Type</div>
        <div style={{ ...readOnlyField, color: COLORS.textPrimary }}>
          {isTruss ? 'Truss' : 'Frame'}
        </div>
      </div>

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
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>Connection at {endNode?.id || 'end'}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={toggleBtn(!member.endHinge)}
              onClick={() => onUpdate(member.id, { endHinge: false })}>Rigid</button>
            <button style={toggleBtn(member.endHinge)}
              onClick={() => onUpdate(member.id, { endHinge: true })}>Hinge</button>
          </div>
        </div>
      )}

      {/* Axial Stiffness */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Axial Stiffness</div>
        {globalOverride ? (
          <div style={{ fontSize: 10, color: '#f59e0b', padding: '4px 0' }}>
            Global: all members axially {globalAxialMode === 'all-rigid' ? 'rigid' : 'deformable'}
          </div>
        ) : !isTruss ? (
          <div style={{ display: 'flex', gap: 4, marginBottom: isDeformable ? 6 : 0 }}>
            <button style={toggleBtn(axialStiffness === 'rigid')}
              onClick={() => onUpdate(member.id, { axialStiffness: 'rigid' })}>Rigid</button>
            <button style={toggleBtn(axialStiffness === 'deformable')}
              onClick={() => onUpdate(member.id, { axialStiffness: 'deformable' })}>Deformable</button>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: COLORS.textMuted, padding: '2px 0', marginBottom: 4 }}>
            Truss: always deformable
          </div>
        )}

        {/* EA input (shown when deformable and no global override) */}
        {isDeformable && !globalOverride && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              <button style={toggleBtn(eaMode === 'relative')}
                onClick={() => onUpdate(member.id, { EA_mode: 'relative' })}>Relative</button>
              <button style={toggleBtn(eaMode === 'absolute')}
                onClick={() => onUpdate(member.id, { EA_mode: 'absolute' })}>Absolute</button>
            </div>
            {eaMode === 'relative' ? (
              <div>
                <div style={labelStyle}>EA Multiplier</div>
                <NumberInput value={eaFactor} onChange={v => {
                  setEaFactor(v);
                  const pv = parseFloat(v);
                  if (pv && pv > 0) onUpdate(member.id, { EA_factor: pv });
                }} min="0.1" />
              </div>
            ) : (
              <div>
                <div style={labelStyle}>EA (kN)</div>
                <NumberInput value={eaAbsolute} onChange={v => {
                  setEaAbsolute(v);
                  const pv = parseFloat(v);
                  if (pv && pv > 0) onUpdate(member.id, { EA_absolute: pv });
                }} min="1" />
              </div>
            )}
          </>
        )}
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

      {/* Distributed loads summary */}
      {(member.distributedLoads || []).length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>Distributed Loads</div>
          {member.distributedLoads.map(dl => (
            <div key={dl.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 10, padding: '3px 6px', background: COLORS.bgInput, borderRadius: 3, marginBottom: 2,
            }}>
              <span style={{ color: COLORS.textMuted }}>
                {dl.shape} &middot; {dl.startIntensity}/{dl.endIntensity} kN/m
              </span>
            </div>
          ))}
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
