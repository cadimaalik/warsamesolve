import { COLORS, FONTS } from '../constants/brand';

const NORMS = [
  {
    id: 'infinity',
    label: '∞-Norm',
    formula: '||A||∞ = max row sum of |aᵢⱼ|',
    tooltip: 'Maximum absolute row sum. Most common in CE 305 lectures.',
  },
  {
    id: 'one',
    label: '1-Norm',
    formula: '||A||₁ = max column sum of |aᵢⱼ|',
    tooltip: 'Maximum absolute column sum.',
  },
  {
    id: 'frobenius',
    label: 'Frobenius',
    formula: '||A||F = √(Σ aᵢⱼ²)',
    tooltip: 'Square root of sum of all squared elements.',
  },
];

export default function NormSelector({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: 10,
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        Norm Type
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NORMS.map(norm => {
          const isActive = selected === norm.id;
          return (
            <button
              key={norm.id}
              onClick={() => onSelect(norm.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                padding: '8px 10px',
                background: isActive ? COLORS.greenGlow : 'transparent',
                border: `1px solid ${isActive ? COLORS.green : COLORS.border}`,
                borderRadius: 4,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: `2px solid ${isActive ? COLORS.green : COLORS.textDim}`,
                  background: isActive ? COLORS.green : 'transparent',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? COLORS.green : COLORS.textPrimary,
                }}>
                  {norm.label}
                </span>
                {norm.id === 'infinity' && (
                  <span style={{
                    fontFamily: FONTS.mono,
                    fontSize: 9,
                    color: COLORS.accent,
                    background: 'rgba(251, 191, 36, 0.1)',
                    padding: '1px 5px',
                    borderRadius: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Default
                  </span>
                )}
              </div>
              <div style={{
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: COLORS.textDim,
                paddingLeft: 18,
              }}>
                {norm.formula}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
