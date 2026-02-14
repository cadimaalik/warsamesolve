import React from 'react';
import { COLORS, FONTS } from '../constants/brand.js';

const secondaryBtn = {
  padding: '6px 12px', borderRadius: 6, border: `1px solid ${COLORS.borderLight}`,
  background: 'transparent', color: COLORS.textPrimary, fontSize: 12,
  fontFamily: FONTS.mono, cursor: 'pointer', transition: 'background 0.15s',
};

const disabledBtn = {
  ...secondaryBtn, opacity: 0.4, cursor: 'default', pointerEvents: 'none',
};

const primaryBtn = {
  padding: '6px 14px', borderRadius: 6, border: 'none',
  background: COLORS.greenDark, color: '#fff', fontSize: 12,
  fontFamily: FONTS.mono, fontWeight: 700, cursor: 'pointer',
  transition: 'all 0.15s',
};

const primaryDisabled = {
  ...primaryBtn, opacity: 0.4, cursor: 'default', pointerEvents: 'none',
};

const selectStyle = {
  padding: '7px 10px', borderRadius: 6, border: `1px solid ${COLORS.borderLight}`,
  background: COLORS.bgCard, color: COLORS.textPrimary, fontSize: 12,
  fontFamily: FONTS.mono, cursor: 'pointer', outline: 'none', minWidth: 160,
};

export default function Header({ onClear, onUndo, canUndo, nodeCount, axialMode, onAxialModeChange }) {
  function handleClear() {
    if (window.confirm('Clear the entire structure? This cannot be undone.')) {
      onClear();
    }
  }

  return (
    <div style={{
      height: 48, background: COLORS.bgDark, display: 'flex',
      alignItems: 'center', padding: '0 16px',
      borderBottom: `1px solid ${COLORS.border}`,
      fontFamily: FONTS.mono, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/structsolve/logo.svg" alt="StructSOLVE" style={{ height: 24 }} />
        <span style={{ fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: '#fff' }}>Struct</span>
          <span style={{ color: COLORS.green }}>SOLVE</span>
        </span>
      </div>

      <span style={{ flex: 1 }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* EA mode dropdown */}
        <span style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 600 }}>Axial Rigidity:</span>
        <select value={axialMode || 'mixed'} onChange={e => onAxialModeChange(e.target.value)} style={selectStyle}>
          <option value="all-rigid">{`All Rigid (EA=\u221E)`}</option>
          <option value="all-deformable">All Deformable</option>
          <option value="mixed">Mixed (per member)</option>
        </select>

        <button onClick={handleClear} style={secondaryBtn}
          onMouseOver={e => e.currentTarget.style.background = COLORS.bgCard}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
          Clear
        </button>

        <button onClick={onUndo} style={canUndo ? secondaryBtn : disabledBtn}
          onMouseOver={e => { if (canUndo) e.currentTarget.style.background = COLORS.bgCard; }}
          onMouseOut={e => { if (canUndo) e.currentTarget.style.background = 'transparent'; }}>
          &#8617; Undo
        </button>

        <button style={nodeCount >= 2 ? primaryBtn : primaryDisabled}
          onMouseOver={e => { if (nodeCount >= 2) e.currentTarget.style.background = COLORS.greenDarker; }}
          onMouseOut={e => { if (nodeCount >= 2) e.currentTarget.style.background = COLORS.greenDark; }}
          onClick={() => { if (nodeCount >= 2) console.log('analyze'); }}>
          Analyze &rarr;
        </button>
      </div>
    </div>
  );
}
