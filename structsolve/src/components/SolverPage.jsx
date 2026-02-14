import React, { useRef, useEffect } from 'react';
import { COLORS, FONTS } from '../constants/brand.js';
import usePanZoom from '../hooks/usePanZoom.js';

export default function SolverPage({ nodes, members, methodName, onBack, onEdit }) {
  const svgRef = useRef(null);
  const { viewBox, fitToNodes } = usePanZoom();

  useEffect(() => {
    if (nodes.length > 0) fitToNodes(nodes);
  }, []);

  return (
    <div style={{
      flex: 1, overflowY: 'auto', background: '#0a0a0a',
      fontFamily: FONTS.mono,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 32px', borderBottom: '1px solid #1f2937',
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#4ade80',
          fontSize: 13, fontFamily: FONTS.mono, cursor: 'pointer',
          fontWeight: 600,
        }}>
          &larr; Back to Methods
        </button>
        <span style={{ fontSize: 14, color: '#e5e5e5', fontWeight: 700 }}>
          <span style={{ color: '#fff' }}>Struct</span>
          <span style={{ color: '#4ade80' }}>SOLVE</span>
        </span>
      </div>

      {/* Canvas */}
      <div style={{
        margin: '24px 32px', position: 'relative',
        background: COLORS.canvasBg, borderRadius: 12, overflow: 'hidden',
        border: '1px solid #2a2a2a',
      }}>
        <svg
          ref={svgRef}
          width="100%" height="300"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          style={{ display: 'block', background: COLORS.canvasBg, pointerEvents: 'none' }}
        >
          <defs>
            <pattern id="grid-solver" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={COLORS.gridLine} strokeWidth="1" />
            </pattern>
          </defs>
          <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h}
            width={viewBox.w * 3} height={viewBox.h * 3}
            fill={COLORS.canvasBg} />
          <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h}
            width={viewBox.w * 3} height={viewBox.h * 3}
            fill="url(#grid-solver)" />

          {members.map(m => {
            const sn = nodes.find(n => n.id === m.startNodeId);
            const en = nodes.find(n => n.id === m.endNodeId);
            if (!sn || !en) return null;
            const isTruss = m.type === 'truss';
            return (
              <line key={m.id} x1={sn.x} y1={sn.y} x2={en.x} y2={en.y}
                stroke={isTruss ? COLORS.memberTruss : COLORS.memberFrame}
                strokeWidth={isTruss ? 2.5 : 3.5}
                strokeDasharray={isTruss ? '6 4' : 'none'}
              />
            );
          })}
          {nodes.map(n => (
            <circle key={n.id} cx={n.x} cy={n.y} r={4}
              fill={COLORS.nodeFill} stroke={COLORS.nodeStroke} strokeWidth={1.5} />
          ))}
        </svg>

        <button onClick={onEdit} style={{
          position: 'absolute', bottom: 12, left: 12,
          padding: '6px 14px', borderRadius: 6, border: 'none',
          background: '#059669', color: '#fff', fontSize: 12,
          fontFamily: FONTS.mono, fontWeight: 600, cursor: 'pointer',
        }}>
          Edit
        </button>
      </div>

      {/* Solution placeholder */}
      <div style={{
        margin: '0 32px 32px', padding: '40px 24px',
        background: '#111827', borderRadius: 12,
        textAlign: 'center', border: '1px solid #1f2937',
      }}>
        <h2 style={{
          fontSize: 16, fontWeight: 700, color: '#e5e5e5', margin: '0 0 8px 0',
        }}>
          SOLUTION &mdash; {methodName}
        </h2>

        <div style={{
          fontSize: 32, margin: '24px 0 16px',
        }}>
          &#128679;
        </div>

        <div style={{
          fontSize: 14, color: '#fbbf24', fontWeight: 600, marginBottom: 12,
        }}>
          Solver Coming in Prompt #16
        </div>

        <div style={{
          fontSize: 12, color: '#94a3b8', lineHeight: 1.8, maxWidth: 400,
          margin: '0 auto', textAlign: 'left',
        }}>
          This section will contain:<br />
          &bull; Step-by-step equilibrium equations (LaTeX)<br />
          &bull; Free body diagrams for determining reactions<br />
          &bull; All support reaction forces<br />
          &bull; Truss member internal forces (Tension/Compression)
        </div>
      </div>
    </div>
  );
}
