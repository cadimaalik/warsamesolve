import React from 'react';
import { PIXELS_PER_METER } from '../../constants/directions.js';

const STROKE = '#374151';

export default function NodeDot({ node, members, allNodes, isSelected, isConnectTarget }) {
  const connected = members.filter(m => m.startNodeId === node.id || m.endNodeId === node.id);

  // Collect which member-ends have hinges at this node (truss members are always hinged)
  const hingedMembers = connected.filter(m => {
    if (m.type === 'truss') return true;
    if (m.startNodeId === node.id && m.startHinge) return true;
    if (m.endNodeId === node.id && m.endHinge) return true;
    return false;
  });

  const hasAnyHinge = hingedMembers.length > 0;
  const allHinged = connected.length > 0 && hingedMembers.length === connected.length;
  const hasSupport = !!node.support;
  const isPinOrRoller = node.support === 'pin' || node.support === 'roller-h' || node.support === 'roller-v';
  const isFreeEnd = connected.length <= 1;

  // Visible dot: only at unsupported free-end nodes with no hinges
  const showDot = !hasSupport && isFreeEnd && !hasAnyHinge;

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

      {/* Visible dot: only at unsupported free-end nodes */}
      {showDot && (
        <circle cx={node.x} cy={node.y} r={4.5}
          fill="#1a1f2b" stroke={STROKE} strokeWidth={1.5} />
      )}

      {/* White dot at supports — drawn in Canvas Layer 1.5 (behind members) when ALL hinged */}

      {/* Supported node with only SOME members hinged: offset circles for hinged members */}
      {hasSupport && hasAnyHinge && !allHinged && (
        hingedMembers.map(m => {
          const otherId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
          const other = allNodes ? allNodes.find(n => n.id === otherId) : null;
          let offsetX = 0, offsetY = 0;
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.001) {
              offsetX = (dx / dist) * 5;
              offsetY = (dy / dist) * 5;
            }
          }
          return (
            <circle key={m.id} cx={node.x + offsetX} cy={node.y + offsetY} r={4}
              fill="#ffffff" stroke={STROKE} strokeWidth={1.5} />
          );
        })
      )}

      {/* Hinge indicators at unsupported nodes */}
      {!hasSupport && hasAnyHinge && allHinged && (
        /* All members hinged at unsupported node: one circle at center */
        <circle cx={node.x} cy={node.y} r={5}
          fill="#ffffff" stroke={STROKE} strokeWidth={1.5} />
      )}
      {!hasSupport && hasAnyHinge && !allHinged && (
        /* Unsupported node with only some members hinged: offset circles */
        hingedMembers.map(m => {
          const otherId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
          const other = allNodes ? allNodes.find(n => n.id === otherId) : null;
          let offsetX = 0, offsetY = 0;
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.001) {
              offsetX = (dx / dist) * 5;
              offsetY = (dy / dist) * 5;
            }
          }
          return (
            <circle key={m.id} cx={node.x + offsetX} cy={node.y + offsetY} r={4}
              fill="#ffffff" stroke={STROKE} strokeWidth={1.5} />
          );
        })
      )}

      {/* Invisible click target — always present at every node */}
      <circle cx={node.x} cy={node.y} r={15}
        fill="transparent" stroke="none"
        style={{ cursor: 'pointer' }} />
    </g>
  );
}
