/**
 * Matrix operations for function approximation calculations.
 * Gaussian elimination with partial pivoting for solving Ax = b.
 */

/**
 * Solve Ax = b using Gaussian elimination with partial pivoting.
 * Returns the solution vector x and intermediate steps for display.
 */
export function solveLinearSystem(A, b) {
  const n = A.length;
  // Augmented matrix
  const aug = A.map((row, i) => [...row, b[i]]);
  const steps = [];

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
      throw new Error('Matrix is singular - system has no unique solution');
    }

    // Swap rows if needed
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = sum / aug[i][i];
  }

  return { x, steps };
}

/**
 * Multiply matrix A by vector v.
 */
export function matVecMul(A, v) {
  return A.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
}

/**
 * Transpose a matrix.
 */
export function transpose(A) {
  const m = A.length;
  const n = A[0].length;
  const T = [];
  for (let j = 0; j < n; j++) {
    T[j] = [];
    for (let i = 0; i < m; i++) {
      T[j][i] = A[i][j];
    }
  }
  return T;
}

/**
 * Multiply two matrices A (m×p) and B (p×n).
 */
export function matMul(A, B) {
  const m = A.length;
  const p = A[0].length;
  const n = B[0].length;
  const C = [];
  for (let i = 0; i < m; i++) {
    C[i] = [];
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < p; k++) {
        sum += A[i][k] * B[k][j];
      }
      C[i][j] = sum;
    }
  }
  return C;
}

/**
 * Format a number for display (avoid floating point noise).
 */
export function fmt(val, decimals = 6) {
  if (val === undefined || val === null || isNaN(val)) return '—';
  if (Math.abs(val) < 1e-14) return '0';
  if (Math.abs(val) > 1e10 || (Math.abs(val) < 1e-6 && val !== 0)) {
    return val.toExponential(decimals);
  }
  // Remove trailing zeros
  return parseFloat(val.toFixed(decimals)).toString();
}
