import { useState } from 'react';
import { COLORS, FONTS } from '../constants/brand';
import MatrixDisplay from './MatrixDisplay';
import { useMathJax } from '../hooks/useMathJax';

const NORM_LABELS = {
  infinity: '∞',
  one: '1',
  frobenius: 'F',
};

const NORM_NAMES = {
  infinity: 'Infinity Norm (Row-Sum)',
  one: '1-Norm (Column-Sum)',
  frobenius: 'Frobenius Norm',
};

export default function ResultsDisplay({ result, normType, matrix }) {
  const [showDetails, setShowDetails] = useState(true);
  const ref = useMathJax([result, showDetails]);

  if (!result) return null;

  const { conditionNumber: cond, normA, normAInv, normADetails, normAInvDetails, inverseMatrix, det, classification } = result;

  const normLabel = NORM_LABELS[normType];

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

  const toggleStyle = (active) => ({
    padding: '4px 10px',
    fontFamily: FONTS.mono,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${active ? COLORS.green : COLORS.border}`,
    background: active ? COLORS.greenGlow : 'transparent',
    color: active ? COLORS.green : COLORS.textDim,
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    outline: 'none',
  });

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Condition Number Hero */}
      <div style={{
        ...cardStyle,
        border: `2px solid ${classification.color}`,
        background: classification.bgColor,
        textAlign: 'center',
        padding: 24,
      }}>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: COLORS.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 8,
        }}>
          Condition Number
        </div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 36,
          fontWeight: 700,
          color: classification.color,
          marginBottom: 8,
        }}>
          {cond < 1000 ? cond.toFixed(2) : cond.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
        <div style={{
          display: 'inline-block',
          padding: '4px 14px',
          borderRadius: 4,
          background: classification.bgColor,
          border: `1px solid ${classification.color}`,
          fontFamily: FONTS.mono,
          fontSize: 12,
          fontWeight: 700,
          color: classification.color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 10,
        }}>
          {classification.label}
        </div>
        <div style={{
          fontFamily: FONTS.body,
          fontSize: 13,
          color: COLORS.textPrimary,
          maxWidth: 500,
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          {classification.description}
        </div>
      </div>

      {/* Formula Summary */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Calculation Summary</div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 13,
          color: COLORS.textPrimary,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: COLORS.textMuted }}>||A||<sub>{normLabel}</sub></span>
            <span style={{ color: COLORS.green, fontWeight: 600 }}>{formatValue(normA)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: COLORS.textMuted }}>||A<sup>-1</sup>||<sub>{normLabel}</sub></span>
            <span style={{ color: COLORS.green, fontWeight: 600 }}>{formatValue(normAInv)}</span>
          </div>
          <div style={{ height: 1, background: COLORS.border }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: COLORS.textMuted }}>
              Cond[A] = ||A||<sub>{normLabel}</sub> × ||A<sup>-1</sup>||<sub>{normLabel}</sub>
            </span>
            <span style={{ color: classification.color, fontWeight: 700, fontSize: 15 }}>
              {formatValue(cond)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: COLORS.textDim }}>det(A)</span>
            <span style={{ color: COLORS.textMuted }}>{formatValue(det)}</span>
          </div>
        </div>
      </div>

      {/* Toggle for detailed calculations */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={toggleStyle(showDetails)} onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide' : 'Show'} Detailed Steps
        </button>
      </div>

      {showDetails && (
        <>
          {/* Matrix A and Inverse side by side */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16,
          }}>
            <div style={cardStyle}>
              <div style={sectionTitle}>Matrix A</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <MatrixDisplay matrix={matrix} />
              </div>
            </div>
            <div style={cardStyle}>
              <div style={sectionTitle}>Inverse A⁻¹</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <MatrixDisplay matrix={inverseMatrix} />
              </div>
            </div>
          </div>

          {/* Norm Calculation Details */}
          <div style={cardStyle}>
            <div style={sectionTitle}>
              {NORM_NAMES[normType]} — ||A||<sub>{normLabel}</sub> Calculation
            </div>
            <NormDetails type={normType} details={normADetails} value={normA} label="A" />
          </div>

          <div style={cardStyle}>
            <div style={sectionTitle}>
              {NORM_NAMES[normType]} — ||A⁻¹||<sub>{normLabel}</sub> Calculation
            </div>
            <NormDetails type={normType} details={normAInvDetails} value={normAInv} label="A⁻¹" />
          </div>
        </>
      )}
    </div>
  );
}

function NormDetails({ type, details, value, label }) {
  if (type === 'infinity') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {details.map((d, i) => (
          <div key={i} style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: COLORS.textPrimary,
            padding: '4px 8px',
            background: d.sum === value ? COLORS.greenGlow : 'transparent',
            borderRadius: 3,
            border: d.sum === value ? `1px solid ${COLORS.green}` : '1px solid transparent',
          }}>
            <span style={{ color: COLORS.textMuted }}>Row {i + 1}:</span>{' '}
            {d.absVals.map((v, j) => (
              <span key={j}>
                {j > 0 && <span style={{ color: COLORS.textDim }}> + </span>}
                {formatValue(v)}
              </span>
            ))}
            <span style={{ color: COLORS.textDim }}> = </span>
            <span style={{ color: d.sum === value ? COLORS.green : COLORS.textPrimary, fontWeight: d.sum === value ? 700 : 400 }}>
              {formatValue(d.sum)}
            </span>
            {d.sum === value && <span style={{ color: COLORS.green }}> ← max</span>}
          </div>
        ))}
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: COLORS.green,
          fontWeight: 600,
          marginTop: 4,
        }}>
          ||{label}||∞ = {formatValue(value)}
        </div>
      </div>
    );
  }

  if (type === 'one') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {details.map((d, i) => (
          <div key={i} style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: COLORS.textPrimary,
            padding: '4px 8px',
            background: d.sum === value ? COLORS.greenGlow : 'transparent',
            borderRadius: 3,
            border: d.sum === value ? `1px solid ${COLORS.green}` : '1px solid transparent',
          }}>
            <span style={{ color: COLORS.textMuted }}>Col {i + 1}:</span>{' '}
            {d.absVals.map((v, j) => (
              <span key={j}>
                {j > 0 && <span style={{ color: COLORS.textDim }}> + </span>}
                {formatValue(v)}
              </span>
            ))}
            <span style={{ color: COLORS.textDim }}> = </span>
            <span style={{ color: d.sum === value ? COLORS.green : COLORS.textPrimary, fontWeight: d.sum === value ? 700 : 400 }}>
              {formatValue(d.sum)}
            </span>
            {d.sum === value && <span style={{ color: COLORS.green }}> ← max</span>}
          </div>
        ))}
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: COLORS.green,
          fontWeight: 600,
          marginTop: 4,
        }}>
          ||{label}||₁ = {formatValue(value)}
        </div>
      </div>
    );
  }

  if (type === 'frobenius') {
    const { squaredVals, sumSq } = details;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {squaredVals.map((row, i) => (
          <div key={i} style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: COLORS.textPrimary,
            padding: '4px 8px',
          }}>
            <span style={{ color: COLORS.textMuted }}>Row {i + 1} squares:</span>{' '}
            {row.map((v, j) => (
              <span key={j}>
                {j > 0 && <span style={{ color: COLORS.textDim }}> + </span>}
                {formatValue(v)}
              </span>
            ))}
          </div>
        ))}
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: COLORS.textMuted,
          padding: '4px 8px',
        }}>
          Sum of squares = {formatValue(sumSq)}
        </div>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: COLORS.green,
          fontWeight: 600,
          marginTop: 4,
        }}>
          ||{label}||F = √{formatValue(sumSq)} = {formatValue(value)}
        </div>
      </div>
    );
  }

  return null;
}

function formatValue(v) {
  if (v === undefined || v === null) return '—';
  if (Number.isInteger(v) && Math.abs(v) < 1e10) return String(v);
  if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(4);
  if (Math.abs(v) > 1e8) return v.toExponential(4);
  const rounded = Math.round(v * 10000) / 10000;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toString();
}
