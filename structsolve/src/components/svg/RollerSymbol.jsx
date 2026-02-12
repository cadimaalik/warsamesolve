import React from 'react';

const C = '#374151';

/**
 * Roller support symbol.
 * @param {'floor'|'wall'} orientation
 */
export default function RollerSymbol({ x, y, angle = 0, orientation = 'floor' }) {
  if (orientation === 'wall') {
    // Triangle points RIGHT, wheels on right, vertical wall line
    return (
      <g transform={`translate(${x},${y}) rotate(${angle})`}>
        <polygon points="0,0 20,-12 20,12"
          fill="none" stroke={C} strokeWidth={2.5} strokeLinejoin="round" />
        <circle cx={24} cy={-5} r={3} fill="none" stroke={C} strokeWidth={1.8} />
        <circle cx={24} cy={5} r={3} fill="none" stroke={C} strokeWidth={1.8} />
        <line x1={28} y1={-14} x2={28} y2={14} stroke={C} strokeWidth={2} />
      </g>
    );
  }

  // Floor: triangle points DOWN, wheels below, horizontal ground line
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      <polygon points="0,0 -12,20 12,20"
        fill="none" stroke={C} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={-5} cy={24} r={3} fill="none" stroke={C} strokeWidth={1.8} />
      <circle cx={5} cy={24} r={3} fill="none" stroke={C} strokeWidth={1.8} />
      <line x1={-14} y1={28} x2={14} y2={28} stroke={C} strokeWidth={2} />
    </g>
  );
}
