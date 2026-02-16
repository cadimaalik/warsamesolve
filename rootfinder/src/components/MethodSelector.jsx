import { COLORS, FONTS, METHOD_COLORS } from '../constants/brand';

const METHODS = [
  {
    id: 'bisection',
    name: 'Bisection',
    desc: 'Bracketing method, always converges',
    formula: 'c = (a + b) / 2',
    convergence: 'Linear, O(log n)',
    needs: ['interval'],
  },
  {
    id: 'falsePosition',
    name: 'False Position',
    desc: 'Bracketing with linear interpolation',
    formula: 'c = a - f(a)(b-a)/(f(b)-f(a))',
    convergence: 'Superlinear',
    needs: ['interval'],
  },
  {
    id: 'newtonRaphson',
    name: 'Newton-Raphson',
    desc: 'Uses derivative, fast convergence',
    formula: "x_{n+1} = x_n - f(x_n)/f'(x_n)",
    convergence: 'Quadratic, O(n^2)',
    needs: ['x0'],
  },
  {
    id: 'secant',
    name: 'Secant',
    desc: 'Like Newton but no derivative needed',
    formula: 'x_{n+1} = x_n - f(x_n)(x_n - x_{n-1})/(f(x_n) - f(x_{n-1}))',
    convergence: 'Superlinear, ~O(n^1.618)',
    needs: ['x0', 'x1'],
  },
  {
    id: 'fixedPoint',
    name: 'Fixed-Point',
    desc: 'Iterates x = g(x)',
    formula: 'x_{n+1} = g(x_n)',
    convergence: 'Linear (if |g\'(r)| < 1)',
    needs: ['x0', 'gExpr'],
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
                  {m.convergence}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
