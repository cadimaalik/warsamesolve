import React, { useState } from 'react';
import { COLORS } from '../../constants/brand.js';
import NumberInput from '../NumberInput.jsx';

const labelStyle = { fontSize: 10, color: COLORS.textDim, marginBottom: 3, fontWeight: 600 };

const toggleBtn = (active) => ({
  flex: 1, padding: '5px 0', borderRadius: 4, border: `1px solid ${COLORS.borderLight}`,
  background: active ? COLORS.greenDark : 'transparent',
  color: active ? '#fff' : COLORS.textMuted,
  fontSize: 10, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
});

function getDefaultDirection(member) {
  const angleDeg = Math.atan2(Math.abs(member.realDy), Math.abs(member.realDx)) * 180 / Math.PI;
  if (angleDeg >= 60) return 'global-x';       // near-vertical
  if (angleDeg >= 30) return 'perpendicular';   // angled
  return 'global-y';                            // near-horizontal
}

export default function DistributedLoadInput({ member, startNodeId, endNodeId, memberLength, isInclined, onApply, onCancel, existingLoad, onDelete }) {
  const isEdit = !!existingLoad;

  const [direction, setDirection] = useState(isEdit ? existingLoad.direction : getDefaultDirection(member));
  const [shape, setShape] = useState(isEdit ? existingLoad.shape : 'udl');
  const [intensity, setIntensity] = useState(isEdit
    ? String(existingLoad.startIntensity === existingLoad.endIntensity ? existingLoad.startIntensity : existingLoad.startIntensity)
    : '-10');
  const [startIntensity, setStartIntensity] = useState(isEdit ? String(existingLoad.startIntensity) : '-10');
  const [endIntensity, setEndIntensity] = useState(isEdit ? String(existingLoad.endIntensity) : '-10');
  const [maxAt, setMaxAt] = useState(() => {
    if (isEdit && existingLoad.shape === 'triangular') {
      return existingLoad.startIntensity !== 0 ? 'start' : 'end';
    }
    return 'end';
  });
  const [startPos, setStartPos] = useState(isEdit ? String(existingLoad.startPos) : '0');
  const [endPos, setEndPos] = useState(isEdit ? String(existingLoad.endPos) : String(memberLength));

  function handleSubmit() {
    const sp = parseFloat(startPos) || 0;
    const ep = parseFloat(endPos) || memberLength;
    if (sp >= ep || sp < 0 || ep > memberLength) return;

    let sI = 0, eI = 0;
    if (shape === 'udl') {
      sI = parseFloat(intensity) || 0;
      eI = sI;
    } else if (shape === 'triangular') {
      const maxVal = parseFloat(intensity) || 0;
      sI = maxAt === 'start' ? maxVal : 0;
      eI = maxAt === 'end' ? maxVal : 0;
    } else {
      sI = parseFloat(startIntensity) || 0;
      eI = parseFloat(endIntensity) || 0;
    }

    if (sI === 0 && eI === 0) return;

    onApply({
      shape,
      startPos: sp,
      endPos: ep,
      startIntensity: sI,
      endIntensity: eI,
      direction,
    });
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10, fontWeight: 600 }}>
        {isEdit ? 'Edit' : 'Add'} Distributed Load on {startNodeId}&rarr;{endNodeId}
      </div>

      {/* Direction (only show for inclined members) */}
      {isInclined && (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>Load Direction</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={toggleBtn(direction === 'global-y')} onClick={() => setDirection('global-y')}>
              Global Y
            </button>
            <button style={toggleBtn(direction === 'global-x')} onClick={() => setDirection('global-x')}>
              Global X
            </button>
            <button style={toggleBtn(direction === 'perpendicular')} onClick={() => setDirection('perpendicular')}>
              Perp.
            </button>
          </div>
        </div>
      )}

      {/* Load shape */}
      <div style={{ marginBottom: 8 }}>
        <div style={labelStyle}>Load Shape</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={toggleBtn(shape === 'udl')} onClick={() => setShape('udl')}>UDL</button>
          <button style={toggleBtn(shape === 'triangular')} onClick={() => setShape('triangular')}>Triangular</button>
          <button style={toggleBtn(shape === 'trapezoidal')} onClick={() => setShape('trapezoidal')}>Trapezoid</button>
        </div>
      </div>

      {/* Intensity inputs based on shape */}
      {shape === 'udl' && (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>Intensity (kN/m)</div>
          <NumberInput value={intensity} onChange={setIntensity} allowNegative />
        </div>
      )}

      {shape === 'triangular' && (
        <>
          <div style={{ marginBottom: 6 }}>
            <div style={labelStyle}>Max Intensity (kN/m)</div>
            <NumberInput value={intensity} onChange={setIntensity} allowNegative />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={labelStyle}>Maximum at</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={toggleBtn(maxAt === 'start')} onClick={() => setMaxAt('start')}>
                Start ({startNodeId})
              </button>
              <button style={toggleBtn(maxAt === 'end')} onClick={() => setMaxAt('end')}>
                End ({endNodeId})
              </button>
            </div>
          </div>
        </>
      )}

      {shape === 'trapezoidal' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Start (kN/m)</div>
            <NumberInput value={startIntensity} onChange={setStartIntensity} allowNegative />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>End (kN/m)</div>
            <NumberInput value={endIntensity} onChange={setEndIntensity} allowNegative />
          </div>
        </div>
      )}

      {/* Position */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Start pos (m)</div>
          <NumberInput value={startPos} onChange={setStartPos} min="0" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>End pos (m)</div>
          <NumberInput value={endPos} onChange={setEndPos} min="0" />
        </div>
      </div>

      <div style={{ fontSize: 9, color: COLORS.textDim, marginBottom: 10 }}>
        Positive = up/right &middot; Negative = down/left
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '8px', borderRadius: 6, border: `1px solid ${COLORS.borderLight}`,
          background: 'transparent', color: COLORS.textMuted, fontSize: 12, cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
        }}>Cancel</button>
        {isEdit && onDelete && (
          <button onClick={onDelete} style={{
            padding: '8px 12px', borderRadius: 6, border: '1px solid #7f1d1d',
            background: 'rgba(220,38,38,0.1)', color: '#f87171', fontSize: 12, cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
          }}>Delete</button>
        )}
        <button onClick={handleSubmit} style={{
          flex: 1, padding: '8px', borderRadius: 6, border: 'none',
          background: COLORS.greenDark, color: '#fff', fontSize: 12, cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
        }}>{isEdit ? 'Update' : 'Apply'}</button>
      </div>
    </div>
  );
}
