import { solveLinearSystem, fmt } from './matrix';

export function cubicSplineInterpolation(points, xEval = null) {
  const n = points.length;
  if (n < 3) throw new Error('Please enter at least 3 data points for cubic splines');

  const sorted = [...points].sort((a, b) => a.x - b.x);

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(sorted[i].x - sorted[i + 1].x) < 1e-14) {
      throw new Error(`Duplicate x-value: x = ${sorted[i].x}`);
    }
  }

  const numSplines = n - 1;
  const steps = [];
  const h = [];

  // Step 1: Data & intervals
  let step1 = `\\textbf{Step 1: Data \\& Interval Summary}\\\\[4pt]`;
  step1 += `\\text{Points: } n+1 = ${n}, \\quad \\text{Splines: } n = ${numSplines}\\\\[4pt]`;
  for (let i = 0; i < numSplines; i++) {
    h[i] = sorted[i + 1].x - sorted[i].x;
    step1 += `[x_{${i}}, x_{${i + 1}}] = [${fmt(sorted[i].x)}, ${fmt(sorted[i + 1].x)}]: \\; h_{${i}} = ${fmt(h[i])}\\\\`;
  }
  steps.push({ type: 'setup', latex: step1 });

  // Step 2: Equations explanation
  let step2 = `\\textbf{Step 2: System of Equations}\\\\[4pt]`;
  step2 += `\\text{Total: } 4 \\times ${numSplines} = ${4 * numSplines} \\text{ equations}\\\\[4pt]`;
  step2 += `\\text{1. Function values at endpoints (${2 * numSplines} eqs)}\\\\`;
  step2 += `\\text{2. First derivative continuity (${numSplines - 1} eqs)}\\\\`;
  step2 += `\\text{3. Second derivative continuity (${numSplines - 1} eqs)}\\\\`;
  step2 += `\\text{4. Natural BCs: } S''_0(x_0) = 0,\\; S''_{${numSplines - 1}}(x_{${n - 1}}) = 0`;
  steps.push({ type: 'info', latex: step2 });

  // Solve tridiagonal system for M values
  const numInterior = n - 2;
  const M = new Array(n).fill(0);

  if (numInterior > 0) {
    const A = [];
    const rhs = [];

    for (let i = 0; i < numInterior; i++) {
      const row = new Array(numInterior).fill(0);
      const idx = i + 1;
      row[i] = 2 * (h[idx - 1] + h[idx]);
      if (i > 0) row[i - 1] = h[idx - 1];
      if (i < numInterior - 1) row[i + 1] = h[idx];
      A.push(row);
      rhs.push(
        6 * ((sorted[idx + 1].y - sorted[idx].y) / h[idx] -
             (sorted[idx].y - sorted[idx - 1].y) / h[idx - 1])
      );
    }

    // Step 3: Matrix
    let step3 = `\\textbf{Step 3: Tridiagonal System}\\\\[4pt]`;
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
      step3 += `\\text{(${numInterior} \\times ${numInterior} tridiagonal system)}`;
    }
    steps.push({ type: 'iteration', latex: step3 });

    const { x: Minterior } = solveLinearSystem(A, rhs);
    for (let i = 0; i < numInterior; i++) M[i + 1] = Minterior[i];
  }

  // Step 4: M values
  let step4 = `\\textbf{Step 4: Second Derivative Values}\\\\[4pt]`;
  for (let i = 0; i < n; i++) {
    step4 += `M_{${i}} = ${fmt(M[i], 6)}\\\\`;
  }
  steps.push({ type: 'info', latex: step4 });

  // Step 5: Spline coefficients
  const splines = [];
  let step5 = `\\textbf{Step 5: Spline Coefficients}\\\\[4pt]`;
  step5 += `S_i(x) = a_i(x - x_i)^3 + b_i(x - x_i)^2 + c_i(x - x_i) + d_i\\\\[8pt]`;

  for (let i = 0; i < numSplines; i++) {
    const ai = (M[i + 1] - M[i]) / (6 * h[i]);
    const bi = M[i] / 2;
    const ci = (sorted[i + 1].y - sorted[i].y) / h[i] - h[i] * (2 * M[i] + M[i + 1]) / 6;
    const di = sorted[i].y;

    splines.push({ a: ai, b: bi, c: ci, d: di, xStart: sorted[i].x, xEnd: sorted[i + 1].x });

    step5 += `S_{${i}}(x) \\text{ on } [${fmt(sorted[i].x)}, ${fmt(sorted[i + 1].x)}]:\\\\`;
    step5 += `\\quad a_{${i}} = ${fmt(ai, 6)}, \\; b_{${i}} = ${fmt(bi, 6)}, \\; c_{${i}} = ${fmt(ci, 6)}, \\; d_{${i}} = ${fmt(di, 6)}\\\\[4pt]`;
  }
  steps.push({ type: 'converged', latex: step5 });

  // Step 6: Usage
  let step6 = `\\textbf{Step 6: Usage Guide}\\\\[4pt]`;
  for (let i = 0; i < numSplines; i++) {
    step6 += `\\text{If } ${fmt(sorted[i].x)} \\leq x \\leq ${fmt(sorted[i + 1].x)}: \\text{ use } S_{${i}}(x)\\\\`;
  }
  steps.push({ type: 'info', latex: step6 });

  // Evaluation
  let evalResult = null;
  if (xEval !== null && !isNaN(xEval)) {
    evalResult = evaluateSpline(splines, xEval);
    let evalStep = `\\textbf{Evaluation at } x = ${fmt(xEval)}\\\\[4pt]`;
    const xMin = sorted[0].x;
    const xMax = sorted[n - 1].x;
    if (xEval < xMin || xEval > xMax) {
      evalStep += `\\textbf{Warning:}\\text{ outside range } [${fmt(xMin)}, ${fmt(xMax)}]\\\\[4pt]`;
    }
    let splineIdx = 0;
    for (let i = 0; i < numSplines; i++) {
      if (xEval >= splines[i].xStart && xEval <= splines[i].xEnd) { splineIdx = i; break; }
      if (xEval > splines[i].xEnd) splineIdx = i;
    }
    evalStep += `\\text{Using } S_{${splineIdx}}: \\quad S_{${splineIdx}}(${fmt(xEval)}) = ${fmt(evalResult, 6)}`;
    steps.push({
      type: xEval < sorted[0].x || xEval > sorted[n - 1].x ? 'error' : 'converged',
      latex: evalStep,
    });
  }

  // Plot
  const xMin = sorted[0].x;
  const xMax = sorted[n - 1].x;
  const margin = (xMax - xMin) * 0.1 || 1;
  const plotPoints = [];
  for (let i = 0; i <= 300; i++) {
    const x = (xMin - margin) + (xMax - xMin + 2 * margin) * i / 300;
    plotPoints.push({ x, y: evaluateSpline(splines, x) });
  }

  return {
    method: 'cubicSplines',
    steps, splines, evalResult, xEval, points: sorted,
    plotData: plotPoints,
    plotRange: { xMin: xMin - margin, xMax: xMax + margin },
    numSplines,
  };
}

function evaluateSpline(splines, x) {
  let idx = splines.length - 1;
  for (let i = 0; i < splines.length; i++) {
    if (x <= splines[i].xEnd) { idx = i; break; }
  }
  if (x < splines[0].xStart) idx = 0;
  const s = splines[idx];
  const dx = x - s.xStart;
  return s.a * dx * dx * dx + s.b * dx * dx + s.c * dx + s.d;
}

export const SPLINE_EXAMPLES = [
  {
    name: 'Projectile Position',
    desc: 'Height (m) vs time (s)',
    points: [
      { x: 0, y: 0 }, { x: 1, y: 14.1 }, { x: 2, y: 22.4 },
      { x: 3, y: 24.8 }, { x: 4, y: 21.4 }, { x: 5, y: 12.2 }, { x: 6, y: 0 },
    ],
    xEval: 2.5,
  },
  {
    name: 'Bridge Profile',
    desc: 'Elevation (m) along bridge span (m)',
    points: [
      { x: 0, y: 0 }, { x: 10, y: 8 }, { x: 20, y: 12 },
      { x: 30, y: 12 }, { x: 40, y: 8 }, { x: 50, y: 0 },
    ],
    xEval: 25,
  },
];
