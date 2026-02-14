import React from 'react';
import { getMemberLength } from '../../utils/geometry.js';

const C = '#dc2626';
const MAX_ARROW = 40;
const NUM_ARROWS = 9;
const HEAD_L = 7;
const HEAD_W = 3.5;
const LABEL_GAP = 14;

export default function DistributedLoadArrows({ member, startNode, endNode }) {
  const loads = member.distributedLoads;
  if (!loads || loads.length === 0) return null;

  const totalLength = getMemberLength(member);
  if (totalLength === 0) return null;

  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  const memberAngle = Math.atan2(dy, dx);
  const perpAngle = memberAngle - Math.PI / 2;

  const elements = [];

  for (const dl of loads) {
    const { startPos, endPos, startIntensity, endIntensity, direction } = dl;
    const loadLen = endPos - startPos;
    if (loadLen <= 0) continue;

    const maxIntensity = Math.max(Math.abs(startIntensity), Math.abs(endIntensity));
    if (maxIntensity === 0) continue;

    const count = Math.max(2, Math.min(NUM_ARROWS, Math.round(loadLen / totalLength * NUM_ARROWS) + 1));
    const arrows = [];
    const tailPoints = [];

    // Determine arrow unit direction (constant for all arrows in this load)
    const refI = startIntensity !== 0 ? startIntensity : endIntensity;
    let unitDx, unitDy;
    if (direction === 'global-y') {
      unitDx = 0;
      unitDy = refI > 0 ? -1 : 1;
    } else if (direction === 'global-x') {
      unitDx = refI > 0 ? 1 : -1;
      unitDy = 0;
    } else {
      unitDx = Math.cos(perpAngle) * (refI > 0 ? 1 : -1);
      unitDy = Math.sin(perpAngle) * (refI > 0 ? 1 : -1);
    }

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const pos = startPos + t * loadLen;
      const ratio = pos / totalLength;

      // Position along member
      const px = startNode.x + dx * ratio;
      const py = startNode.y + dy * ratio;

      // Intensity at this point (linear interpolation)
      const intensity = startIntensity + t * (endIntensity - startIntensity);
      const normalizedLen = (Math.abs(intensity) / maxIntensity) * MAX_ARROW;

      // Tail point: always computed on the straight line (no offset gap)
      const tailX = px - unitDx * normalizedLen;
      const tailY = py - unitDy * normalizedLen;
      tailPoints.push({ x: tailX, y: tailY });

      if (normalizedLen < 1) continue;

      // Arrow direction (same sign as intensity)
      const sign = intensity > 0 ? 1 : -1;
      let arrowDx, arrowDy;
      if (direction === 'global-y') {
        arrowDx = 0;
        arrowDy = sign * -1; // positive up in SVG
      } else if (direction === 'global-x') {
        arrowDx = sign;
        arrowDy = 0;
      } else {
        arrowDx = Math.cos(perpAngle) * sign;
        arrowDy = Math.sin(perpAngle) * sign;
      }

      // Head at member surface, tail away from member
      const headX = px;
      const headY = py;
      const angle = Math.atan2(arrowDy, arrowDx) * 180 / Math.PI;

      arrows.push(
        <g key={`${dl.id}-arr-${i}`}>
          <line x1={tailX} y1={tailY} x2={headX} y2={headY}
            stroke={C} strokeWidth={1.5} />
          <polygon
            points={`0,0 ${-HEAD_L},${-HEAD_W} ${-HEAD_L},${HEAD_W}`}
            fill={C}
            transform={`translate(${headX},${headY}) rotate(${angle})`}
          />
        </g>
      );
    }

    // Connecting line between tails
    let tailLine = null;
    if (tailPoints.length >= 2) {
      const pathD = tailPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      tailLine = <path key={`${dl.id}-line`} d={pathD} fill="none" stroke={C} strokeWidth={1.5} />;
    }

    // Label positioning
    const sRatio = startPos / totalLength;
    const eRatio = endPos / totalLength;
    const labelSx = startNode.x + dx * sRatio;
    const labelSy = startNode.y + dy * sRatio;
    const labelEx = startNode.x + dx * eRatio;
    const labelEy = startNode.y + dy * eRatio;
    const midLx = (labelSx + labelEx) / 2;
    const midLy = (labelSy + labelEy) / 2;

    const isUDL = startIntensity === endIntensity;

    function renderLabel(cx, cy, value) {
      // Position label just outside the connecting line at this point
      const tailDist = (Math.abs(value) / maxIntensity) * MAX_ARROW;
      const offset = tailDist + LABEL_GAP;
      const lx = cx - unitDx * offset;
      const ly = cy - unitDy * offset;
      return (
        <g>
          <rect x={lx - 30} y={ly - 8}
            width={60} height={16} rx={2} fill="white" fillOpacity={0.85} />
          <text x={lx} y={ly + 4}
            textAnchor="middle" fontSize={10} fill={C}
            fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
            {Math.abs(value)} kN/m
          </text>
        </g>
      );
    }

    elements.push(
      <g key={dl.id}>
        {tailLine}
        {arrows}
        {isUDL ? (
          /* UDL: single centered label */
          startIntensity !== 0 && renderLabel(midLx, midLy, startIntensity)
        ) : (
          /* Triangular / Trapezoidal: labels at non-zero ends */
          <>
            {startIntensity !== 0 && renderLabel(labelSx, labelSy, startIntensity)}
            {endIntensity !== 0 && renderLabel(labelEx, labelEy, endIntensity)}
          </>
        )}
      </g>
    );
  }

  return <g>{elements}</g>;
}
