import React from 'react';

const C = '#dc2626';
const ARROW_LEN = 50;
const HEAD_W = 5;
const HEAD_L = 10;
const GAP = 12;

function ArrowHead({ x, y, angle }) {
  return (
    <polygon
      points={`0,0 ${-HEAD_L},${-HEAD_W} ${-HEAD_L},${HEAD_W}`}
      fill={C}
      transform={`translate(${x},${y}) rotate(${angle})`}
    />
  );
}

/** Check if any connected member goes roughly in the given direction (within 45deg) */
function hasMemberInDirection(node, dir, members, allNodes) {
  const connected = members.filter(m => m.startNodeId === node.id || m.endNodeId === node.id);
  for (const m of connected) {
    const otherId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
    const other = allNodes.find(n => n.id === otherId);
    if (!other) continue;
    const dx = other.x - node.x;
    const dy = other.y - node.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (dir === 'down' && angle > 45 && angle < 135) return true;
    if (dir === 'up' && angle < -45 && angle > -135) return true;
    if (dir === 'right' && angle > -45 && angle < 45) return true;
    if (dir === 'left' && (angle > 135 || angle < -135)) return true;
  }
  return false;
}

export default function LoadArrows({ node, members, allNodes }) {
  const { fx, fy } = node.loads;
  if (!fx && !fy) return null;

  const elements = [];

  // Fy arrow (vertical) — positive = UP (engineering), SVG y-axis inverted
  if (fy) {
    const forceDown = fy < 0;
    // Default: arrow on side force is going. Exception: flip if member in that direction
    let flipped = false;
    if (forceDown && hasMemberInDirection(node, 'down', members, allNodes)) flipped = true;
    if (!forceDown && hasMemberInDirection(node, 'up', members, allNodes)) flipped = true;

    if (forceDown) {
      if (!flipped) {
        // Arrow BELOW node, pointing down. Tail near node, head far.
        const tailY = node.y + GAP;
        const headY = tailY + ARROW_LEN;
        elements.push(
          <g key="fy">
            <line x1={node.x} y1={tailY} x2={node.x} y2={headY} stroke={C} strokeWidth={2.5} />
            <ArrowHead x={node.x} y={headY} angle={90} />
            <rect x={node.x + 6} y={headY} width={55} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={node.x + 8} y={headY + 12} fontSize={11} fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>{Math.abs(fy)} kN</text>
          </g>
        );
      } else {
        // Flipped ABOVE node, arrowhead still points down (near node end)
        const headY = node.y - GAP;
        const tailY = headY - ARROW_LEN;
        elements.push(
          <g key="fy">
            <line x1={node.x} y1={tailY} x2={node.x} y2={headY} stroke={C} strokeWidth={2.5} />
            <ArrowHead x={node.x} y={headY} angle={90} />
            <rect x={node.x + 6} y={tailY - 4} width={55} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={node.x + 8} y={tailY + 8} fontSize={11} fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>{Math.abs(fy)} kN</text>
          </g>
        );
      }
    } else {
      // Force goes UP
      if (!flipped) {
        // Arrow ABOVE node, pointing up
        const tailY = node.y - GAP;
        const headY = tailY - ARROW_LEN;
        elements.push(
          <g key="fy">
            <line x1={node.x} y1={tailY} x2={node.x} y2={headY} stroke={C} strokeWidth={2.5} />
            <ArrowHead x={node.x} y={headY} angle={-90} />
            <rect x={node.x + 6} y={headY - 4} width={55} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={node.x + 8} y={headY + 8} fontSize={11} fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>{Math.abs(fy)} kN</text>
          </g>
        );
      } else {
        // Flipped BELOW node, arrowhead still points up (near node end)
        const headY = node.y + GAP;
        const tailY = headY + ARROW_LEN;
        elements.push(
          <g key="fy">
            <line x1={node.x} y1={tailY} x2={node.x} y2={headY} stroke={C} strokeWidth={2.5} />
            <ArrowHead x={node.x} y={headY} angle={-90} />
            <rect x={node.x + 6} y={tailY - 4} width={55} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={node.x + 8} y={tailY + 8} fontSize={11} fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>{Math.abs(fy)} kN</text>
          </g>
        );
      }
    }
  }

  // Fx arrow (horizontal) — positive = RIGHT
  if (fx) {
    const forceRight = fx > 0;
    const offsetY = fy ? -14 : 0;

    let flipped = false;
    if (forceRight && hasMemberInDirection(node, 'right', members, allNodes)) flipped = true;
    if (!forceRight && hasMemberInDirection(node, 'left', members, allNodes)) flipped = true;

    if (forceRight) {
      if (!flipped) {
        // Arrow RIGHT of node, pointing right
        const tailX = node.x + GAP;
        const headX = tailX + ARROW_LEN;
        elements.push(
          <g key="fx">
            <line x1={tailX} y1={node.y + offsetY} x2={headX} y2={node.y + offsetY} stroke={C} strokeWidth={2.5} />
            <ArrowHead x={headX} y={node.y + offsetY} angle={0} />
            <rect x={headX + 4} y={node.y + offsetY - 8} width={55} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={headX + 6} y={node.y + offsetY + 4} fontSize={11} fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>{Math.abs(fx)} kN</text>
          </g>
        );
      } else {
        // Flipped LEFT, arrowhead points right (near node)
        const headX = node.x - GAP;
        const tailX = headX - ARROW_LEN;
        elements.push(
          <g key="fx">
            <line x1={tailX} y1={node.y + offsetY} x2={headX} y2={node.y + offsetY} stroke={C} strokeWidth={2.5} />
            <ArrowHead x={headX} y={node.y + offsetY} angle={0} />
            <rect x={tailX - 4 - 55} y={node.y + offsetY - 8} width={55} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={tailX - 4 - 53} y={node.y + offsetY + 4} fontSize={11} fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>{Math.abs(fx)} kN</text>
          </g>
        );
      }
    } else {
      // Force goes LEFT
      if (!flipped) {
        // Arrow LEFT of node, pointing left
        const tailX = node.x - GAP;
        const headX = tailX - ARROW_LEN;
        elements.push(
          <g key="fx">
            <line x1={tailX} y1={node.y + offsetY} x2={headX} y2={node.y + offsetY} stroke={C} strokeWidth={2.5} />
            <ArrowHead x={headX} y={node.y + offsetY} angle={180} />
            <rect x={headX - 4 - 55} y={node.y + offsetY - 8} width={55} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={headX - 4 - 53} y={node.y + offsetY + 4} fontSize={11} fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>{Math.abs(fx)} kN</text>
          </g>
        );
      } else {
        // Flipped RIGHT, arrowhead points left (near node)
        const headX = node.x + GAP;
        const tailX = headX + ARROW_LEN;
        elements.push(
          <g key="fx">
            <line x1={tailX} y1={node.y + offsetY} x2={headX} y2={node.y + offsetY} stroke={C} strokeWidth={2.5} />
            <ArrowHead x={headX} y={node.y + offsetY} angle={180} />
            <rect x={tailX + 4} y={node.y + offsetY - 8} width={55} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={tailX + 6} y={node.y + offsetY + 4} fontSize={11} fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>{Math.abs(fx)} kN</text>
          </g>
        );
      }
    }
  }

  return <g>{elements}</g>;
}
