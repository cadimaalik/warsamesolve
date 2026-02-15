// ResultsSummary.jsx — Summary Card at Top of Solution Page
import React from 'react';
import { FONTS } from '../constants/brand.js';

function roundDisplay(value, decimals = 3) {
  const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return parseFloat(rounded.toFixed(decimals)).toString();
}

export default function ResultsSummary({ results }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 12,
    }}>
      {results.reactions.map((r, i) => {
        const label = r.type === 'M'
          ? `M_${r.label}`
          : `R_${r.label}${r.type === 'Rx' ? 'x' : 'y'}`;

        const unit = r.type === 'M' ? 'kN·m' : 'kN';

        const direction = r.type === 'Rx' ? (r.value >= 0 ? '→' : '←')
          : r.type === 'Ry' ? (r.value >= 0 ? '↑' : '↓')
          : r.type === 'M' ? (r.value >= 0 ? '↺ CCW' : '↻ CW')
          : '';

        return (
          <div key={i} style={{
            background: '#1f1f1f',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center',
          }}>
            <div style={{
              color: '#9ca3af',
              fontSize: 12,
              marginBottom: 4,
              fontFamily: FONTS.mono,
            }}>
              {label}
            </div>
            <div style={{
              color: '#4ade80',
              fontSize: 20,
              fontWeight: 700,
              fontFamily: FONTS.mono,
            }}>
              {roundDisplay(r.value)}
            </div>
            <div style={{
              color: '#6b7280',
              fontSize: 11,
              marginTop: 4,
              fontFamily: FONTS.mono,
            }}>
              {unit} {direction}
            </div>
          </div>
        );
      })}
    </div>
  );
}
