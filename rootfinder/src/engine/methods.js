import { compileExpr, compileDerivative, exprToLatex } from './parser';

const MAX_ITER = 100;
const DEFAULT_TOL = 1e-6;

/**
 * Bisection Method
 * Finds root in [a, b] where f(a)*f(b) < 0
 */
export function bisection(exprStr, a, b, tol = DEFAULT_TOL, maxIter = MAX_ITER) {
  const f = compileExpr(exprStr);
  const fLatex = exprToLatex(exprStr);
  const steps = [];
  const iterations = [];

  const fa = f(a);
  const fb = f(b);

  if (fa * fb > 0) {
    return {
      converged: false,
      error: `f(a) and f(b) must have opposite signs. f(${a}) = ${fa.toFixed(6)}, f(${b}) = ${fb.toFixed(6)}`,
      steps: [],
      iterations: [],
      method: 'Bisection',
    };
  }

  steps.push({
    type: 'setup',
    latex: `\\text{Bisection Method for } f(x) = ${fLatex}`,
  });
  steps.push({
    type: 'info',
    latex: `\\text{Initial interval: } [${a}, ${b}], \\quad \\text{Tolerance: } ${tol}`,
  });
  steps.push({
    type: 'info',
    latex: `f(${a}) = ${fa.toFixed(6)}, \\quad f(${b}) = ${fb.toFixed(6)}`,
  });
  steps.push({
    type: 'info',
    latex: `\\text{Since } f(a) \\cdot f(b) = ${(fa * fb).toFixed(6)} < 0, \\text{ a root exists in } [${a}, ${b}]`,
  });

  let aI = a, bI = b;
  let prevC = null;

  for (let i = 0; i < maxIter; i++) {
    const c = (aI + bI) / 2;
    const fc = f(c);
    const faI = f(aI);

    const absError = prevC !== null ? Math.abs(c - prevC) : Math.abs(bI - aI) / 2;
    const relError = c !== 0 ? Math.abs(absError / c) : absError;

    iterations.push({
      n: i + 1,
      a: aI,
      b: bI,
      c,
      fc,
      absError,
      relError,
    });

    steps.push({
      type: 'iteration',
      latex: `\\textbf{Iteration ${i + 1}:} \\quad c = \\frac{${aI.toFixed(6)} + ${bI.toFixed(6)}}{2} = ${c.toFixed(6)}, \\quad f(c) = ${fc.toFixed(6)}`,
    });

    if (Math.abs(fc) < tol || absError < tol) {
      steps.push({
        type: 'converged',
        latex: `\\text{Converged! Root} \\approx ${c.toFixed(8)} \\text{ after ${i + 1} iterations}`,
      });
      steps.push({
        type: 'info',
        latex: `|f(c)| = ${Math.abs(fc).toExponential(4)} < ${tol}`,
      });
      return {
        converged: true,
        root: c,
        fRoot: fc,
        iterations,
        steps,
        numIterations: i + 1,
        method: 'Bisection',
      };
    }

    if (faI * fc < 0) {
      steps.push({
        type: 'update',
        latex: `f(a) \\cdot f(c) < 0 \\Rightarrow \\text{root in } [${aI.toFixed(6)}, ${c.toFixed(6)}], \\quad b \\leftarrow ${c.toFixed(6)}`,
      });
      bI = c;
    } else {
      steps.push({
        type: 'update',
        latex: `f(a) \\cdot f(c) > 0 \\Rightarrow \\text{root in } [${c.toFixed(6)}, ${bI.toFixed(6)}], \\quad a \\leftarrow ${c.toFixed(6)}`,
      });
      aI = c;
    }

    prevC = c;
  }

  const finalC = (aI + bI) / 2;
  return {
    converged: false,
    root: finalC,
    fRoot: f(finalC),
    error: `Did not converge within ${maxIter} iterations`,
    iterations,
    steps,
    numIterations: maxIter,
    method: 'Bisection',
  };
}

/**
 * False Position (Regula Falsi) Method
 */
