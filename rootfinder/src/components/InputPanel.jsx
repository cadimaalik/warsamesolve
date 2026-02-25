import { useState, useCallback } from 'react';
import { COLORS, FONTS } from '../constants/brand';
import { polynomialToExpr, validateExpr, exprToLatex } from '../engine/parser';
import { toPythonNotation } from '../engine/pythonParser';
import useMathJax from '../hooks/useMathJax';
import PythonInput from './PythonInput';
import VisualKeyboard from './VisualKeyboard';

/* ── Reusable field ── */
function InputField({ label, value, onChange, placeholder, type = 'text', width }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width }}>
      <label style={{
        fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: COLORS.bgInput, border: `1px solid ${COLORS.border}`,
          borderRadius: 4, padding: '8px 10px',
          fontFamily: FONTS.mono, fontSize: 13, color: COLORS.textPrimary,
          outline: 'none', width: '100%',
        }}
        onFocus={(e) => (e.target.style.borderColor = COLORS.green)}
        onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
      />
    </div>
  );
}

/* ── Mode descriptions for the guide ── */
const MODES = [
  {
    id: 'polynomial',
    icon: '\u{1F4D0}',
    name: 'Polynomial Builder',
    tagline: 'Simple polynomials',
    detail: 'x\u00B3 \u2212 2x\u00B2 + 5x \u2212 3',
  },
  {
    id: 'python',
    icon: '\u{1F4BB}',
    name: 'Python Notation',
    tagline: 'Text input for any function',
    detail: 'exp(-x) - x, x*sin(x) - 1',
  },
  {
    id: 'keyboard',
    icon: '\u{1F3B9}',
    name: 'Visual Keyboard',
    tagline: 'Touch-friendly builder',
    detail: 'Build by clicking buttons',
  },
];

