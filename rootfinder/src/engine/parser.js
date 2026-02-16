import { parse, derivative, compile } from 'mathjs';

/**
 * Normalizes expression notation to math.js compatible format.
 * Handles both MATLAB-style (^) and Python-style (**) exponentiation.
 * Examples:
 *   "x^3 - 2*x + 1"     -> "x^3 - 2*x + 1"
 *   "x**3 - 2*x + 1"    -> "x^3 - 2*x + 1"
 *   "3x^2 + 2x - 1"     -> "3*x^2 + 2*x - 1"
 *   "sin(x) + x**2"     -> "sin(x) + x^2"
 *   "exp(-x) - x"       -> "exp(-x) - x"
 */
export function normalizeMatlabExpr(expr) {
  let s = expr.trim();

  // Convert Python ** to ^ for mathjs
  s = s.replace(/\*\*/g, '^');

  // Insert * for implicit multiplication: "3x" -> "3*x", "2sin" -> "2*sin"
  s = s.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
  // "x(" -> "x*(" but not for functions like sin(, cos(, etc.
  s = s.replace(/([a-zA-Z])(\()/g, (match, letter, paren) => {
    const funcs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan',
                   'sinh', 'cosh', 'tanh', 'log', 'ln', 'exp',
                   'sqrt', 'abs', 'ceil', 'floor', 'round',
                   'sec', 'csc', 'cot'];
    // Check if letter is the last char of a known function
    for (const f of funcs) {
      if (s.includes(f + '(')) return match;
    }
    return letter + '*' + paren;
  });
  // ")x" -> ")*x", ")(" -> ")*("
  s = s.replace(/\)([a-zA-Z0-9(])/g, ')*$1');

  return s;
}

/**
 * Build expression string from polynomial coefficients.
 * coefficients: array where index i is the coefficient of x^i
 * e.g., [1, -2, 0, 1] means 1 - 2x + 0x^2 + x^3
 */
export function polynomialToExpr(coefficients) {
  const terms = [];
  for (let i = coefficients.length - 1; i >= 0; i--) {
    const c = coefficients[i];
    if (c === 0) continue;

    let term;
    if (i === 0) {
      term = String(c);
    } else if (i === 1) {
      if (c === 1) term = 'x';
      else if (c === -1) term = '-x';
      else term = `${c}*x`;
    } else {
      if (c === 1) term = `x^${i}`;
      else if (c === -1) term = `-x^${i}`;
      else term = `${c}*x^${i}`;
    }

    terms.push(term);
  }

  if (terms.length === 0) return '0';

  // Join with proper signs
  let expr = terms[0];
  for (let i = 1; i < terms.length; i++) {
    if (terms[i].startsWith('-')) {
      expr += ' - ' + terms[i].slice(1);
    } else {
      expr += ' + ' + terms[i];
    }
  }
  return expr;
}

/**
 * Parse an expression string and return an evaluator function.
 */
export function compileExpr(exprStr) {
  const normalized = normalizeMatlabExpr(exprStr);
  const compiled = compile(normalized);
  return (x) => {
    try {
      return compiled.evaluate({ x });
    } catch {
      return NaN;
    }
  };
}

/**
 * Compute symbolic derivative using math.js, return compiled evaluator.
 */
export function compileDerivative(exprStr) {
  const normalized = normalizeMatlabExpr(exprStr);
  try {
    const node = parse(normalized);
    const dNode = derivative(node, 'x');
    const compiled = dNode.compile();
    return {
      expr: dNode.toString(),
      fn: (x) => {
        try {
          return compiled.evaluate({ x });
        } catch {
          return NaN;
        }
      },
    };
  } catch {
    // Fallback to numerical differentiation
    const f = compileExpr(exprStr);
    return {
      expr: "f'(x) [numeric]",
      fn: (x) => {
        const h = 1e-8;
        return (f(x + h) - f(x - h)) / (2 * h);
      },
    };
  }
}

/**
 * Convert expression string to LaTeX.
 */
export function exprToLatex(exprStr) {
  try {
    const normalized = normalizeMatlabExpr(exprStr);
    const node = parse(normalized);
    return node.toTex();
  } catch {
    return exprStr;
  }
}

/**
 * Validate that an expression is parseable and evaluatable.
 */
export function validateExpr(exprStr) {
  try {
    const fn = compileExpr(exprStr);
    const val = fn(1);
    if (typeof val !== 'number' || isNaN(val)) {
      return { valid: false, error: 'Expression does not evaluate to a number' };
    }
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}