export function falsePosition(exprStr, a, b, tol = DEFAULT_TOL, maxIter = MAX_ITER) {
  const f = compileExpr(exprStr);
  const fLatex = exprToLatex(exprStr);
  const steps = [];
  const iterations = [];

  const fa0 = f(a);
  const fb0 = f(b);

  if (fa0 * fb0 > 0) {
    return {
      converged: false,
      error: `f(a) and f(b) must have opposite signs. f(${a}) = ${fa0.toFixed(6)}, f(${b}) = ${fb0.toFixed(6)}`,
      steps: [],
      iterations: [],
      method: 'False Position',
    };
  }

  steps.push({
    type: 'setup',
    latex: `\\text{False Position Method for } f(x) = ${fLatex}`,
  });
  steps.push({
    type: 'info',
    latex: `\\text{Formula: } c = a - f(a) \\cdot \\frac{b - a}{f(b) - f(a)}`,
  });
  steps.push({
    type: 'info',
    latex: `\\text{Initial interval: } [${a}, ${b}], \\quad \\text{Tolerance: } ${tol}`,
  });

  let aI = a, bI = b;
  let prevC = null;

  for (let i = 0; i < maxIter; i++) {
    const faI = f(aI);
    const fbI = f(bI);
    const c = aI - faI * (bI - aI) / (fbI - faI);
    const fc = f(c);

    const absError = prevC !== null ? Math.abs(c - prevC) : Math.abs(bI - aI);
    const relError = c !== 0 ? Math.abs(absError / c) : absError;

    iterations.push({
      n: i + 1,
      a: aI,
      b: bI,
      c,
      fc,
      absError,
      relError,
    });

    steps.push({
      type: 'iteration',
      latex: `\\textbf{Iteration ${i + 1}:} \\quad c = ${aI.toFixed(6)} - \\frac{${faI.toFixed(6)} \\cdot (${bI.toFixed(6)} - ${aI.toFixed(6)})}{${fbI.toFixed(6)} - ${faI.toFixed(6)}} = ${c.toFixed(6)}`,
    });
    steps.push({
      type: 'info',
      latex: `f(c) = f(${c.toFixed(6)}) = ${fc.toFixed(6)}`,
    });

    if (Math.abs(fc) < tol || absError < tol) {
      steps.push({
        type: 'converged',
        latex: `\\text{Converged! Root} \\approx ${c.toFixed(8)} \\text{ after ${i + 1} iterations}`,
      });
      return {
        converged: true,
        root: c,
        fRoot: fc,
        iterations,
        steps,
        numIterations: i + 1,
        method: 'False Position',
      };
    }

    if (faI * fc < 0) {
      bI = c;
      steps.push({
        type: 'update',
        latex: `f(a) \\cdot f(c) < 0 \\Rightarrow b \\leftarrow ${c.toFixed(6)}`,
      });
    } else {
      aI = c;
      steps.push({
        type: 'update',
        latex: `f(a) \\cdot f(c) > 0 \\Rightarrow a \\leftarrow ${c.toFixed(6)}`,
      });
    }

    prevC = c;
  }

  const finalC = aI - f(aI) * (bI - aI) / (f(bI) - f(aI));
  return {
    converged: false,
    root: finalC,
    fRoot: f(finalC),
    error: `Did not converge within ${maxIter} iterations`,
    iterations,
    steps,
    numIterations: maxIter,
    method: 'False Position',
  };
}

/**
 * Newton-Raphson Method
 * x_{n+1} = x_n - f(x_n) / f'(x_n)
 */
