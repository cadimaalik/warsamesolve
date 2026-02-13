import React from 'react';

const C = '#dc2626';

/** Find best offset direction for moment arc (away from members) */
function findArcOffset(x, y, members, allNodes) {
  const connected = members.filter(m => m.startNodeId === findNodeId(x, y, allNodes) || m.endNodeId === findNodeId(x, y, allNodes));
  // Collect angles of connected members
  const angles = [];
  const nodeId = findNodeId(x, y, allNodes);
  for (const m of connected) {
    const otherId = m.startNodeId === nodeId ? m.endNodeId : m.startNodeId;
    const other = allNodes.find(n => n.id === otherId);
    if (!other) continue;
    angles.push(Math.atan2(other.y - y, other.x - x));
  }

  if (angles.length === 0) return { dx: 0, dy: -28 }; // default: above

  // Find largest gap between member angles, place arc in that gap
  if (angles.length === 1) {
    // Single member: place opposite
    const a = angles[0] + Math.PI;
    return { dx: Math.cos(a) * 28, dy: Math.sin(a) * 28 };
  }

  // Sort angles and find largest gap
  angles.sort((a, b) => a - b);
  let maxGap = 0, maxMid = -Math.PI / 2; // default: up
  for (let i = 0; i < angles.length; i++) {
    const next = i < angles.length - 1 ? angles[i + 1] : angles[0] + 2 * Math.PI;
    const gap = next - angles[i];
    if (gap > maxGap) {
      maxGap = gap;
      maxMid = angles[i] + gap / 2;
    }
  }
  return { dx: Math.cos(maxMid) * 28, dy: Math.sin(maxMid) * 28 };
}

function findNodeId(x, y, allNodes) {
  const n = allNodes.find(n => n.x === x && n.y === y);
  return n ? n.id : null;
}

export default function MomentArc({ x, y, moment, members, allNodes }) {
  if (!moment) return null;

  const r = 18;
  const isCCW = moment > 0;

  // Compute offset to position arc away from members
  const offset = (members && allNodes) ? findArcOffset(x, y, members, allNodes) : { dx: 0, dy: -28 };
  const cx = x + offset.dx;
  const cy = y + offset.dy;

  // 270° arc (three-quarter circle)
  // For CCW (positive moment): arc sweeps counter-clockwise
  // For CW (negative moment): arc sweeps clockwise
  // Start at 45° from top, sweep 270°

  const startAngle = -Math.PI / 4; // -45° (upper-right)
  const sweepAngle = (270 * Math.PI) / 180;

  let endAngle;
  if (isCCW) {
    // CCW sweep: go counter-clockwise (subtract)
    endAngle = startAngle - sweepAngle;
  } else {
    // CW sweep: go clockwise (add)
    endAngle = startAngle + sweepAngle;
  }

  const sx = cx + r * Math.cos(startAngle);
  const sy = cy + r * Math.sin(startAngle);
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy + r * Math.sin(endAngle);

  // SVG arc: large-arc-flag = 1 for >180°, sweep-flag: 0=CCW, 1=CW
  const largeArc = 1; // always >180° since we're doing 270°
  const sweepFlag = isCCW ? 0 : 1;

  const path = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex} ${ey}`;

  // Arrowhead tangent to arc at the end point
  // Tangent direction at end of arc
  let tangentAngle;
  if (isCCW) {
    // CCW: tangent at end points in CCW direction (perpendicular to radius, left)
    tangentAngle = (endAngle - Math.PI / 2) * 180 / Math.PI;
  } else {
    // CW: tangent at end points in CW direction (perpendicular to radius, right)
    tangentAngle = (endAngle + Math.PI / 2) * 180 / Math.PI;
  }

  // Label position: opposite side of arc center from node
  const labelX = cx;
  const labelY = cy - r - 14;

  return (
    <g>
      <path d={path} fill="none" stroke={C} strokeWidth={2.5} />
      <polygon
        points="0,0 -9,-4 -9,4"
        fill={C}
        transform={`translate(${ex},${ey}) rotate(${tangentAngle})`}
      />
      <rect x={labelX - 35} y={labelY - 8} width={70} height={16} rx={2}
        fill="white" fillOpacity={0.85} />
      <text x={labelX} y={labelY + 4} textAnchor="middle" fontSize={11}
        fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
        {Math.abs(moment)} kN·m
      </text>
    </g>
  );
}
