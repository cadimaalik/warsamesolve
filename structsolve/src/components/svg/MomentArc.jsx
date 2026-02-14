import React from 'react';

const C = '#dc2626';

/**
 * Find the emptiest quadrant around the node for the label.
 * Checks where members, Fx arrows, and Fy arrows occupy space.
 * Quadrants: 0=top-right, 1=top-left, 2=bottom-left, 3=bottom-right
 */
function findBestLabelQuadrant(node, members, allNodes) {
  const occupancy = [0, 0, 0, 0]; // TR, TL, BL, BR

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
 * Find the direction of the arc gap — face toward members
 * so the arc curves away from them.
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

  // Gap faces toward members so arc curves away
  const gapAngle = (members && allNodes && node)
    ? findArcGapAngle(node, members, allNodes)
    : -Math.PI / 2;

  // 300-degree arc with 60-degree gap centered on gapAngle
  const halfGap = (30 * Math.PI) / 180;
  let startAngle, endAngle;
  if (isCCW) {
    startAngle = gapAngle + halfGap;
    endAngle = gapAngle - halfGap;
  } else {
    startAngle = gapAngle - halfGap;
    endAngle = gapAngle + halfGap;
  }

  const sx = cx + r * Math.cos(startAngle);
  const sy = cy + r * Math.sin(startAngle);
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy + r * Math.sin(endAngle);

  const largeArc = 1;
  const sweepFlag = isCCW ? 0 : 1;
  const path = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex} ${ey}`;

  // Arrowhead tangent to arc at endpoint
  let tangentAngle;
  if (isCCW) {
    tangentAngle = (endAngle - Math.PI / 2) * 180 / Math.PI;
  } else {
    tangentAngle = (endAngle + Math.PI / 2) * 180 / Math.PI;
  }

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
        {Math.abs(moment)} kN&middot;m
      </text>
    </g>
  );
}
