import React from 'react';

const STROKE = '#374151';

export default function NodeDot({ node, members, isSelected, isConnectTarget }) {
  const connected = members.filter(m => m.startNodeId === node.id || m.endNodeId === node.id);

  const hasHinge = connected.some(m => {
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

      {/* Hinge indicator: open white circle */}
      {hasHinge && (
        <circle cx={node.x} cy={node.y} r={5}
          fill="#ffffff" stroke={STROKE} strokeWidth={1.5} />
      )}
    </g>
  );
}
