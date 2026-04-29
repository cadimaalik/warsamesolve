import { solveLinearSystem, transpose, matMul, fmt } from './matrix.js';

// ─── Linear Regression ──────────────────────────────────────────────

export function linearRegression(points, xEval = null) {
  const n = points.length;
  if (n < 2) throw new Error('Please enter at least 2 data points for linear regression');

  const steps = [];
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  let step1 = `\\textbf{Step 1: Data Table}\\\\[4pt]`;
  step1 += `\\begin{array}{c|c|c|c|c} i & x_i & y_i & x_i y_i & x_i^2 \\\\\\hline `;
  for (let i = 0; i < n; i++) {
    const { x, y } = points[i];
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    step1 += `${i + 1} & ${fmt(x)} & ${fmt(y)} & ${fmt(x * y)} & ${fmt(x * x)} \\\\`;
  }
  step1 += `\\hline \\Sigma & ${fmt(sumX)} & ${fmt(sumY)} & ${fmt(sumXY)} & ${fmt(sumX2)} \\end{array}`;
  steps.push({ type: 'setup', latex: step1 });

  let step2 = `\\textbf{Step 2: Normal Equations}\\\\[4pt]`;
  step2 += `\\begin{bmatrix} ${n} & ${fmt(sumX)} \\\\ ${fmt(sumX)} & ${fmt(sumX2)} \\end{bmatrix}`;
  step2 += `\\begin{bmatrix} a \\\\ b \\end{bmatrix} = `;
  step2 += `\\begin{bmatrix} ${fmt(sumY)} \\\\ ${fmt(sumXY)} \\end{bmatrix}`;
  steps.push({ type: 'iteration', latex: step2 });

  const { x: coeffs } = solveLinearSystem([[n, sumX], [sumX, sumX2]], [sumY, sumXY]);
  const a = coeffs[0], b = coeffs[1];

  let step3 = `\\textbf{Step 3: Solution}\\\\[4pt]`;
  step3 += `a = ${fmt(a, 6)}, \\quad b = ${fmt(b, 6)}\\\\[4pt]`;
  step3 += `\\boxed{\\hat{y} = ${fmt(a, 4)} ${b >= 0 ? '+' : '-'} ${fmt(Math.abs(b), 4)}x}`;
  steps.push({ type: 'converged', latex: step3 });

  // Error analysis
  let ssTot = 0, ssRes = 0;
  const yMean = sumY / n;
  const residuals = [];

  let step4 = `\\textbf{Step 4: Error Analysis}\\\\[4pt]`;
  step4 += `\\bar{y} = ${fmt(yMean, 4)}\\\\[4pt]`;
  step4 += `\\begin{array}{c|c|c|c} i & y_i & \\hat{y}_i & (y_i - \\hat{y}_i)^2 \\\\\\hline `;
  for (let i = 0; i < n; i++) {
    const yHat = a + b * points[i].x;
    const resid = points[i].y - yHat;
    residuals.push(resid);
    ssRes += resid * resid;
    ssTot += (points[i].y - yMean) ** 2;
    step4 += `${i + 1} & ${fmt(points[i].y)} & ${fmt(yHat, 4)} & ${fmt(resid * resid, 4)} \\\\`;
  }
  step4 += `\\end{array}\\\\[4pt]`;
  const rss = Math.sqrt(ssRes);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;
  step4 += `SS_{res} = ${fmt(ssRes, 6)}, \\quad SS_{tot} = ${fmt(ssTot, 6)}\\\\`;
  step4 += `\\text{RSS} = ${fmt(rss, 6)}, \\quad R^2 = ${fmt(r2, 6)}`;
  steps.push({ type: 'info', latex: step4 });

  let evalResult = null;
  if (xEval !== null && !isNaN(xEval)) {
    evalResult = a + b * xEval;
    steps.push({
      type: 'converged',
      latex: `\\textbf{Evaluation:}\\; \\hat{y}(${fmt(xEval)}) = ${fmt(evalResult, 6)}`,
    });
  }

  const xMin = Math.min(...points.map(p => p.x));
  const xMax = Math.max(...points.map(p => p.x));
  const margin = (xMax - xMin) * 0.15 || 1;
  const plotPoints = [];
  for (let i = 0; i <= 100; i++) {
    const x = (xMin - margin) + (xMax - xMin + 2 * margin) * i / 100;
    plotPoints.push({ x, y: a + b * x });
  }

  return {
    method: 'leastSquares', subMethod: 'linear', steps,
    coefficients: [a, b], rss, r2, evalResult, xEval, points, residuals,
    plotData: plotPoints, plotRange: { xMin: xMin - margin, xMax: xMax + margin },
    equationStr: `\\hat{y} = ${fmt(a, 4)} ${b >= 0 ? '+' : '-'} ${fmt(Math.abs(b), 4)}x`,
  };
}

