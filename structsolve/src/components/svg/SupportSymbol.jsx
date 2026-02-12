import React from 'react';
import PinSymbol from './PinSymbol.jsx';
import RollerSymbol from './RollerSymbol.jsx';
import FixedSymbol from './FixedSymbol.jsx';
import GuideSymbol from './GuideSymbol.jsx';
import { computeSupportAngle } from '../../utils/geometry.js';

export default function SupportSymbol({ node, allNodes, members }) {
  if (!node.support) return null;

  const angle = computeSupportAngle(node, allNodes, members);

  switch (node.support) {
    case 'pin':
      return <PinSymbol x={node.x} y={node.y} angle={angle} />;
    case 'roller-h':
      return <RollerSymbol x={node.x} y={node.y} angle={angle} orientation="floor" />;
    case 'roller-v':
      return <RollerSymbol x={node.x} y={node.y} angle={angle} orientation="wall" />;
    case 'fixed':
      return <FixedSymbol x={node.x} y={node.y} angle={angle} />;
    case 'guide-h':
      return <GuideSymbol x={node.x} y={node.y} angle={angle} orientation="floor" />;
    case 'guide-v':
      return <GuideSymbol x={node.x} y={node.y} angle={angle} orientation="wall" />;
    default:
      return null;
  }
}
