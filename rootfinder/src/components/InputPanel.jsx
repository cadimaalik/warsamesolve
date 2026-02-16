import { useState, useCallback } from 'react';
import { COLORS, FONTS } from '../constants/brand';
import { polynomialToExpr, validateExpr, exprToLatex } from '../engine/parser';
import useMathJax from '../hooks/useMathJax';

function InputField({ label, value, onChange, placeholder, type = 'text', width }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width }}>
      <label style={{
        fontFamily: FONTS.mono,
        fontSize: 10,
        color: COLORS.textDim,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: COLORS.bgInput,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
          padding: '8px 10px',
          fontFamily: FONTS.mono,
          fontSize: 13,
          color: COLORS.textPrimary,
          outline: 'none',
          width: '100%',
        }}
        onFocus={(e) => e.target.style.borderColor = COLORS.green}
        onBlur={(e) => e.target.style.borderColor = COLORS.border}
      />
    </div>
  );
}

export default function InputPanel({
  method,
  onSolve,
  exprStr,
  setExprStr,
}) {
  const [inputMode, setInputMode] = useState('matlab'); // 'matlab' | 'polynomial'
  const [polyDegree, setPolyDegree] = useState(3);
  const [polyCoeffs, setPolyCoeffs] = useState([1, -2, 0, 1]); // x^3 - 2x + 1
  const [a, setA] = useState('-2');
  const [b, setB] = useState('2');
  const [x0, setX0] = useState('1');
  const [x1, setX1] = useState('2');
  const [gExpr, setGExpr] = useState('');
  const [tol, setTol] = useState('1e-6');
  const [maxIter, setMaxIter] = useState('50');
  const [error, setError] = useState(null);
  const [matlabExpr, setMatlabExpr] = useState('x^3 - 2*x + 1');

  const previewLatex = exprStr ? exprToLatex(exprStr) : '';
  useMathJax([previewLatex, inputMode]);

  const handleMatlabChange = useCallback((val) => {
    setMatlabExpr(val);
    setExprStr(val);
  }, [setExprStr]);

  const handleDegreeChange = useCallback((deg) => {
    const d = Math.max(1, Math.min(10, parseInt(deg) || 1));
    setPolyDegree(d);
    const newCoeffs = Array(d + 1).fill(0);
    for (let i = 0; i < Math.min(polyCoeffs.length, newCoeffs.length); i++) {
      newCoeffs[i] = polyCoeffs[i];
    }
    if (newCoeffs[d] === 0) newCoeffs[d] = 1;
    setPolyCoeffs(newCoeffs);
    setExprStr(polynomialToExpr(newCoeffs));
  }, [polyCoeffs, setExprStr]);

  const handleCoeffChange = useCallback((index, val) => {
    const newCoeffs = [...polyCoeffs];
    newCoeffs[index] = parseFloat(val) || 0;
    setPolyCoeffs(newCoeffs);
    setExprStr(polynomialToExpr(newCoeffs));
  }, [polyCoeffs, setExprStr]);

  const handleSolve = () => {
    setError(null);

    const currentExpr = inputMode === 'matlab' ? matlabExpr : polynomialToExpr(polyCoeffs);
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

    const params = {
      expr: currentExpr,
      tol: tolNum,
      maxIter: maxIterNum,
    };

    if (method === 'bisection' || method === 'falsePosition') {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      if (isNaN(aNum) || isNaN(bNum)) {
        setError('Please enter valid interval bounds a and b');
        return;
      }
      if (aNum >= bNum) {
        setError('a must be less than b');
        return;
      }
      params.a = aNum;
      params.b = bNum;
    }

    if (method === 'newtonRaphson' || method === 'fixedPoint') {
      const x0Num = parseFloat(x0);
      if (isNaN(x0Num)) {
        setError('Please enter a valid initial guess x0');
        return;
      }
      params.x0 = x0Num;
    }

    if (method === 'secant') {
      const x0Num = parseFloat(x0);
      const x1Num = parseFloat(x1);
      if (isNaN(x0Num) || isNaN(x1Num)) {
        setError('Please enter valid initial guesses x0 and x1');
        return;
      }
      params.x0 = x0Num;
      params.x1 = x1Num;
    }

    if (method === 'fixedPoint') {
      if (!gExpr) {
        setError('Please enter g(x) for fixed-point iteration');
        return;
      }
      const gValidation = validateExpr(gExpr);
      if (!gValidation.valid) {
        setError(`Invalid g(x): ${gValidation.error}`);
        return;
      }
      params.gExpr = gExpr;
    }

    onSolve(params);
  };

  const needsInterval = method === 'bisection' || method === 'falsePosition';
  const needsX0 = method === 'newtonRaphson' || method === 'secant' || method === 'fixedPoint';
  const needsX1 = method === 'secant';
  const needsG = method === 'fixedPoint';

  const tabStyle = (active) => ({
    padding: '6px 16px',
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${active ? COLORS.green : COLORS.border}`,
    background: active ? COLORS.greenGlow : 'transparent',
    color: active ? COLORS.green : COLORS.textMuted,
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    outline: 'none',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Input mode tabs */}
      <div>
        <label style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: COLORS.textDim,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'block',
          marginBottom: 6,
        }}>
          f(x) Input Mode
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={tabStyle(inputMode === 'matlab')} onClick={() => {
            setInputMode('matlab');
            setExprStr(matlabExpr);
          }}>
            MATLAB-Style
          </button>
          <button style={tabStyle(inputMode === 'polynomial')} onClick={() => {
            setInputMode('polynomial');
            setExprStr(polynomialToExpr(polyCoeffs));
          }}>
            Polynomial Builder
          </button>
        </div>
      </div>

      {/* MATLAB input */}
      {inputMode === 'matlab' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.textDim,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            f(x) =
          </label>
          <input
            type="text"
            value={matlabExpr}
            onChange={(e) => handleMatlabChange(e.target.value)}
            placeholder="e.g. x^3 - 2*x + 1, sin(x) - x/2, exp(-x) - x"
            style={{
              background: COLORS.bgInput,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              padding: '10px 12px',
              fontFamily: FONTS.mono,
              fontSize: 14,
              color: COLORS.green,
              outline: 'none',
              width: '100%',
            }}
            onFocus={(e) => e.target.style.borderColor = COLORS.green}
            onBlur={(e) => e.target.style.borderColor = COLORS.border}
          />
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.textDim,
            marginTop: 2,
          }}>
            Supports: +, -, *, /, ^, sin, cos, tan, exp, log, sqrt, abs, pi, e
          </div>
        </div>
      )}

      {/* Polynomial builder */}
      {inputMode === 'polynomial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <InputField
              label="Degree"
              value={String(polyDegree)}
              onChange={handleDegreeChange}
              type="number"
              width="80px"
            />
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            background: COLORS.bgInput,
            padding: 12,
            borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
          }}>
            {Array.from({ length: polyDegree + 1 }, (_, i) => {
              const power = polyDegree - i;
              let termLabel;
              if (power === 0) termLabel = 'const';
              else if (power === 1) termLabel = 'x';
              else termLabel = `x^${power}`;
              return (
                <div key={power} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 70 }}>
                  <label style={{
                    fontFamily: FONTS.mono,
                    fontSize: 10,
                    color: COLORS.textDim,
                    textAlign: 'center',
                  }}>
                    {termLabel}
                  </label>
                  <input
                    type="number"
                    value={polyCoeffs[power] || 0}
                    onChange={(e) => handleCoeffChange(power, e.target.value)}
                    style={{
                      background: COLORS.bgDark,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 3,
                      padding: '6px 8px',
                      fontFamily: FONTS.mono,
                      fontSize: 13,
                      color: COLORS.textPrimary,
                      outline: 'none',
                      width: 70,
                      textAlign: 'center',
                    }}
                    onFocus={(e) => e.target.style.borderColor = COLORS.green}
                    onBlur={(e) => e.target.style.borderColor = COLORS.border}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LaTeX preview */}
      {previewLatex && (
        <div style={{
          background: COLORS.bgInput,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
          padding: '8px 12px',
          textAlign: 'center',
          minHeight: 36,
        }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim }}>
            Preview: {' '}
          </span>
          {`$$f(x) = ${previewLatex}$$`}
        </div>
      )}

      {/* g(x) for fixed-point */}
      {needsG && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.textDim,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            g(x) = (rewrite f(x)=0 as x = g(x))
          </label>
          <input
            type="text"
            value={gExpr}
            onChange={(e) => setGExpr(e.target.value)}
            placeholder="e.g. (2*x + 1)^(1/3) for x^3 - 2x - 1 = 0"
            style={{
              background: COLORS.bgInput,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              padding: '10px 12px',
              fontFamily: FONTS.mono,
              fontSize: 14,
              color: COLORS.cyan,
              outline: 'none',
            }}
            onFocus={(e) => e.target.style.borderColor = COLORS.cyan}
            onBlur={(e) => e.target.style.borderColor = COLORS.border}
          />
        </div>
      )}

      {/* Method parameters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
      }}>
        {needsInterval && (
          <>
            <InputField label="a (lower)" value={a} onChange={setA} placeholder="-2" type="number" width="100px" />
            <InputField label="b (upper)" value={b} onChange={setB} placeholder="2" type="number" width="100px" />
          </>
        )}
        {needsX0 && (
          <InputField label="x0 (initial)" value={x0} onChange={setX0} placeholder="1" type="number" width="100px" />
        )}
        {needsX1 && (
          <InputField label="x1 (second)" value={x1} onChange={setX1} placeholder="2" type="number" width="100px" />
        )}
        <InputField label="Tolerance" value={tol} onChange={setTol} placeholder="1e-6" width="100px" />
        <InputField label="Max Iter" value={maxIter} onChange={setMaxIter} placeholder="50" type="number" width="80px" />
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          background: COLORS.errorGlow,
          border: `1px solid ${COLORS.error}`,
          borderRadius: 4,
          padding: '8px 12px',
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: COLORS.error,
        }}>
          {error}
        </div>
      )}

      {/* Solve button */}
      <button
        onClick={handleSolve}
        style={{
          background: COLORS.green,
          color: '#000',
          border: 'none',
          borderRadius: 4,
          padding: '12px 24px',
          fontFamily: FONTS.mono,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#86efac';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = COLORS.green;
          e.target.style.transform = 'translateY(0)';
        }}
      >
        Find Root
      </button>
    </div>
  );
}
