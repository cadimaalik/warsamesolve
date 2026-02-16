import { compile } from 'mathjs';

/* ── All supported functions ── */
const FUNCTIONS = [
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh',
  'asinh', 'acosh', 'atanh',
  'exp', 'log', 'log10', 'log2',
  'sqrt', 'abs', 'sign', 'floor', 'ceil',
];

const CONSTANTS = ['pi', 'e'];

/* ── Convert Python → mathjs ── */
export function pythonToMathjs(expr) {
  let s = expr.trim();
  // ** → ^
  s = s.replace(/\*\*/g, '^');
  // implicit multiplication: 3x → 3*x, 2( → 2*(
  s = s.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
  // )( → )*(
  s = s.replace(/\)\(/g, ')*(');
  // )x → )*x  (but keep function parens intact – handled by mathjs)
  s = s.replace(/\)([a-zA-Z0-9])/g, ')*$1');
  return s;
}

/* ── Convert internal (^) → Python display (**) ── */
export function toPythonNotation(expr) {
  return (expr || '').replace(/\^/g, '**');
}

/* ── Validate Python expression ── */
export function validatePythonExpression(expr) {
  const errors = [];
  const suggestions = [];

  if (!expr || !expr.trim()) {
    return { isValid: false, errors: ['Expression is empty'], suggestions: [] };
  }

  // ^ should be **
  if (/\^/.test(expr)) {
    errors.push('Use ** for exponentiation (not ^)');
    suggestions.push({ message: 'Replace ^ with **', fix: expr.replace(/\^/g, '**') });
  }

  // implicit multiplication (ignore inside log10, log2, atan2)
  const cleaned = expr.replace(/log10|log2|atan2/g, '___');
  if (/\d[a-zA-Z]/.test(cleaned)) {
    errors.push('Multiplication must be explicit: use 2*x (not 2x)');
    suggestions.push({
      message: 'Add explicit multiplication',
      fix: expr.replace(/(\d)([a-zA-Z])/g, '$1*$2'),
    });
  }

  // ln() → log()
  if (/\bln\s*\(/.test(expr)) {
    errors.push('Use log(x) for natural logarithm (not ln(x))');
    suggestions.push({ message: 'Replace ln with log', fix: expr.replace(/\bln\s*\(/g, 'log(') });
  }

  if (errors.length > 0) return { isValid: false, errors, suggestions };

  try {
    const mathjsExpr = pythonToMathjs(expr);
    const compiled = compile(mathjsExpr);
    const val = compiled.evaluate({ x: 1 });
    if (typeof val !== 'number' || isNaN(val)) {
      return { isValid: false, errors: ['Expression does not evaluate to a number'], suggestions: [] };
    }
    return { isValid: true, errors: [], suggestions: [] };
  } catch (e) {
    return { isValid: false, errors: [e.message], suggestions: [] };
  }
}

/* ── Tokenizer for syntax highlighting ── */
export function tokenizeExpression(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    // whitespace
    if (/\s/.test(expr[i])) {
      let start = i;
      while (i < expr.length && /\s/.test(expr[i])) i++;
      tokens.push({ type: 'whitespace', value: expr.slice(start, i) });
      continue;
    }

    // numbers (with optional decimal / sci notation)
    if (/\d/.test(expr[i]) || (expr[i] === '.' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let start = i;
      while (i < expr.length && /[\d.]/.test(expr[i])) i++;
      if (i < expr.length && /[eE]/.test(expr[i])) {
        i++;
        if (i < expr.length && /[+-]/.test(expr[i])) i++;
        while (i < expr.length && /\d/.test(expr[i])) i++;
      }
      tokens.push({ type: 'number', value: expr.slice(start, i) });
      continue;
    }

    // identifiers
    if (/[a-zA-Z_]/.test(expr[i])) {
      let start = i;
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) i++;
      const word = expr.slice(start, i);
      if (FUNCTIONS.includes(word)) tokens.push({ type: 'function', value: word });
      else if (CONSTANTS.includes(word)) tokens.push({ type: 'constant', value: word });
      else if (word === 'x') tokens.push({ type: 'variable', value: word });
      else tokens.push({ type: 'unknown', value: word });
      continue;
    }

    // ** operator
    if (expr[i] === '*' && i + 1 < expr.length && expr[i + 1] === '*') {
      tokens.push({ type: 'operator', value: '**' });
      i += 2;
      continue;
    }

    // single-char operators
    if (/[+\-*/]/.test(expr[i])) {
      tokens.push({ type: 'operator', value: expr[i] });
      i++;
      continue;
    }

    // parens & commas
    if (/[(),]/.test(expr[i])) {
      tokens.push({ type: 'paren', value: expr[i] });
      i++;
      continue;
    }

    tokens.push({ type: 'error', value: expr[i] });
    i++;
  }

  return tokens;
}

/* ── Autocomplete suggestions ── */
export function getAutocompleteSuggestions(partialWord) {
  if (!partialWord || partialWord.length === 0) return [];
  const lower = partialWord.toLowerCase();
  return [...FUNCTIONS, ...CONSTANTS].filter(f => f.startsWith(lower) && f !== lower);
}

/* ── Format expression for mathematical display ── */
export function formatForDisplay(expr) {
  if (!expr) return '';
  let f = expr;
  // ** digits → superscript
  f = f.replace(/\*\*(\d+)/g, (_, exp) => {
    const sup = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return exp.split('').map(c => sup[c] || c).join('');
  });
  f = f.replace(/\bpi\b/g, 'π');
  // remove * before variable / letter for display
  f = f.replace(/\*([a-zA-Zπ(])/g, '$1');
  f = f.replace(/ - /g, ' − ');
  return f;
}

export { FUNCTIONS, CONSTANTS };
