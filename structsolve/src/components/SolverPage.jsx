import React, { useRef, useEffect } from 'react';
import { COLORS, FONTS } from '../constants/brand.js';
import { getMemberLength } from '../utils/geometry.js';
import usePanZoom from '../hooks/usePanZoom.js';
import { useMathJax } from '../hooks/useMathJax.js';
import { generateSolutionSteps } from '../solver/latexGenerator.js';
import { checkStabilityWarnings } from '../solver/stabilityChecks.js';
import SupportSymbol from './svg/SupportSymbol.jsx';
import NodeDot from './svg/NodeDot.jsx';
import NodeLabel from './svg/NodeLabel.jsx';
import MemberLine from './svg/MemberLine.jsx';
import DimensionLine from './svg/DimensionLine.jsx';
import LoadArrows from './svg/LoadArrows.jsx';
import MomentArc from './svg/MomentArc.jsx';
import DistributedLoadArrows from './svg/DistributedLoadArrows.jsx';
import ResultsSummary from './ResultsSummary.jsx';
import TrussTable from './TrussTable.jsx';
import StabilityWarnings from './StabilityWarnings.jsx';
import Verification from './Verification.jsx';
import FBDCanvas from './FBDCanvas.jsx';
import ForceLegend from './ForceLegend.jsx';

const noop = () => {};

export default function SolverPage({ nodes, members, methodName, solverResults, onBack, onEdit }) {
  const svgRef = useRef(null);
  const { viewBox, fitToNodes } = usePanZoom();

  useEffect(() => {
    if (nodes.length > 0) fitToNodes(nodes);
  }, []);

  // Generate step-by-step solution
  const steps = solverResults ? generateSolutionSteps(solverResults) : [];
  const warnings = solverResults ? checkStabilityWarnings(solverResults) : [];

  // Re-typeset MathJax whenever steps change
  useMathJax([steps]);

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      background: COLORS.bgDark,
      fontFamily: FONTS.mono,
      minHeight: '100vh',
      color: '#e5e5e5',
    }}>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Header Bar */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 32px',
        borderBottom: '1px solid #2a2a2a',
      }}>
        <button onClick={onBack} style={{
          background: 'none',
          border: '1px solid #4ade80',
          color: '#4ade80',
          fontSize: 13,
          fontFamily: FONTS.mono,
          fontWeight: 600,
          cursor: 'pointer',
          padding: '8px 16px',
          borderRadius: 8,
          transition: 'background 0.2s',
        }}
        onMouseOver={(e) => e.target.style.background = 'rgba(74, 222, 128, 0.1)'}
        onMouseOut={(e) => e.target.style.background = 'none'}
        >
          &larr; Back to Methods
        </button>
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          <span style={{ color: '#fff' }}>Struct</span>
          <span style={{ color: '#4ade80' }}>SOLVE</span>
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Canvas Preview — Read-only, compact */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div style={{
        margin: '24px 32px',
        position: 'relative',
        background: COLORS.canvasBg,
        borderRadius: 12,
        overflow: 'hidden',
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

        <button onClick={onEdit} style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          padding: '6px 14px',
          borderRadius: 6,
          border: 'none',
          background: '#059669',
          color: '#fff',
          fontSize: 12,
          fontFamily: FONTS.mono,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          ✏️ Edit
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Solution Content — Scrollable */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 24px 32px',
      }}>
        {solverResults ? (
          <>
            {/* ─────────────────────────────────────────────────── */}
            {/* Results Summary Card */}
            {/* ─────────────────────────────────────────────────── */}
            <div style={{
              background: '#171717',
              border: '1px solid #2a2a2a',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}>
              <div style={{
                color: '#4ade80',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: '1px solid #2a2a2a',
              }}>
                Results Summary
              </div>
              <ResultsSummary results={solverResults} />
            </div>

            {/* ─────────────────────────────────────────────────── */}
            {/* Stability Warnings (if any) */}
            {/* ─────────────────────────────────────────────────── */}
            {warnings.length > 0 && (
              <div style={{
                background: '#171717',
                border: '1px solid #2a2a2a',
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
              }}>
                <div style={{
                  color: '#fbbf24',
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: '1px solid #2a2a2a',
                }}>
                  ⚠️ Stability Warnings
                </div>
                <StabilityWarnings warnings={warnings} />
              </div>
            )}

            {/* ─────────────────────────────────────────────────── */}
            {/* Step-by-Step Solution */}
            {/* ─────────────────────────────────────────────────── */}
            <div style={{
              background: '#171717',
              border: '1px solid #2a2a2a',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}>
              <div style={{
                color: '#4ade80',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: '1px solid #2a2a2a',
              }}>
                Step-by-Step Solution
              </div>

              {/* FBD Color Legend */}
              <ForceLegend />

              <div>
                {steps.map((step, idx) => (
                  <div key={idx} style={{
                    marginBottom: 24,
                    paddingLeft: 16,
                    borderLeft: '3px solid #4ade80',
                  }}>
                    <div style={{
                      color: '#4ade80',
                      fontWeight: 700,
                      fontSize: 15,
                      marginBottom: 8,
                    }}>
                      {step.title}
                    </div>

                    {/* FBD ABOVE description (Prompt #16C) */}
                    {step.fbd && (
                      <FBDCanvas fbd={step.fbd} />
                    )}

                    {/* Truss Joint FBDs in 2-column grid */}
                    {step.jointFBDs && step.jointFBDs.length > 0 && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 8,
                        marginBottom: 12,
                      }}>
                        {step.jointFBDs.map((jfbd, jIdx) => (
                          <FBDCanvas key={jIdx} fbd={jfbd} />
                        ))}
                      </div>
                    )}

                    {step.description && (
                      <div style={{
                        color: '#d1d5db',
                        fontSize: 14,
                        lineHeight: 1.7,
                        marginBottom: 12,
                      }}>
                        {step.description}
                      </div>
                    )}
                    {step.latex && (
                      <div style={{
                        background: '#1a1a2e',
                        border: '1px solid #2a2a3e',
                        borderRadius: 8,
                        padding: 16,
                        overflowX: 'hidden',
                        textAlign: 'center',
                      }}>
                        <div style={{ color: '#e5e5e5', fontSize: 14 }}>
                          {'\\[\\begin{gathered}' + step.latex + '\\end{gathered}\\]'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────── */}
            {/* Truss Forces Table (if applicable) */}
            {/* ─────────────────────────────────────────────────── */}
            {solverResults.trussForces && solverResults.trussForces.length > 0 && (
              <div style={{
                background: '#171717',
                border: '1px solid #2a2a2a',
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
              }}>
                <div style={{
                  color: '#4ade80',
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: '1px solid #2a2a2a',
                }}>
                  Truss Member Forces
                </div>
                <TrussTable forces={solverResults.trussForces} />
              </div>
            )}

            {/* ─────────────────────────────────────────────────── */}
            {/* Verification */}
            {/* ─────────────────────────────────────────────────── */}
            <div style={{
              background: '#171717',
              border: '1px solid #2a2a2a',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}>
              <div style={{
                color: '#4ade80',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: '1px solid #2a2a2a',
              }}>
                Verification
              </div>
              <Verification results={solverResults} />
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#171717',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              &#128679;
            </div>
            <div style={{
              fontSize: 14,
              color: '#fbbf24',
              fontWeight: 600,
              marginBottom: 12,
            }}>
              No solver results available
            </div>
            <div style={{
              fontSize: 12,
              color: '#94a3b8',
            }}>
              Click "Launch Calculator →" on the analysis page to run the solver
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
