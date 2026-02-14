import React from 'react';
import { COLORS } from '../../constants/brand.js';

const btnStyle = {
  padding: '8px 12px', borderRadius: 6, border: `1px solid ${COLORS.borderLight}`,
  background: 'transparent', color: COLORS.textPrimary, fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
  transition: 'background 0.15s',
};

const deleteBtn = {
  ...btnStyle,
  border: '1px solid #7f1d1d',
  color: '#f87171',
};

export default function MemberActionBar({ memberLabel, onAction }) {
  const actions = [
    { key: 'properties', icon: '\u{1F4D0}', label: 'Member Properties' },
    { key: 'point-load', icon: '\u{1F4CF}', label: 'Point Load' },
    { key: 'distributed-load', icon: '\u{1F4CA}', label: 'Distributed Load' },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 8, fontWeight: 600 }}>
        Member {memberLabel}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {actions.map(a => (
          <button key={a.key} style={btnStyle}
            onMouseOver={e => e.currentTarget.style.background = COLORS.greenGlow}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => onAction(a.key)}
          >
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
        <button style={deleteBtn}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(220,38,38,0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          onClick={() => onAction('delete')}
        >
          <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{'\u{1F5D1}'}</span>
          Delete Member
        </button>
      </div>
    </div>
  );
}
