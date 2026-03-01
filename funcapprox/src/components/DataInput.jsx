import { useState, useCallback } from 'react';
import { COLORS, FONTS } from '../constants/brand';

export default function DataInput({ points, setPoints, maxPoints }) {
  const [xVal, setXVal] = useState('');
  const [yVal, setYVal] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const addPoint = useCallback(() => {
    const x = parseFloat(xVal);
    const y = parseFloat(yVal);
    if (isNaN(x) || isNaN(y)) return;
    if (points.length >= maxPoints) return;
    setPoints(prev => [...prev, { x, y }]);
    setXVal('');
    setYVal('');
  }, [xVal, yVal, points.length, maxPoints, setPoints]);

  const removePoint = useCallback((idx) => {
    setPoints(prev => prev.filter((_, i) => i !== idx));
  }, [setPoints]);

  const handlePaste = useCallback(() => {
    const lines = pasteText.trim().split('\n');
    const newPoints = [];
    for (const line of lines) {
      const parts = line.split(/[\t,;\s]+/).map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        newPoints.push({ x: parts[0], y: parts[1] });
      }
    }
    if (newPoints.length > 0) {
      setPoints(prev => [...prev, ...newPoints].slice(0, maxPoints));
      setPasteText('');
      setPasteMode(false);
    }
  }, [pasteText, maxPoints, setPoints]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') addPoint();
  }, [addPoint]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          onClick={() => setPasteMode(!pasteMode)}
          style={{
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            padding: '3px 8px',
            fontFamily: FONTS.mono,
            fontSize: 9,
            color: COLORS.textDim,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {pasteMode ? 'Manual' : 'CSV/Paste'}
        </button>
      </div>

      {pasteMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={"Paste data (x,y per line):\n1, 5.2\n2, 9.8\n3, 15.1"}
            style={{
              ...inputStyle,
              height: 100,
              resize: 'vertical',
            }}
            aria-label="Paste data points"
          />
          <button
            onClick={handlePaste}
            style={{
              background: COLORS.green,
              color: '#000',
              border: 'none',
              borderRadius: 3,
              padding: '6px',
              fontFamily: FONTS.mono,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Import
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            value={xVal}
            onChange={e => setXVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="x"
            style={{ ...inputStyle, flex: 1 }}
            aria-label="x value"
          />
          <input
            type="number"
            value={yVal}
            onChange={e => setYVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="y"
            style={{ ...inputStyle, flex: 1 }}
            aria-label="y value"
          />
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
            aria-label="Add point"
          >
            Add
          </button>
        </div>
      )}

      {/* Data table */}
      {points.length > 0 && (
        <div style={{
          background: COLORS.bgDark,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
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
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <th style={{ padding: '4px 8px', color: COLORS.textDim, textAlign: 'left', fontWeight: 600 }}>i</th>
                <th style={{ padding: '4px 8px', color: COLORS.textDim, textAlign: 'right', fontWeight: 600 }}>x</th>
                <th style={{ padding: '4px 8px', color: COLORS.textDim, textAlign: 'right', fontWeight: 600 }}>y</th>
                <th style={{ padding: '4px 4px', width: 24 }}></th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '3px 8px', color: COLORS.textDim }}>{i + 1}</td>
                  <td style={{ padding: '3px 8px', color: COLORS.textPrimary, textAlign: 'right' }}>{p.x}</td>
                  <td style={{ padding: '3px 8px', color: COLORS.textPrimary, textAlign: 'right' }}>{p.y}</td>
                  <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                    <button
                      onClick={() => removePoint(i)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: COLORS.error,
                        cursor: 'pointer',
                        fontFamily: FONTS.mono,
                        fontSize: 11,
                        padding: '0 4px',
                      }}
                      aria-label={`Remove point ${i + 1}`}
                    >
                      x
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
