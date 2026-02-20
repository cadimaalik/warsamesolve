/**
 * MATLAB Notation Parser
 * Parses MATLAB-style matrix input like [1 2 3; 4 5 6; 7 8 9]
 */

/**
 * Parse a MATLAB notation string into a 2D array of numbers.
 * Accepts:
 *   [1 2 3; 4 5 6; 7 8 9]
 *   [1,2,3; 4,5,6; 7,8,9]
 *   1 2 3; 4 5 6; 7 8 9   (brackets optional)
 *   Negative numbers: [-1 2; 3 -4]
 *   Decimals: [1.5 2.3; 4.1 5.6]
 *
 * @param {string} input - MATLAB notation string
 * @returns {{ matrix: number[][], rows: number, cols: number }}
 * @throws {Error} with descriptive message on invalid input
 */
export function parseMatlab(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Please enter a matrix in MATLAB notation');
  }

  // Strip outer whitespace
  let s = input.trim();

  // Remove optional brackets
  if (s.startsWith('[') && s.endsWith(']')) {
    s = s.slice(1, -1).trim();
  } else if (s.startsWith('[') || s.endsWith(']')) {
    throw new Error('Invalid MATLAB notation — mismatched brackets');
  }

  if (s.length === 0) {
    throw new Error('Matrix is empty');
  }

  // Split into rows by semicolons
  const rowStrings = s.split(';').map(r => r.trim()).filter(r => r.length > 0);

  if (rowStrings.length === 0) {
    throw new Error('Matrix is empty — use semicolons to separate rows');
  }

  const matrix = [];
  let cols = null;

  for (let i = 0; i < rowStrings.length; i++) {
    // Split row elements by commas or whitespace
    // Handle negative numbers: split on comma or space that's not part of a negative sign
    const elements = rowStrings[i]
      .split(/[,\s]+/)
      .filter(e => e.length > 0);

    // Rejoin elements that were split incorrectly (e.g. "- 4" -> handle gracefully)
    const row = [];
    for (let j = 0; j < elements.length; j++) {
      const val = Number(elements[j]);
      if (isNaN(val)) {
        throw new Error(
          `Invalid number "${elements[j]}" in row ${i + 1} — check your syntax`
        );
      }
      if (!isFinite(val)) {
        throw new Error(
          `Number too large in row ${i + 1} — values must be finite`
        );
      }
      row.push(val);
    }

    if (row.length === 0) {
      throw new Error(`Row ${i + 1} is empty`);
    }

    if (cols === null) {
      cols = row.length;
    } else if (row.length !== cols) {
      throw new Error(
        `Row ${i + 1} has ${row.length} elements but row 1 has ${cols} — all rows must have the same number of elements`
      );
    }

    matrix.push(row);
  }

  const rows = matrix.length;

  if (rows !== cols) {
    throw new Error(
      `Matrix is ${rows}x${cols} — must be square (same number of rows and columns)`
    );
  }

  if (rows < 2) {
    throw new Error('Matrix must be at least 2x2');
  }

  if (rows > 5) {
    throw new Error('Matrix size limited to 5x5 for this calculator');
  }

  return { matrix, rows, cols };
}

/**
 * Format a 2D array back to MATLAB notation string
 * @param {number[][]} matrix
 * @returns {string}
 */
export function toMatlab(matrix) {
  const rows = matrix.map(row =>
    row.map(v => {
      // Compact number formatting
      if (Number.isInteger(v)) return String(v);
      // Show up to 6 decimal places, strip trailing zeros
      return parseFloat(v.toPrecision(6)).toString();
    }).join(' ')
  );
  return '[' + rows.join('; ') + ']';
}
