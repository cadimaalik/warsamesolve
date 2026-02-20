import { COLORS, FONTS } from '../constants/brand';

/**
 * Display a matrix in proper mathematical notation with brackets
 */
export default function MatrixDisplay({ matrix, label, compact = false }) {
  if (!matrix || matrix.length === 0) return null;

  const n = matrix.length;
  const fontSize = compact ? 12 : 14;
  const cellPad = compact ? '3px 6px' : '4px 10px';

  const formatNum = (v) => {
    if (Number.isInteger(v) && Math.abs(v) < 1e10) return String(v);
    if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(3);
    // Round to 4 decimal places for display
    const rounded = Math.round(v * 10000) / 10000;
    if (Number.isInteger(rounded)) return String(rounded);
    return rounded.toString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      {label && (
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label}
        </div>
      )}
      <div style={{
        display: 'inline-flex',
        alignItems: 'stretch',
      }}>
        {/* Left bracket */}
        <div style={{
          width: 4,
          borderLeft: `2px solid ${COLORS.textMuted}`,
          borderTop: `2px solid ${COLORS.textMuted}`,
          borderBottom: `2px solid ${COLORS.textMuted}`,
          borderRadius: '3px 0 0 3px',
          marginRight: 4,
        }} />

        {/* Matrix body */}
        <table style={{
          borderCollapse: 'collapse',
          fontFamily: FONTS.mono,
          fontSize,
        }}>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                {row.map((val, j) => (
                  <td
                    key={j}
                    style={{
                      padding: cellPad,
                      textAlign: 'right',
                      color: COLORS.textPrimary,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatNum(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Right bracket */}
        <div style={{
          width: 4,
          borderRight: `2px solid ${COLORS.textMuted}`,
          borderTop: `2px solid ${COLORS.textMuted}`,
          borderBottom: `2px solid ${COLORS.textMuted}`,
          borderRadius: '0 3px 3px 0',
          marginLeft: 4,
        }} />
      </div>
    </div>
  );
}
