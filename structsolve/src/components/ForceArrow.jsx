// ForceArrow.jsx — SVG arrow for FBD force visualization
// Used in FBDCanvas to render reaction, applied, member, and equivalent forces
import React from 'react';

const HEAD_W = 4;
const HEAD_L = 8;

/**
 * @param {number} x1 - start x (tail) in SVG coords
 * @param {number} y1 - start y (tail) in SVG coords
 * @param {number} x2 - end x (head/tip) in SVG coords
 * @param {number} y2 - end y (head/tip) in SVG coords
 * @param {string} color - stroke/fill color
 * @param {string} label - text label next to arrow
 * @param {string} [style] - 'bold' | 'dimmed' | 'dashed' (default: bold)
 * @param {number} [strokeWidth] - line width (default 2)
 */
export default function ForceArrow({ x1, y1, x2, y2, color, label, style, strokeWidth }) {
  const sw = strokeWidth || 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.5) return null;

  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  const opacity = style === 'dimmed' ? 0.4 : 1;
  const dashArray = style === 'dashed' ? '4,3' : 'none';

  // Label position: offset perpendicular to arrow direction
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const perpX = -dy / len;
  const perpY = dx / len;
  const labelOffset = 12;
  const labelX = midX + perpX * labelOffset;
  const labelY = midY + perpY * labelOffset;

  // Decide text-anchor based on label position relative to arrow
  const anchor = Math.abs(perpX) < 0.3 ? 'middle' : perpX > 0 ? 'start' : 'end';

  return (
    <g opacity={opacity}>
      {/* Arrow line */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={sw}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
      {/* Arrowhead at (x2, y2) */}
      <polygon
        points={`0,0 ${-HEAD_L},${-HEAD_W} ${-HEAD_L},${HEAD_W}`}
        fill={color}
        transform={`translate(${x2},${y2}) rotate(${angle})`}
      />
      {/* Label */}
      {label && (
        <>
          <rect
            x={labelX - (anchor === 'middle' ? 30 : anchor === 'end' ? 60 : 0)}
            y={labelY - 7}
            width={60} height={14} rx={2}
            fill="white" fillOpacity={0.85}
          />
          <text
            x={labelX} y={labelY + 4}
            textAnchor={anchor}
            fontSize={9}
            fill={color}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={600}
          >
            {label}
          </text>
        </>
      )}
    </g>
  );
}
