// FBDMomentArc.jsx — 270-degree curved arc arrow for moment display in FBDs
import React from 'react';

const HEAD_W = 3.5;
const HEAD_L = 7;

/**
 * @param {number} cx - center x in SVG coords
 * @param {number} cy - center y in SVG coords
 * @param {number} value - moment value (positive = CCW in engineering = CW in SVG)
 * @param {string} color - stroke/fill color
 * @param {string} label - text label
 * @param {number} [radius] - arc radius (default 16)
 */
export default function FBDMomentArc({ cx, cy, value, color, label, radius }) {
  if (Math.abs(value) < 1e-10) return null;

  const r = radius || 16;
  const isCCW = value > 0; // engineering CCW

  // 270-degree arc: gap of 90 degrees at the top
  // In SVG coordinates (y-down), we place the gap at angle = -PI/2 (top)
  const gapCenter = -Math.PI / 2;
  const halfGap = Math.PI / 4; // 45 deg each side = 90 deg gap

  let startAngle, endAngle, sweepFlag;
  if (isCCW) {
    // Engineering CCW = SVG CW (because y is flipped)
    // Arc goes CW in SVG from start to end
    startAngle = gapCenter + halfGap;   // right of gap
    endAngle = gapCenter - halfGap + 2 * Math.PI; // left of gap, going CW = 270 deg
    sweepFlag = 1; // CW in SVG
  } else {
    // Engineering CW = SVG CCW
    startAngle = gapCenter - halfGap;   // left of gap
    endAngle = gapCenter + halfGap - 2 * Math.PI; // right of gap, going CCW = 270 deg
    sweepFlag = 0; // CCW in SVG
  }

  const sx = cx + r * Math.cos(startAngle);
  const sy = cy + r * Math.sin(startAngle);

  const actualEnd = isCCW
    ? gapCenter - halfGap
    : gapCenter + halfGap;
  const ex = cx + r * Math.cos(actualEnd);
  const ey = cy + r * Math.sin(actualEnd);

  // large-arc flag = 1 for 270 deg (> 180)
  const path = `M ${sx} ${sy} A ${r} ${r} 0 1 ${sweepFlag} ${ex} ${ey}`;

  // Arrowhead tangent at endpoint
  let tangentAngle;
  if (isCCW) {
    // CW in SVG: tangent at end is 90 deg ahead of radius
    tangentAngle = actualEnd + Math.PI / 2;
  } else {
    // CCW in SVG: tangent at end is 90 deg behind radius
    tangentAngle = actualEnd - Math.PI / 2;
  }
  const tangentDeg = tangentAngle * 180 / Math.PI;

  // Label below the arc
  const labelX = cx;
  const labelY = cy + r + 14;

  return (
    <g>
      <path d={path} fill="none" stroke={color} strokeWidth={1.8} />
      <polygon
        points={`0,0 ${-HEAD_L},${-HEAD_W} ${-HEAD_L},${HEAD_W}`}
        fill={color}
        transform={`translate(${ex},${ey}) rotate(${tangentDeg})`}
      />
      {label && (
        <>
          <rect
            x={labelX - 30} y={labelY - 7}
            width={60} height={14} rx={2}
            fill="white" fillOpacity={0.85}
          />
          <text
            x={labelX} y={labelY + 4}
            textAnchor="middle"
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
