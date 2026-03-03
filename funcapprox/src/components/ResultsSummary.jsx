import { COLORS, FONTS, METHOD_COLORS } from '../constants/brand';
import useMathJax from '../hooks/useMathJax';

export default function ResultsSummary({ result }) {
  useMathJax([result]);

  if (!result) return null;

  const color = METHOD_COLORS[result.subMethod || result.method] || COLORS.green;

  const statBoxStyle = {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: '10px 14px',
    flex: 1,
    minWidth: 120,
  };

  const statLabel = {
    fontFamily: FONTS.mono, fontSize: 9, color: COLORS.textDim,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
  };

  const statValue = {
    fontFamily: FONTS.mono, fontSize: 14, fontWeight: 700, color,
  };

  const methodLabel = {
    lagrange: 'Lagrange Interpolation',
    cubicSplines: 'Natural Cubic Splines',
    leastSquares: 'Least-Squares Regression',
  }[result.method] || result.method;

  return (
    <div style={{
      background: COLORS.bgPanel,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: FONTS.mono, fontSize: 12, fontWeight: 600,
          color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Results
        </span>
        <span style={{
          fontFamily: FONTS.mono, fontSize: 10, color,
          padding: '2px 8px', background: `${color}18`,
          border: `1px solid ${color}40`, borderRadius: 3,
        }}>
          {methodLabel}
        </span>
      </div>

      <div style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {/* Equation */}
        {result.equationStr && (
          <div style={{ ...statBoxStyle, flex: '1 1 100%' }}>
            <div style={statLabel}>Fitted Equation</div>
            <div style={{ ...statValue, fontSize: 13, overflowX: 'auto' }}>
              {`$$${result.equationStr}$$`}
            </div>
          </div>
        )}

        {result.polynomialStr && (
          <div style={{ ...statBoxStyle, flex: '1 1 100%' }}>
            <div style={statLabel}>Polynomial (degree {result.degree})</div>
            <div style={{ ...statValue, fontSize: 13, overflowX: 'auto' }}>
              {`$$P_{${result.degree}}(x) = ${result.polynomialStr}$$`}
            </div>
          </div>
        )}

        {result.numSplines !== undefined && (
          <div style={statBoxStyle}>
            <div style={statLabel}>Spline Segments</div>
            <div style={statValue}>{result.numSplines}</div>
          </div>
        )}

        {result.r2 !== undefined && (
          <div style={statBoxStyle}>
            <div style={statLabel}>R-squared</div>
            <div style={statValue}>{result.r2.toFixed(6)}</div>
          </div>
        )}

        {result.rss !== undefined && (
          <div style={statBoxStyle}>
            <div style={statLabel}>RSS Error</div>
            <div style={statValue}>{result.rss.toFixed(6)}</div>
          </div>
        )}

        {result.evalResult !== null && result.evalResult !== undefined && (
          <div style={statBoxStyle}>
            <div style={statLabel}>f({result.xEval})</div>
            <div style={statValue}>{result.evalResult.toFixed(6)}</div>
          </div>
        )}

        <div style={statBoxStyle}>
          <div style={statLabel}>Data Points</div>
          <div style={statValue}>{result.points.length}</div>
        </div>
      </div>
    </div>
  );
}
