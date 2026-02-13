import React from 'react';
import { COLORS } from '../../constants/brand.js';

const SUPPORTS = [
  { key: null,       icon: '\u2715', label: 'None' },
  { key: 'pin',      icon: '\u25B3', label: 'Pin' },
  { key: 'roller-h', icon: '\u25CB', sub: 'H', label: 'Roller H' },
  { key: 'roller-v', icon: '\u25CB', sub: 'V', label: 'Roller V' },
  { key: 'fixed',    icon: '\u2593', label: 'Fixed' },
  { key: 'guide-h',  icon: '\u2550', sub: 'H', label: 'Guide H' },
  { key: 'guide-v',  icon: '\u2550', sub: 'V', label: 'Guide V' },
];

export default function SupportGrid({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 36px)', gap: 4 }}>
      {SUPPORTS.map(s => {
        const active = value === s.key;
        return (
          <button key={s.key || 'none'} title={s.label} onClick={() => onChange(s.key)}
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
        );
      })}
    </div>
  );
}
