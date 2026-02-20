import { useState } from 'react';
import { COLORS, FONTS } from '../constants/brand';

const EXAMPLES = [
  {
    label: 'Identity 3x3 (Cond = 1)',
    value: '[1 0 0; 0 1 0; 0 0 1]',
    description: 'Perfectly conditioned',
  },
  {
    label: 'Well-conditioned 2x2',
    value: '[1.01 0.99; 0.99 1.01]',
    description: 'Cond(A) ≈ 100',
  },
  {
    label: 'Ill-conditioned 3x3',
    value: '[3.02 -1.05 2.53; 4.33 0.56 -1.78; -0.83 -0.54 1.47]',
    description: 'Cond(A) ≈ 7595',
  },
  {
    label: 'Extremely ill-conditioned 2x2',
    value: '[5 400000; 1 1]',
    description: 'Cond(A) ≈ 400,013',
  },
  {
    label: 'Simple 2x2',
    value: '[1 2; 3 4]',
    description: 'Basic example',
  },
  {
    label: 'Diagonal 3x3',
    value: '[1 0 0; 0 2 0; 0 0 3]',
    description: 'Cond(A) = 3',
  },
];

export default function MatrixInput({ value, onChange, error }) {
  const [showExamples, setShowExamples] = useState(false);

  const inputStyle = {
    width: '100%',
    minHeight: 80,
    padding: '10px 12px',
    fontFamily: FONTS.mono,
    fontSize: 14,
    background: COLORS.bgInput,
    color: COLORS.textPrimary,
    border: `1px solid ${error ? COLORS.error : COLORS.border}`,
    borderRadius: 4,
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.6,
  };

  const labelStyle = {
    fontFamily: FONTS.mono,
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={labelStyle}>Matrix A (MATLAB notation)</div>
        <button
          onClick={() => setShowExamples(!showExamples)}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            fontWeight: 600,
            color: COLORS.green,
            background: 'transparent',
            border: `1px solid ${COLORS.green}`,
            borderRadius: 3,
            padding: '3px 8px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {showExamples ? 'Hide' : 'Load'} Examples
        </button>
      </div>

      {showExamples && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 8,
          background: COLORS.bgCard,
          borderRadius: 4,
          border: `1px solid ${COLORS.border}`,
        }}>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => { onChange(ex.value); setShowExamples(false); }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                background: 'transparent',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                textAlign: 'left',
                color: COLORS.textPrimary,
                fontFamily: FONTS.mono,
                fontSize: 11,
              }}
              onMouseOver={e => e.currentTarget.style.background = COLORS.bgInput}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span>{ex.label}</span>
              <span style={{ color: COLORS.textDim, fontSize: 10 }}>{ex.description}</span>
            </button>
          ))}
        </div>
      )}

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="[1 2; 3 4]"
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = error ? COLORS.error : COLORS.green}
        onBlur={e => e.target.style.borderColor = error ? COLORS.error : COLORS.border}
        spellCheck={false}
      />

      {error && (
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: COLORS.error,
          padding: '6px 8px',
          background: COLORS.errorGlow,
          borderRadius: 3,
          border: `1px solid ${COLORS.error}`,
        }}>
          {error}
        </div>
      )}

      <div style={{
        fontFamily: FONTS.body,
        fontSize: 12,
        color: COLORS.textDim,
        lineHeight: 1.5,
      }}>
        Rows separated by <span style={{ color: COLORS.textMuted, fontFamily: FONTS.mono }}>;</span> — elements by spaces or commas
      </div>

      {/* Syntax examples */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4,
        fontSize: 10,
        fontFamily: FONTS.mono,
        color: COLORS.textDim,
      }}>
        <div>2x2: <span style={{ color: COLORS.textMuted }}>[1 2; 3 4]</span></div>
        <div>3x3: <span style={{ color: COLORS.textMuted }}>[1 0 0; 0 2 0; 0 0 3]</span></div>
        <div>Decimals: <span style={{ color: COLORS.textMuted }}>[1.5 2.3; 4.1 5.6]</span></div>
        <div>Negatives: <span style={{ color: COLORS.textMuted }}>[-1 2; 3 -4]</span></div>
      </div>
    </div>
  );
}
