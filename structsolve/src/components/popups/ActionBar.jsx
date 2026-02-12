import React from 'react';
import { COLORS } from '../../constants/brand.js';

const btnStyle = {
  padding: '8px 12px', borderRadius: 6, border: `1px solid ${COLORS.borderLight}`,
  background: 'transparent', color: COLORS.textPrimary, fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
  transition: 'background 0.15s',
};

export default function ActionBar({ nodeId, onAction }) {
  const actions = [
    { key: 'compass', icon: '+', label: 'Add Member' },
    { key: 'support', icon: '\u25B3', label: 'Support' },
    { key: 'load',    icon: '\u2193', label: 'Load' },
    { key: 'hinge',   icon: '\u25CB', label: 'Toggle Hinge' },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 8, fontWeight: 600 }}>
        Node {nodeId}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {actions.map(a => (
          <button key={a.key} style={btnStyle}
            onMouseOver={e => e.target.style.background = COLORS.greenGlow}
            onMouseOut={e => e.target.style.background = 'transparent'}
            onClick={() => onAction(a.key)}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
