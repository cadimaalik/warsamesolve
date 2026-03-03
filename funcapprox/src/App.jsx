import { useState, useCallback } from 'react';
import { COLORS, FONTS } from './constants/brand';
import Header from './components/Header';
import MethodSelector from './components/MethodSelector';
import DataInput from './components/DataInput';
import MethodOptions from './components/MethodOptions';
import InfoBox from './components/InfoBox';
import ResultsSummary from './components/ResultsSummary';
import StepByStep from './components/StepByStep';
import FunctionPlot from './components/FunctionPlot';
import { lagrangeInterpolation, LAGRANGE_EXAMPLES } from './engine/lagrange';
import { cubicSplineInterpolation, SPLINE_EXAMPLES } from './engine/cubicSplines';
import {
  linearRegression, polynomialRegression, nonlinearRegression, REGRESSION_EXAMPLES,
} from './engine/leastSquares';

export default function App() {
  const [method, setMethod] = useState('lagrange');
  const [subMethod, setSubMethod] = useState('linear');
  const [points, setPoints] = useState([]);
  const [polyDegree, setPolyDegree] = useState(2);
  const [xEval, setXEval] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showSteps, setShowSteps] = useState(true);
  const [showResiduals, setShowResiduals] = useState(false);

  const handleCalculate = useCallback(() => {
    setError(null);
    if (points.length < 2) { setError('Please enter at least 2 data points'); return; }

    const xVal = xEval !== '' ? parseFloat(xEval) : null;

    try {
      let res;
      switch (method) {
        case 'lagrange': res = lagrangeInterpolation(points, xVal); break;
        case 'cubicSplines': res = cubicSplineInterpolation(points, xVal); break;
        case 'leastSquares':
          switch (subMethod) {
            case 'linear': res = linearRegression(points, xVal); break;
            case 'polynomial': res = polynomialRegression(points, polyDegree, xVal); break;
            default: res = nonlinearRegression(points, subMethod, xVal); break;
          }
          break;
        default: return;
      }
      setResult(res);
    } catch (e) {
      setError(e.message);
      setResult(null);
    }
  }, [method, subMethod, points, polyDegree, xEval]);

  const handleClear = useCallback(() => {
    setPoints([]); setResult(null); setError(null); setXEval('');
  }, []);

  const handleExample = useCallback(() => {
    setError(null); setResult(null);
    let example;
    if (method === 'lagrange') {
      example = LAGRANGE_EXAMPLES[0];
    } else if (method === 'cubicSplines') {
      example = SPLINE_EXAMPLES[0];
    } else {
      example = REGRESSION_EXAMPLES[subMethod] || REGRESSION_EXAMPLES.linear;
      if (example.degree) setPolyDegree(example.degree);
    }
    setPoints(example.points);
    setXEval(example.xEval?.toString() || '');
  }, [method, subMethod]);

  const handleMethodChange = useCallback((m) => {
    setMethod(m); setResult(null); setError(null);
  }, []);

  const maxPoints = method === 'lagrange' ? 10 : (method === 'leastSquares' ? 1000 : 100);

  const toggleStyle = (active) => ({
    padding: '5px 12px', fontFamily: FONTS.mono, fontSize: 10, fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${active ? COLORS.green : COLORS.border}`,
    background: active ? COLORS.greenGlow : 'transparent',
    color: active ? COLORS.green : COLORS.textDim,
    borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.05em', outline: 'none',
  });

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: COLORS.bgDark, display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: 0, overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={{
          width: 380, minWidth: 320, background: COLORS.bgPanel,
          borderRight: `1px solid ${COLORS.border}`, padding: 16,
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <MethodSelector selected={method} onSelect={handleMethodChange} />
          <div style={{ height: 1, background: COLORS.border }} />
          <DataInput points={points} setPoints={setPoints} maxPoints={maxPoints} />
          <div style={{ height: 1, background: COLORS.border }} />
          <MethodOptions
            method={method} subMethod={subMethod} setSubMethod={setSubMethod}
            polyDegree={polyDegree} setPolyDegree={setPolyDegree}
            xEval={xEval} setXEval={setXEval}
          />
          <div style={{ height: 1, background: COLORS.border }} />

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleCalculate}
              style={{
                flex: 1, background: COLORS.green, color: '#000', border: 'none',
                borderRadius: 4, padding: '10px 16px', fontFamily: FONTS.mono,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
              aria-label="Calculate"
            >
              Calculate
            </button>
            <button
              onClick={handleClear}
              style={{
                background: 'transparent', color: COLORS.textDim,
                border: `1px solid ${COLORS.border}`, borderRadius: 4,
                padding: '10px 14px', fontFamily: FONTS.mono, fontSize: 11,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
              aria-label="Clear all"
            >
              Clear
            </button>
            <button
              onClick={handleExample}
              style={{
                background: 'transparent', color: COLORS.accent,
                border: `1px solid ${COLORS.accent}30`, borderRadius: 4,
                padding: '10px 14px', fontFamily: FONTS.mono, fontSize: 11,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
              aria-label="Load example"
            >
              Example
            </button>
          </div>

          {error && (
            <div style={{
              background: COLORS.errorGlow, border: `1px solid ${COLORS.error}`,
              borderRadius: 4, padding: '8px 12px', fontFamily: FONTS.mono,
              fontSize: 11, color: COLORS.error,
            }}>
              {error}
            </div>
          )}

          <InfoBox method={method} />
        </div>

        {/* Right panel */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 20,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {!result && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12, color: COLORS.textDim,
            }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 48, color: COLORS.border }}>
                f(x) ?
              </div>
              <div style={{
                fontFamily: FONTS.mono, fontSize: 13, color: COLORS.textDim,
                textAlign: 'center', maxWidth: 400, lineHeight: 1.6,
              }}>
                Enter data points, select a method, and click Calculate to see step-by-step
                curve fitting with interactive visualization.
              </div>
              <div style={{
                fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textDim,
                marginTop: 8, padding: '8px 14px', background: COLORS.bgPanel,
                borderRadius: 4, border: `1px solid ${COLORS.border}`,
              }}>
                Lagrange · Cubic Splines · Least-Squares
              </div>
            </div>
          )}

          {result && (
            <>
              <ResultsSummary result={result} />
              <FunctionPlot result={result} showResiduals={showResiduals} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={toggleStyle(showSteps)} onClick={() => setShowSteps(!showSteps)}>
                  {showSteps ? 'Hide' : 'Show'} Steps
                </button>
                {result.residuals && (
                  <button style={toggleStyle(showResiduals)} onClick={() => setShowResiduals(!showResiduals)}>
                    {showResiduals ? 'Hide' : 'Show'} Residuals
                  </button>
                )}
              </div>
              {showSteps && <StepByStep steps={result.steps} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
