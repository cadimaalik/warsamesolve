import { useState, useCallback, useRef, useEffect } from 'react';
import { COLORS, FONTS } from '../constants/brand';
import { formatForDisplay } from '../engine/pythonParser';

/* ── Keyboard button ── */
function KBtn({ label, onClick, type = 'function', wide, ariaLabel }) {
  const bg = {
    function:  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    operator:  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    number:    '#374151',
    special:   'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    variable:  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    control:   '#1f2937',
  }[type] || '#374151';

  const textColor = type === 'variable' ? '#1a1a2e' : '#fff';

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel || label}
      className="kb-btn"
      style={{
        height: 42,
        minWidth: wide ? 76 : 52,
        padding: '4px 8px',
        borderRadius: 6,
        background: bg,
        color: textColor,
        fontFamily: FONTS.mono,
        fontSize: 13,
        fontWeight: 600,
        border: type === 'control' ? `1px solid ${COLORS.border}` : 'none',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

/* ── Collapsible section ── */
function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: FONTS.mono, fontSize: 10, fontWeight: 600,
          color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: '0.08em',
        }}
      >
        <span style={{
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s', display: 'inline-block', fontSize: 8,
        }}>&#9654;</span>
        {title}
      </button>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '4px 0' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Power exponent dialog ── */
function PowerDialog({ onConfirm, onCancel }) {
  const [exp, setExp] = useState('2');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }}
        onClick={onCancel}
      />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', zIndex: 200,
        background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
        borderRadius: 8, padding: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textPrimary }}>
          Enter exponent:
        </div>
        <input
          ref={ref}
          type="number"
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm(exp);
            if (e.key === 'Escape') onCancel();
          }}
          style={{
            background: COLORS.bgInput, border: `1px solid ${COLORS.green}`,
            borderRadius: 4, padding: '6px 10px',
            fontFamily: FONTS.mono, fontSize: 14, color: COLORS.textPrimary,
            outline: 'none', width: 60, textAlign: 'center',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onConfirm(exp)}
            style={{
              padding: '4px 14px', fontFamily: FONTS.mono, fontSize: 11,
              background: COLORS.green, color: '#000', border: 'none',
              borderRadius: 3, cursor: 'pointer', fontWeight: 600,
            }}
          >OK</button>
          <button
            onClick={onCancel}
            style={{
              padding: '4px 14px', fontFamily: FONTS.mono, fontSize: 11,
              background: COLORS.bgInput, color: COLORS.textMuted,
              border: `1px solid ${COLORS.border}`, borderRadius: 3, cursor: 'pointer',
            }}
          >Cancel</button>
        </div>
      </div>
    </>
  );
}

