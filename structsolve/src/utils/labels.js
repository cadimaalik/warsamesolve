/**
 * Smart label positioning — avoids members, supports, and load arrows.
 * Returns { dx, dy } offset from node center.
 */
export function computeLabelOffset(node, allNodes, members) {
  const occupied = new Set();

  members.forEach(m => {
    if (m.startNodeId !== node.id && m.endNodeId !== node.id) return;
    const otherId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
    const other = allNodes.find(n => n.id === otherId);
    if (!other) return;
    const dx = other.x - node.x;
    const dy = other.y - node.y;
    if (dx >= 0 && dy <= 0) occupied.add('top-right');
    if (dx <= 0 && dy <= 0) occupied.add('top-left');
    if (dx >= 0 && dy >= 0) occupied.add('bottom-right');
    if (dx <= 0 && dy >= 0) occupied.add('bottom-left');
  });

  // Support faces down → avoid bottom
  if (node.support) {
    occupied.add('bottom-left');
    occupied.add('bottom-right');
  }

  const OFFSETS = {
    'top-left':     { dx: -18, dy: -12 },
    'top-right':    { dx: 12,  dy: -12 },
    'bottom-right': { dx: 12,  dy: 22 },
    'bottom-left':  { dx: -18, dy: 22 },
  };

  const preference = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  for (const q of preference) {
    if (!occupied.has(q)) return OFFSETS[q];
  }
  return OFFSETS['top-left'];
}
