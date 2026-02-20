import { COLORS, FONTS } from '../constants/brand';

export default function SensitivityAnalysis({ sensitivity, conditionNumber }) {
  if (!sensitivity) return null;

  const { b, x, perturbedX, perturbAmount, relChangeA, relChangeX, amplification } = sensitivity;

  const cardStyle = {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: 16,
  };

  const sectionTitle = {
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 10,
  };

  const formatNum = (v) => {
    if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(4);
    const r = Math.round(v * 100000) / 100000;
    return r.toString();
  };

  const formatPct = (v) => {
    return (v * 100).toFixed(4) + '%';
  };

  return (
    <div style={cardStyle}>
      <div style={sectionTitle}>Sensitivity Analysis</div>

      <div style={{
        fontFamily: FONTS.body,
        fontSize: 13,
        color: COLORS.textMuted,
        lineHeight: 1.6,
        marginBottom: 12,
      }}>
        A small perturbation ({formatNum(perturbAmount)}) was applied to element a₁₁.
        This shows how sensitive the solution of <span style={{ fontFamily: FONTS.mono, color: COLORS.textPrimary }}>Ax = b</span> is to changes in A.
      </div>

      {/* Original vs Perturbed Solution */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 12,
      }}>
        <div style={{
          padding: 10,
          background: COLORS.bgPanel,
          borderRadius: 4,
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.textDim,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 6,
          }}>
            Original x
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textPrimary }}>
            [{x.map(v => formatNum(v)).join(', ')}]
          </div>
        </div>
        <div style={{
          padding: 10,
          background: COLORS.bgPanel,
          borderRadius: 4,
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.textDim,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 6,
          }}>
            Perturbed x
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.accent }}>
            [{perturbedX.map(v => formatNum(v)).join(', ')}]
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: FONTS.mono,
        fontSize: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textPrimary }}>
          <span style={{ color: COLORS.textMuted }}>b vector</span>
          <span>[{b.join(', ')}]</span>
        </div>
        <div style={{ height: 1, background: COLORS.border }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textPrimary }}>
          <span style={{ color: COLORS.textMuted }}>Relative change in A</span>
          <span>{formatPct(relChangeA)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textPrimary }}>
          <span style={{ color: COLORS.textMuted }}>Relative change in x</span>
          <span style={{ color: COLORS.accent }}>{formatPct(relChangeX)}</span>
        </div>
        <div style={{ height: 1, background: COLORS.border }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textPrimary }}>
          <span style={{ color: COLORS.textMuted }}>Amplification factor</span>
          <span style={{ color: COLORS.orange, fontWeight: 700 }}>
            {amplification.toFixed(2)}×
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textPrimary }}>
          <span style={{ color: COLORS.textMuted }}>Condition number bound</span>
          <span style={{ fontWeight: 600 }}>
            ≤ {conditionNumber < 1000 ? conditionNumber.toFixed(2) : conditionNumber.toLocaleString('en-US', { maximumFractionDigits: 0 })}×
          </span>
        </div>
      </div>

      {/* Interpretation */}
      <div style={{
        marginTop: 12,
        padding: 10,
        background: COLORS.bgPanel,
        borderRadius: 4,
        border: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          color: COLORS.textDim,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 6,
        }}>
          Interpretation
        </div>
        <div style={{
          fontFamily: FONTS.body,
          fontSize: 12,
          color: COLORS.textMuted,
          lineHeight: 1.6,
        }}>
          The condition number guarantees that the relative error in x is at most Cond[A] times the relative error in A.
          Here, a {formatPct(relChangeA)} change in A caused a {formatPct(relChangeX)} change in x (amplification: {amplification.toFixed(2)}×).
          {amplification > 10
            ? ' This significant amplification indicates the system is sensitive to input perturbations.'
            : ' The amplification is moderate, suggesting reasonable solution reliability.'}
        </div>
      </div>
    </div>
  );
}
