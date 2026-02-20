/**
 * Matrix Math Engine
 * Computes norms, inverses, determinants, and condition numbers
 * All operations are pure functions on 2D arrays (number[][])
 */

// ─── Norms ───────────────────────────────────────────────────────────────────

/**
 * Infinity norm (row-sum norm): max of absolute row sums
 * ||A||∞ = max_i ( sum_j |a_ij| )
 */
export function infinityNorm(A) {
  let maxSum = 0;
  const details = [];
  for (let i = 0; i < A.length; i++) {
    let rowSum = 0;
    const absVals = [];
    for (let j = 0; j < A[i].length; j++) {
      const absVal = Math.abs(A[i][j]);
      absVals.push(absVal);
      rowSum += absVal;
    }
    details.push({ row: i, absVals, sum: rowSum });
    if (rowSum > maxSum) maxSum = rowSum;
  }
  return { value: maxSum, details };
}

/**
 * 1-norm (column-sum norm): max of absolute column sums
 * ||A||₁ = max_j ( sum_i |a_ij| )
 */
export function oneNorm(A) {
  const n = A.length;
  const m = A[0].length;
  let maxSum = 0;
  const details = [];
  for (let j = 0; j < m; j++) {
    let colSum = 0;
    const absVals = [];
    for (let i = 0; i < n; i++) {
      const absVal = Math.abs(A[i][j]);
      absVals.push(absVal);
      colSum += absVal;
    }
    details.push({ col: j, absVals, sum: colSum });
    if (colSum > maxSum) maxSum = colSum;
  }
  return { value: maxSum, details };
}

/**
 * Frobenius norm: sqrt of sum of all elements squared
 * ||A||F = sqrt( sum_ij a_ij² )
 */
export function frobeniusNorm(A) {
  let sumSq = 0;
  const squaredVals = [];
  for (let i = 0; i < A.length; i++) {
    const rowSq = [];
    for (let j = 0; j < A[i].length; j++) {
      const sq = A[i][j] * A[i][j];
      rowSq.push(sq);
      sumSq += sq;
    }
    squaredVals.push(rowSq);
  }
  return { value: Math.sqrt(sumSq), details: { squaredVals, sumSq } };
}

/**
 * Compute the selected norm
 * @param {number[][]} A
 * @param {'infinity' | 'one' | 'frobenius'} type
 */
export function computeNorm(A, type) {
  switch (type) {
    case 'infinity': return infinityNorm(A);
    case 'one': return oneNorm(A);
    case 'frobenius': return frobeniusNorm(A);
    default: throw new Error(`Unknown norm type: ${type}`);
  }
}

// ─── Determinant ─────────────────────────────────────────────────────────────

/**
 * Compute determinant using cofactor expansion (for small matrices)
 */
export function determinant(A) {
  const n = A.length;
  if (n === 1) return A[0][0];
  if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];

  let det = 0;
  for (let j = 0; j < n; j++) {
    const minor = [];
    for (let i = 1; i < n; i++) {
      const row = [];
      for (let k = 0; k < n; k++) {
        if (k !== j) row.push(A[i][k]);
      }
      minor.push(row);
    }
    det += (j % 2 === 0 ? 1 : -1) * A[0][j] * determinant(minor);
  }
  return det;
}

// ─── Matrix Inverse ──────────────────────────────────────────────────────────

/**
 * Compute the inverse of a square matrix using Gauss-Jordan elimination
 * @param {number[][]} A - square matrix
 * @returns {number[][]} inverse matrix
 * @throws {Error} if matrix is singular
 */
export function inverse(A) {
  const n = A.length;

  // Create augmented matrix [A | I]
  const aug = A.map((row, i) => {
    const extended = [...row];
    for (let j = 0; j < n; j++) {
      extended.push(i === j ? 1 : 0);
    }
    return extended;
  });

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-14) {
      throw new Error('Matrix is singular — inverse does not exist');
    }

    // Swap rows
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Scale pivot row
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Extract inverse from right half
  return aug.map(row => row.slice(n));
}

// ─── Condition Number ────────────────────────────────────────────────────────

