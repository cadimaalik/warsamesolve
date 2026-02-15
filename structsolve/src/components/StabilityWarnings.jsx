// StabilityWarnings.jsx — Warning Display Component
import React from 'react';
import { FONTS } from '../constants/brand.js';

export default function StabilityWarnings({ warnings }) {
  return (
    <div>
      {warnings.map((w, i) => {
        const isError = w.severity === 'error';
        const bgColor = isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)';
        const borderColor = isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.3)';
        const icon = isError ? '❌' : '⚠️';

        return (
          <div key={i} style={{
            display: 'flex',
            gap: 12,
            padding: 16,
            borderRadius: 8,
            marginBottom: 12,
            background: bgColor,
            border: `1px solid ${borderColor}`,
          }}>
            <div style={{ fontSize: 20 }}>
              {icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 600,
                fontSize: 14,
                color: '#e5e5e5',
                fontFamily: FONTS.mono,
                marginBottom: 4,
              }}>
                {w.message}
              </div>
              {w.detail && (
                <div style={{
                  color: '#9ca3af',
                  fontSize: 13,
                  fontFamily: FONTS.mono,
                  lineHeight: 1.5,
                }}>
                  {w.detail}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
