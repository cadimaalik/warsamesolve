import { COLORS, FONTS } from '../constants/brand';

export default function MethodOptions({
  method, subMethod, setSubMethod, polyDegree, setPolyDegree, xEval, setXEval,
}) {
  const inputStyle = {
    background: COLORS.bgInput,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 3,
    padding: '6px 8px',
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.textPrimary,
    outline: 'none',
    width: '100%',
  };

  const labelStyle = {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={{
        fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textDim,
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        Options
      </label>

      {method === 'leastSquares' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Fit Type</label>
          {[
            { id: 'linear', label: 'Linear (y = a + bx)' },
            { id: 'polynomial', label: 'Polynomial' },
            { id: 'exponential', label: 'Exponential (y = Ce^Ax)' },
            { id: 'power', label: 'Power (y = Cx^A)' },
            { id: 'rational', label: 'Rational (y = D/(x+C))' },
          ].map(opt => {
            const isActive = subMethod === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSubMethod(opt.id)}
                style={{
                  background: isActive ? COLORS.greenGlow : 'transparent',
                  border: `1px solid ${isActive ? COLORS.green : COLORS.border}`,
                  borderRadius: 3, padding: '6px 10px',
                  fontFamily: FONTS.mono, fontSize: 11,
                  color: isActive ? COLORS.green : COLORS.textMuted,
                  cursor: 'pointer', textAlign: 'left', outline: 'none',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {method === 'leastSquares' && subMethod === 'polynomial' && (
        <div>
          <label style={labelStyle}>Polynomial Degree (m)</label>
          <input
            type="number" min={1} max={5} value={polyDegree}
            onChange={e => setPolyDegree(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
            style={inputStyle} aria-label="Polynomial degree"
          />
        </div>
      )}

      <div>
        <label style={labelStyle}>Evaluate at x = (optional)</label>
        <input
          type="number" value={xEval}
          onChange={e => setXEval(e.target.value)}
          placeholder="Enter x value"
          style={inputStyle} aria-label="x value for evaluation"
        />
      </div>
    </div>
  );
}