// ─── Polynomial Regression ──────────────────────────────────────────

export function polynomialRegression(points, degree, xEval = null) {
  const n = points.length;
  if (n < 2) throw new Error('Please enter at least 2 data points');
  if (degree < 1) throw new Error('Polynomial degree must be at least 1');
  if (degree >= n) throw new Error(`Polynomial degree must be less than number of data points (${degree} >= ${n})`);
  if (degree > 5) throw new Error('Maximum polynomial degree is 5');

  const m = degree;
  const steps = [];

  let step1 = `\\textbf{Step 1: Data Summary}\\\\[4pt]`;
  step1 += `\\text{Fitting degree } m = ${m} \\text{ polynomial to } n = ${n} \\text{ points}`;
  if (m >= n - 1) step1 += `\\\\\\textbf{Warning:}\\text{ degree } \\geq n-1 \\text{ (may overfit)}`;
  steps.push({ type: 'setup', latex: step1 });

  // Design matrix
  const F = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j <= m; j++) row.push(Math.pow(points[i].x, j));
    F.push(row);
  }

  let step2 = `\\textbf{Step 2: Design Matrix } \\mathbf{F}\\\\[4pt]`;
  if (n <= 8) {
    step2 += `F = \\begin{bmatrix}`;
    for (let i = 0; i < n; i++) {
      step2 += F[i].map(v => fmt(v, 2)).join(' & ');
      if (i < n - 1) step2 += '\\\\';
    }
    step2 += `\\end{bmatrix}`;
  } else {
    step2 += `F \\text{ is } ${n} \\times ${m + 1}`;
  }
  steps.push({ type: 'info', latex: step2 });

  const FT = transpose(F);
  const FTF = matMul(FT, F);
  const FTy = matMul(FT, points.map(p => [p.y])).map(r => r[0]);

  // Summation values
  let step3 = `\\textbf{Step 3: Summation Values}\\\\[4pt]`;
  for (let k = 1; k <= 2 * m; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.pow(points[i].x, k);
    step3 += `\\sum x_i^{${k}} = ${fmt(sum)}\\\\`;
  }
  for (let k = 0; k <= m; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.pow(points[i].x, k) * points[i].y;
    step3 += k === 0 ? `\\sum y_i = ${fmt(sum)}\\\\` : `\\sum x_i^{${k}} y_i = ${fmt(sum)}\\\\`;
  }
  steps.push({ type: 'info', latex: step3 });

  // Normal equations
  let step4 = `\\textbf{Step 4: Normal Equations } \\mathbf{F^T F \\, c = F^T y}\\\\[4pt]`;
  if (m + 1 <= 6) {
    step4 += `\\begin{bmatrix}`;
    for (let i = 0; i <= m; i++) {
      step4 += FTF[i].map(v => fmt(v, 2)).join(' & ');
      if (i < m) step4 += '\\\\';
    }
    step4 += `\\end{bmatrix}`;
    step4 += `\\begin{bmatrix}`;
    for (let i = 0; i <= m; i++) { step4 += `c_{${i}}`; if (i < m) step4 += '\\\\'; }
    step4 += `\\end{bmatrix} = \\begin{bmatrix}`;
    for (let i = 0; i <= m; i++) { step4 += fmt(FTy[i], 4); if (i < m) step4 += '\\\\'; }
    step4 += `\\end{bmatrix}`;
  }
  steps.push({ type: 'iteration', latex: step4 });

  const { x: coeffs } = solveLinearSystem(FTF, FTy);

  let step5 = `\\textbf{Step 5: Solution}\\\\[4pt]`;
  for (let i = 0; i <= m; i++) step5 += `c_{${i}} = ${fmt(coeffs[i], 6)}\\\\`;
  step5 += `\\\\\\boxed{\\hat{y} = ${formatPolyStr(coeffs)}}`;
  steps.push({ type: 'converged', latex: step5 });

  // Error
  let ssTot = 0, ssRes = 0;
  const yMean = points.reduce((s, p) => s + p.y, 0) / n;
  const residuals = [];
  for (let i = 0; i < n; i++) {
    let yHat = 0;
    for (let j = 0; j <= m; j++) yHat += coeffs[j] * Math.pow(points[i].x, j);
    const resid = points[i].y - yHat;
    residuals.push(resid);
    ssRes += resid * resid;
    ssTot += (points[i].y - yMean) ** 2;
  }
  const rss = Math.sqrt(ssRes);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  let step6 = `\\textbf{Step 6: Error Analysis}\\\\[4pt]`;
  step6 += `SS_{res} = ${fmt(ssRes, 6)}, \\quad SS_{tot} = ${fmt(ssTot, 6)}\\\\`;
  step6 += `\\text{RSS} = ${fmt(rss, 6)}, \\quad R^2 = ${fmt(r2, 6)}`;
  steps.push({ type: 'info', latex: step6 });

  let evalResult = null;
  if (xEval !== null && !isNaN(xEval)) {
    evalResult = 0;
    for (let j = 0; j <= m; j++) evalResult += coeffs[j] * Math.pow(xEval, j);
    steps.push({ type: 'converged', latex: `\\textbf{Evaluation:}\\; \\hat{y}(${fmt(xEval)}) = ${fmt(evalResult, 6)}` });
  }

  const xMin = Math.min(...points.map(p => p.x));
  const xMax = Math.max(...points.map(p => p.x));
  const margin = (xMax - xMin) * 0.15 || 1;
  const plotPoints = [];
  for (let i = 0; i <= 200; i++) {
    const x = (xMin - margin) + (xMax - xMin + 2 * margin) * i / 200;
    let y = 0;
    for (let j = 0; j <= m; j++) y += coeffs[j] * Math.pow(x, j);
    plotPoints.push({ x, y });
  }

  return {
    method: 'leastSquares', subMethod: 'polynomial', steps,
    coefficients: coeffs, degree: m, rss, r2, evalResult, xEval, points, residuals,
    plotData: plotPoints, plotRange: { xMin: xMin - margin, xMax: xMax + margin },
    equationStr: `\\hat{y} = ${formatPolyStr(coeffs)}`,
  };
}

