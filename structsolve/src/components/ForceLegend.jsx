// ForceLegend.jsx — Color legend for FBD force types
import React from 'react';

const items = [
  { color: '#3b82f6', label: 'Reactions' },
  { color: '#ef4444', label: 'Applied Loads' },
  { color: '#f59e0b', label: 'Member Forces' },
  { color: '#8b5cf6', label: 'Equivalent (DL)' },
  { color: '#ec4899', label: 'Moments' },
  { color: '#6b7280', label: 'Dimensions' },
];

export default function ForceLegend() {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      padding: '8px 0',
      marginBottom: 8,
    }}>
      {items.map(item => (
        <div key={item.label} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <div style={{
            width: 12,
            height: 3,
            borderRadius: 1,
            background: item.color,
          }} />
          <span style={{
            fontSize: 10,
            color: '#9ca3af',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
