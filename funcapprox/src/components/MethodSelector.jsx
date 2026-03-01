import { COLORS, FONTS, METHOD_COLORS } from '../constants/brand';

const METHODS = [
  {
    id: 'lagrange',
    name: 'Lagrange Interpolation',
    desc: 'Polynomial through all data points',
    formula: 'P(x) = Σ Lᵢ(x)·yᵢ',
    info: 'Best for small datasets (≤5 points)',
  },
  {
    id: 'cubicSplines',
    name: 'Cubic Splines',
    desc: 'Piecewise cubic with smooth joins',
    formula: 'Sᵢ(x) = aᵢx³ + bᵢx² + cᵢx + dᵢ',
    info: 'Natural boundary conditions',
  },
  {
    id: 'leastSquares',
    name: 'Least-Squares Regression',
    desc: 'Best fit minimizing error',
    formula: 'min Σ(yᵢ - ŷᵢ)²',
    info: 'Linear, polynomial & nonlinear fits',
  },
];

export { METHODS };

export default function MethodSelector({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: COLORS.textDim,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        Method
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {METHODS.map((m) => {
          const isActive = selected === m.id;
          const color = METHOD_COLORS[m.id] || COLORS.green;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              aria-pressed={isActive}
              style={{
                background: isActive ? `${color}15` : COLORS.bgInput,
                border: `1px solid ${isActive ? color : COLORS.border}`,
                borderRadius: 4,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                outline: 'none',
              }}
            >
              <div style={{
                fontFamily: FONTS.mono,
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? color : COLORS.textPrimary,
                marginBottom: 2,
              }}>
                {m.name}
              </div>
              <div style={{
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: COLORS.textDim,
              }}>
                {m.desc}
              </div>
              {isActive && (
                <div style={{
                  fontFamily: FONTS.mono,
                  fontSize: 10,
                  color: COLORS.textMuted,
                  marginTop: 4,
                  padding: '3px 6px',
                  background: COLORS.bgDark,
                  borderRadius: 2,
                  display: 'inline-block',
                }}>
                  {m.info}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
