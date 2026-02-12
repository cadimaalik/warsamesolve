import React from 'react';

const C = '#dc2626';
const ARROW_LEN = 50;
const HEAD_W = 5;
const HEAD_L = 10;
const GAP = 10;       // gap between arrow tip and node center

function ArrowHead({ x, y, angle }) {
  return (
    <polygon
      points={`0,0 ${-HEAD_L},${-HEAD_W} ${-HEAD_L},${HEAD_W}`}
      fill={C}
      transform={`translate(${x},${y}) rotate(${angle})`}
    />
  );
}

export default function LoadArrows({ node }) {
  const { fx, fy } = node.loads;
  if (!fx && !fy) return null;

  const elements = [];

  // Fy arrow (vertical) — positive = UP
  // Upward load: arrow sits ABOVE member, points DOWN toward node
  // Downward load: arrow sits BELOW member, points UP toward node
  if (fy) {
    const dir = fy > 0 ? -1 : 1; // SVG: -1 = up, +1 = down
    const tipY = node.y + dir * GAP;          // tip offset from node
    const tailY = tipY + dir * ARROW_LEN;     // tail = far end

    elements.push(
      <g key="fy">
        <line x1={node.x} y1={tailY} x2={node.x} y2={tipY}
          stroke={C} strokeWidth={2.5} />
        <ArrowHead x={node.x} y={tipY} angle={dir > 0 ? 90 : -90} />
        {/* Label at tail, offset to the right */}
        <rect x={node.x + 6} y={tailY - 8} width={55} height={16} rx={2}
          fill="white" fillOpacity={0.85} />
        <text x={node.x + 8} y={tailY + 4} fontSize={11}
          fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
          {Math.abs(fy)} kN
        </text>
      </g>
    );
  }

  // Fx arrow (horizontal) — positive = RIGHT
  // Rightward load: arrow comes from the LEFT, points RIGHT toward node
  // Leftward load: arrow comes from the RIGHT, points LEFT toward node
  if (fx) {
    const dir = fx > 0 ? -1 : 1; // arrow comes from OPPOSITE side
    const tipX = node.x + (-dir) * GAP;      // tip near node (with gap)
    const tailX = tipX + dir * ARROW_LEN;     // tail = far end
    const offsetY = fy ? -10 : 0;             // vertical offset if Fy also exists

    elements.push(
      <g key="fx">
        <line x1={tailX} y1={node.y + offsetY} x2={tipX} y2={node.y + offsetY}
          stroke={C} strokeWidth={2.5} />
        <ArrowHead x={tipX} y={node.y + offsetY} angle={dir > 0 ? 180 : 0} />
        {/* Label at tail, offset above */}
        <rect x={tailX - 27} y={node.y + offsetY - 22}
          width={55} height={16} rx={2} fill="white" fillOpacity={0.85} />
        <text x={tailX - 25} y={node.y + offsetY - 10}
          fontSize={11} fill={C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
          {Math.abs(fx)} kN
        </text>
      </g>
    );
  }

  return <g>{elements}</g>;
}
