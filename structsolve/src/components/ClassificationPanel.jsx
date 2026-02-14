import React from 'react';
import { FONTS } from '../constants/brand.js';

const rowStyle = {
  display: 'flex', justifyContent: 'space-between', padding: '4px 0',
  fontSize: 13, fontFamily: FONTS.mono,
};

export default function ClassificationPanel({ info }) {
  if (!info) return null;

  const { type, mf, mt, jf, jt, r, c, DOF, status } = info;

  // Build the formula string with numbers filled in
  const terms = [
    `3(${mf})`, `${mt}`, `${r}`, `3(${jf})`, `2(${jt})`, `${c}`,
  ];
  const expanded = [
    `${3 * mf}`, `${mt}`, `${r}`, `${3 * jf}`, `${2 * jt}`, `${c}`,
  ];
  const formulaLine = `DOF = ${terms[0]} + ${terms[1]} + ${terms[2]} \u2212 ${terms[3]} \u2212 ${terms[4]} \u2212 ${terms[5]}`;
  const expandedLine = `    = ${expanded[0]} + ${expanded[1]} + ${expanded[2]} \u2212 ${expanded[3]} \u2212 ${expanded[4]} \u2212 ${expanded[5]} = ${DOF}`;

  let conclusionColor, conclusionText;
  if (status === 'determinate') {
    conclusionColor = '#4ade80';
    conclusionText = 'Stable & Statically Determinate';
  } else if (status === 'indeterminate') {
    conclusionColor = '#fbbf24';
    conclusionText = `Stable & Statically Indeterminate\nDegree of Indeterminacy: ${DOF}`;
  } else {
    conclusionColor = '#ef4444';
    conclusionText = `Unstable Mechanism\nDOF = ${DOF}`;
  }

  return (
    <div style={{
      background: '#111827', borderRadius: 12, padding: 24,
      fontFamily: FONTS.mono, color: '#e5e5e5', flex: 1, minWidth: 280,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', color: '#fff' }}>
        Classification
      </h3>

      {/* Structure type */}
      <div style={rowStyle}>
        <span style={{ color: '#94a3b8' }}>Structure Type</span>
        <span style={{ fontWeight: 600 }}>{type}</span>
      </div>

      <div style={{ height: 1, background: '#1f2937', margin: '8px 0' }} />

      {/* Counts */}
      <div style={rowStyle}>
        <span style={{ color: '#94a3b8' }}>Frame members (m<sub>f</sub>)</span>
        <span style={{ fontWeight: 600 }}>{mf}</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: '#94a3b8' }}>Truss members (m<sub>t</sub>)</span>
        <span style={{ fontWeight: 600 }}>{mt}</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: '#94a3b8' }}>Frame joints (j<sub>f</sub>)</span>
        <span style={{ fontWeight: 600 }}>{jf}</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: '#94a3b8' }}>Truss-only joints (j<sub>t</sub>)</span>
        <span style={{ fontWeight: 600 }}>{jt}</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: '#94a3b8' }}>Reactions (r)</span>
        <span style={{ fontWeight: 600 }}>{r}</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: '#94a3b8' }}>Hinge conditions (c)</span>
        <span style={{ fontWeight: 600 }}>{c}</span>
      </div>

      <div style={{ height: 1, background: '#1f2937', margin: '12px 0' }} />

      {/* General formula */}
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>General Formula</div>
      <div style={{
        fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.6,
        background: '#0d1117', borderRadius: 8, padding: '10px 12px',
      }}>
        <div>DOF = 3&middot;m<sub>f</sub> + m<sub>t</sub> + r &minus; 3&middot;j<sub>f</sub> &minus; 2&middot;j<sub>t</sub> &minus; c</div>
        <div style={{ marginTop: 6, color: '#e5e5e5' }}>{formulaLine}</div>
        <div style={{ color: '#e5e5e5' }}>{expandedLine}</div>
      </div>

      {/* Conclusion */}
      <div style={{
        background: '#0d1117', borderRadius: 8, padding: '12px 16px',
        borderLeft: `3px solid ${conclusionColor}`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: conclusionColor, whiteSpace: 'pre-line' }}>
          {status === 'determinate' && '\u2705 '}{status === 'indeterminate' && '\u2705 '}{status === 'unstable' && '\u274C '}
          {conclusionText}
        </div>
        {status === 'unstable' && (
          <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6, opacity: 0.8 }}>
            This structure cannot be analyzed. Go back and add supports or members.
          </div>
        )}
      </div>
    </div>
  );
}
