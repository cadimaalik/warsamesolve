import React from 'react';
import { COLORS } from '../../constants/brand.js';
import { DIRECTIONS } from '../../constants/directions.js';

const DIR_KEYS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Positions for each direction button in a circle layout
const positions = {
  N:  { top: 4, left: 72 },
  NE: { top: 16, left: 124 },
  E:  { top: 64, left: 140 },
  SE: { top: 112, left: 124 },
  S:  { top: 128, left: 72 },
  SW: { top: 112, left: 20 },
  W:  { top: 64, left: 4 },
  NW: { top: 16, left: 20 },
};

export default function CompassPicker({ nodeId, existingNodes, onSelectDirection, onConnect, onClose }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 8, fontWeight: 600 }}>
        Grow from {nodeId}
      </div>

      {/* Compass circle */}
      <div style={{ position: 'relative', width: 168, height: 158, margin: '0 auto' }}>
        {/* Center dot */}
        <div style={{
          position: 'absolute', top: 72, left: 80, width: 8, height: 8,
          borderRadius: '50%', background: COLORS.textDim,
        }} />

        {DIR_KEYS.map(dir => (
          <button key={dir}
            onClick={() => onSelectDirection(dir)}
            style={{
              position: 'absolute',
              top: positions[dir].top,
              left: positions[dir].left,
              width: 28, height: 28, borderRadius: '50%',
              border: `1.5px solid ${COLORS.borderLight}`,
              background: COLORS.bgInput, color: COLORS.textPrimary,
              fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'all 0.15s',
            }}
            onMouseOver={e => {
              e.target.style.background = COLORS.greenDark;
              e.target.style.borderColor = COLORS.green;
            }}
            onMouseOut={e => {
              e.target.style.background = COLORS.bgInput;
              e.target.style.borderColor = COLORS.borderLight;
            }}
          >
            {DIRECTIONS[dir].label}
          </button>
        ))}
      </div>

      {/* Connect to existing node button */}
      {existingNodes.length > 1 && (
        <button
          onClick={onConnect}
          style={{
            marginTop: 10, width: '100%', padding: '8px 12px',
            borderRadius: 6, border: `1px solid ${COLORS.green}`,
            background: COLORS.greenGlow, color: COLORS.green,
            fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          Connect to existing node...
        </button>
      )}

      <button onClick={onClose} style={{
        marginTop: 6, width: '100%', padding: '6px',
        borderRadius: 6, border: 'none', background: 'transparent',
        color: COLORS.textDim, fontSize: 11, cursor: 'pointer',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        Cancel
      </button>
    </div>
  );
}
