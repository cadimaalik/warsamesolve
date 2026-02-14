import React from 'react';
import { COLORS } from '../../constants/brand.js';

const options = [
  { key: null,       icon: '\u2715', label: 'None',              sub: '' },
  { key: 'pin',      icon: '\u25B3', label: 'Pin',               sub: 'Rx, Ry' },
  { key: 'roller-h', icon: '\u25CB\u2500', label: 'Roller (horizontal)',  sub: 'Ry' },
  { key: 'roller-v', icon: '\u25CB\u2502', label: 'Roller (vertical)',  sub: 'Rx' },
  { key: 'fixed',    icon: '\u2593', label: 'Fixed',                  sub: 'Rx, Ry, M' },
  { key: 'guide-h',  icon: '\u2550\u2500', label: 'Guide (horizontal)',   sub: 'Ry, M' },
  { key: 'guide-v',  icon: '\u2550\u2502', label: 'Guide (vertical)',   sub: 'Rx, M' },
];

export default function SupportPicker({ nodeId, currentSupport, onSelect, onClose }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 8, fontWeight: 600 }}>
        Support at {nodeId}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {options.map(opt => {
          const active = currentSupport === opt.key;
          return (
            <button key={opt.key || 'none'}
              onClick={() => { onSelect(opt.key); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 6,
                border: active ? `1.5px solid ${COLORS.green}` : `1px solid ${COLORS.borderLight}`,
                background: active ? COLORS.greenGlow : 'transparent',
                color: COLORS.textPrimary, fontSize: 12, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                transition: 'all 0.15s', width: '100%', textAlign: 'left',
              }}
              onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 22, textAlign: 'center', fontSize: 14 }}>{opt.icon}</span>
              <span style={{ flex: 1 }}>{opt.label}</span>
              {opt.sub && (
                <span style={{ fontSize: 10, color: COLORS.textDim }}>({opt.sub})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
