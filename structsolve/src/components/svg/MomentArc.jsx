import React from 'react';

const C = '#dc2626';

/**
 * Find best label quadrant (least occupied by members/loads).
 * Quadrants: 0=top-right, 1=top-left, 2=bottom-left, 3=bottom-right
 */
function findBestLabelQuadrant(node, members, allNodes) {
  const occupancy = [0, 0, 0, 0];
  const connected = members.filter(m => m.startNodeId === node.id || m.endNodeId === node.id);
  for (const m of connected) {
    const otherId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
    const other = allNodes.find(n => n.id === otherId);
    if (!other) continue;
    const dx = other.x - node.x;
    const dy = other.y - node.y;
    if (dx >= 0 && dy <= 0) occupancy[0]++;
    if (dx <= 0 && dy <= 0) occupancy[1]++;
    if (dx <= 0 && dy >= 0) occupancy[2]++;
    if (dx >= 0 && dy >= 0) occupancy[3]++;
  }
  if (node.loads) {
    if (node.loads.fx > 0) { occupancy[0]++; occupancy[3]++; }
    if (node.loads.fx < 0) { occupancy[1]++; occupancy[2]++; }
    if (node.loads.fy > 0) { occupancy[2]++; occupancy[3]++; }
    if (node.loads.fy < 0) { occupancy[0]++; occupancy[1]++; }
  }
  let minIdx = 0;
  for (let i = 1; i < 4; i++) {
    if (occupancy[i] < occupancy[minIdx]) minIdx = i;
  }
  return minIdx;
}

/**
 * Find the average direction of connected members so the arc gap faces
 * TOWARD the members (arc wraps away from them).
 */
function findArcGapAngle(node, members, allNodes) {
  const connected = members.filter(m => m.startNodeId === node.id || m.endNodeId === node.id);
  if (connected.length === 0) return -Math.PI / 2;
  let sumDx = 0, sumDy = 0;
  for (const m of connected) {
    const otherId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
    const other = allNodes.find(n => n.id === otherId);
    if (!other) continue;
    const dx = other.x - node.x;
    const dy = other.y - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) { sumDx += dx / dist; sumDy += dy / dist; }
  }
  if (Math.abs(sumDx) < 0.001 && Math.abs(sumDy) < 0.001) return -Math.PI / 2;
  return Math.atan2(sumDy, sumDx);
}

export default function MomentArc({ x, y, moment, node, members, allNodes }) {
  if (!moment) return null;

  const r = 18;
  const isCCW = moment > 0;

  // Arc centered ON the node
  const cx = x;
  const cy = y;

  // Gap faces toward connected members
  const gapAngle = (members && allNodes && node)
    ? findArcGapAngle(node, members, allNodes)
    : -Math.PI / 2;

  // 180-degree arc (semicircle) — gap is on the side facing members
  const halfGap = Math.PI / 2; // 90° each side = 180° gap, so arc is 180°
  let startAngle, endAngle;
  if (isCCW) {
    // CCW: arc goes counter-clockwise from start to end
    startAngle = gapAngle + Math.PI + halfGap;  // opposite side of gap + offset
    endAngle = gapAngle + Math.PI - halfGap;
  } else {
    // CW: arc goes clockwise
    startAngle = gapAngle + Math.PI - halfGap;
    endAngle = gapAngle + Math.PI + halfGap;
  }

  const sx = cx + r * Math.cos(startAngle);
  const sy = cy + r * Math.sin(startAngle);
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy + r * Math.sin(endAngle);

  // SVG arc: large-arc=0 for 180° (semicircle)
  // sweep: 0 = CCW in SVG coords, 1 = CW in SVG coords
  const sweepFlag = isCCW ? 0 : 1;
  const path = `M ${sx} ${sy} A ${r} ${r} 0 0 ${sweepFlag} ${ex} ${ey}`;

  // Arrowhead tangent to arc at endpoint
  // Tangent direction at endpoint: perpendicular to the radius at that point
  let tangentAngle;
  if (isCCW) {
    // CCW in math = CW in SVG (y-axis flipped) — tangent is 90° behind radius
    tangentAngle = endAngle - Math.PI / 2;
  } else {
    // CW in math = CCW in SVG — tangent is 90° ahead of radius
    tangentAngle = endAngle + Math.PI / 2;
  }
  const tangentDeg = tangentAngle * 180 / Math.PI;

  // Smart label positioning
  const quadrant = (members && allNodes && node)
    ? findBestLabelQuadrant(node, members, allNodes)
    : 0;

  const labelDist = r + 16;
  const quadrantOffsets = [
    { dx: labelDist, dy: -labelDist },
    { dx: -labelDist, dy: -labelDist },
    { dx: -labelDist, dy: labelDist },
    { dx: labelDist, dy: labelDist },
  ];
  const labelOffset = quadrantOffsets[quadrant];
  const labelX = cx + labelOffset.dx;
  const labelY = cy + labelOffset.dy;

  return (
    <g>
      <path d={path} fill="none" stroke={C} strokeWidth={2} />
      <polygon
        points="0,0 -8,-3.5 -8,3.5"
        fill={C}
        transform={`translate(${ex},${ey}) rotate(${tangentDeg})`}
      />
      <rect x={labelX - 35} y={labelY - 8} width={70} height={16} rx={2}
        fill="white" fillOpacity={0.85} />
      <text x={labelX} y={labelY + 4} textAnchor="middle" fontSize={11}
        fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
        {Math.abs(moment)} kN&middot;m
      </text>
    </g>
  );
}
