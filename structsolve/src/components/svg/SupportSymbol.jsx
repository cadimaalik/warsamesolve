import React from 'react';
import PinSymbol from './PinSymbol.jsx';
import RollerSymbol from './RollerSymbol.jsx';
import FixedSymbol from './FixedSymbol.jsx';
import GuideSymbol from './GuideSymbol.jsx';
import { computeSupportAngle } from '../../utils/geometry.js';

/**
 * Constrain angle for rollers/guides so their surface orientation is preserved.
 * Floor (horizontal surface) → only 0° or 180°
 * Wall  (vertical surface)   → only 0° or 180°
 * 90°/-90° rotations would flip the surface direction, which is wrong.
 */
function constrainAngle(computedAngle, orientation) {
  if (orientation === 'floor') {
    // Keep horizontal surface horizontal: only flip vertically
    return computedAngle === 180 ? 180 : 0;
  }
  if (orientation === 'wall') {
    // Keep vertical surface vertical: wall on left or right side
    // Members go right (90) or down (180) → wall on left → 180
    // Members go left (-90) or up (0) → wall on right → 0
    if (computedAngle === 90 || computedAngle === 180) return 180;
    return 0;
  }
  return computedAngle;
}

export default function SupportSymbol({ node, allNodes, members }) {
  if (!node.support) return null;

  const angle = computeSupportAngle(node, allNodes, members);

  switch (node.support) {
    case 'pin':
      return <PinSymbol x={node.x} y={node.y} angle={angle} />;
    case 'roller-h':
      return <RollerSymbol x={node.x} y={node.y} angle={constrainAngle(angle, 'floor')} orientation="floor" />;
    case 'roller-v':
      return <RollerSymbol x={node.x} y={node.y} angle={constrainAngle(angle, 'wall')} orientation="wall" />;
    case 'fixed':
      return <FixedSymbol x={node.x} y={node.y} angle={angle} />;
    case 'guide-h':
      return <GuideSymbol x={node.x} y={node.y} angle={constrainAngle(angle, 'floor')} orientation="floor" />;
    case 'guide-v':
      return <GuideSymbol x={node.x} y={node.y} angle={constrainAngle(angle, 'wall')} orientation="wall" />;
    default:
      return null;
  }
}
