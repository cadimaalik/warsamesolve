import React from 'react';

const C = '#374151';

export default function FixedSymbol({ x, y, angle = 0 }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      {/* Thick ground line */}
      <line x1={-16} y1={0} x2={16} y2={0} stroke={C} strokeWidth={3.5} />
      {/* Hatching: 6 lines below */}
      {[-12, -6, 0, 6, 12].map((xOff, i) => (
        <line key={i} x1={xOff} y1={0} x2={xOff - 5} y2={8}
          stroke={C} strokeWidth={1.2} />
      ))}
    </g>
  );
}