/**
 * Compute the condition number of a matrix
 * Cond[A] = ||A|| * ||A⁻¹||
 *
 * @param {number[][]} A - square matrix
 * @param {'infinity' | 'one' | 'frobenius'} normType
 * @returns {{ conditionNumber, normA, normAInv, inverseMatrix, normADetails, normAInvDetails, det }}
 */
export function conditionNumber(A, normType) {
  const det = determinant(A);

  if (Math.abs(det) < 1e-14) {
    throw new Error('Matrix is singular (determinant ≈ 0) — inverse does not exist');
  }

  const Ainv = inverse(A);
  const normAResult = computeNorm(A, normType);
  const normAInvResult = computeNorm(Ainv, normType);
  const cond = normAResult.value * normAInvResult.value;

  return {
    conditionNumber: cond,
    normA: normAResult.value,
    normAInv: normAInvResult.value,
    normADetails: normAResult.details,
    normAInvDetails: normAInvResult.details,
    inverseMatrix: Ainv,
    det,
  };
}

// ─── Classification ──────────────────────────────────────────────────────────

/**
 * Classify the condition number
 * @param {number} cond
 * @returns {{ level: string, color: string, label: string, description: string }}
 */
export function classifyCondition(cond) {
  if (cond <= 10) {
    return {
      level: 'well',
      color: '#4ade80',
      bgColor: 'rgba(74, 222, 128, 0.15)',
      label: 'Well-Conditioned',
      description:
        'Small perturbations in the input produce small changes in the output. Solutions to Ax = b are reliable.',
    };
  }
  if (cond <= 1000) {
    return {
      level: 'moderate',
      color: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.15)',
      label: 'Moderately Ill-Conditioned',
      description:
        'Some sensitivity to perturbations. Solutions may lose a few digits of accuracy. Use caution with iterative methods.',
    };
  }
  return {
    level: 'severe',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    label: 'Severely Ill-Conditioned',
    description:
      'Highly sensitive to perturbations. Solutions to Ax = b may be unreliable. Consider reformulating the problem or using higher precision arithmetic.',
  };
}

// ─── Sensitivity Analysis ────────────────────────────────────────────────────

/**
 * Demonstrate sensitivity by perturbing A slightly and showing
 * how the solution to Ax = b changes.
 *
 * @param {number[][]} A - original matrix
 * @param {number} cond - condition number
 * @returns {{ b, x, perturbedA, perturbedX, relChangeA, relChangeX, amplification }}
 */
export function sensitivityAnalysis(A) {
  const n = A.length;

  // Create a simple b vector (all ones)
  const b = Array(n).fill(1);

  // Solve Ax = b
  const x = solveSystem(A, b);

  // Perturb A by ~0.1% in the (0,0) element
  const perturbedA = A.map(row => [...row]);
  const perturbAmount = Math.abs(A[0][0]) > 1e-10 ? A[0][0] * 0.001 : 0.001;
  perturbedA[0][0] += perturbAmount;

  // Solve perturbed system
  const perturbedX = solveSystem(perturbedA, b);

  // Compute relative changes
  const normX = Math.sqrt(x.reduce((s, v) => s + v * v, 0));
  const normDeltaX = Math.sqrt(x.reduce((s, v, i) => s + (perturbedX[i] - v) ** 2, 0));
  const normA = Math.sqrt(A.flat().reduce((s, v) => s + v * v, 0));
  const normDeltaA = Math.abs(perturbAmount);

  const relChangeA = normA > 0 ? normDeltaA / normA : 0;
  const relChangeX = normX > 0 ? normDeltaX / normX : 0;
  const amplification = relChangeA > 0 ? relChangeX / relChangeA : 0;

  return {
    b,
    x,
    perturbedA,
    perturbedX,
    perturbAmount,
    relChangeA,
    relChangeX,
    amplification,
  };
}

/**
 * Solve Ax = b using Gaussian elimination with partial pivoting
 */
function solveSystem(A, b) {
  const n = A.length;

  // Augmented matrix [A | b]
  const aug = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-14) {
      throw new Error('System is singular');
    }
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = sum / aug[i][i];
  }

  return x;
}
