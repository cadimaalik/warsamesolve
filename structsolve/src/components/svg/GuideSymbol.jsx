import React from 'react';

const C = '#374151';

export default function GuideSymbol({ x, y, angle = 0, orientation = 'floor' }) {
  if (orientation === 'wall') {
    // VERTICAL guide: member connects rigidly to rails,
    // wheels between rails, wall line + hatching beyond wheels
    return (
      <g transform={`translate(${x},${y}) rotate(${angle})`}>
        {/* Rail 1 (left, vertical) */}
        <line x1={4} y1={-14} x2={4} y2={14} stroke={C} strokeWidth={2.5} />
        {/* Rail 2 (right, vertical) */}
        <line x1={16} y1={-14} x2={16} y2={14} stroke={C} strokeWidth={2.5} />
        {/* 3 wheels between rails */}
        <circle cx={10} cy={-7} r={3} fill="none" stroke={C} strokeWidth={1.5} />
        <circle cx={10} cy={0} r={3} fill="none" stroke={C} strokeWidth={1.5} />
        <circle cx={10} cy={7} r={3} fill="none" stroke={C} strokeWidth={1.5} />
        {/* Wall line beyond wheels (right side) */}
        <line x1={20} y1={-16} x2={20} y2={16} stroke={C} strokeWidth={2} />
        {/* Hatching ON the wall line */}
        {[-12, -6, 0, 6, 12].map((yOff, i) => (
          <line key={i} x1={20} y1={yOff} x2={26} y2={yOff - 5}
            stroke={C} strokeWidth={1.2} />
        ))}
      </g>
    );
  }

  // Floor guide: member connects rigidly to horizontal rails,
  // wheels between rails, ground line + hatching below
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      {/* Rail 1 (top, horizontal) */}
      <line x1={-14} y1={4} x2={14} y2={4} stroke={C} strokeWidth={2.5} />
      {/* Rail 2 (bottom, horizontal) */}
      <line x1={-14} y1={16} x2={14} y2={16} stroke={C} strokeWidth={2.5} />
      {/* 3 wheels between rails */}
      <circle cx={-7} cy={10} r={3} fill="none" stroke={C} strokeWidth={1.5} />
      <circle cx={0} cy={10} r={3} fill="none" stroke={C} strokeWidth={1.5} />
      <circle cx={7} cy={10} r={3} fill="none" stroke={C} strokeWidth={1.5} />
      {/* Ground line beyond wheels (below) */}
      <line x1={-16} y1={20} x2={16} y2={20} stroke={C} strokeWidth={2} />
      {/* Hatching ON the ground line */}
      {[-12, -6, 0, 6, 12].map((xOff, i) => (
        <line key={i} x1={xOff} y1={20} x2={xOff - 5} y2={26}
          stroke={C} strokeWidth={1.2} />
      ))}
    </g>
  );
}
