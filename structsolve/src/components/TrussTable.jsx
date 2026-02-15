// TrussTable.jsx — Table of Truss Member Forces
import React from 'react';
import { FONTS } from '../constants/brand.js';

export default function TrussTable({ forces }) {
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: FONTS.mono,
      fontSize: 13,
    }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #4ade80' }}>
          <th style={{
            textAlign: 'left',
            padding: '12px 16px',
            color: '#4ade80',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            Member
          </th>
          <th style={{
            textAlign: 'right',
            padding: '12px 16px',
            color: '#4ade80',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            Force (kN)
          </th>
          <th style={{
            textAlign: 'left',
            padding: '12px 16px',
            color: '#4ade80',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            Type
          </th>
        </tr>
      </thead>
      <tbody>
        {forces.map((tf, i) => {
          const isTension = tf.classification.includes('Tension');
          const isCompression = tf.classification.includes('Compression');
          const isZero = tf.classification.includes('Zero');

          const typeColor = isZero ? '#6b7280'
            : isTension ? '#3b82f6'
            : isCompression ? '#ef4444'
            : '#6b7280';

          return (
            <tr key={i} style={{ borderBottom: '1px solid #2a2a2a' }}>
              <td style={{ padding: '12px 16px', color: '#e5e5e5' }}>
                {tf.startLabel}→{tf.endLabel}
              </td>
              <td style={{ textAlign: 'right', padding: '12px 16px', color: '#4ade80', fontWeight: 600 }}>
                {Math.abs(tf.force).toFixed(3)}
              </td>
              <td style={{ padding: '12px 16px', color: typeColor, fontWeight: 700 }}>
                {tf.classification}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
