import React from 'react';

const FILL = '#1a1f2b';
const STROKE = '#374151';

export default function NodeDot({ node, members, isSelected, isConnectTarget }) {
  // Check if any connected member has a hinge at this node's end
  const hasHinge = members.some(m => {
    if (m.startNodeId === node.id && m.startHinge) return true;
    if (m.endNodeId === node.id && m.endHinge) return true;
    return false;
  });

  return (
    <g>
      {/* Connect mode: pulsing green ring */}
      {isConnectTarget && (
        <circle cx={node.x} cy={node.y} r={16}
          fill="none" stroke="#4ade80" strokeWidth={2}
          className="connectable-pulse" />
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle cx={node.x} cy={node.y} r={12}
          fill="rgba(74, 222, 128, 0.15)" stroke="#4ade80" strokeWidth={2} />
      )}

      {/* Node dot */}
      <circle cx={node.x} cy={node.y} r={4.5}
        fill={FILL} stroke={STROKE} strokeWidth={1.5} />

      {/* Hinge indicator: open white circle on top */}
      {hasHinge && (
        <circle cx={node.x} cy={node.y} r={7}
          fill="#ffffff" stroke={STROKE} strokeWidth={2} />
      )}
    </g>
  );
}
