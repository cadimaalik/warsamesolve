import React from 'react';
import { COLORS } from '../constants/brand.js';
import SupportSymbol from './svg/SupportSymbol.jsx';
import NodeDot from './svg/NodeDot.jsx';
import NodeLabel from './svg/NodeLabel.jsx';
import MemberLine from './svg/MemberLine.jsx';
import DimensionLine from './svg/DimensionLine.jsx';
import LoadArrows from './svg/LoadArrows.jsx';
import MomentArc from './svg/MomentArc.jsx';
import DistributedLoadArrows from './svg/DistributedLoadArrows.jsx';
import { getMemberLength } from '../utils/geometry.js';

const zoomBtnStyle = {
  width: 32, height: 32, borderRadius: 6,
  background: '#171717', border: '1px solid #2a2a2a',
  color: '#e5e5e5', fontSize: 16, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'JetBrains Mono', monospace", padding: 0,
};

const ANGLE_TEXT_C = '#64748b';

function AngleLabel({ startNode, endNode }) {
  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return null;

  const angleDeg = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
  // Only show for inclined members (not horizontal or vertical)
  if (angleDeg < 3 || angleDeg > 87) return null;

  const displayAngle = angleDeg <= 90 ? angleDeg : 180 - angleDeg;
  const label = `${displayAngle.toFixed(1).replace(/\.0$/, '')}\u00B0`;

  // Position: on the opposite side of the dimension line (which uses perpendicular offset to the left)
  const memberAngle = Math.atan2(dy, dx);
  // Place below the dimension line (on the right side of the member direction)
  const offset = 35;
  const nx = Math.sin(memberAngle) * offset;
  const ny = -Math.cos(memberAngle) * offset;

  const mx = (startNode.x + endNode.x) / 2 + nx;
  const my = (startNode.y + endNode.y) / 2 + ny;

  return (
    <g transform={`translate(${mx},${my})`}>
      <rect x={-18} y={-9} width={36} height={14} rx={2}
        fill="white" fillOpacity={0.9} />
      <text x={0} y={3} textAnchor="middle" fontSize={10}
        fill={ANGLE_TEXT_C} fontFamily="'JetBrains Mono', monospace" fontWeight={500}>
        {label}
      </text>
    </g>
  );
}

export default function Canvas({
  nodes, members, ui, svgRef, viewBox, svgProps, panning,
  onSelectNode, onSelectMember, onCanvasClick, onConnectTarget,
  onZoomIn, onZoomOut, onFit, globalAxialMode,
}) {
  function handleSvgClick(e) {
    const tag = e.target.tagName;
    if (tag === 'svg' || tag === 'rect' || tag === 'path') {
      onCanvasClick && onCanvasClick();
    }
  }

  function handleNodeClick(nodeId, e) {
    e.stopPropagation();
    if (ui.connectMode && ui.connectFromId && ui.connectFromId !== nodeId) {
      onConnectTarget && onConnectTarget(nodeId);
    } else {
      onSelectNode && onSelectNode(nodeId);
    }
  }

  const vb = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', background: COLORS.canvasBg, overflow: 'hidden',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      {/* Connect mode banner */}
      {ui.connectMode && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'rgba(74, 222, 128, 0.12)', backdropFilter: 'blur(4px)',
          padding: '8px 16px', textAlign: 'center', zIndex: 10,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
          color: COLORS.greenDark, borderBottom: `1px solid ${COLORS.green}`,
        }}>
          Click a pulsing node to connect &middot; <strong>Esc</strong> to cancel
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%" height="100%" viewBox={vb}
        style={{
          display: 'block', background: COLORS.canvasBg,
          userSelect: 'none', WebkitUserSelect: 'none',
          cursor: panning ? 'grabbing' : ui.connectMode ? 'crosshair' : 'grab',
        }}
        onClick={handleSvgClick}
        {...svgProps}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={COLORS.gridLine} strokeWidth="1" />
          </pattern>
        </defs>

        {/* Graph-paper background */}
        <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h}
          width={viewBox.w * 3} height={viewBox.h * 3}
          fill={COLORS.canvasBg} />
        <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h}
          width={viewBox.w * 3} height={viewBox.h * 3}
          fill="url(#grid)" />

        {/* Layer 1: Dimension lines + angle labels */}
        {members.map(m => {
          const sn = nodes.find(n => n.id === m.startNodeId);
          const en = nodes.find(n => n.id === m.endNodeId);
          if (!sn || !en) return null;
          return (
            <React.Fragment key={'dim-' + m.id}>
              <DimensionLine startNode={sn} endNode={en} length={getMemberLength(m)} />
              <AngleLabel startNode={sn} endNode={en} />
            </React.Fragment>
          );
        })}

        {/* Layer 1.5: White dots at pin/roller supports BEHIND members (when hinged) */}
        {nodes.map(n => {
          const isPinOrRoller = n.support === 'pin' || n.support === 'roller-h' || n.support === 'roller-v';
          if (!isPinOrRoller) return null;
          const connected = members.filter(m => m.startNodeId === n.id || m.endNodeId === n.id);
          const hasHinge = connected.some(m => {
            if (m.startNodeId === n.id && m.startHinge) return true;
            if (m.endNodeId === n.id && m.endHinge) return true;
            return false;
          });
          if (!hasHinge) return null; // rigid: no dot at all
          return (
            <circle key={'supdot-' + n.id} cx={n.x} cy={n.y} r={5}
              fill="#ffffff" stroke="#374151" strokeWidth={1.5} />
          );
        })}

        {/* Layer 2: Member lines */}
        {members.map(m => {
          const sn = nodes.find(n => n.id === m.startNodeId);
          const en = nodes.find(n => n.id === m.endNodeId);
          if (!sn || !en) return null;
          return (
            <MemberLine key={'mem-' + m.id}
              member={m} startNode={sn} endNode={en}
              isSelected={ui.activeMemberId === m.id}
              onSelect={onSelectMember}
              globalAxialMode={globalAxialMode}
            />
          );
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
              <MomentArc x={n.x} y={n.y} moment={n.loads.moment}
                node={n} members={members} allNodes={nodes} />
            )}
          </React.Fragment>
        ))}

        {/* Layer 5: Node dots (clickable) */}
        {nodes.map(n => {
          const isTarget = ui.connectMode && ui.connectFromId !== n.id;
          return (
            <g key={'node-' + n.id}
              data-interactive="true"
              onClick={(e) => handleNodeClick(n.id, e)}
              style={{ cursor: 'pointer' }}
            >
              <NodeDot
                node={n} members={members} allNodes={nodes}
                isSelected={ui.activeNodeId === n.id}
                isConnectTarget={isTarget}
              />
            </g>
          );
        })}

        {/* Layer 6: Node labels (on top of everything) */}
        {nodes.map(n => (
          <NodeLabel key={'lbl-' + n.id} node={n} allNodes={nodes} members={members} />
        ))}
      </svg>

      {/* Zoom controls — bottom-right */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <button style={zoomBtnStyle} onClick={onZoomIn} title="Zoom in">+</button>
        <button style={zoomBtnStyle} onClick={onZoomOut} title="Zoom out">&minus;</button>
        <button style={zoomBtnStyle} onClick={onFit} title="Fit to view">&#8862;</button>
      </div>
    </div>
  );
}
