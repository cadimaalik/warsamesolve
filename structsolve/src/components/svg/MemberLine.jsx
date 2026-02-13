import React from 'react';

const FRAME_C = '#1a1f2b';
const DEFORM_C = '#0d9488';
const TRUSS_C = '#c2410c';
const SELECT_C = 'rgba(74, 222, 128, 0.2)';

export default function MemberLine({ member, startNode, endNode, isSelected, onSelect }) {
  const isTruss = member.type === 'truss';
  const isDeformable = !isTruss && member.EI_factor !== 1;

  let strokeColor = FRAME_C;
  if (isTruss) strokeColor = TRUSS_C;
  else if (isDeformable) strokeColor = DEFORM_C;

  return (
    <g>
      {/* Selection highlight */}
      {isSelected && (
        <line x1={startNode.x} y1={startNode.y} x2={endNode.x} y2={endNode.y}
          stroke={SELECT_C} strokeWidth={12} strokeLinecap="round" />
      )}

      {/* Visible member line */}
      <line x1={startNode.x} y1={startNode.y} x2={endNode.x} y2={endNode.y}
        stroke={strokeColor}
        strokeWidth={isTruss ? 1.5 : 3}
        strokeLinecap="round"
        strokeDasharray="none"
      />

      {/* Invisible fat hit area for clicking */}
      <line x1={startNode.x} y1={startNode.y} x2={endNode.x} y2={endNode.y}
        data-interactive="true"
        stroke="transparent" strokeWidth={16}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onSelect && onSelect(member.id); }}
      />
    </g>
  );
}
