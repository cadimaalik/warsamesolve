import React from 'react';

const C = '#374151';

export default function GuideSymbol({ x, y, angle = 0, orientation = 'floor' }) {
  if (orientation === 'wall') {
    // VERTICAL rails, wheels slide up/down, wall line + hatching on RIGHT
    return (
      <g transform={`translate(${x},${y}) rotate(${angle})`}>
        {/* Left rail (vertical) */}
        <line x1={4} y1={-14} x2={4} y2={14} stroke={C} strokeWidth={2.5} />
        {/* Right rail (vertical) */}
        <line x1={20} y1={-14} x2={20} y2={14} stroke={C} strokeWidth={2.5} />
        {/* 3 wheels between rails */}
        <circle cx={12} cy={-7} r={3} fill="none" stroke={C} strokeWidth={1.5} />
        <circle cx={12} cy={0} r={3} fill="none" stroke={C} strokeWidth={1.5} />
        <circle cx={12} cy={7} r={3} fill="none" stroke={C} strokeWidth={1.5} />
        {/* Wall line on right */}
        <line x1={24} y1={-16} x2={24} y2={16} stroke={C} strokeWidth={2} />
        {/* Hatching on wall side */}
        {[-10, -4, 2, 8, 14].map((yOff, i) => (
          <line key={i} x1={24} y1={yOff} x2={30} y2={yOff - 5}
            stroke={C} strokeWidth={1.2} />
        ))}
      </g>
    );
  }

  // Floor: HORIZONTAL rails, wheels slide left/right, ground + hatching below
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      {/* Top rail (horizontal) */}
      <line x1={-14} y1={4} x2={14} y2={4} stroke={C} strokeWidth={2.5} />
      {/* Bottom rail (horizontal) */}
      <line x1={-14} y1={20} x2={14} y2={20} stroke={C} strokeWidth={2.5} />
      {/* 3 wheels between rails */}
      <circle cx={-7} cy={12} r={3} fill="none" stroke={C} strokeWidth={1.5} />
      <circle cx={0} cy={12} r={3} fill="none" stroke={C} strokeWidth={1.5} />
      <circle cx={7} cy={12} r={3} fill="none" stroke={C} strokeWidth={1.5} />
      {/* Ground line */}
      <line x1={-16} y1={24} x2={16} y2={24} stroke={C} strokeWidth={2} />
      {/* Hatching below ground */}
      {[-10, -4, 2, 8, 14].map((xOff, i) => (
        <line key={i} x1={xOff} y1={24} x2={xOff - 5} y2={30}
          stroke={C} strokeWidth={1.2} />
      ))}
    </g>
  );
}