// ─── Nonlinear Regression ───────────────────────────────────────────

export function nonlinearRegression(points, funcType, xEval = null) {
  const n = points.length;
  if (n < 2) throw new Error('Please enter at least 2 data points');

  const steps = [];
  let xTransform, yTransform, funcName;

  switch (funcType) {
    case 'exponential':
      funcName = 'y = Ce^{Ax}';
      for (const p of points) if (p.y <= 0) throw new Error(`Cannot take logarithm of non-positive y-values (y = ${p.y})`);
      xTransform = x => x;
      yTransform = y => Math.log(y);
      break;
    case 'power':
      funcName = 'y = Cx^A';
      for (const p of points) {
        if (p.x <= 0) throw new Error(`Power fit requires positive x-values (x = ${p.x})`);
        if (p.y <= 0) throw new Error(`Power fit requires positive y-values (y = ${p.y})`);
      }
      xTransform = x => Math.log(x);
      yTransform = y => Math.log(y);
      break;
    case 'rational':
      funcName = 'y = \\frac{D}{x + C}';
      for (const p of points) if (Math.abs(p.y) < 1e-14) throw new Error(`Rational fit requires non-zero y-values`);
      xTransform = x => x;
      yTransform = y => 1 / y;
      break;
    default:
      throw new Error(`Unknown function type: ${funcType}`);
  }

  steps.push({ type: 'setup', latex: `\\textbf{Step 1: Original Function}\\\\[4pt]\\text{Target: } ${funcName}` });

  // Linearization
  let step2 = `\\textbf{Step 2: Linearization}\\\\[4pt]`;
  if (funcType === 'exponential') {
    step2 += `\\ln(y) = \\ln(C) + Ax \\quad \\Rightarrow \\quad y^* = B^* + A^* x^*`;
  } else if (funcType === 'power') {
    step2 += `\\ln(y) = \\ln(C) + A\\ln(x) \\quad \\Rightarrow \\quad y^* = B^* + A^* x^*`;
  } else {
    step2 += `1/y = C/D + (1/D)x \\quad \\Rightarrow \\quad y^* = a^* + b^* x^*`;
  }
  steps.push({ type: 'info', latex: step2 });

  // Transformed data
  const xStar = points.map(p => xTransform(p.x));
  const yStar = points.map(p => yTransform(p.y));

  let step3 = `\\textbf{Step 3: Transformed Data}\\\\[4pt]`;
  step3 += `\\begin{array}{c|c|c|c|c} i & x_i & y_i & x^*_i & y^*_i \\\\\\hline `;
  for (let i = 0; i < n; i++) {
    step3 += `${i + 1} & ${fmt(points[i].x)} & ${fmt(points[i].y)} & ${fmt(xStar[i], 4)} & ${fmt(yStar[i], 4)} \\\\`;
  }
  step3 += `\\end{array}`;
  steps.push({ type: 'info', latex: step3 });

  // Linear regression on transformed
  let sumXs = 0, sumYs = 0, sumXsYs = 0, sumXs2 = 0;
  for (let i = 0; i < n; i++) {
    sumXs += xStar[i]; sumYs += yStar[i];
    sumXsYs += xStar[i] * yStar[i]; sumXs2 += xStar[i] * xStar[i];
  }

  const { x: linCoeffs } = solveLinearSystem([[n, sumXs], [sumXs, sumXs2]], [sumYs, sumXsYs]);
  const aStar = linCoeffs[0], bStar = linCoeffs[1];

  let step4 = `\\textbf{Step 4: Linear Regression on Transformed Data}\\\\[4pt]`;
  step4 += `a^* = ${fmt(aStar, 6)}, \\; b^* = ${fmt(bStar, 6)}`;
  steps.push({ type: 'iteration', latex: step4 });

  // Back-transformation
  let finalFunc, equationStr;
  let step5 = `\\textbf{Step 5: Back-Transformation}\\\\[4pt]`;

  if (funcType === 'exponential') {
    const C = Math.exp(aStar), A = bStar;
    step5 += `C = e^{${fmt(aStar, 4)}} = ${fmt(C, 6)}, \\quad A = ${fmt(A, 6)}\\\\[4pt]`;
    step5 += `\\boxed{y = ${fmt(C, 4)} e^{${fmt(A, 4)} x}}`;
    finalFunc = x => C * Math.exp(A * x);
    equationStr = `y = ${fmt(C, 4)} e^{${fmt(A, 4)} x}`;
  } else if (funcType === 'power') {
    const C = Math.exp(aStar), A = bStar;
    step5 += `C = e^{${fmt(aStar, 4)}} = ${fmt(C, 6)}, \\quad A = ${fmt(A, 6)}\\\\[4pt]`;
    step5 += `\\boxed{y = ${fmt(C, 4)} x^{${fmt(A, 4)}}}`;
    finalFunc = x => C * Math.pow(x, A);
    equationStr = `y = ${fmt(C, 4)} x^{${fmt(A, 4)}}`;
  } else {
    const D = 1 / bStar, C = aStar * D;
    step5 += `D = ${fmt(D, 6)}, \\quad C = ${fmt(C, 6)}\\\\[4pt]`;
    step5 += `\\boxed{y = \\frac{${fmt(D, 4)}}{x ${C >= 0 ? '+' : '-'} ${fmt(Math.abs(C), 4)}}}`;
    finalFunc = x => D / (x + C);
    equationStr = `y = \\frac{${fmt(D, 4)}}{x ${C >= 0 ? '+' : '-'} ${fmt(Math.abs(C), 4)}}`;
  }
  steps.push({ type: 'converged', latex: step5 });

  // Error on original scale
  let ssRes = 0, ssTot = 0;
  const yMean = points.reduce((s, p) => s + p.y, 0) / n;
  const residuals = [];

  let step6 = `\\textbf{Step 6: Error on Original Scale}\\\\[4pt]`;
  step6 += `\\begin{array}{c|c|c|c} i & y_i & \\hat{y}_i & (y_i - \\hat{y}_i)^2 \\\\\\hline `;
  for (let i = 0; i < n; i++) {
    const yHat = finalFunc(points[i].x);
    const resid = points[i].y - yHat;
    residuals.push(resid);
    ssRes += resid * resid;
    ssTot += (points[i].y - yMean) ** 2;
    step6 += `${i + 1} & ${fmt(points[i].y)} & ${fmt(yHat, 4)} & ${fmt(resid * resid, 4)} \\\\`;
  }
  step6 += `\\end{array}\\\\[4pt]`;
  const rss = Math.sqrt(ssRes);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;
  step6 += `\\text{RSS} = ${fmt(rss, 6)}, \\quad R^2 = ${fmt(r2, 6)}`;
  steps.push({ type: 'info', latex: step6 });

  let evalResult = null;
  if (xEval !== null && !isNaN(xEval)) {
    evalResult = finalFunc(xEval);
    steps.push({ type: 'converged', latex: `\\textbf{Evaluation:}\\; \\hat{y}(${fmt(xEval)}) = ${fmt(evalResult, 6)}` });
  }

  const xMin = Math.min(...points.map(p => p.x));
  const xMax = Math.max(...points.map(p => p.x));
  const margin = (xMax - xMin) * 0.15 || 1;
  const plotMin = funcType === 'power' ? Math.max(0.01, xMin - margin) : xMin - margin;
  const plotPoints = [];
  for (let i = 0; i <= 200; i++) {
    const x = plotMin + (xMax + margin - plotMin) * i / 200;
    try {
      const y = finalFunc(x);
      if (isFinite(y) && Math.abs(y) < 1e10) plotPoints.push({ x, y });
    } catch { /* skip */ }
  }

  return {
    method: 'leastSquares', subMethod: funcType, steps,
    rss, r2, evalResult, xEval, points, residuals,
    plotData: plotPoints, plotRange: { xMin: plotMin, xMax: xMax + margin },
    equationStr, finalFunc,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatPolyStr(coeffs) {
  const terms = [];
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i];
    if (Math.abs(c) < 1e-12) continue;
    const absC = Math.abs(c);
    const sign = c >= 0 ? '+' : '-';
    let term;
    if (i === 0) term = fmt(absC, 4);
    else if (i === 1) term = (Math.abs(absC - 1) < 1e-10 ? '' : fmt(absC, 4)) + 'x';
    else term = (Math.abs(absC - 1) < 1e-10 ? '' : fmt(absC, 4)) + `x^{${i}}`;
    if (terms.length === 0) terms.push(c < 0 ? `-${term}` : term);
    else terms.push(`${sign} ${term}`);
  }
  return terms.length > 0 ? terms.join(' ') : '0';
}

