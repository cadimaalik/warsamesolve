import React, { useRef, useEffect, useState } from 'react';
import { COLORS, FONTS } from '../constants/brand.js';
import { classify } from '../utils/analysis.js';
import { getMemberLength } from '../utils/geometry.js';
import usePanZoom from '../hooks/usePanZoom.js';
import SupportSymbol from './svg/SupportSymbol.jsx';
import NodeDot from './svg/NodeDot.jsx';
import NodeLabel from './svg/NodeLabel.jsx';
import MemberLine from './svg/MemberLine.jsx';
import DimensionLine from './svg/DimensionLine.jsx';
import LoadArrows from './svg/LoadArrows.jsx';
import MomentArc from './svg/MomentArc.jsx';
import DistributedLoadArrows from './svg/DistributedLoadArrows.jsx';
import ClassificationPanel from './ClassificationPanel.jsx';
import { solveReactions } from '../solver/index.js';

const noop = () => {};

const emptyUI = {
  activeNodeId: null, activeMemberId: null, activePopup: null,
  connectMode: false, connectFromId: null,
};

export default function AnalysisPage({ nodes, members, structure, onEdit, onLaunchMethod }) {
  const svgRef = useRef(null);
  const { viewBox, fitToNodes } = usePanZoom();
  const [solverError, setSolverError] = useState(null);

  useEffect(() => {
    if (nodes.length > 0) fitToNodes(nodes);
  }, []);

  // Clear solver error after 4 seconds
  useEffect(() => {
    if (solverError) {
      const t = setTimeout(() => setSolverError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [solverError]);

  const info = classify(nodes, members);
  const isDeterminate = info.status === 'determinate';

  const handleLaunch = (methodName) => {
    // Run the solver
    const results = solveReactions(structure);

    if (results.success) {
      console.log('=== SOLVER RESULTS ===', results);
      onLaunchMethod(methodName, results);
    } else {
      setSolverError(results.error);
      console.error('Solver failed:', results.error);
    }
  };

  const methods = [
    {
      title: 'Support Reactions & Truss Forces',
      description: 'Solve for all support reactions via equilibrium, and if truss members exist, their internal forces labeled as Tension (T) or Compression (C).',
      bullets: ['Equilibrium equations', 'Reaction forces at all supports', 'Truss member forces (T/C)'],
      active: isDeterminate,
      comingSoon: false,
      disabledReason: !isDeterminate ? 'Only for DOF = 0' : null,
    },
    {
      title: 'Moment Equation Method',
      description: 'Full analysis: reactions + N/V/M diagrams + free body diagrams + deflected shape + displacements. Only for DOF = 0.',
      bullets: ['N, V, M diagrams', 'Free body diagrams', 'Deflected shape', 'Displacements'],
      active: false,
      comingSoon: true,
    },
    {
      title: 'Slope Deflection Method (SDM)',
      description: 'For indeterminate frames & beams. Simultaneous equations approach.',
      bullets: ['Simultaneous equations', 'Joint rotations & translations'],
      active: false,
      comingSoon: true,
    },
    {
      title: 'Moment Distribution Method (MDM)',
      description: 'For indeterminate frames & beams. Iterative approach.',
      bullets: ['Iterative', 'Distribution factors', 'Carry-over factors'],
      active: false,
      comingSoon: true,
    },
    {
      title: 'General Stiffness Method (GSM)',
      description: 'For any structure. Matrix-based formulation.',
      bullets: ['Matrix assembly', 'DOF-based formulation'],
      active: false,
      comingSoon: true,
    },
    {
      title: 'Direct Stiffness Method (DSM)',
      description: 'For any structure. Element-level stiffness approach.',
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
      {/* Solver error toast */}
      {solverError && (
        <div style={{
          background: '#7f1d1d', color: '#fca5a5', padding: '8px 16px',
          fontSize: 12, fontFamily: FONTS.mono, fontWeight: 600,
          textAlign: 'center',
        }}>
          Solver Error: {solverError}
        </div>
      )}

      {/* TOP SECTION: Canvas + Classification */}
      <div style={{
        display: 'flex', gap: 24, padding: '24px 32px',
        flexWrap: 'wrap',
      }}>
        {/* Canvas preview — exact same rendering as builder */}
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

            {/* Layer 1: Dimension lines */}
            {members.map(m => {
              const sn = nodes.find(n => n.id === m.startNodeId);
              const en = nodes.find(n => n.id === m.endNodeId);
              if (!sn || !en) return null;
              return <DimensionLine key={'dim-' + m.id} startNode={sn} endNode={en} length={getMemberLength(m)} />;
            })}

            {/* Layer 1.5: White dots at supports when all hinged */}
            {nodes.map(n => {
              if (!n.support) return null;
              const connected = members.filter(m => m.startNodeId === n.id || m.endNodeId === n.id);
              if (connected.length === 0) return null;
              const allHinged = connected.every(m => {
                if (m.startNodeId === n.id) return m.startHinge || m.type === 'truss';
                return m.endHinge || m.type === 'truss';
              });
              if (!allHinged) return null;
              return <circle key={'supdot-' + n.id} cx={n.x} cy={n.y} r={5} fill="#ffffff" stroke="#374151" strokeWidth={1.5} />;
            })}

            {/* Layer 2: Member lines */}
            {members.map(m => {
              const sn = nodes.find(n => n.id === m.startNodeId);
              const en = nodes.find(n => n.id === m.endNodeId);
              if (!sn || !en) return null;
              return <MemberLine key={'mem-' + m.id} member={m} startNode={sn} endNode={en} isSelected={false} onSelect={noop} globalAxialMode={null} />;
            })}

            {/* Layer 2b: Distributed load arrows */}
            {members.map(m => {
              if (!m.distributedLoads || m.distributedLoads.length === 0) return null;
              const sn = nodes.find(n => n.id === m.startNodeId);
              const en = nodes.find(n => n.id === m.endNodeId);
              if (!sn || !en) return null;
              return <DistributedLoadArrows key={'dl-' + m.id} member={m} startNode={sn} endNode={en} />;
            })}

            {/* Layer 3: Support symbols */}
            {nodes.map(n => (
              <SupportSymbol key={'sup-' + n.id} node={n} allNodes={nodes} members={members} />
            ))}

            {/* Layer 4: Load arrows + moment arcs */}
            {nodes.map(n => (
              <React.Fragment key={'load-' + n.id}>
                <LoadArrows node={n} members={members} allNodes={nodes} />
                {n.loads.moment !== 0 && (
                  <MomentArc x={n.x} y={n.y} moment={n.loads.moment} node={n} members={members} allNodes={nodes} />
                )}
              </React.Fragment>
            ))}

            {/* Layer 5: Node dots */}
            {nodes.map(n => (
              <NodeDot key={'node-' + n.id} node={n} members={members} allNodes={nodes} isSelected={false} isConnectTarget={false} />
            ))}

            {/* Layer 6: Node labels */}
            {nodes.map(n => (
              <NodeLabel key={'lbl-' + n.id} node={n} allNodes={nodes} members={members} />
            ))}
          </svg>

          {/* Edit button */}
          <button onClick={onEdit} style={{
            position: 'absolute', bottom: 12, left: 12,
            padding: '6px 14px', border: 'none',
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

      {/* BOTTOM SECTION: Method Cards — HydroSOLVE hub style */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 32px' }}>
        <div style={{
          fontFamily: FONTS.mono, fontSize: '1.5rem', fontWeight: 700,
          color: '#4ade80', marginBottom: 24, paddingBottom: 16,
          borderBottom: '2px solid #404040',
        }}>
          Analysis Methods
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
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
              onLaunch={() => handleLaunch(m.title)}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center', marginTop: 48, padding: '24px 0',
          fontSize: '0.875rem', color: '#a3a3a3', fontFamily: FONTS.mono,
          borderTop: '1px solid #404040',
        }}>
          StructSOLVE &bull; METU CE 383 Structural Analysis
        </div>
      </div>
    </div>
  );
}

/* HydroSOLVE-style method card — exact clone */
function MethodCard({ title, description, bullets, active, comingSoon, disabledReason, onLaunch }) {
  const isClickable = active && !comingSoon && !disabledReason;
  const isDisabled = comingSoon || !!disabledReason;

  return (
    <div
      style={{
        background: '#171717',
        border: '2px solid #404040',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        opacity: comingSoon ? 0.6 : 1,
      }}
      onMouseOver={e => {
        if (!comingSoon) {
          e.currentTarget.style.borderColor = '#4ade80';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }
      }}
      onMouseOut={e => {
        e.currentTarget.style.borderColor = '#404040';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '1.125rem', fontWeight: 600, color: '#e5e5e5',
        marginBottom: 16,
      }}>
        {title}
      </div>

      <p style={{
        fontFamily: "'Spectral', serif",
        fontSize: '0.9375rem', color: '#a3a3a3', lineHeight: 1.6,
        marginBottom: 24, flexGrow: 1,
      }}>
        {description}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.8125rem', color: '#a3a3a3',
            paddingLeft: 24, position: 'relative', marginBottom: 8,
          }}>
            <span style={{ position: 'absolute', left: 0, color: '#4ade80' }}>&rarr;</span>
            {b}
          </li>
        ))}
      </ul>

      {isDisabled ? (
        <button disabled style={{
          display: 'block', width: '100%', padding: 16,
          background: '#404040', color: '#a3a3a3',
          textAlign: 'center', border: 'none',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600, fontSize: '0.875rem',
          cursor: 'not-allowed', opacity: 0.5,
        }}>
          {disabledReason || 'Coming Soon'}
        </button>
      ) : (
        <button onClick={onLaunch} style={{
          display: 'block', width: '100%', padding: 16,
          background: '#4ade80', color: '#0a0a0a',
          textAlign: 'center', border: 'none',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600, fontSize: '0.875rem',
          cursor: 'pointer', transition: 'background 0.2s',
        }}
          onMouseOver={e => e.currentTarget.style.background = '#86efac'}
          onMouseOut={e => e.currentTarget.style.background = '#4ade80'}
        >
          Launch Calculator &rarr;
        </button>
      )}
    </div>
  );
}