export function newtonRaphson(exprStr, x0, tol = DEFAULT_TOL, maxIter = MAX_ITER) {
  const f = compileExpr(exprStr);
  const fLatex = exprToLatex(exprStr);
  const { fn: fPrime, expr: fPrimeStr } = compileDerivative(exprStr);
  const steps = [];
  const iterations = [];

  let fPrimeLatex;
  try {
    fPrimeLatex = exprToLatex(fPrimeStr);
  } catch {
    fPrimeLatex = "f'(x)";
  }

  steps.push({
    type: 'setup',
    latex: `\\text{Newton-Raphson Method for } f(x) = ${fLatex}`,
  });
  steps.push({
    type: 'info',
    latex: `f'(x) = ${fPrimeLatex}`,
  });
  steps.push({
    type: 'info',
    latex: `\\text{Formula: } x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}`,
  });
  steps.push({
    type: 'info',
    latex: `x_0 = ${x0}, \\quad \\text{Tolerance: } ${tol}`,
  });

  let xn = x0;

  for (let i = 0; i < maxIter; i++) {
    const fxn = f(xn);
    const fpxn = fPrime(xn);

    if (Math.abs(fpxn) < 1e-14) {
      steps.push({
        type: 'error',
        latex: `\\text{Derivative is zero at } x = ${xn.toFixed(6)}. \\text{ Method fails.}`,
      });
      return {
        converged: false,
        error: `Derivative is zero at x = ${xn.toFixed(6)}. Division by zero.`,
        iterations,
        steps,
        method: 'Newton-Raphson',
      };
    }

    const xnp1 = xn - fxn / fpxn;
    const absError = Math.abs(xnp1 - xn);
    const relError = xnp1 !== 0 ? Math.abs(absError / xnp1) : absError;

    iterations.push({
      n: i + 1,
      xn,
      fxn,
      fpxn,
      xnp1,
      absError,
      relError,
    });

    steps.push({
      type: 'iteration',
      latex: `\\textbf{Iteration ${i + 1}:} \\quad x_{${i + 1}} = ${xn.toFixed(6)} - \\frac{${fxn.toFixed(6)}}{${fpxn.toFixed(6)}} = ${xnp1.toFixed(6)}`,
    });

    if (absError < tol || Math.abs(f(xnp1)) < tol) {
      steps.push({
        type: 'converged',
        latex: `\\text{Converged! Root} \\approx ${xnp1.toFixed(8)} \\text{ after ${i + 1} iterations}`,
      });
      return {
        converged: true,
        root: xnp1,
        fRoot: f(xnp1),
        iterations,
        steps,
        numIterations: i + 1,
        method: 'Newton-Raphson',
      };
    }

    xn = xnp1;
  }

  return {
    converged: false,
    root: xn,
    fRoot: f(xn),
    error: `Did not converge within ${maxIter} iterations`,
    iterations,
    steps,
    numIterations: maxIter,
    method: 'Newton-Raphson',
  };
}

/**
 * Secant Method
 * x_{n+1} = x_n - f(x_n) * (x_n - x_{n-1}) / (f(x_n) - f(x_{n-1}))
 */
export function secant(exprStr, x0, x1, tol = DEFAULT_TOL, maxIter = MAX_ITER) {
  const f = compileExpr(exprStr);
  const fLatex = exprToLatex(exprStr);
  const steps = [];
  const iterations = [];

  steps.push({
    type: 'setup',
    latex: `\\text{Secant Method for } f(x) = ${fLatex}`,
  });
  steps.push({
    type: 'info',
    latex: `\\text{Formula: } x_{n+1} = x_n - f(x_n) \\cdot \\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}`,
  });
  steps.push({
    type: 'info',
    latex: `x_0 = ${x0}, \\quad x_1 = ${x1}, \\quad \\text{Tolerance: } ${tol}`,
  });

  let xPrev = x0;
  let xCurr = x1;

  for (let i = 0; i < maxIter; i++) {
    const fPrev = f(xPrev);
    const fCurr = f(xCurr);
    const denom = fCurr - fPrev;

    if (Math.abs(denom) < 1e-14) {
      steps.push({
        type: 'error',
        latex: `\\text{Division by zero: } f(x_n) - f(x_{n-1}) \\approx 0`,
      });
      return {
        converged: false,
        error: 'Division by zero: f(x_n) - f(x_{n-1}) is too small',
        iterations,
        steps,
        method: 'Secant',
      };
    }

    const xNext = xCurr - fCurr * (xCurr - xPrev) / denom;
    const absError = Math.abs(xNext - xCurr);
    const relError = xNext !== 0 ? Math.abs(absError / xNext) : absError;

    iterations.push({
      n: i + 1,
      xPrev,
      xCurr,
      fPrev,
      fCurr,
      xNext,
      absError,
      relError,
    });

    steps.push({
      type: 'iteration',
      latex: `\\textbf{Iteration ${i + 1}:} \\quad x_{${i + 2}} = ${xCurr.toFixed(6)} - \\frac{${fCurr.toFixed(6)} \\cdot (${xCurr.toFixed(6)} - ${xPrev.toFixed(6)})}{${fCurr.toFixed(6)} - ${fPrev.toFixed(6)}} = ${xNext.toFixed(6)}`,
    });

    if (absError < tol || Math.abs(f(xNext)) < tol) {
      steps.push({
        type: 'converged',
        latex: `\\text{Converged! Root} \\approx ${xNext.toFixed(8)} \\text{ after ${i + 1} iterations}`,
      });
      return {
        converged: true,
        root: xNext,
        fRoot: f(xNext),
        iterations,
        steps,
        numIterations: i + 1,
        method: 'Secant',
      };
    }

    xPrev = xCurr;
    xCurr = xNext;
  }

  return {
    converged: false,
    root: xCurr,
    fRoot: f(xCurr),
    error: `Did not converge within ${maxIter} iterations`,
    iterations,
    steps,
    numIterations: maxIter,
    method: 'Secant',
  };
}

