import { fmt } from './matrix';

export function lagrangeInterpolation(points, xEval = null) {
  const n = points.length;
  if (n < 2) throw new Error('Please enter at least 2 data points for Lagrange interpolation');
  if (n > 10) throw new Error('Maximum 10 data points allowed for Lagrange interpolation');

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(points[i].x - points[j].x) < 1e-14) {
        throw new Error(`Data points must have unique x-values (duplicate x = ${points[i].x})`);
      }
    }
  }

  const steps = [];

  // Step 1: Data summary
  let dataSummary = `\\textbf{Step 1: Data Summary}\\\\[4pt]`;
  dataSummary += `\\text{Given } n+1 = ${n} \\text{ data points (polynomial degree } n = ${n - 1}\\text{):}\\\\[4pt]`;
  for (let i = 0; i < n; i++) {
    dataSummary += `(x_{${i}}, y_{${i}}) = (${fmt(points[i].x)},\\; ${fmt(points[i].y)})\\\\`;
  }
  steps.push({ type: 'setup', latex: dataSummary });

  if (n > 5) {
    steps.push({
      type: 'error',
      latex: `\\textbf{Warning:}\\text{ High-degree polynomial (degree ${n - 1}). May exhibit Runge's phenomenon.}`,
    });
  }

  // Step 2: Basis polynomials
  const basisSteps = [];
  basisSteps.push(`\\textbf{Step 2: Lagrange Basis Polynomials}\\\\[4pt]`);
  basisSteps.push(`L_i(x) = \\prod_{\\substack{j=0 \\\\ j \\neq i}}^{${n - 1}} \\frac{x - x_j}{x_i - x_j}\\\\[8pt]`);

  const denominators = [];
  for (let i = 0; i < n; i++) {
    let denom = 1;
    let denomStr = '';
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      denom *= (points[i].x - points[j].x);
      denomStr += `(${fmt(points[i].x)} - ${fmt(points[j].x)})`;
    }
    denominators.push(denom);

    let numStr = '';
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      numStr += `(x - ${fmt(points[j].x)})`;
    }

    basisSteps.push(
      `L_{${i}}(x) = \\frac{${numStr}}{${denomStr}} = \\frac{${numStr}}{${fmt(denom, 4)}}\\\\[4pt]`
    );
  }
  steps.push({ type: 'info', latex: basisSteps.join('') });

  // Step 3: Polynomial
  const coefficients = computePolynomialCoefficients(points, denominators);

  let polyStep = `\\textbf{Step 3: Interpolating Polynomial}\\\\[4pt]`;
  polyStep += `P_{${n - 1}}(x) = \\sum_{i=0}^{${n - 1}} L_i(x) \\cdot y_i\\\\[4pt]`;
  polyStep += `P_{${n - 1}}(x) = `;
  for (let i = 0; i < n; i++) {
    polyStep += `${i > 0 ? ' + ' : ''}L_{${i}}(x) \\cdot (${fmt(points[i].y)})`;
  }
  polyStep += `\\\\[8pt]\\textbf{Simplified form:}\\\\[4pt]`;
  polyStep += `P_{${n - 1}}(x) = ` + formatPolynomial(coefficients);
  steps.push({ type: 'iteration', latex: polyStep });

  // Step 4: Verification
  let verifyStep = `\\textbf{Step 4: Verification}\\\\[4pt]`;
  let allCorrect = true;
  for (let i = 0; i < n; i++) {
    const val = evaluatePolynomial(coefficients, points[i].x);
    const match = Math.abs(val - points[i].y) < 1e-6;
    if (!match) allCorrect = false;
    verifyStep += `P_{${n - 1}}(${fmt(points[i].x)}) = ${fmt(val, 6)} ${match ? '= ' : '\\approx '}y_{${i}} = ${fmt(points[i].y)}\\;${match ? '\\checkmark' : '\\text{(rounding)}'} \\\\`;
  }
  steps.push({ type: allCorrect ? 'converged' : 'info', latex: verifyStep });

  // Step 5: Evaluation
  let evalResult = null;
  if (xEval !== null && !isNaN(xEval)) {
    const val = evaluatePolynomial(coefficients, xEval);
    evalResult = val;
    const xMin = Math.min(...points.map(p => p.x));
    const xMax = Math.max(...points.map(p => p.x));
    const isExtrapolation = xEval < xMin || xEval > xMax;

    let evalStep = `\\textbf{Step 5: ${isExtrapolation ? 'Extrapolation' : 'Interpolation'}}\\\\[4pt]`;
    evalStep += `P_{${n - 1}}(${fmt(xEval)}) = ${fmt(val, 6)}`;
    if (isExtrapolation) {
      evalStep += `\\\\[4pt]\\textbf{Warning:}\\text{ } x = ${fmt(xEval)} \\text{ is outside } [${fmt(xMin)}, ${fmt(xMax)}].`;
    }
    steps.push({ type: isExtrapolation ? 'error' : 'converged', latex: evalStep });
  }

  // Error estimate
  let errorStep = `\\textbf{Step ${xEval !== null ? '6' : '5'}: Error Estimate}\\\\[4pt]`;
  errorStep += `E_{${n - 1}}(x) = \\frac{f^{(${n})}(\\xi)}{${n}!} \\prod_{i=0}^{${n - 1}}(x - x_i)\\\\[4pt]`;
  errorStep += `\\text{Note: Exact error requires knowledge of } f^{(${n})}(\\xi).`;
  if (xEval !== null && !isNaN(xEval)) {
    let product = 1;
    for (let i = 0; i < n; i++) product *= (xEval - points[i].x);
    errorStep += `\\\\[4pt]\\text{Error bound factor: } \\left|\\prod(${fmt(xEval)} - x_i)\\right| = ${fmt(Math.abs(product), 6)}`;
  }
  steps.push({ type: 'info', latex: errorStep });

  // Plot data
  const xMin = Math.min(...points.map(p => p.x));
  const xMax = Math.max(...points.map(p => p.x));
  const margin = (xMax - xMin) * 0.15 || 1;
  const plotPoints = [];
  for (let i = 0; i <= 200; i++) {
    const x = (xMin - margin) + (xMax - xMin + 2 * margin) * i / 200;
    plotPoints.push({ x, y: evaluatePolynomial(coefficients, x) });
  }

  return {
    method: 'lagrange',
    steps,
    coefficients,
    evalResult,
    xEval,
    points,
    plotData: plotPoints,
    plotRange: { xMin: xMin - margin, xMax: xMax + margin },
    polynomialStr: formatPolynomial(coefficients),
    degree: n - 1,
  };
}

