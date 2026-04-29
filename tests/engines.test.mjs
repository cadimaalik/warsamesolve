import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMatlab } from '../condnumber/src/engine/parser.js';
import { conditionNumber } from '../condnumber/src/engine/matrix.js';
import { lagrangeInterpolation } from '../funcapprox/src/engine/lagrange.js';
import { cubicSplineInterpolation } from '../funcapprox/src/engine/cubicSplines.js';
import { linearRegression } from '../funcapprox/src/engine/leastSquares.js';
import { classify } from '../structsolve/src/utils/analysis.js';

const nearlyEqual = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
};

test('parseMatlab accepts bracketed square matrices', () => {
  const { matrix, rows, cols } = parseMatlab('[1 2; 3 4]');

  assert.equal(rows, 2);
  assert.equal(cols, 2);
  assert.deepEqual(matrix, [[1, 2], [3, 4]]);
});

test('conditionNumber computes infinity-norm condition number', () => {
  const { conditionNumber: cond } = conditionNumber([[1, 2], [3, 4]], 'infinity');

  nearlyEqual(cond, 21);
});

test('lagrangeInterpolation reproduces a quadratic data set', () => {
  const result = lagrangeInterpolation([
    { x: 0, y: 1 },
    { x: 1, y: 4 },
    { x: 2, y: 9 },
  ], 3);

  nearlyEqual(result.evalResult, 16, 1e-8);
});

test('cubicSplineInterpolation evaluates linear data linearly', () => {
  const result = cubicSplineInterpolation([
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  ], 1.5);

  nearlyEqual(result.evalResult, 1.5, 1e-8);
});

test('linearRegression fits y = 2x + 1 exactly', () => {
  const result = linearRegression([
    { x: 0, y: 1 },
    { x: 1, y: 3 },
    { x: 2, y: 5 },
  ], 3);

  nearlyEqual(result.coefficients[0], 1, 1e-8);
  nearlyEqual(result.coefficients[1], 2, 1e-8);
  nearlyEqual(result.evalResult, 7, 1e-8);
});

test('classify identifies a simply supported beam as determinate frame', () => {
  const nodes = [
    { id: 'A', support: 'pin' },
    { id: 'B', support: 'roller-h' },
  ];
  const members = [
    { startNodeId: 'A', endNodeId: 'B', type: 'frame', startHinge: false, endHinge: false },
  ];

  const result = classify(nodes, members);

  assert.equal(result.type, 'Frame');
  assert.equal(result.status, 'determinate');
  assert.equal(result.DOF, 0);
});
