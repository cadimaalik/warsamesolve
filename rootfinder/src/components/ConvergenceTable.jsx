import { COLORS, FONTS } from '../constants/brand';

const cellStyle = {
  padding: '6px 10px',
  fontFamily: FONTS.mono,
  fontSize: 11,
  borderBottom: `1px solid ${COLORS.border}`,
  whiteSpace: 'nowrap',
};

const headerStyle = {
  ...cellStyle,
  color: COLORS.textDim,
  fontWeight: 600,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  position: 'sticky',
  top: 0,
  background: COLORS.bgCard,
  zIndex: 1,
};

function fmt(v, decimals = 8) {
  if (v === null || v === undefined) return '-';
  if (Math.abs(v) < 1e-4 && v !== 0) return v.toExponential(4);
  return v.toFixed(decimals);
}

export default function ConvergenceTable({ result }) {
  if (!result || !result.iterations || result.iterations.length === 0) return null;

  const method = result.method;
  const isBracketing = method === 'Bisection' || method === 'False Position';
  const isNewton = method === 'Newton-Raphson';
  const isSecant = method === 'Secant';
  const isFixedPoint = method === 'Fixed-Point Iteration';

  return (
    <div style={{
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${COLORS.border}`,
        fontFamily: FONTS.mono,
        fontSize: 12,
        fontWeight: 600,
        color: COLORS.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Iteration Table
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 400 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerStyle}>n</th>
              {isBracketing && <th style={headerStyle}>a</th>}
              {isBracketing && <th style={headerStyle}>b</th>}
              {isBracketing && <th style={headerStyle}>c</th>}
              {isBracketing && <th style={headerStyle}>f(c)</th>}
              {isNewton && <th style={headerStyle}>x_n</th>}
              {isNewton && <th style={headerStyle}>f(x_n)</th>}
              {isNewton && <th style={headerStyle}>f'(x_n)</th>}
              {isNewton && <th style={headerStyle}>x_{'{n+1}'}</th>}
              {isSecant && <th style={headerStyle}>x_{'{n-1}'}</th>}
              {isSecant && <th style={headerStyle}>x_n</th>}
              {isSecant && <th style={headerStyle}>f(x_n)</th>}
              {isSecant && <th style={headerStyle}>x_{'{n+1}'}</th>}
              {isFixedPoint && <th style={headerStyle}>x_n</th>}
              {isFixedPoint && <th style={headerStyle}>g(x_n)</th>}
              <th style={headerStyle}>|Error|</th>
              <th style={headerStyle}>|Rel Error|</th>
            </tr>
          </thead>
          <tbody>
            {result.iterations.map((row, idx) => {
              const isLast = idx === result.iterations.length - 1;
              const rowColor = isLast && result.converged ? COLORS.greenGlow : 'transparent';
              return (
                <tr key={idx} style={{ background: rowColor }}>
                  <td style={{ ...cellStyle, color: COLORS.textDim }}>{row.n}</td>
                  {isBracketing && <td style={{ ...cellStyle, color: COLORS.textPrimary }}>{fmt(row.a, 6)}</td>}
                  {isBracketing && <td style={{ ...cellStyle, color: COLORS.textPrimary }}>{fmt(row.b, 6)}</td>}
                  {isBracketing && <td style={{ ...cellStyle, color: COLORS.green, fontWeight: 600 }}>{fmt(row.c, 8)}</td>}
                  {isBracketing && <td style={{ ...cellStyle, color: COLORS.textMuted }}>{fmt(row.fc)}</td>}
                  {isNewton && <td style={{ ...cellStyle, color: COLORS.textPrimary }}>{fmt(row.xn, 8)}</td>}
                  {isNewton && <td style={{ ...cellStyle, color: COLORS.textMuted }}>{fmt(row.fxn)}</td>}
                  {isNewton && <td style={{ ...cellStyle, color: COLORS.textMuted }}>{fmt(row.fpxn)}</td>}
                  {isNewton && <td style={{ ...cellStyle, color: COLORS.green, fontWeight: 600 }}>{fmt(row.xnp1, 8)}</td>}
                  {isSecant && <td style={{ ...cellStyle, color: COLORS.textMuted }}>{fmt(row.xPrev, 8)}</td>}
                  {isSecant && <td style={{ ...cellStyle, color: COLORS.textPrimary }}>{fmt(row.xCurr, 8)}</td>}
                  {isSecant && <td style={{ ...cellStyle, color: COLORS.textMuted }}>{fmt(row.fCurr)}</td>}
                  {isSecant && <td style={{ ...cellStyle, color: COLORS.green, fontWeight: 600 }}>{fmt(row.xNext, 8)}</td>}
                  {isFixedPoint && <td style={{ ...cellStyle, color: COLORS.textPrimary }}>{fmt(row.xn, 8)}</td>}
                  {isFixedPoint && <td style={{ ...cellStyle, color: COLORS.green, fontWeight: 600 }}>{fmt(row.gxn, 8)}</td>}
                  <td style={{ ...cellStyle, color: COLORS.accent }}>{row.absError?.toExponential(4)}</td>
                  <td style={{ ...cellStyle, color: COLORS.textDim }}>{row.relError?.toExponential(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
