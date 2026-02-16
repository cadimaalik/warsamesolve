import { useState, useRef, useCallback, useEffect } from 'react';
import { COLORS, FONTS } from '../constants/brand';
import { tokenizeExpression, validatePythonExpression } from '../engine/pythonParser';
import AutoComplete from './AutoComplete';

const TOKEN_COLORS = {
  function: COLORS.blue,
  constant: COLORS.purple,
  number: '#4ade80',
  operator: COLORS.orange,
  variable: '#ef4444',
  paren: COLORS.textDim,
  whitespace: 'transparent',
  error: COLORS.error,
  unknown: COLORS.textMuted,
};

const EXAMPLES = [
  { expr: 'x**2 - 4', label: 'Quadratic' },
  { expr: 'exp(-x) - x', label: 'Exponential' },
  { expr: 'x*sin(x) - 1', label: 'Transcendental' },
];

export default function PythonInput({ value, onChange }) {
  const [showAC, setShowAC] = useState(false);
  const [validation, setValidation] = useState(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);

  /* debounced validation */
  useEffect(() => {
    if (!value || !value.trim()) { setValidation(null); return; }
    const t = setTimeout(() => setValidation(validatePythonExpression(value)), 350);
    return () => clearTimeout(t);
  }, [value]);

  const handleChange = useCallback((e) => {
    onChange(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
    setShowAC(true);
  }, [onChange]);

  /* sync overlay scroll with input scroll */
  const syncScroll = useCallback(() => {
    if (inputRef.current) setScrollLeft(inputRef.current.scrollLeft);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setShowAC(false);
    if (e.key === 'Tab' && showAC) { e.preventDefault(); }
    requestAnimationFrame(syncScroll);
  }, [showAC, syncScroll]);

  const handleAutocompleteSelect = useCallback((func, replaceLen) => {
    const before = value.slice(0, cursorPos - replaceLen);
    const after = value.slice(cursorPos);
    const newVal = before + func + '()' + after;
    onChange(newVal);
    setShowAC(false);
    setTimeout(() => {
      if (inputRef.current) {
        const np = before.length + func.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(np, np);
        setCursorPos(np);
      }
    }, 0);
  }, [value, cursorPos, onChange]);

  const applyFix = useCallback((fix) => {
    onChange(fix);
    inputRef.current?.focus();
  }, [onChange]);

  /* highlighted tokens */
  const tokens = value ? tokenizeExpression(value) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{
        fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>f(x) =</label>

      {/* input container with overlay */}
      <div style={{ position: 'relative' }}>
        {/* highlighted overlay */}
        <div
          ref={overlayRef}
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: '10px 12px',
            fontFamily: FONTS.mono, fontSize: 14, lineHeight: '20px',
            pointerEvents: 'none', whiteSpace: 'pre', overflow: 'hidden',
            transform: `translateX(-${scrollLeft}px)`,
          }}
        >
          {tokens.map((t, i) => (
            <span key={i} style={{ color: TOKEN_COLORS[t.type] || COLORS.textPrimary }}>{t.value}</span>
          ))}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={syncScroll}
          onFocus={() => setShowAC(true)}
          onBlur={() => setTimeout(() => setShowAC(false), 200)}
          onClick={(e) => { setCursorPos(e.target.selectionStart || 0); syncScroll(); }}
          onScroll={syncScroll}
          placeholder="e.g. x**3 - 2*x + 1, exp(-x) - x"
          style={{
            background: COLORS.bgInput,
            border: `1px solid ${validation && !validation.isValid ? COLORS.error : COLORS.border}`,
            borderRadius: 4, padding: '10px 12px',
            fontFamily: FONTS.mono, fontSize: 14, lineHeight: '20px',
            color: 'transparent', caretColor: COLORS.green,
            outline: 'none', width: '100%',
          }}
          onFocusCapture={(e) => {
            e.target.style.borderColor = validation && !validation.isValid ? COLORS.error : COLORS.green;
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = validation && !validation.isValid ? COLORS.error : COLORS.border;
          }}
        />

        <AutoComplete
          input={value}
          cursorPosition={cursorPos}
          onSelect={handleAutocompleteSelect}
          visible={showAC}
        />
      </div>

      {/* quick reference */}
      <div style={{
        fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim,
        lineHeight: 1.7, padding: '6px 8px',
        background: `${COLORS.bgInput}80`, borderRadius: 3,
      }}>
        <div>• Exponentiation: <span style={{ color: COLORS.orange }}>x**3</span> <span style={{ color: COLORS.textDim }}>(not x^3)</span></div>
        <div>• Explicit multiply: <span style={{ color: COLORS.orange }}>2*x</span> <span style={{ color: COLORS.textDim }}>(not 2x)</span></div>
        <div>• Natural log: <span style={{ color: COLORS.blue }}>log(x)</span> <span style={{ color: COLORS.textDim }}>(not ln)</span></div>
        <div>• Constants: <span style={{ color: COLORS.purple }}>pi</span>, <span style={{ color: COLORS.purple }}>e</span></div>
      </div>

      {/* clickable examples */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {EXAMPLES.map(({ expr, label }) => (
          <button
            key={expr}
            onClick={() => { onChange(expr); inputRef.current?.focus(); }}
            style={{
              padding: '4px 10px', fontFamily: FONTS.mono, fontSize: 10,
              color: COLORS.textMuted, background: COLORS.bgInput,
              border: `1px solid ${COLORS.border}`, borderRadius: 3,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.green; e.currentTarget.style.color = COLORS.green; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
          >
            <span>{expr}</span>
            <span style={{ fontSize: 9, color: COLORS.textDim, marginTop: 1 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* validation feedback */}
      {validation && !validation.isValid && (
        <div style={{
          background: COLORS.errorGlow, border: `1px solid ${COLORS.error}`,
          borderRadius: 4, padding: '8px 12px', fontFamily: FONTS.mono, fontSize: 11,
        }}>
          {validation.errors.map((err, i) => (
            <div key={i} style={{ color: COLORS.error, marginBottom: 4 }}>✗ {err}</div>
          ))}
          {validation.suggestions.map((s, i) => (
            <div key={i} style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: COLORS.textMuted, fontSize: 10 }}>
                Fix: <code style={{ color: COLORS.green }}>{s.fix}</code>
              </span>
              <button
                onClick={() => applyFix(s.fix)}
                style={{
                  padding: '2px 8px', fontFamily: FONTS.mono, fontSize: 10,
                  color: COLORS.green, background: COLORS.greenGlow,
                  border: `1px solid ${COLORS.green}`, borderRadius: 3, cursor: 'pointer',
                }}
              >Apply Fix</button>
            </div>
          ))}
        </div>
      )}

      {validation && validation.isValid && value && (
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.green }}>
          ✓ Valid Python expression
        </div>
      )}
    </div>
  );
}
