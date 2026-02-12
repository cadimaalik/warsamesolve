export const DIRECTIONS = {
  N:  { dx: 0,  dy: -1, label: '↑' },
  NE: { dx: 1,  dy: -1, label: '↗' },
  E:  { dx: 1,  dy: 0,  label: '→' },
  SE: { dx: 1,  dy: 1,  label: '↘' },
  S:  { dx: 0,  dy: 1,  label: '↓' },
  SW: { dx: -1, dy: 1,  label: '↙' },
  W:  { dx: -1, dy: 0,  label: '←' },
  NW: { dx: -1, dy: -1, label: '↖' },
};

// Pixel spacing when growing a new member
export const MEMBER_SPACING = 200;

// For compass popup layout (CSS positions)
export const COMPASS_POSITIONS = {
  N:  { top: '0%',  left: '50%' },
  NE: { top: '10%', left: '85%' },
  E:  { top: '50%', left: '100%' },
  SE: { top: '85%', left: '85%' },
  S:  { top: '100%',left: '50%' },
  SW: { top: '85%', left: '15%' },
  W:  { top: '50%', left: '0%' },
  NW: { top: '10%', left: '15%' },
};
