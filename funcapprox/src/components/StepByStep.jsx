import { COLORS, FONTS } from '../constants/brand';
import useMathJax from '../hooks/useMathJax';

const typeStyles = {
  setup: { borderLeft: `3px solid ${COLORS.green}`, background: COLORS.greenGlow },
  info: { borderLeft: `3px solid ${COLORS.textDim}`, background: 'transparent' },
  iteration: { borderLeft: `3px solid ${COLORS.blue}`, background: 'transparent' },
  update: { borderLeft: `3px solid ${COLORS.accent}`, background: 'transparent' },
  converged: { borderLeft: `3px solid ${COLORS.green}`, background: COLORS.greenGlow },
  error: { borderLeft: `3px solid ${COLORS.error}`, background: COLORS.errorGlow },
};

export default function StepByStep({ steps }) {
  useMathJax([steps]);

  if (!steps || steps.length === 0) return null;

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
        fontFamily: FONTS.mono, fontSize: 12, fontWeight: 600,
        color: COLORS.textPrimary, textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Step-by-Step Solution
      </div>
      <div style={{ padding: 14, maxHeight: 600, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {steps.map((step, idx) => {
            const style = typeStyles[step.type] || typeStyles.info;
            return (
              <div
                key={idx}
                style={{
                  ...style,
                  padding: '8px 12px',
                  borderRadius: 2,
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  color: COLORS.textPrimary,
                  overflowX: 'auto',
                }}
              >
                {`$$${step.latex}$$`}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
