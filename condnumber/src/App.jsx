import { useState, useCallback } from 'react';
import { COLORS, FONTS } from './constants/brand';
import Header from './components/Header';
import MatrixInput from './components/MatrixInput';
import NormSelector from './components/NormSelector';
import ResultsDisplay from './components/ResultsDisplay';
import SensitivityAnalysis from './components/SensitivityAnalysis';
import { parseMatlab, toMatlab } from './engine/parser';
import { conditionNumber, classifyCondition, sensitivityAnalysis } from './engine/matrix';

export default function App() {
  const [inputStr, setInputStr] = useState('[1 2; 3 4]');
  const [normType, setNormType] = useState('infinity');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [parsedMatrix, setParsedMatrix] = useState(null);
  const [sensitivity, setSensitivity] = useState(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    setResult(null);
    setSensitivity(null);
    setParsedMatrix(null);

    try {
      // Parse the MATLAB notation
      const { matrix } = parseMatlab(inputStr);
      setParsedMatrix(matrix);

      // Compute condition number
      const res = conditionNumber(matrix, normType);
      const classification = classifyCondition(res.conditionNumber);

      setResult({ ...res, classification });

      // Run sensitivity analysis
      try {
        const sens = sensitivityAnalysis(matrix);
        setSensitivity(sens);
      } catch {
        // Sensitivity analysis is optional — don't block results
      }
    } catch (e) {
      setError(e.message);
    }
  }, [inputStr, normType]);

  const handleReset = useCallback(() => {
    setInputStr('');
    setResult(null);
    setError(null);
    setParsedMatrix(null);
    setSensitivity(null);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleCalculate();
    }
  }, [handleCalculate]);

  const btnPrimary = {
    width: '100%',
    padding: '16px 24px',
    fontFamily: FONTS.mono,
    fontSize: 16,
    fontWeight: 700,
    color: '#000',
    background: COLORS.green,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    transition: 'all 0.15s',
  };

  const btnSecondary = {
    width: '100%',
    padding: '8px 16px',
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.textDim,
    background: 'transparent',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: COLORS.bgDark,
        display: 'flex',
        flexDirection: 'column',
      }}
      onKeyDown={handleKeyDown}
    >
      <Header />

      <div
        className="main-layout"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          gap: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left panel — input */}
        <div
          className="left-panel"
          style={{
            width: 380,
            minWidth: 320,
            background: COLORS.bgPanel,
            borderRight: `1px solid ${COLORS.border}`,
            padding: 16,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <MatrixInput
            value={inputStr}
            onChange={setInputStr}
            error={error}
          />

          <div style={{ height: 1, background: COLORS.border }} />

          <NormSelector
            selected={normType}
            onSelect={setNormType}
          />

          <div style={{ height: 1, background: COLORS.border }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              style={btnPrimary}
              onClick={handleCalculate}
              onMouseOver={e => { e.currentTarget.style.background = '#86efac'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(74, 222, 128, 0.3)'; }}
              onMouseOut={e => { e.currentTarget.style.background = COLORS.green; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Hesapla &rarr;
            </button>
            <button
              style={btnSecondary}
              onClick={handleReset}
              onMouseOver={e => e.currentTarget.style.borderColor = COLORS.borderLight}
              onMouseOut={e => e.currentTarget.style.borderColor = COLORS.border}
            >
              Reset
            </button>
          </div>

          {/* Keyboard shortcut hint */}
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.textDim,
            textAlign: 'center',
          }}>
            Ctrl + Enter to calculate
          </div>

          {/* Educational note */}
          <div style={{
            padding: 12,
            background: COLORS.bgCard,
            borderRadius: 6,
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: 10,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}>
              Why Condition Numbers?
            </div>
            <div style={{
              fontFamily: FONTS.body,
              fontSize: 12,
              color: COLORS.textDim,
              lineHeight: 1.6,
            }}>
              The condition number measures how sensitive the solution of <span style={{ fontFamily: FONTS.mono, color: COLORS.textMuted }}>Ax = b</span> is
              to small changes in A or b. A large condition number means small errors in input can produce large errors in the solution —
              critical for Gaussian elimination and LU factorization.
            </div>
          </div>
        </div>

        {/* Right panel — results */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {!result && !error && (
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
                Cond[A]
              </div>
              <div style={{
                fontFamily: FONTS.mono,
                fontSize: 13,
                color: COLORS.textDim,
                textAlign: 'center',
                maxWidth: 400,
                lineHeight: 1.6,
              }}>
                Enter a square matrix in MATLAB notation, select a norm type, and click "Calculate"
                to see the condition number with step-by-step details.
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
                Supports 2×2 to 5×5 matrices • ∞-norm, 1-norm, Frobenius norm
              </div>
            </div>
          )}

          {result && parsedMatrix && (
            <>
              <ResultsDisplay
                result={result}
                normType={normType}
                matrix={parsedMatrix}
              />

              <SensitivityAnalysis
                sensitivity={sensitivity}
                conditionNumber={result.conditionNumber}
              />

              {/* Practical Implications */}
              <div style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: 16,
              }}>
                <div style={{
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 10,
                }}>
                  Practical Implications
                </div>
                <div style={{
                  fontFamily: FONTS.body,
                  fontSize: 13,
                  color: COLORS.textMuted,
                  lineHeight: 1.7,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <PracticalNote
                    cond={result.conditionNumber}
                    classification={result.classification}
                  />
                </div>
              </div>

              {/* MATLAB notation */}
              <div style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: 16,
              }}>
                <div style={{
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 10,
                }}>
                  MATLAB Code
                </div>
                <div style={{
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  color: COLORS.textPrimary,
                  background: COLORS.bgInput,
                  padding: 10,
                  borderRadius: 4,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  position: 'relative',
                }}>
                  {`A = ${toMatlab(parsedMatrix)};\ncond(A)  % = ${result.conditionNumber < 1000 ? result.conditionNumber.toFixed(4) : result.conditionNumber.toFixed(0)}`}
                  <button
                    onClick={() => {
                      const code = `A = ${toMatlab(parsedMatrix)};\ncond(A)`;
                      navigator.clipboard.writeText(code).catch(() => {});
                    }}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      fontFamily: FONTS.mono,
                      fontSize: 9,
                      color: COLORS.textDim,
                      background: COLORS.bgCard,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 3,
                      padding: '2px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PracticalNote({ cond, classification }) {
  if (classification.level === 'well') {
    return (
      <>
        <div>
          <span style={{ color: COLORS.green, fontFamily: FONTS.mono, fontWeight: 600 }}>Gaussian Elimination: </span>
          Safe to use. Results will be accurate with standard floating-point arithmetic.
        </div>
        <div>
          <span style={{ color: COLORS.green, fontFamily: FONTS.mono, fontWeight: 600 }}>LU Factorization: </span>
          Reliable. Forward/back substitution will produce trustworthy results.
        </div>
        <div>
          <span style={{ color: COLORS.green, fontFamily: FONTS.mono, fontWeight: 600 }}>Iterative Methods: </span>
          Will converge quickly if the matrix has suitable properties.
        </div>
      </>
    );
  }

  if (classification.level === 'moderate') {
    return (
      <>
        <div>
          <span style={{ color: COLORS.accent, fontFamily: FONTS.mono, fontWeight: 600 }}>Gaussian Elimination: </span>
          Use with partial pivoting. Some digits of accuracy may be lost.
        </div>
        <div>
          <span style={{ color: COLORS.accent, fontFamily: FONTS.mono, fontWeight: 600 }}>LU Factorization: </span>
          Results should be verified. Consider using double precision.
        </div>
        <div>
          <span style={{ color: COLORS.accent, fontFamily: FONTS.mono, fontWeight: 600 }}>Digits of accuracy lost: </span>
          Approximately {Math.floor(Math.log10(cond))} digits may be lost due to conditioning.
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <span style={{ color: COLORS.error, fontFamily: FONTS.mono, fontWeight: 600 }}>Gaussian Elimination: </span>
        Results may be unreliable even with partial pivoting. Scaled pivoting or iterative refinement recommended.
      </div>
      <div>
        <span style={{ color: COLORS.error, fontFamily: FONTS.mono, fontWeight: 600 }}>LU Factorization: </span>
        Exercise extreme caution. Consider alternative methods or reformulating the problem.
      </div>
      <div>
        <span style={{ color: COLORS.error, fontFamily: FONTS.mono, fontWeight: 600 }}>Digits of accuracy lost: </span>
        Approximately {Math.floor(Math.log10(cond))} digits. With 16 digits of double precision, only ~{Math.max(0, 16 - Math.floor(Math.log10(cond)))} significant digits remain reliable.
      </div>
      <div>
        <span style={{ color: COLORS.error, fontFamily: FONTS.mono, fontWeight: 600 }}>Recommendation: </span>
        Consider preconditioning, scaling the matrix, or using iterative refinement to improve solution quality.
      </div>
    </>
  );
}
