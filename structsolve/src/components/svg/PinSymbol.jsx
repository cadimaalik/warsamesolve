import React from 'react';

const C = '#374151';

/**
 * Pin support symbol.
 * @param {number} x - Node x position
 * @param {number} y - Node y position
 * @param {number} angle - 0 = faces down, 180 = faces up
 */
export default function PinSymbol({ x, y, angle = 0 }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      {/* Triangle */}
      <polygon
        points="0,0 -12,20 12,20"
        fill="none" stroke={C} strokeWidth={2.5} strokeLinejoin="round"
      />
      {/* Ground line */}
      <line x1={-15} y1={20} x2={15} y2={20} stroke={C} strokeWidth={2} />
      {/* Hatching: 5 lines angled below ground */}
      {[-10, -4, 2, 8, 14].map((xOff, i) => (
        <line key={i} x1={xOff} y1={20} x2={xOff - 5} y2={26}
          stroke={C} strokeWidth={1.2} />
      ))}
    </g>
  );
}