/**
 * Fixed-Point Iteration
 * x_{n+1} = g(x_n)
 * User provides g(x) such that f(x) = 0 can be rewritten as x = g(x)
 */
export function fixedPoint(gExprStr, x0, tol = DEFAULT_TOL, maxIter = MAX_ITER, fExprStr = null) {
  const g = compileExpr(gExprStr);
  const gLatex = exprToLatex(gExprStr);
  const steps = [];
  const iterations = [];

  let f = null;
  if (fExprStr) {
    f = compileExpr(fExprStr);
  }

  steps.push({
    type: 'setup',
    latex: `\\text{Fixed-Point Iteration with } g(x) = ${gLatex}`,
  });
  steps.push({
    type: 'info',
    latex: `\\text{Formula: } x_{n+1} = g(x_n)`,
  });
  steps.push({
    type: 'info',
    latex: `x_0 = ${x0}, \\quad \\text{Tolerance: } ${tol}`,
  });

  let xn = x0;

  for (let i = 0; i < maxIter; i++) {
    const xnp1 = g(xn);

    if (!isFinite(xnp1)) {
      steps.push({
        type: 'error',
        latex: `\\text{Diverged at iteration ${i + 1}: } g(${xn.toFixed(6)}) = ${xnp1}`,
      });
      return {
        converged: false,
        error: `Method diverged at iteration ${i + 1}`,
        iterations,
        steps,
        method: 'Fixed-Point Iteration',
      };
    }

    const absError = Math.abs(xnp1 - xn);
    const relError = xnp1 !== 0 ? Math.abs(absError / xnp1) : absError;
    const fVal = f ? f(xnp1) : null;

    iterations.push({
      n: i + 1,
      xn,
      gxn: xnp1,
      absError,
      relError,
      fVal,
    });

    steps.push({
      type: 'iteration',
      latex: `\\textbf{Iteration ${i + 1}:} \\quad x_{${i + 1}} = g(${xn.toFixed(6)}) = ${xnp1.toFixed(6)}, \\quad |x_{${i + 1}} - x_{${i}}| = ${absError.toExponential(4)}`,
    });

    if (absError < tol) {
      steps.push({
        type: 'converged',
        latex: `\\text{Converged! Root} \\approx ${xnp1.toFixed(8)} \\text{ after ${i + 1} iterations}`,
      });
      return {
        converged: true,
        root: xnp1,
        fRoot: fVal,
        iterations,
        steps,
        numIterations: i + 1,
        method: 'Fixed-Point Iteration',
      };
    }

    xn = xnp1;
  }

  return {
    converged: false,
    root: xn,
    fRoot: f ? f(xn) : null,
    error: `Did not converge within ${maxIter} iterations`,
    iterations,
    steps,
    numIterations: maxIter,
    method: 'Fixed-Point Iteration',
  };
}

/**
 * Generate function plot data for f(x) over [xMin, xMax].
 */
export function generatePlotData(exprStr, xMin, xMax, numPoints = 400) {
  const f = compileExpr(exprStr);
  const data = [];
  const step = (xMax - xMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * step;
    const y = f(x);
    if (isFinite(y) && Math.abs(y) < 1e10) {
      data.push({ x: parseFloat(x.toFixed(8)), y: parseFloat(y.toFixed(8)) });
    } else {
      data.push({ x: parseFloat(x.toFixed(8)), y: null });
    }
  }

  return data;
}