export const REGRESSION_EXAMPLES = {
  linear: {
    name: 'Force vs Displacement',
    points: [
      { x: 1, y: 5.2 }, { x: 2, y: 9.8 }, { x: 3, y: 15.1 }, { x: 4, y: 19.5 },
      { x: 5, y: 25.3 }, { x: 6, y: 30.1 }, { x: 7, y: 34.8 }, { x: 8, y: 40.2 },
    ],
    xEval: 4.5,
  },
  polynomial: {
    name: 'Stress-Strain Curve',
    points: [
      { x: 0, y: 0 }, { x: 0.5, y: 50 }, { x: 1.0, y: 95 }, { x: 1.5, y: 130 },
      { x: 2.0, y: 155 }, { x: 2.5, y: 168 }, { x: 3.0, y: 172 }, { x: 3.5, y: 165 },
      { x: 4.0, y: 150 }, { x: 4.5, y: 125 },
    ],
    degree: 3, xEval: 2.75,
  },
  exponential: {
    name: 'Population Growth',
    points: [
      { x: 0, y: 10 }, { x: 1, y: 12.2 }, { x: 2, y: 14.8 }, { x: 3, y: 18.1 },
      { x: 4, y: 22.0 }, { x: 5, y: 26.9 }, { x: 6, y: 32.7 },
    ],
    xEval: 7,
  },
  power: {
    name: 'Flow Rate vs Head',
    points: [
      { x: 1, y: 2.5 }, { x: 2, y: 7.1 }, { x: 3, y: 13.0 },
      { x: 5, y: 28.0 }, { x: 8, y: 56.5 }, { x: 10, y: 79.0 },
    ],
    xEval: 6,
  },
  rational: {
    name: 'Reaction Rate',
    points: [
      { x: 0.5, y: 3.8 }, { x: 1, y: 2.1 }, { x: 2, y: 1.1 },
      { x: 3, y: 0.78 }, { x: 5, y: 0.48 }, { x: 8, y: 0.31 },
    ],
    xEval: 4,
  },
};
