/**
 * Matrix operations for function approximation calculations.
 * Gaussian elimination with partial pivoting for solving Ax = b.
 */

export function solveLinearSystem(A, b) {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);

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
      throw new Error('Matrix is singular - system has no unique solution');
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

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = sum / aug[i][i];
  }

  return { x };
}

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

export function fmt(val, decimals = 6) {
  if (val === undefined || val === null || isNaN(val)) return '—';
  if (Math.abs(val) < 1e-14) return '0';
  if (Math.abs(val) > 1e10 || (Math.abs(val) < 1e-6 && val !== 0)) {
    return val.toExponential(decimals);
  }
  return parseFloat(val.toFixed(decimals)).toString();
}
