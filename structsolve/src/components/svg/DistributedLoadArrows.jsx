import React from 'react';
import { getMemberLength } from '../../utils/geometry.js';

const C = '#dc2626';
const MAX_ARROW = 40;
const NUM_ARROWS = 9;
const HEAD_L = 7;
const HEAD_W = 3.5;

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
      if (normalizedLen < 1) {
        tailPoints.push({ x: px, y: py });
        continue;
      }

      // Arrow direction based on load direction setting
      let arrowDx, arrowDy;
      if (direction === 'global-y') {
        arrowDx = 0;
        arrowDy = intensity > 0 ? -1 : 1; // positive up (SVG y inverted)
      } else if (direction === 'global-x') {
        arrowDx = intensity > 0 ? 1 : -1;
        arrowDy = 0;
      } else {
        // Perpendicular to member
        arrowDx = Math.cos(perpAngle) * (intensity > 0 ? 1 : -1);
        arrowDy = Math.sin(perpAngle) * (intensity > 0 ? 1 : -1);
      }

      // Offset from member: arrows start away from member, point toward it
      const offset = 8; // gap from member line
      const tailX = px - arrowDx * (normalizedLen + offset);
      const tailY = py - arrowDy * (normalizedLen + offset);
      const headX = px - arrowDx * offset;
      const headY = py - arrowDy * offset;

      tailPoints.push({ x: tailX, y: tailY });

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

    // Intensity labels at start and end
    const sRatio = startPos / totalLength;
    const eRatio = endPos / totalLength;
    const labelSx = startNode.x + dx * sRatio;
    const labelSy = startNode.y + dy * sRatio;
    const labelEx = startNode.x + dx * eRatio;
    const labelEy = startNode.y + dy * eRatio;

    // Offset labels away from member
    let labelDirX, labelDirY;
    if (direction === 'global-y') {
      labelDirX = 0;
      labelDirY = startIntensity >= 0 ? -1 : 1;
    } else if (direction === 'global-x') {
      labelDirX = startIntensity >= 0 ? 1 : -1;
      labelDirY = 0;
    } else {
      labelDirX = Math.cos(perpAngle) * (startIntensity >= 0 ? 1 : -1);
      labelDirY = Math.sin(perpAngle) * (startIntensity >= 0 ? 1 : -1);
    }
    const labelOffset = MAX_ARROW + 22;

    elements.push(
      <g key={dl.id}>
        {tailLine}
        {arrows}
        {/* Start intensity label */}
        {startIntensity !== 0 && (
          <g>
            <rect x={labelSx + labelDirX * labelOffset - 30} y={labelSy + labelDirY * labelOffset - 8}
              width={60} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={labelSx + labelDirX * labelOffset} y={labelSy + labelDirY * labelOffset + 4}
              textAnchor="middle" fontSize={10} fill={C}
              fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
              {Math.abs(startIntensity)} kN/m
            </text>
          </g>
        )}
        {/* End intensity label (if different from start) */}
        {endIntensity !== startIntensity && endIntensity !== 0 && (
          <g>
            <rect x={labelEx + labelDirX * labelOffset - 30} y={labelEy + labelDirY * labelOffset - 8}
              width={60} height={16} rx={2} fill="white" fillOpacity={0.85} />
            <text x={labelEx + labelDirX * labelOffset} y={labelEy + labelDirY * labelOffset + 4}
              textAnchor="middle" fontSize={10} fill={C}
              fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
              {Math.abs(endIntensity)} kN/m
            </text>
          </g>
        )}
      </g>
    );
  }

  return <g>{elements}</g>;
}
