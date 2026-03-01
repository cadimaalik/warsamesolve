import { COLORS, FONTS } from '../constants/brand';
import useMathJax from '../hooks/useMathJax';
import { fmt } from '../engine/matrix';

export default function ResultsSummary({ result }) {
  useMathJax([result]);

  if (!result) return null;

  const methodNames = {
    lagrange: 'Lagrange Interpolation',
    cubicSplines: 'Natural Cubic Splines',
    leastSquares: 'Least-Squares Regression',
  };

  const subMethodNames = {
    linear: 'Linear Fit',
    polynomial: 'Polynomial Fit',
    exponential: 'Exponential Fit',
    power: 'Power Fit',
    rational: 'Rational Fit',
  };

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.green,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {methodNames[result.method] || result.method}
        </div>
        {result.subMethod && (
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.textDim,
            padding: '2px 8px',
            background: COLORS.bgDark,
            borderRadius: 3,
          }}>
            {subMethodNames[result.subMethod] || result.subMethod}
          </div>
        )}
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Equation */}
        {(result.polynomialStr || result.equationStr) && (
          <div style={{
            background: COLORS.bgDark,
            borderRadius: 4,
            padding: '10px 14px',
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: 10,
              color: COLORS.textDim,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Result
            </div>
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: 14,
              color: COLORS.green,
              overflowX: 'auto',
            }}>
              {`$$${result.polynomialStr || result.equationStr}$$`}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {result.degree !== undefined && (
            <StatBox label="Degree" value={result.degree} />
          )}
          {result.numSplines !== undefined && (
            <StatBox label="Splines" value={result.numSplines} />
          )}
          {result.r2 !== undefined && (
            <StatBox label="R²" value={fmt(result.r2, 6)} />
          )}
          {result.rss !== undefined && (
            <StatBox label="RSS Error" value={fmt(result.rss, 6)} />
          )}
          {result.evalResult !== null && result.evalResult !== undefined && (
            <StatBox
              label={`f(${fmt(result.xEval)})`}
              value={fmt(result.evalResult, 6)}
              highlight
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight = false }) {
  return (
    <div style={{
      flex: '1 1 100px',
      background: highlight ? COLORS.greenGlow : COLORS.bgDark,
      borderRadius: 4,
      padding: '8px 12px',
      border: `1px solid ${highlight ? COLORS.green : COLORS.border}`,
    }}>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: 9,
        color: COLORS.textDim,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: 14,
        fontWeight: 600,
        color: highlight ? COLORS.green : COLORS.textPrimary,
      }}>
        {value}
      </div>
    </div>
  );
}