/* ── Main Visual Keyboard ── */
export default function VisualKeyboard({ value, onChange }) {
  const [cursorPos, setCursorPos] = useState(value ? value.length : 0);
  const [showPowerDlg, setShowPowerDlg] = useState(false);
  const [history, setHistory] = useState([value || '']);
  const [histIdx, setHistIdx] = useState(0);

  /* keep cursor in bounds when value changes externally */
  useEffect(() => {
    if (cursorPos > (value || '').length) setCursorPos((value || '').length);
  }, [value, cursorPos]);

  const pushState = useCallback((newVal) => {
    setHistory(prev => [...prev.slice(0, histIdx + 1), newVal]);
    setHistIdx(prev => prev + 1);
  }, [histIdx]);

  const insert = useCallback((text) => {
    const v = value || '';
    const pos = Math.min(cursorPos, v.length);
    const newExpr = v.slice(0, pos) + text + v.slice(pos);
    pushState(newExpr);
    onChange(newExpr);
    setCursorPos(pos + text.length);
  }, [value, cursorPos, onChange, pushState]);

  const insertFunc = useCallback((name) => {
    const v = value || '';
    const pos = Math.min(cursorPos, v.length);
    const text = `${name}()`;
    const newExpr = v.slice(0, pos) + text + v.slice(pos);
    pushState(newExpr);
    onChange(newExpr);
    setCursorPos(pos + name.length + 1); // inside ()
  }, [value, cursorPos, onChange, pushState]);

  const backspace = useCallback(() => {
    const v = value || '';
    if (cursorPos <= 0 || v.length === 0) return;
    const pos = Math.min(cursorPos, v.length);
    const newExpr = v.slice(0, pos - 1) + v.slice(pos);
    pushState(newExpr);
    onChange(newExpr);
    setCursorPos(pos - 1);
  }, [value, cursorPos, onChange, pushState]);

  const clear = useCallback(() => {
    pushState('');
    onChange('');
    setCursorPos(0);
  }, [onChange, pushState]);

  const undo = useCallback(() => {
    if (histIdx <= 0) return;
    const ni = histIdx - 1;
    setHistIdx(ni);
    const prev = history[ni];
    onChange(prev);
    setCursorPos(prev.length);
  }, [histIdx, history, onChange]);

  const redo = useCallback(() => {
    if (histIdx >= history.length - 1) return;
    const ni = histIdx + 1;
    setHistIdx(ni);
    const next = history[ni];
    onChange(next);
    setCursorPos(next.length);
  }, [histIdx, history, onChange]);

  const displayExpr = formatForDisplay(value || '');

  /* render cursor inside display string */
  const renderDisplay = () => {
    if (!value) {
      return (
        <span style={{ color: COLORS.textDim, fontSize: 13, fontFamily: FONTS.mono }}>
          Build your expression below
        </span>
      );
    }
    const dispBefore = formatForDisplay(value.slice(0, cursorPos));
    const dispAfter = formatForDisplay(value.slice(cursorPos));
    return (
      <>
        <span>{dispBefore}</span>
        <span className="vk-cursor" />
        <span>{dispAfter}</span>
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
      {/* expression display */}
      <label style={{
        fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>f(x) =</label>

      <div style={{
        minHeight: 52, padding: '10px 14px',
        background: COLORS.bgInput, border: `2px solid ${COLORS.border}`,
        borderRadius: 6,
        fontFamily: "'Spectral', serif", fontSize: 20, color: COLORS.textPrimary,
        display: 'flex', alignItems: 'center', wordBreak: 'break-all',
        position: 'relative',
      }}>
        {renderDisplay()}
      </div>

      {/* raw python notation */}
      {value && (
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim, paddingLeft: 2 }}>
          Python: <span style={{ color: COLORS.textMuted }}>{value}</span>
        </div>
      )}

      {/* nav & control row */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <KBtn label="&#9664;" onClick={() => setCursorPos(Math.max(0, cursorPos - 1))} type="control" ariaLabel="Move left" />
        <KBtn label="&#9654;" onClick={() => setCursorPos(Math.min((value || '').length, cursorPos + 1))} type="control" ariaLabel="Move right" />
        <KBtn label="&#9003;" onClick={backspace} type="control" ariaLabel="Backspace" />
        <KBtn label="Clear" onClick={clear} type="control" ariaLabel="Clear all" />
        <div style={{ flex: 1 }} />
        <KBtn label="&#8630;" onClick={undo} type="control" ariaLabel="Undo" />
        <KBtn label="&#8631;" onClick={redo} type="control" ariaLabel="Redo" />
      </div>

      {/* VARIABLES & CONSTANTS */}
      <Section title="Variables &amp; Constants" defaultOpen>
        <KBtn label="x" onClick={() => insert('x')} type="variable" ariaLabel="Variable x" />
        <KBtn label="&#960;" onClick={() => insert('pi')} type="variable" ariaLabel="Pi" />
        <KBtn label="e" onClick={() => insert('e')} type="variable" ariaLabel="Euler number" />
        <KBtn label="," onClick={() => insert(',')} type="control" ariaLabel="Comma" />
      </Section>

      {/* BASIC OPERATORS */}
      <Section title="Operators" defaultOpen>
        <KBtn label="+" onClick={() => insert(' + ')} type="operator" ariaLabel="Add" />
        <KBtn label="&#8722;" onClick={() => insert(' - ')} type="operator" ariaLabel="Subtract" />
        <KBtn label="&#215;" onClick={() => insert('*')} type="operator" ariaLabel="Multiply" />
        <KBtn label="&#247;" onClick={() => insert('/')} type="operator" ariaLabel="Divide" />
        <KBtn label="x&#8319;" onClick={() => setShowPowerDlg(true)} type="operator" ariaLabel="Power" />
        <KBtn label="x&#178;" onClick={() => insert('**2')} type="operator" ariaLabel="Square" />
        <KBtn label="x&#179;" onClick={() => insert('**3')} type="operator" ariaLabel="Cube" />
        <KBtn label="(" onClick={() => insert('(')} type="control" ariaLabel="Open paren" />
        <KBtn label=")" onClick={() => insert(')')} type="control" ariaLabel="Close paren" />
        <KBtn label="&#8730;x" onClick={() => insertFunc('sqrt')} type="special" ariaLabel="Square root" />
        <KBtn label="|x|" onClick={() => insertFunc('abs')} type="special" ariaLabel="Absolute value" />
      </Section>

      {/* TRIGONOMETRIC */}
      <Section title="Trigonometric" defaultOpen={false}>
        <KBtn label="sin" onClick={() => insertFunc('sin')} type="function" />
        <KBtn label="cos" onClick={() => insertFunc('cos')} type="function" />
        <KBtn label="tan" onClick={() => insertFunc('tan')} type="function" />
        <KBtn label="cot" onClick={() => insertFunc('cot')} type="function" />
        <KBtn label="sec" onClick={() => insertFunc('sec')} type="function" />
        <KBtn label="csc" onClick={() => insertFunc('csc')} type="function" />
        <KBtn label="asin" onClick={() => insertFunc('asin')} type="function" />
        <KBtn label="acos" onClick={() => insertFunc('acos')} type="function" />
        <KBtn label="atan" onClick={() => insertFunc('atan')} type="function" />
      </Section>

      {/* EXPONENTIAL & LOGARITHMIC */}
      <Section title="Exponential &amp; Logarithmic" defaultOpen={false}>
        <KBtn label="e&#739;" onClick={() => insertFunc('exp')} type="function" ariaLabel="exp" />
        <KBtn label="ln(x)" onClick={() => insertFunc('log')} type="function" ariaLabel="Natural log" />
        <KBtn label="log&#8321;&#8320;" onClick={() => insertFunc('log10')} type="function" ariaLabel="Log base 10" />
        <KBtn label="log&#8322;" onClick={() => insertFunc('log2')} type="function" ariaLabel="Log base 2" />
      </Section>

      {/* HYPERBOLIC */}
      <Section title="Hyperbolic" defaultOpen={false}>
        <KBtn label="sinh" onClick={() => insertFunc('sinh')} type="function" />
        <KBtn label="cosh" onClick={() => insertFunc('cosh')} type="function" />
        <KBtn label="tanh" onClick={() => insertFunc('tanh')} type="function" />
        <KBtn label="asinh" onClick={() => insertFunc('asinh')} type="function" />
        <KBtn label="acosh" onClick={() => insertFunc('acosh')} type="function" />
        <KBtn label="atanh" onClick={() => insertFunc('atanh')} type="function" />
      </Section>

      {/* NUMBER PAD */}
      <Section title="Number Pad" defaultOpen>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 46px) 46px',
          gap: 4,
        }}>
          {['7','8','9'].map(n => <KBtn key={n} label={n} onClick={() => insert(n)} type="number" />)}
          <KBtn label="&#9003;" onClick={backspace} type="control" ariaLabel="Backspace" />

          {['4','5','6'].map(n => <KBtn key={n} label={n} onClick={() => insert(n)} type="number" />)}
          <KBtn label="." onClick={() => insert('.')} type="number" ariaLabel="Decimal" />

          {['1','2','3'].map(n => <KBtn key={n} label={n} onClick={() => insert(n)} type="number" />)}
          <KBtn label="&#8722;" onClick={() => insert('-')} type="operator" ariaLabel="Negative" />

          <div style={{ gridColumn: 'span 2' }}>
            <KBtn label="0" onClick={() => insert('0')} type="number" wide />
          </div>
          <div style={{ gridColumn: 'span 2' }} />
        </div>
      </Section>

      {/* power dialog */}
      {showPowerDlg && (
        <PowerDialog
          onConfirm={(e) => { insert(`**${e}`); setShowPowerDlg(false); }}
          onCancel={() => setShowPowerDlg(false)}
        />
      )}
    </div>
  );
}
