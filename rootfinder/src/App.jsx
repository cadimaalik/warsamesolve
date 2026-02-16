import { useState, useCallback } from 'react';
import { COLORS, FONTS } from './constants/brand';
import Header from './components/Header';
import MethodSelector from './components/MethodSelector';
import InputPanel from './components/InputPanel';
import ResultsSummary from './components/ResultsSummary';
import ConvergenceTable from './components/ConvergenceTable';
import StepByStep from './components/StepByStep';
import FunctionPlot from './components/FunctionPlot';
import ErrorPlot from './components/ErrorPlot';
import {
  bisection,
  falsePosition,
  newtonRaphson,
  secant,
  fixedPoint,
} from './engine/methods';

export default function App() {
  const [method, setMethod] = useState('bisection');
  const [result, setResult] = useState(null);
  const [exprStr, setExprStr] = useState('x**3 - 2*x + 1');
  const [showSteps, setShowSteps] = useState(true);
  const [showTable, setShowTable] = useState(true);
  const [plotRange, setPlotRange] = useState({ xMin: -3, xMax: 3 });

  const handleSolve = useCallback((params) => {
    let res;
    try {
      switch (method) {
        case 'bisection':
          res = bisection(params.expr, params.a, params.b, params.tol, params.maxIter);
          setPlotRange({ xMin: params.a - 1, xMax: params.b + 1 });
          break;
        case 'falsePosition':
          res = falsePosition(params.expr, params.a, params.b, params.tol, params.maxIter);
          setPlotRange({ xMin: params.a - 1, xMax: params.b + 1 });
          break;
        case 'newtonRaphson':
          res = newtonRaphson(params.expr, params.x0, params.tol, params.maxIter);
          setPlotRange({ xMin: params.x0 - 5, xMax: params.x0 + 5 });
          break;
        case 'secant':
          res = secant(params.expr, params.x0, params.x1, params.tol, params.maxIter);
          setPlotRange({
            xMin: Math.min(params.x0, params.x1) - 3,
            xMax: Math.max(params.x0, params.x1) + 3,
          });
          break;
        case 'fixedPoint':
          res = fixedPoint(params.gExpr, params.x0, params.tol, params.maxIter, params.expr);
          setPlotRange({ xMin: params.x0 - 5, xMax: params.x0 + 5 });
          break;
        default:
          return;
      }
    } catch (e) {
      res = {
        converged: false,
        error: e.message,
        steps: [],
        iterations: [],
        method: method,
      };
    }
    setResult(res);
  }, [method]);

  const toggleStyle = (active) => ({
    padding: '5px 12px',
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
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: COLORS.bgDark,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Header />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: 0,
        overflow: 'hidden',
      }}>
        {/* Left panel - input */}
        <div style={{
          width: 380,
          minWidth: 320,
          background: COLORS.bgPanel,
          borderRight: `1px solid ${COLORS.border}`,
          padding: 16,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <MethodSelector selected={method} onSelect={(m) => { setMethod(m); setResult(null); }} />
          <div style={{ height: 1, background: COLORS.border }} />
          <InputPanel
            method={method}
            onSolve={handleSolve}
            exprStr={exprStr}
            setExprStr={setExprStr}
          />
        </div>

        {/* Right panel - results */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {!result && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: COLORS.textDim,
            }}>
              <div style={{
                fontFamily: FONTS.mono,
                fontSize: 48,
                color: COLORS.border,
              }}>
                f(x) = 0
              </div>
              <div style={{
                fontFamily: FONTS.mono,
                fontSize: 13,
                color: COLORS.textDim,
                textAlign: 'center',
                maxWidth: 400,
                lineHeight: 1.6,
              }}>
                Enter your function, select a method, and click "Find Root" to see step-by-step iterations with error analysis.
              </div>
              <div style={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                color: COLORS.textDim,
                marginTop: 8,
                padding: '8px 14px',
                background: COLORS.bgPanel,
                borderRadius: 4,
                border: `1px solid ${COLORS.border}`,
              }}>
                Supports: polynomials, trigonometric, exponential, logarithmic functions
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Summary */}
              <ResultsSummary result={result} />

              {/* Function plot */}
              <FunctionPlot
                exprStr={exprStr}
                result={result}
                xMin={plotRange.xMin}
                xMax={plotRange.xMax}
              />

              {/* Toggle buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={toggleStyle(showSteps)} onClick={() => setShowSteps(!showSteps)}>
                  {showSteps ? 'Hide' : 'Show'} Steps
                </button>
                <button style={toggleStyle(showTable)} onClick={() => setShowTable(!showTable)}>
                  {showTable ? 'Hide' : 'Show'} Table
                </button>
              </div>

              {/* Error plot */}
              <ErrorPlot result={result} />

              {/* Step-by-step */}
              {showSteps && <StepByStep steps={result.steps} />}

              {/* Convergence table */}
              {showTable && <ConvergenceTable result={result} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
