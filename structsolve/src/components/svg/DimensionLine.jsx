import React from 'react';

const LINE_C = '#94a3b8';
const TEXT_C = '#64748b';

export default function DimensionLine({ startNode, endNode, length }) {
  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return null;

  // Perpendicular offset (push dimension line away from member)
  const angle = Math.atan2(dy, dx);
  const isNearVertical = Math.abs(Math.cos(angle)) < 0.3;
  const offset = isNearVertical ? 35 : 20;

  // Normal vector (perpendicular to member, pointing "left" of direction)
  const nx = -Math.sin(angle) * offset;
  const ny = Math.cos(angle) * offset;

  // Offset start and end points
  const sx = startNode.x + nx;
  const sy = startNode.y + ny;
  const ex = endNode.x + nx;
  const ey = endNode.y + ny;

  // Midpoint for text
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;

  // Text rotation (keep text readable — never upside down)
  let textAngle = (angle * 180) / Math.PI;
  if (textAngle > 90 || textAngle < -90) textAngle += 180;

  // Tick mark endpoints (perpendicular to dimension line)
  const tickLen = 4;
  const tnx = -Math.sin(angle) * tickLen;
  const tny = Math.cos(angle) * tickLen;

  // Format length: "6m", "7.21m"
  const label = Number.isInteger(length) ? `${length}m` : `${length.toFixed(2).replace(/\.?0+$/, '')}m`;

  return (
    <g>
      {/* Dashed dimension line */}
      <line x1={sx} y1={sy} x2={ex} y2={ey}
        stroke={LINE_C} strokeWidth={1} strokeDasharray="6,3" />
      {/* Start tick */}
      <line x1={sx - tnx} y1={sy - tny} x2={sx + tnx} y2={sy + tny}
        stroke={LINE_C} strokeWidth={1.2} />
      {/* End tick */}
      <line x1={ex - tnx} y1={ey - tny} x2={ex + tnx} y2={ey + tny}
        stroke={LINE_C} strokeWidth={1.2} />
      {/* Label */}
      <g transform={`translate(${mx},${my}) rotate(${isNearVertical ? 0 : textAngle})`}>
        <rect x={-20} y={-9} width={40} height={14} rx={2}
          fill="white" fillOpacity={0.9} />
        <text x={0} y={3} textAnchor="middle" fontSize={11}
          fill={TEXT_C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
          {label}
        </text>
      </g>
    </g>
  );
}
