/**
 * Natural Cubic Spline Interpolation
 *
 * Given n+1 data points, construct n cubic polynomials Si(x) = ai*x^3 + bi*x^2 + ci*x + di
 * for each interval [xi, xi+1], satisfying continuity of function, first and second derivatives,
 * plus natural boundary conditions S''(x0)=0, S''(xn)=0.
 */
import { solveLinearSystem, fmt } from './matrix';

/**
 * Compute natural cubic spline interpolation with full step-by-step solution.
 *
 * @param {Array<{x: number, y: number}>} points - Data points (must be sorted by x)
 * @returns {object} Result with steps, spline coefficients, and plot data
 */
export function cubicSplineInterpolation(points, xEval = null) {
  const n = points.length;
  if (n < 3) throw new Error('Please enter at least 3 data points for cubic splines');

  // Sort points by x
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // Check for duplicate x values
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(sorted[i].x - sorted[i + 1].x) < 1e-14) {
      throw new Error(`Data points must have unique x-values for cubic splines (duplicate x = ${sorted[i].x})`);
    }
  }

  const numSplines = n - 1;
  const steps = [];

  // Step 1: Data & Interval Summary
  const h = [];
  let step1 = `\\textbf{Step 1: Data \\& Interval Summary}\\\\[4pt]`;
  step1 += `\\text{Number of points: } n+1 = ${n}\\\\`;
  step1 += `\\text{Number of splines: } n = ${numSplines}\\\\[4pt]`;
  step1 += `\\text{Intervals:}\\\\`;
  for (let i = 0; i < numSplines; i++) {
    h[i] = sorted[i + 1].x - sorted[i].x;
    step1 += `[x_{${i}}, x_{${i + 1}}] = [${fmt(sorted[i].x)}, ${fmt(sorted[i + 1].x)}]: \\quad h_{${i}} = ${fmt(h[i])}\\\\`;
  }
  steps.push({ type: 'setup', latex: step1 });

  // Use the standard formulation with second derivatives (sigma/M values)
  // S_i(x) = M_i/(6*h_i)*(x_{i+1}-x)^3 + M_{i+1}/(6*h_i)*(x-x_i)^3
  //         + (y_i/h_i - M_i*h_i/6)*(x_{i+1}-x) + (y_{i+1}/h_i - M_{i+1}*h_i/6)*(x-x_i)
  // But we'll use the polynomial form a_i*x^3 + b_i*x^2 + c_i*x + d_i for clarity.

  // Step 2: System of equations explanation
  let step2 = `\\textbf{Step 2: System of Equations}\\\\[4pt]`;
  step2 += `\\text{For } ${numSplines} \\text{ cubic splines, we need } 4 \\times ${numSplines} = ${4 * numSplines} \\text{ equations:}\\\\[4pt]`;
  step2 += `\\text{Condition 1: Function values at endpoints (}${2 * numSplines}\\text{ eqs)}\\\\`;
  step2 += `\\quad S_i(x_i) = y_i \\text{ and } S_i(x_{i+1}) = y_{i+1}\\\\[4pt]`;
  step2 += `\\text{Condition 2: First derivative continuity (}${numSplines - 1}\\text{ eqs)}\\\\`;
  step2 += `\\quad S'_i(x_{i+1}) = S'_{i+1}(x_{i+1})\\\\[4pt]`;
  step2 += `\\text{Condition 3: Second derivative continuity (}${numSplines - 1}\\text{ eqs)}\\\\`;
  step2 += `\\quad S''_i(x_{i+1}) = S''_{i+1}(x_{i+1})\\\\[4pt]`;
  step2 += `\\text{Condition 4: Natural boundary conditions (2 eqs)}\\\\`;
  step2 += `\\quad S''_0(x_0) = 0, \\quad S''_{${numSplines - 1}}(x_{${n - 1}}) = 0`;
  steps.push({ type: 'info', latex: step2 });

  // Build and solve the system using second derivatives (M values)
  // The tridiagonal system for M values:
  // h_{i-1} M_{i-1} + 2(h_{i-1}+h_i) M_i + h_i M_{i+1} = 6[(y_{i+1}-y_i)/h_i - (y_i-y_{i-1})/h_{i-1}]
  // with M_0 = 0, M_{n-1} = 0 (natural BCs)

  const numInterior = n - 2;
  const M = new Array(n).fill(0); // M_0 = M_{n-1} = 0

  if (numInterior > 0) {
    const A = [];
    const rhs = [];

    for (let i = 0; i < numInterior; i++) {
      const row = new Array(numInterior).fill(0);
      const idx = i + 1; // actual point index

      // Main diagonal
      row[i] = 2 * (h[idx - 1] + h[idx]);

      // Sub-diagonal
      if (i > 0) row[i - 1] = h[idx - 1];

      // Super-diagonal
      if (i < numInterior - 1) row[i + 1] = h[idx];

      A.push(row);

      // RHS
      rhs.push(
        6 * ((sorted[idx + 1].y - sorted[idx].y) / h[idx] -
             (sorted[idx].y - sorted[idx - 1].y) / h[idx - 1])
      );
    }

    // Step 3: Matrix system
    let step3 = `\\textbf{Step 3: Tridiagonal System for Second Derivatives}\\\\[4pt]`;
    step3 += `\\text{Natural BCs: } M_0 = 0, \\; M_{${n - 1}} = 0\\\\[4pt]`;

    if (numInterior <= 5) {
      step3 += `\\begin{bmatrix}`;
      for (let i = 0; i < numInterior; i++) {
        step3 += A[i].map(v => fmt(v, 2)).join(' & ');
        if (i < numInterior - 1) step3 += '\\\\';
      }
      step3 += `\\end{bmatrix}`;
      step3 += `\\begin{bmatrix}`;
      for (let i = 0; i < numInterior; i++) {
        step3 += `M_{${i + 1}}`;
        if (i < numInterior - 1) step3 += '\\\\';
      }
      step3 += `\\end{bmatrix} = \\begin{bmatrix}`;
      for (let i = 0; i < numInterior; i++) {
        step3 += fmt(rhs[i], 4);
        if (i < numInterior - 1) step3 += '\\\\';
      }
      step3 += `\\end{bmatrix}`;
    } else {
      step3 += `\\text{(${numInterior} × ${numInterior} tridiagonal system — too large to display fully)}`;
    }

    steps.push({ type: 'iteration', latex: step3 });

    // Solve
    const { x: Minterior } = solveLinearSystem(A, rhs);
    for (let i = 0; i < numInterior; i++) {
      M[i + 1] = Minterior[i];
    }
  }

  // Step 4: Second derivative values
  let step4 = `\\textbf{Step 4: Second Derivative Values}\\\\[4pt]`;
  for (let i = 0; i < n; i++) {
    step4 += `M_{${i}} = S''(x_{${i}}) = ${fmt(M[i], 6)}\\\\`;
  }
  steps.push({ type: 'info', latex: step4 });

  // Step 5: Compute spline coefficients in standard form Si(x) = ai(x-xi)^3 + bi(x-xi)^2 + ci(x-xi) + di
  const splines = [];
  let step5 = `\\textbf{Step 5: Spline Coefficients}\\\\[4pt]`;
  step5 += `S_i(x) = a_i(x - x_i)^3 + b_i(x - x_i)^2 + c_i(x - x_i) + d_i\\\\[8pt]`;

  for (let i = 0; i < numSplines; i++) {
    const ai = (M[i + 1] - M[i]) / (6 * h[i]);
    const bi = M[i] / 2;
    const ci = (sorted[i + 1].y - sorted[i].y) / h[i] - h[i] * (2 * M[i] + M[i + 1]) / 6;
    const di = sorted[i].y;

    splines.push({
      a: ai, b: bi, c: ci, d: di,
      xStart: sorted[i].x, xEnd: sorted[i + 1].x,
    });

    step5 += `S_{${i}}(x) \\text{ on } [${fmt(sorted[i].x)}, ${fmt(sorted[i + 1].x)}]:\\\\`;
    step5 += `\\quad a_{${i}} = ${fmt(ai, 6)}, \\; b_{${i}} = ${fmt(bi, 6)}, \\; c_{${i}} = ${fmt(ci, 6)}, \\; d_{${i}} = ${fmt(di, 6)}\\\\`;
    step5 += `\\quad S_{${i}}(x) = ${fmt(ai, 4)}(x - ${fmt(sorted[i].x)})^3`;
    if (bi !== 0) step5 += ` ${bi >= 0 ? '+' : '-'} ${fmt(Math.abs(bi), 4)}(x - ${fmt(sorted[i].x)})^2`;
    if (ci !== 0) step5 += ` ${ci >= 0 ? '+' : '-'} ${fmt(Math.abs(ci), 4)}(x - ${fmt(sorted[i].x)})`;
    step5 += ` ${di >= 0 ? '+' : '-'} ${fmt(Math.abs(di), 4)}\\\\[4pt]`;
  }

  steps.push({ type: 'converged', latex: step5 });

  // Step 6: Usage guide
  let step6 = `\\textbf{Step 6: Usage Guide}\\\\[4pt]`;
  step6 += `\\text{To evaluate } f(x):\\\\`;
  for (let i = 0; i < numSplines; i++) {
    step6 += `\\text{If } ${fmt(sorted[i].x)} \\leq x \\leq ${fmt(sorted[i + 1].x)}: \\text{ use } S_{${i}}(x)\\\\`;
  }
  steps.push({ type: 'info', latex: step6 });

  // Evaluate at xEval if provided
  let evalResult = null;
  if (xEval !== null && !isNaN(xEval)) {
    evalResult = evaluateSpline(splines, xEval, sorted);
    let evalStep = `\\textbf{Evaluation at } x = ${fmt(xEval)}\\\\[4pt]`;

    const xMin = sorted[0].x;
    const xMax = sorted[n - 1].x;

    if (xEval < xMin || xEval > xMax) {
      evalStep += `\\textbf{Warning:}\\text{ } x = ${fmt(xEval)} \\text{ is outside the data range } [${fmt(xMin)}, ${fmt(xMax)}]\\\\`;
      evalStep += `\\text{Using nearest spline for extrapolation.}\\\\[4pt]`;
    }

    // Find which spline
    let splineIdx = 0;
    for (let i = 0; i < numSplines; i++) {
      if (xEval >= splines[i].xStart && xEval <= splines[i].xEnd) {
        splineIdx = i;
        break;
      }
      if (xEval > splines[i].xEnd) splineIdx = i;
    }

    evalStep += `\\text{Using } S_{${splineIdx}}(x):\\\\`;
    evalStep += `S_{${splineIdx}}(${fmt(xEval)}) = ${fmt(evalResult, 6)}`;

    steps.push({
      type: xEval < sorted[0].x || xEval > sorted[n - 1].x ? 'error' : 'converged',
      latex: evalStep,
    });
  }

  // Generate plot data
  const xMin = sorted[0].x;
  const xMax = sorted[n - 1].x;
  const margin = (xMax - xMin) * 0.1 || 1;
  const plotPoints = [];
  const plotN = 300;
  for (let i = 0; i <= plotN; i++) {
    const x = (xMin - margin) + (xMax - xMin + 2 * margin) * i / plotN;
    const y = evaluateSpline(splines, x, sorted);
    plotPoints.push({ x, y, splineIdx: findSplineIdx(splines, x) });
  }

  return {
    method: 'cubicSplines',
    steps,
    splines,
    evalResult,
    xEval,
    points: sorted,
    plotData: plotPoints,
    plotRange: { xMin: xMin - margin, xMax: xMax + margin },
    numSplines,
  };
}