function computePolynomialCoefficients(points, denominators) {
  const n = points.length;
  const coeffs = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const basisCoeffs = basisPolynomialCoeffs(points, i, denominators[i]);
    for (let k = 0; k < n; k++) {
      coeffs[k] += points[i].y * basisCoeffs[k];
    }
  }
  return coeffs;
}

function basisPolynomialCoeffs(points, i, denom) {
  const n = points.length;
  let poly = [1];
  for (let j = 0; j < n; j++) {
    if (j === i) continue;
    const newPoly = new Array(poly.length + 1).fill(0);
    for (let k = 0; k < poly.length; k++) {
      newPoly[k + 1] += poly[k];
      newPoly[k] -= points[j].x * poly[k];
    }
    poly = newPoly;
  }
  return poly.map(c => c / denom);
}

export function evaluatePolynomial(coeffs, x) {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = result * x + coeffs[i];
  }
  return result;
}

function formatPolynomial(coeffs) {
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

export const LAGRANGE_EXAMPLES = [
  {
    name: 'Temperature vs Altitude',
    desc: 'Atmospheric temperature at different altitudes (km)',
    points: [
      { x: 0, y: 15 }, { x: 2, y: 2 }, { x: 4, y: -11 },
      { x: 6, y: -24 }, { x: 8, y: -37 },
    ],
    xEval: 3,
  },
  {
    name: 'Beam Deflection',
    desc: 'Deflection (mm) at positions along a beam (m)',
    points: [
      { x: 0, y: 0 }, { x: 1, y: -2.5 }, { x: 2, y: -4.2 },
      { x: 3, y: -3.8 }, { x: 4, y: 0 },
    ],
    xEval: 1.5,
  },
];
