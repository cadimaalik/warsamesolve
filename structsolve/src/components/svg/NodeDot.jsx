import React from 'react';

const FILL = '#1a1f2b';
const STROKE = '#374151';

export default function NodeDot({ node, members, isSelected, isConnectTarget }) {
  const connected = members.filter(m => m.startNodeId === node.id || m.endNodeId === node.id);
  const connCount = connected.length;

  const hasHinge = connected.some(m => {
    if (m.startNodeId === node.id && m.startHinge) return true;
    if (m.endNodeId === node.id && m.endHinge) return true;
    return false;
  });

  const hasSupport = !!node.support;
  const isFreeEnd = connCount === 1;
  // Show dot only when: has support, has hinge, or is a free end (1 connected member)
  const showDot = hasSupport || hasHinge || isFreeEnd || connCount === 0;

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

      {/* Node dot — only when rules say to show */}
      {showDot && !hasHinge && (
        <circle cx={node.x} cy={node.y} r={4.5}
          fill={FILL} stroke={STROKE} strokeWidth={1.5} />
      )}

      {/* Hinge indicator: open white circle */}
      {hasHinge && (
        <circle cx={node.x} cy={node.y} r={7}
          fill="#ffffff" stroke={STROKE} strokeWidth={2} />
      )}
    </g>
  );
}
