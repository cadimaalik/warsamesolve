import { useState, useCallback } from 'react';
import { COLORS, FONTS } from '../constants/brand';

/**
 * DataInput: Handles manual data point entry, CSV paste, and example loading.
 */
export default function DataInput({ points, setPoints, maxPoints = 100 }) {
  const [newX, setNewX] = useState('');
  const [newY, setNewY] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  const addPoint = useCallback(() => {
    const x = parseFloat(newX);
    const y = parseFloat(newY);
    if (isNaN(x) || isNaN(y)) return;
    if (points.length >= maxPoints) return;
    setPoints([...points, { x, y }]);
    setNewX('');
    setNewY('');
  }, [newX, newY, points, setPoints, maxPoints]);

  const removePoint = useCallback((idx) => {
    setPoints(points.filter((_, i) => i !== idx));
  }, [points, setPoints]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') addPoint();
  }, [addPoint]);

  const parsePastedData = useCallback(() => {
    const lines = pasteText.trim().split('\n');
    const parsed = [];
    for (const line of lines) {
      const parts = line.split(/[\t,;]+/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x) && !isNaN(y)) {
          parsed.push({ x, y });
        }
      }
    }
    if (parsed.length > 0) {
      setPoints(parsed.slice(0, maxPoints));
      setPasteText('');
      setShowPaste(false);
    }
  }, [pasteText, setPoints, maxPoints]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: COLORS.textDim,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          Data Points ({points.length})
        </label>
        <button
          onClick={() => setShowPaste(!showPaste)}
          style={{
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            padding: '3px 8px',
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.textDim,
            cursor: 'pointer',
          }}
        >
          {showPaste ? 'Manual' : 'Paste/CSV'}
        </button>
      </div>

      {showPaste ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'Paste tab/comma separated data:\nx1, y1\nx2, y2\n...'}
            style={{
              ...inputStyle,
              minHeight: 100,
              resize: 'vertical',
            }}
          />
          <button
            onClick={parsePastedData}
            style={{
              background: COLORS.green,
              color: '#000',
              border: 'none',
              borderRadius: 3,
              padding: '6px 12px',
              fontFamily: FONTS.mono,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Parse Data
          </button>
        </div>
      ) : (
        <>
          {/* Add point row */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                value={newX}
                onChange={(e) => setNewX(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="x"
                style={inputStyle}
                aria-label="x value"
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                value={newY}
                onChange={(e) => setNewY(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="y"
                style={inputStyle}
                aria-label="y value"
              />
            </div>
            <button
              onClick={addPoint}
              disabled={points.length >= maxPoints}
              style={{
                background: COLORS.green,
                color: '#000',
                border: 'none',
                borderRadius: 3,
                padding: '6px 10px',
                fontFamily: FONTS.mono,
                fontSize: 11,
                fontWeight: 700,
                cursor: points.length >= maxPoints ? 'not-allowed' : 'pointer',
                opacity: points.length >= maxPoints ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
              aria-label="Add data point"
            >
              + Add
            </button>
          </div>
        </>
      )}

      {/* Data points table */}
      {points.length > 0 && (
        <div style={{
          background: COLORS.bgDark,
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: FONTS.mono,
            fontSize: 11,
          }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 30 }}>#</th>
                <th style={thStyle}>x</th>
                <th style={thStyle}>y</th>
                <th style={{ ...thStyle, width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{p.x}</td>
                  <td style={tdStyle}>{p.y}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => removePoint(i)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: COLORS.error,
                        cursor: 'pointer',
                        fontFamily: FONTS.mono,
                        fontSize: 10,
                        padding: '2px 4px',
                      }}
                      aria-label={`Remove point ${i + 1}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '6px 8px',
  textAlign: 'left',
  color: COLORS.textDim,
  borderBottom: `1px solid ${COLORS.border}`,
  fontWeight: 600,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '4px 8px',
  color: COLORS.textPrimary,
  borderBottom: `1px solid ${COLORS.border}`,
};
