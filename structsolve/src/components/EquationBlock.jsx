import React, { useEffect, useRef } from 'react';

/**
 * Renders an array of LaTeX strings using MathJax.
 * Each string is one line; empty strings become vertical spacers.
 */
export default function EquationBlock({ equations }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  });

  if (!equations || equations.length === 0) return null;

  // Group consecutive non-empty lines into display blocks;
  // empty strings trigger a visual gap between groups.
  const groups = [];
  let current = [];
  for (const line of equations) {
    if (line === '') {
      if (current.length > 0) { groups.push(current); current = []; }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) groups.push(current);

  return (
    <div ref={ref} className="equation-block">
      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? 8 : 0 }}>
          {group.length === 1
            ? '\\[' + group[0] + '\\]'
            : '\\[\\begin{gathered}' + group.join(' \\\\ ') + '\\end{gathered}\\]'}
        </div>
      ))}
    </div>
  );
}
