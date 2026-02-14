import React, { useState } from 'react';
import { FONTS } from '../constants/brand.js';

export default function MethodCard({ title, description, bullets, active, comingSoon, onLaunch, disabledReason }) {
  const [hover, setHover] = useState(false);
  const isClickable = active && !comingSoon && !disabledReason;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#171717',
        border: `1px solid ${isClickable && hover ? '#4ade80' : '#2a2a2a'}`,
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        transform: isClickable && hover ? 'translateY(-4px)' : 'none',
        boxShadow: isClickable && hover ? '0 8px 30px rgba(74, 222, 128, 0.15)' : 'none',
        opacity: comingSoon ? 0.6 : 1,
        pointerEvents: comingSoon ? 'none' : 'auto',
      }}
    >
      <h3 style={{
        fontSize: 16, fontWeight: 700, color: '#e5e5e5', margin: '0 0 8px 0',
        fontFamily: FONTS.mono,
      }}>
        {title}
      </h3>

      <p style={{
        fontSize: 12, color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.5,
        fontFamily: FONTS.mono,
      }}>
        {description}
      </p>

      <ul style={{
        listStyle: 'none', padding: 0, margin: '0 0 16px 0', flex: 1,
      }}>
        {bullets.map((b, i) => (
          <li key={i} style={{
            fontSize: 11, color: '#64748b', padding: '2px 0',
            fontFamily: FONTS.mono,
          }}>
            &bull; {b}
          </li>
        ))}
      </ul>

      {disabledReason && !comingSoon ? (
        <button disabled style={{
          background: '#374151', color: '#6b7280', border: 'none',
          padding: '10px 20px', borderRadius: 8, width: '100%',
          cursor: 'not-allowed', fontFamily: FONTS.mono, fontSize: 12,
        }}>
          {disabledReason}
        </button>
      ) : comingSoon ? (
        <button disabled style={{
          background: '#374151', color: '#6b7280', border: 'none',
          padding: '10px 20px', borderRadius: 8, width: '100%',
          cursor: 'not-allowed', fontFamily: FONTS.mono, fontSize: 12,
        }}>
          Coming Soon
        </button>
      ) : (
        <button onClick={onLaunch} style={{
          background: '#059669', color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: 8, width: '100%',
          cursor: 'pointer', fontFamily: FONTS.mono, fontSize: 12,
          fontWeight: 600, transition: 'background 0.15s',
        }}
          onMouseOver={e => e.currentTarget.style.background = '#047857'}
          onMouseOut={e => e.currentTarget.style.background = '#059669'}
        >
          Launch &rarr;
        </button>
      )}
    </div>
  );
}
