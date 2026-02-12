// Support type definitions
// Internal value → display label, reactions blocked, reaction count
export const SUPPORT_TYPES = {
  pin:       { label: 'Pin',               reactions: 'Rx, Ry',    count: 2 },
  'roller-h':{ label: 'Horizontal Roller', reactions: 'Ry',        count: 1 },
  'roller-v':{ label: 'Vertical Roller',   reactions: 'Rx',        count: 1 },
  fixed:     { label: 'Fixed',             reactions: 'Rx, Ry, M', count: 3 },
  'guide-h': { label: 'Horizontal Guide',  reactions: 'Ry, M',     count: 2 },
  'guide-v': { label: 'Vertical Guide',    reactions: 'Rx, M',     count: 2 },
};

// Orientation for roller/guide symbols:
// roller-h / guide-h: moves horizontally → "floor" orientation (vertical rails, ground below)
// roller-v / guide-v: moves vertically   → "wall" orientation (horizontal rails, wall on side)
export function getOrientation(supportType) {
  if (supportType === 'roller-h' || supportType === 'guide-h') return 'floor';
  if (supportType === 'roller-v' || supportType === 'guide-v') return 'wall';
  return null;
}

export function supportReactions(supportType) {
  return SUPPORT_TYPES[supportType]?.count || 0;
}
