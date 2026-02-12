import React from 'react';

const C = '#dc2626';

export default function MomentArc({ x, y, moment }) {
  if (!moment) return null;

  const r = 22;
  const isCCW = moment > 0;

  // Arc drawn around the node with slight visual offset
  let path, arrowAngle, arrowX, arrowY;

  if (isCCW) {
    path = `M ${x + r} ${y} A ${r} ${r} 0 0 0 ${x - r} ${y}`;
    arrowX = x - r;
    arrowY = y;
    arrowAngle = 200;
  } else {
    path = `M ${x - r} ${y} A ${r} ${r} 0 0 0 ${x + r} ${y}`;
    arrowX = x + r;
    arrowY = y;
    arrowAngle = -20;
  }

  return (
    <g>
      <path d={path} fill="none" stroke={C} strokeWidth={3} />
      <polygon
        points="0,0 -10,-4 -10,4"
        fill={C}
        transform={`translate(${arrowX},${arrowY}) rotate(${arrowAngle})`}
      />
      {/* Label above the arc, offset from node */}
      <rect x={x - 35} y={y - r - 22} width={70} height={16} rx={2}
        fill="white" fillOpacity={0.85} />
      <text x={x} y={y - r - 10} textAnchor="middle" fontSize={11}
        fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
        {Math.abs(moment)} kN·m
      </text>
    </g>
  );
}
