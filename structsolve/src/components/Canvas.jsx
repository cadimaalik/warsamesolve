import React from 'react';
import { COLORS } from '../constants/brand.js';
import SupportSymbol from './svg/SupportSymbol.jsx';
import NodeDot from './svg/NodeDot.jsx';
import NodeLabel from './svg/NodeLabel.jsx';
import MemberLine from './svg/MemberLine.jsx';
import DimensionLine from './svg/DimensionLine.jsx';
import LoadArrows from './svg/LoadArrows.jsx';
import MomentArc from './svg/MomentArc.jsx';

export default function Canvas({
  nodes, members, ui, svgRef, viewBox, svgProps, panning,
  onSelectNode, onSelectMember, onCanvasClick, onConnectTarget,
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
      flex: 1, position: 'relative', background: COLORS.canvasBg, overflow: 'hidden',
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

        {/* Layer 1: Dimension lines (behind everything) */}
        {members.map(m => {
          const sn = nodes.find(n => n.id === m.startNodeId);
          const en = nodes.find(n => n.id === m.endNodeId);
          if (!sn || !en) return null;
          return <DimensionLine key={'dim-' + m.id} startNode={sn} endNode={en} length={m.length} />;
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
            />
          );
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
              <MomentArc x={n.x} y={n.y} moment={n.loads.moment} members={members} allNodes={nodes} />
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
                node={n} members={members}
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
    </div>
  );
}
