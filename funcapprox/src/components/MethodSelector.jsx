import { COLORS, FONTS, METHOD_COLORS } from '../constants/brand';

const METHODS = [
  { id: 'lagrange', label: 'Lagrange', desc: 'Interpolating Polynomials' },
  { id: 'cubicSplines', label: 'Cubic Splines', desc: 'Natural Boundary' },
  { id: 'leastSquares', label: 'Least-Squares', desc: 'Regression' },
];

export default function MethodSelector({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: COLORS.textDim,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        Method
      </label>
      <div style={{ display: 'flex', gap: 4 }}>
        {METHODS.map(m => {
          const isActive = selected === m.id;
          const color = METHOD_COLORS[m.id] || COLORS.green;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              aria-pressed={isActive}
              aria-label={`${m.label} - ${m.desc}`}
              style={{
                flex: 1,
                padding: '8px 6px',
                background: isActive ? `${color}18` : 'transparent',
                border: `1px solid ${isActive ? color : COLORS.border}`,
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                outline: 'none',
              }}
            >
              <span style={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                fontWeight: 600,
                color: isActive ? color : COLORS.textMuted,
              }}>
                {m.label}
              </span>
              <span style={{
                fontFamily: FONTS.mono,
                fontSize: 9,
                color: COLORS.textDim,
              }}>
                {m.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