/* ── Main component ── */
export default function InputPanel({ method, onSolve, exprStr, setExprStr }) {
  const [inputMode, setInputMode] = useState('python'); // 'python' | 'polynomial' | 'keyboard'

  /* polynomial builder state */
  const [polyDegree, setPolyDegree] = useState(3);
  const [polyCoeffs, setPolyCoeffs] = useState([1, -2, 0, 1]);

  /* python / keyboard share the same expression in Python notation (**) */
  const [pythonExpr, setPythonExpr] = useState('x**3 - 2*x + 1');

  /* method parameters */
  const [a, setA] = useState('-2');
  const [b, setB] = useState('2');
  const [x0, setX0] = useState('1');
  const [x1, setX1] = useState('2');
  const [gExpr, setGExpr] = useState('');
  const [tol, setTol] = useState('1e-6');
  const [maxIter, setMaxIter] = useState('50');
  const [error, setError] = useState(null);

  const previewLatex = exprStr ? exprToLatex(exprStr) : '';
  useMathJax([previewLatex, inputMode]);

  /* ── handlers ── */
  const handlePythonChange = useCallback((val) => {
    setPythonExpr(val);
    setExprStr(val); // parser now handles **
  }, [setExprStr]);

  const handleDegreeChange = useCallback((deg) => {
    const d = Math.max(1, Math.min(10, parseInt(deg) || 1));
    setPolyDegree(d);
    const nc = Array(d + 1).fill(0);
    for (let i = 0; i < Math.min(polyCoeffs.length, nc.length); i++) nc[i] = polyCoeffs[i];
    if (nc[d] === 0) nc[d] = 1;
    setPolyCoeffs(nc);
    setExprStr(polynomialToExpr(nc));
  }, [polyCoeffs, setExprStr]);

  const handleCoeffChange = useCallback((idx, val) => {
    const nc = [...polyCoeffs];
    nc[idx] = parseFloat(val) || 0;
    setPolyCoeffs(nc);
    setExprStr(polynomialToExpr(nc));
  }, [polyCoeffs, setExprStr]);

  /* mode switching with automatic expression conversion */
  const switchMode = useCallback((newMode) => {
    if (newMode === inputMode) return;

    if (newMode === 'polynomial') {
      setExprStr(polynomialToExpr(polyCoeffs));
    } else if (newMode === 'python' || newMode === 'keyboard') {
      // Convert current exprStr (might have ^) to Python notation
      if (inputMode === 'polynomial') {
        const pyExpr = toPythonNotation(polynomialToExpr(polyCoeffs));
        setPythonExpr(pyExpr);
        setExprStr(pyExpr);
      } else {
        setExprStr(pythonExpr);
      }
    }
    setInputMode(newMode);
  }, [inputMode, polyCoeffs, pythonExpr, setExprStr]);

  /* ── Solve ── */
  const handleSolve = () => {
    setError(null);

    let currentExpr;
    if (inputMode === 'polynomial') currentExpr = polynomialToExpr(polyCoeffs);
    else currentExpr = pythonExpr;

    if (!currentExpr || currentExpr === '0') {
      setError('Please enter a function');
      return;
    }

    const validation = validateExpr(currentExpr);
    if (!validation.valid) {
      setError(`Invalid expression: ${validation.error}`);
      return;
    }

    const tolNum = parseFloat(tol) || 1e-6;
    const maxIterNum = parseInt(maxIter) || 50;
    const params = { expr: currentExpr, tol: tolNum, maxIter: maxIterNum };

    if (method === 'bisection' || method === 'falsePosition') {
      const aNum = parseFloat(a), bNum = parseFloat(b);
      if (isNaN(aNum) || isNaN(bNum)) { setError('Enter valid interval bounds a and b'); return; }
      if (aNum >= bNum) { setError('a must be less than b'); return; }
      params.a = aNum; params.b = bNum;
    }

    if (method === 'newtonRaphson' || method === 'fixedPoint') {
      const x0Num = parseFloat(x0);
      if (isNaN(x0Num)) { setError('Enter a valid initial guess x0'); return; }
      params.x0 = x0Num;
    }

    if (method === 'secant') {
      const x0Num = parseFloat(x0), x1Num = parseFloat(x1);
      if (isNaN(x0Num) || isNaN(x1Num)) { setError('Enter valid initial guesses x0 and x1'); return; }
      params.x0 = x0Num; params.x1 = x1Num;
    }

    if (method === 'fixedPoint') {
      if (!gExpr) { setError('Enter g(x) for fixed-point iteration'); return; }
      const gV = validateExpr(gExpr);
      if (!gV.valid) { setError(`Invalid g(x): ${gV.error}`); return; }
      params.gExpr = gExpr;
    }

    onSolve(params);
  };

  const needsInterval = method === 'bisection' || method === 'falsePosition';
  const needsX0 = method === 'newtonRaphson' || method === 'secant' || method === 'fixedPoint';
  const needsX1 = method === 'secant';
  const needsG = method === 'fixedPoint';

  /* ── Mode selector style ── */
  const modeBtn = (m) => {
    const active = inputMode === m.id;
    return {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 5, cursor: 'pointer',
      background: active ? COLORS.greenGlow : COLORS.bgInput,
      border: `1px solid ${active ? COLORS.green : COLORS.border}`,
      textAlign: 'left', outline: 'none', width: '100%',
      transition: 'all 0.15s',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Input mode selector ── */}
      <div>
        <label style={{
          fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textDim,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          display: 'block', marginBottom: 6,
        }}>Input Method</label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MODES.map((m) => (
            <button key={m.id} style={modeBtn(m)} onClick={() => switchMode(m.id)}>
              {/* radio dot */}
              <span style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${inputMode === m.id ? COLORS.green : COLORS.textDim}`,
                background: inputMode === m.id ? COLORS.green : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {inputMode === m.id && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#000' }} />
                )}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: FONTS.mono, fontSize: 12, fontWeight: 600,
                  color: inputMode === m.id ? COLORS.green : COLORS.textPrimary,
                }}>{m.icon} {m.name}</div>
                <div style={{
                  fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{m.tagline}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{
          fontFamily: FONTS.mono, fontSize: 9, color: COLORS.textDim,
          marginTop: 4, fontStyle: 'italic',
        }}>
          Switch modes anytime — expression converts automatically
        </div>
      </div>

      <div style={{ height: 1, background: COLORS.border }} />

      {/* ── Polynomial Builder ── */}
      {inputMode === 'polynomial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <InputField label="Degree" value={String(polyDegree)} onChange={handleDegreeChange} type="number" width="80px" />
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            background: COLORS.bgInput, padding: 12, borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
          }}>
            {Array.from({ length: polyDegree + 1 }, (_, i) => {
              const power = polyDegree - i;
              const termLabel = power === 0 ? 'const' : power === 1 ? 'x' : `x^${power}`;
              return (
                <div key={power} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 70 }}>
                  <label style={{
                    fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim, textAlign: 'center',
                  }}>{termLabel}</label>
                  <input
                    type="number"
                    value={polyCoeffs[power] || 0}
                    onChange={(e) => handleCoeffChange(power, e.target.value)}
                    style={{
                      background: COLORS.bgDark, border: `1px solid ${COLORS.border}`,
                      borderRadius: 3, padding: '6px 8px',
                      fontFamily: FONTS.mono, fontSize: 13, color: COLORS.textPrimary,
                      outline: 'none', width: 70, textAlign: 'center',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = COLORS.green)}
                    onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Python Notation ── */}
      {inputMode === 'python' && (
        <PythonInput value={pythonExpr} onChange={handlePythonChange} />
      )}

      {/* ── Visual Keyboard ── */}
      {inputMode === 'keyboard' && (
        <VisualKeyboard value={pythonExpr} onChange={handlePythonChange} />
      )}

      {/* ── LaTeX preview ── */}
      {previewLatex && (
        <div style={{
          background: COLORS.bgInput, border: `1px solid ${COLORS.border}`,
          borderRadius: 4, padding: '8px 12px', textAlign: 'center', minHeight: 36,
        }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim }}>Preview: </span>
          {`$$f(x) = ${previewLatex}$$`}
        </div>
      )}

      {/* ── g(x) for fixed-point ── */}
      {needsG && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{
            fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>g(x) = (rewrite f(x)=0 as x = g(x))</label>
          <input
            type="text" value={gExpr}
            onChange={(e) => setGExpr(e.target.value)}
            placeholder="e.g. (2*x + 1)**(1/3)"
            style={{
              background: COLORS.bgInput, border: `1px solid ${COLORS.border}`,
              borderRadius: 4, padding: '10px 12px',
              fontFamily: FONTS.mono, fontSize: 14, color: COLORS.cyan, outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = COLORS.cyan)}
            onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
          />
        </div>
      )}

      {/* ── Method parameters ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {needsInterval && (
          <>
            <InputField label="a (lower)" value={a} onChange={setA} placeholder="-2" type="number" width="100px" />
            <InputField label="b (upper)" value={b} onChange={setB} placeholder="2" type="number" width="100px" />
          </>
        )}
        {needsX0 && <InputField label="x0 (initial)" value={x0} onChange={setX0} placeholder="1" type="number" width="100px" />}
        {needsX1 && <InputField label="x1 (second)" value={x1} onChange={setX1} placeholder="2" type="number" width="100px" />}
        <InputField label="Tolerance" value={tol} onChange={setTol} placeholder="1e-6" width="100px" />
        <InputField label="Max Iter" value={maxIter} onChange={setMaxIter} placeholder="50" type="number" width="80px" />
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: COLORS.errorGlow, border: `1px solid ${COLORS.error}`,
          borderRadius: 4, padding: '8px 12px',
          fontFamily: FONTS.mono, fontSize: 12, color: COLORS.error,
        }}>{error}</div>
      )}

      {/* ── Solve button ── */}
      <button
        onClick={handleSolve}
        style={{
          background: COLORS.green, color: '#000', border: 'none',
          borderRadius: 4, padding: '16px 24px',
          fontFamily: FONTS.mono, fontSize: 16, fontWeight: 700,
          cursor: 'pointer', textTransform: 'uppercase',
          letterSpacing: '0.1em', transition: 'all 0.15s',
          width: '100%', marginTop: 4,
        }}
        onMouseEnter={(e) => { e.target.style.background = '#86efac'; e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 10px 30px rgba(74, 222, 128, 0.3)'; }}
        onMouseLeave={(e) => { e.target.style.background = COLORS.green; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}
      >Hesapla &rarr;</button>
    </div>
  );
}
