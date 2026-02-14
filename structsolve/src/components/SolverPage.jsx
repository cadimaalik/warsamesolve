import React, { useRef, useEffect } from 'react';
import { COLORS, FONTS } from '../constants/brand.js';
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

const noop = () => {};

export default function SolverPage({ nodes, members, methodName, solverResults, onBack, onEdit }) {
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

      {/* Canvas — exact same rendering as builder */}
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
          position: 'absolute', bottom: 12, left: 12,
          padding: '6px 14px', borderRadius: 6, border: 'none',
          background: '#059669', color: '#fff', fontSize: 12,
          fontFamily: FONTS.mono, fontWeight: 600, cursor: 'pointer',
        }}>
          Edit
        </button>
      </div>

      {/* Solution results preview */}
      <div style={{
        margin: '0 32px 32px', padding: '24px',
        background: '#111827', borderRadius: 12,
        border: '1px solid #1f2937',
      }}>
        <h2 style={{
          fontSize: 16, fontWeight: 700, color: '#4ade80', margin: '0 0 24px 0',
          fontFamily: FONTS.mono,
        }}>
          SOLUTION &mdash; {methodName}
        </h2>

        {solverResults ? (
          <div>
            {/* Reactions table */}
            <h3 style={{
              fontSize: 14, fontWeight: 600, color: '#e5e5e5', margin: '0 0 12px 0',
              fontFamily: FONTS.mono,
            }}>
              Support Reactions
            </h3>
            <table style={{
              width: '100%', borderCollapse: 'collapse', marginBottom: 32,
              fontFamily: FONTS.mono, fontSize: 13,
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #374151' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af' }}>Reaction</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#9ca3af' }}>Value</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af' }}>Unit</th>
                </tr>
              </thead>
              <tbody>
                {solverResults.reactions.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '8px 12px', color: '#e5e5e5' }}>
                      {r.type === 'M' ? `M_${r.label}` : `R_${r.label}${r.type === 'Rx' ? 'x' : 'y'}`}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', color: '#4ade80', fontWeight: 600 }}>
                      {r.value.toFixed(4)}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#9ca3af' }}>
                      {r.type === 'M' ? 'kN·m' : 'kN'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Truss forces table */}
            {solverResults.trussForces.length > 0 && (
              <>
                <h3 style={{
                  fontSize: 14, fontWeight: 600, color: '#e5e5e5', margin: '0 0 12px 0',
                  fontFamily: FONTS.mono,
                }}>
                  Truss Member Forces
                </h3>
                <table style={{
                  width: '100%', borderCollapse: 'collapse', marginBottom: 32,
                  fontFamily: FONTS.mono, fontSize: 13,
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #374151' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af' }}>Member</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: '#9ca3af' }}>Force (kN)</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af' }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solverResults.trussForces.map((tf, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                        <td style={{ padding: '8px 12px', color: '#e5e5e5' }}>
                          {tf.startLabel}→{tf.endLabel}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 12px', color: '#4ade80', fontWeight: 600 }}>
                          {Math.abs(tf.force).toFixed(4)}
                        </td>
                        <td style={{ padding: '8px 12px', color: tf.classification.includes('T') ? '#fbbf24' : '#ef4444' }}>
                          {tf.classification}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Verification */}
            <h3 style={{
              fontSize: 14, fontWeight: 600, color: '#e5e5e5', margin: '0 0 12px 0',
              fontFamily: FONTS.mono,
            }}>
              Equation Verification
            </h3>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12 }}>
              {solverResults.verification.map((v, i) => (
                <div key={i} style={{
                  padding: '6px 12px',
                  color: v.pass ? '#4ade80' : '#ef4444',
                  borderBottom: '1px solid #1f2937',
                }}>
                  {v.equation}: residual = {v.residual.toFixed(6)} {v.pass ? '✅' : '❌'}
                </div>
              ))}
            </div>

            {/* Note about LaTeX */}
            <div style={{
              marginTop: 32, padding: 16, background: '#0a0a0a',
              borderRadius: 8, border: '1px solid #1f2937',
              fontFamily: FONTS.mono, fontSize: 12, color: '#94a3b8',
            }}>
              ℹ️ Full step-by-step solution with LaTeX equations and diagrams coming in Prompt #16B
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              fontSize: 32, margin: '24px 0 16px',
            }}>
              &#128679;
            </div>
            <div style={{
              fontSize: 14, color: '#fbbf24', fontWeight: 600, marginBottom: 12,
            }}>
              No solver results available
            </div>
            <div style={{
              fontSize: 12, color: '#94a3b8',
            }}>
              Click "Launch Calculator →" on the analysis page to run the solver
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
