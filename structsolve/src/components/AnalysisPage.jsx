import React, { useRef, useEffect } from 'react';
import { COLORS, FONTS } from '../constants/brand.js';
import { classify } from '../utils/analysis.js';
import { getMemberLength } from '../utils/geometry.js';
import usePanZoom from '../hooks/usePanZoom.js';
import Canvas from './Canvas.jsx';
import ClassificationPanel from './ClassificationPanel.jsx';
import MethodCard from './MethodCard.jsx';

const emptyUI = {
  activeNodeId: null, activeMemberId: null, activePopup: null,
  connectMode: false, connectFromId: null,
};

export default function AnalysisPage({ nodes, members, onEdit, onLaunchMethod }) {
  const svgRef = useRef(null);
  const { viewBox, svgProps, fitToNodes } = usePanZoom();

  useEffect(() => {
    if (nodes.length > 0) fitToNodes(nodes);
  }, []);

  const info = classify(nodes, members);
  const isDeterminate = info.status === 'determinate';

  const methods = [
    {
      title: 'Support Reactions & Truss Forces',
      description: 'For statically determinate structures (DOF = 0)',
      bullets: ['Equilibrium equations', 'Reaction forces at all supports', 'Truss member forces (T/C)'],
      active: isDeterminate,
      comingSoon: false,
      disabledReason: !isDeterminate ? 'Only for DOF = 0' : null,
    },
    {
      title: 'Moment Equation Method',
      description: 'For statically determinate structures (DOF = 0)',
      bullets: ['N, V, M diagrams', 'Free body diagrams', 'Deflected shape', 'Displacements'],
      active: false,
      comingSoon: true,
    },
    {
      title: 'Slope Deflection Method (SDM)',
      description: 'For indeterminate frames & beams',
      bullets: ['Simultaneous equations', 'Joint rotations & translations'],
      active: false,
      comingSoon: true,
    },
    {
      title: 'Moment Distribution Method (MDM)',
      description: 'For indeterminate frames & beams',
      bullets: ['Iterative', 'Distribution factors', 'Carry-over factors'],
      active: false,
      comingSoon: true,
    },
    {
      title: 'General Stiffness Method (GSM)',
      description: 'For any structure',
      bullets: ['Matrix assembly', 'DOF-based formulation'],
      active: false,
      comingSoon: true,
    },
    {
      title: 'Direct Stiffness Method (DSM)',
      description: 'For any structure',
      bullets: ['Element stiffness', 'Global assembly', 'Band matrix solver'],
      active: false,
      comingSoon: true,
    },
  ];

  return (
    <div style={{
      flex: 1, overflowY: 'auto', background: '#0a0a0a',
      fontFamily: FONTS.mono,
    }}>
      {/* TOP SECTION: Canvas + Classification */}
      <div style={{
        display: 'flex', gap: 24, padding: '24px 32px',
        flexWrap: 'wrap',
      }}>
        {/* Canvas preview */}
        <div style={{
          flex: '1 1 55%', minWidth: 320, maxHeight: 350,
          position: 'relative', background: COLORS.canvasBg,
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid #2a2a2a',
        }}>
          <svg
            ref={svgRef}
            width="100%" height="350"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            style={{ display: 'block', background: COLORS.canvasBg, pointerEvents: 'none' }}
          >
            <defs>
              <pattern id="grid-analysis" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={COLORS.gridLine} strokeWidth="1" />
              </pattern>
            </defs>
            <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h}
              width={viewBox.w * 3} height={viewBox.h * 3}
              fill={COLORS.canvasBg} />
            <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h}
              width={viewBox.w * 3} height={viewBox.h * 3}
              fill="url(#grid-analysis)" />

            {/* Render structure read-only — reuse Canvas internals inline */}
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

          {/* Edit button */}
          <button onClick={onEdit} style={{
            position: 'absolute', bottom: 12, left: 12,
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: '#059669', color: '#fff', fontSize: 12,
            fontFamily: FONTS.mono, fontWeight: 600, cursor: 'pointer',
          }}>
            Edit
          </button>
        </div>

        {/* Classification panel */}
        <div style={{ flex: '1 1 40%', minWidth: 280 }}>
          <ClassificationPanel info={info} />
        </div>
      </div>

      {/* BOTTOM SECTION: Method Cards */}
      <div style={{ padding: '0 32px 32px' }}>
        <h2 style={{
          fontSize: 18, fontWeight: 700, color: '#e5e5e5', margin: '0 0 20px 0',
          fontFamily: FONTS.mono,
        }}>
          Analysis Methods
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {methods.map((m, i) => (
            <MethodCard
              key={i}
              title={m.title}
              description={m.description}
              bullets={m.bullets}
              active={m.active}
              comingSoon={m.comingSoon}
              disabledReason={m.disabledReason}
              onLaunch={() => onLaunchMethod && onLaunchMethod(m.title)}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center', marginTop: 32, padding: '16px 0',
          fontSize: 11, color: '#4b5563', fontFamily: FONTS.mono,
          borderTop: '1px solid #1f2937',
        }}>
          StructSOLVE &bull; METU CE 383 Structural Analysis
        </div>
      </div>
    </div>
  );
}
