import React, { useState } from 'react';
import { COLORS } from '../../constants/brand.js';

const ALL_SUPPORTS = [
  { key: null,       icon: '\u2715', label: 'None' },
  { key: 'pin',      icon: '\u25B3', label: 'Pin' },
  { key: 'roller-h', icon: '\u25CB', sub: 'H', label: 'Roller (horizontal surface)' },
  { key: 'roller-v', icon: '\u25CB', sub: 'V', label: 'Roller (vertical surface)' },
  { key: 'fixed',    icon: '\u2593', label: 'Fixed' },
  { key: 'guide-h',  icon: '\u2550', sub: 'H', label: 'Guide (horizontal guide)' },
  { key: 'guide-v',  icon: '\u2550', sub: 'V', label: 'Guide (vertical guide)' },
];

// Truss members cannot use supports that resist moment
const TRUSS_ALLOWED = [null, 'pin', 'roller-h', 'roller-v'];

function SupportButton({ s, active, onChange }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => onChange(s.key)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 36, height: 36, borderRadius: 4, cursor: 'pointer',
          border: active ? `2px solid ${COLORS.green}` : `1px solid ${COLORS.borderLight}`,
          background: active ? COLORS.greenGlow : 'transparent',
          color: COLORS.textPrimary, fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.12s', padding: 0, lineHeight: 1,
        }}
      >
        <span>{s.icon}</span>
        {s.sub && <span style={{ fontSize: 7, color: COLORS.textDim, marginTop: -1 }}>{s.sub}</span>}
      </button>
      {hover && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          marginTop: 4, background: '#1e1e1e', color: '#e5e5e5', fontSize: 10,
          padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 200,
          pointerEvents: 'none',
        }}>
          {s.label}
        </div>
      )}
    </div>
  );
}

export default function SupportGrid({ value, onChange, trussMode = false }) {
  const supports = trussMode
    ? ALL_SUPPORTS.filter(s => TRUSS_ALLOWED.includes(s.key))
    : ALL_SUPPORTS;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 36px)', gap: 4 }}>
      {supports.map(s => (
        <SupportButton key={s.key || 'none'} s={s} active={value === s.key} onChange={onChange} />
      ))}
    </div>
  );
}
