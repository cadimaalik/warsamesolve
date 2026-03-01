import { useState } from 'react';
import { COLORS, FONTS } from '../constants/brand';

const INFO = {
  lagrange: {
    title: 'Lagrange Interpolation',
    when: 'Use when you need a polynomial that passes exactly through all data points, especially for small datasets (n ≤ 5).',
    advantages: [
      'Easy to understand and implement',
      'Unique polynomial guaranteed for n+1 points',
      'No system of equations to solve',
    ],
    disadvantages: [
      "Runge's phenomenon for high-degree polynomials",
      'Oscillation between data points (n > 5)',
      'Adding a point requires complete recomputation',
    ],
    applications: [
      'Engineering data interpolation',
      'Numerical integration (Newton-Cotes)',
      'Signal processing',
    ],
  },
  cubicSplines: {
    title: 'Natural Cubic Splines',
    when: 'Use when you need a smooth curve through data points without high-degree polynomial oscillation.',
    advantages: [
      'Smooth first and second derivatives',
      'No oscillation problems',
      'Local changes only affect nearby intervals',
    ],
    disadvantages: [
      'Requires solving a system of equations',
      'Natural BCs assume zero curvature at endpoints',
      'Cannot extrapolate well beyond data range',
    ],
    applications: [
      'CAD/CAM surface modeling',
      'Animation and graphics',
      'Road and bridge profile design',
    ],
  },
  leastSquares: {
    title: 'Least-Squares Regression',
    when: 'Use when data contains noise/measurement error and you want the best-fit curve (not necessarily passing through points).',
    advantages: [
      'Robust to noise in data',
      'R² provides quality metric',
      'Can fit various function types',
    ],
    disadvantages: [
      'Does not pass through data points',
      'Choice of model affects quality',
      'Nonlinear fits use linearization (approximate)',
    ],
    applications: [
      'Experimental data analysis',
      'Trend prediction and forecasting',
      'Calibration curves in testing',
    ],
  },
};

export default function InfoBox({ method }) {
  const [expanded, setExpanded] = useState(false);
  const info = INFO[method];
  if (!info) return null;

  return (
    <div style={{
      background: COLORS.bgDark,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 4,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontFamily: FONTS.mono,
          fontSize: 10,
          color: COLORS.textDim,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
        aria-expanded={expanded}
      >
        <span>About {info.title}</span>
        <span style={{ fontSize: 12 }}>{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px', fontSize: 11, fontFamily: FONTS.mono }}>
          <Section title="When to Use" color={COLORS.green}>
            {info.when}
          </Section>
          <Section title="Advantages" color={COLORS.green}>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {info.advantages.map((a, i) => <li key={i} style={{ color: COLORS.textMuted, marginBottom: 2 }}>{a}</li>)}
            </ul>
          </Section>
          <Section title="Disadvantages" color={COLORS.error}>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {info.disadvantages.map((d, i) => <li key={i} style={{ color: COLORS.textMuted, marginBottom: 2 }}>{d}</li>)}
            </ul>
          </Section>
          <Section title="Applications" color={COLORS.blue}>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {info.applications.map((a, i) => <li key={i} style={{ color: COLORS.textMuted, marginBottom: 2 }}>{a}</li>)}
            </ul>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: 10,
        fontWeight: 600,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 4,
      }}>
        {title}
      </div>
      <div style={{ color: COLORS.textMuted, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}