function findSplineIdx(splines, x) {
  for (let i = 0; i < splines.length; i++) {
    if (x >= splines[i].xStart && x <= splines[i].xEnd) return i;
  }
  return x < splines[0].xStart ? 0 : splines.length - 1;
}

/**
 * Evaluate the spline at a given x value.
 */
function evaluateSpline(splines, x, sorted) {
  // Find the correct spline segment
  let idx = splines.length - 1;
  for (let i = 0; i < splines.length; i++) {
    if (x <= splines[i].xEnd) {
      idx = i;
      break;
    }
  }

  // Clamp to range for extrapolation
  if (x < splines[0].xStart) idx = 0;

  const s = splines[idx];
  const dx = x - s.xStart;
  return s.a * dx * dx * dx + s.b * dx * dx + s.c * dx + s.d;
}

/** Example datasets for cubic spline interpolation */
export const SPLINE_EXAMPLES = [
  {
    name: 'Projectile Position',
    desc: 'Height (m) vs time (s) for a projectile',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 14.1 },
      { x: 2, y: 22.4 },
      { x: 3, y: 24.8 },
      { x: 4, y: 21.4 },
      { x: 5, y: 12.2 },
      { x: 6, y: 0 },
    ],
    xEval: 2.5,
  },
  {
    name: 'Bridge Profile',
    desc: 'Elevation (m) at distance along bridge span (m)',
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 8 },
      { x: 20, y: 12 },
      { x: 30, y: 12 },
      { x: 40, y: 8 },
      { x: 50, y: 0 },
    ],
    xEval: 25,
  },
];
