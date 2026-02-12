import React from 'react';
import { computeLabelOffset } from '../../utils/labels.js';

export default function NodeLabel({ node, allNodes, members }) {
  const { dx, dy } = computeLabelOffset(node, allNodes, members);

  return (
    <text
      x={node.x + dx}
      y={node.y + dy}
      fontSize={13}
      fontWeight={600}
      fontFamily="'JetBrains Mono', monospace"
      fill="#1a1f2b"
      textAnchor="middle"
    >
      {node.id}
    </text>
  );
}
