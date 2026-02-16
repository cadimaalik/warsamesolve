import { COLORS, FONTS } from '../constants/brand';
import useMathJax from '../hooks/useMathJax';

export default function ResultsSummary({ result }) {
  useMathJax([result]);

  if (!result) return null;

  const hasError = !result.converged && result.error;

  return (
    <div style={{
      background: hasError ? COLORS.errorGlow : COLORS.greenGlow,
      border: `1px solid ${hasError ? COLORS.error : COLORS.green}`,
      borderRadius: 6,
      padding: 16,
    }}>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: 14,
        fontWeight: 700,
        color: hasError ? COLORS.error : COLORS.green,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {result.method} {result.converged ? '- Converged' : '- Did Not Converge'}
      </div>

      {hasError && !result.root && (
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: COLORS.error,
        }}>
          {result.error}
        </div>
      )}

      {result.root !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim, textTransform: 'uppercase' }}>
                Root
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: COLORS.textPrimary, fontWeight: 600 }}>
                {result.root.toFixed(10)}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim, textTransform: 'uppercase' }}>
                f(root)
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: COLORS.textMuted }}>
                {result.fRoot !== null && result.fRoot !== undefined ? result.fRoot.toExponential(6) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim, textTransform: 'uppercase' }}>
                Iterations
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: COLORS.accent }}>
                {result.numIterations || result.iterations?.length || '-'}
              </div>
            </div>
            {result.iterations?.length > 0 && (
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim, textTransform: 'uppercase' }}>
                  Final |Error|
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: COLORS.textMuted }}>
                  {result.iterations[result.iterations.length - 1].absError?.toExponential(4) || '-'}
                </div>
              </div>
            )}
          </div>
          {!result.converged && result.error && (
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: COLORS.accent,
              marginTop: 4,
            }}>
              Note: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
