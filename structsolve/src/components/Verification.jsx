// Verification.jsx — Verification Component with LaTeX
import React from 'react';
import { FONTS } from '../constants/brand.js';

function roundDisplay(value, decimals = 3) {
  const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return parseFloat(rounded.toFixed(decimals)).toString();
}

export default function Verification({ results }) {
  const { reactions, knownForces, momentPoint, verification } = results;

  // Build LaTeX showing each equation check
  const lines = [];

  // ΣFx check
  let sumFx = 0;
  const fxTerms = [];
  for (const r of reactions) {
    if (r.type === 'Rx') {
      sumFx += r.value;
      fxTerms.push(roundDisplay(r.value));
    }
  }
  for (const f of knownForces) {
    if (Math.abs(f.fx) > 1e-10) {
      sumFx += f.fx;
      fxTerms.push(roundDisplay(f.fx));
    }
  }
  const fxCheck = Math.abs(sumFx) < 0.01;
  if (fxTerms.length > 0) {
    lines.push(
      `\\sum F_x = ${fxTerms.join(' + ')} = ${roundDisplay(sumFx)} ${fxCheck ? '\\approx 0 \\; \\checkmark' : '\\neq 0 \\; \\times'}`
    );
  }

  // ΣFy check
  let sumFy = 0;
  const fyTerms = [];
  for (const r of reactions) {
    if (r.type === 'Ry') {
      sumFy += r.value;
      fyTerms.push(roundDisplay(r.value));
    }
  }
  for (const f of knownForces) {
    if (Math.abs(f.fy) > 1e-10) {
      sumFy += f.fy;
      fyTerms.push(roundDisplay(f.fy));
    }
  }
  const fyCheck = Math.abs(sumFy) < 0.01;
  if (fyTerms.length > 0) {
    lines.push(
      `\\sum F_y = ${fyTerms.join(' + ')} = ${roundDisplay(sumFy)} ${fyCheck ? '\\approx 0 \\; \\checkmark' : '\\neq 0 \\; \\times'}`
    );
  }

  // ΣM check (if we have a moment point)
  if (momentPoint) {
    let sumM = 0;
    const mTerms = [];
    for (const r of reactions) {
      const node = r.node;
      const dx = node.x - momentPoint.x;
      const dy = node.y - momentPoint.y;
      let moment = 0;
      if (r.type === 'Rx') moment = -dy * r.value;
      else if (r.type === 'Ry') moment = dx * r.value;
      else if (r.type === 'M') moment = r.value;
      sumM += moment;
      if (Math.abs(moment) > 1e-10) mTerms.push(roundDisplay(moment));
    }
    for (const f of knownForces) {
      const dx = f.x - momentPoint.x;
      const dy = f.y - momentPoint.y;
      const moment = dx * f.fy - dy * f.fx + (f.m || 0);
      sumM += moment;
      if (Math.abs(moment) > 1e-10) mTerms.push(roundDisplay(moment));
    }
    const mCheck = Math.abs(sumM) < 0.01;
    if (mTerms.length > 0) {
      lines.push(
        `\\sum M_{${momentPoint.label}} = ${mTerms.join(' + ')} = ${roundDisplay(sumM)} ${mCheck ? '\\approx 0 \\; \\checkmark' : '\\neq 0 \\; \\times'}`
      );
    }
  }

  const allPass = verification ? verification.every(v => v.pass) : (fxCheck && fyCheck);

  return (
    <div>
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #2a2a3e',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        overflowX: 'hidden',
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 14, color: '#e5e5e5' }}>
          {'\\[\\begin{gathered}' + lines.join(' \\\\ ') + '\\end{gathered}\\]'}
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderRadius: 8,
        fontWeight: 600,
        textAlign: 'center',
        fontFamily: FONTS.mono,
        background: allPass ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: allPass ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
        color: allPass ? '#4ade80' : '#ef4444',
      }}>
        {allPass
          ? '✅ All equilibrium equations satisfied. Solution is verified.'
          : '❌ Verification failed. Check the solution for errors.'}
      </div>
    </div>
  );
}
