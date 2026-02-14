import React from 'react';
import { COLORS } from '../constants/brand.js';
import { SUPPORT_TYPES } from '../constants/supports.js';
import { classify } from '../utils/analysis.js';
import MemberDetail from './MemberDetail.jsx';
import { getMemberLength } from '../utils/geometry.js';

const sectionTitle = { fontSize: 11, color: COLORS.textDim, fontWeight: 700, marginBottom: 6, letterSpacing: 1 };

function NodeRow({ node, isActive, onSelect, onDelete }) {
  const sup = node.support ? (SUPPORT_TYPES[node.support]?.label || node.support) : '\u2014';
  const hasLoads = node.loads && (node.loads.fx || node.loads.fy || node.loads.moment);
  return (
    <div onClick={() => onSelect(node.id)} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
      borderRadius: 4, cursor: 'pointer', borderLeft: isActive ? `3px solid ${COLORS.green}` : '3px solid transparent',
      background: isActive ? COLORS.greenGlow : 'transparent', transition: 'all 0.12s',
    }}>
      <span style={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: 12, minWidth: 18 }}>{node.id}</span>
      <span style={{ flex: 1, fontSize: 11, color: COLORS.textMuted }}>{sup}</span>
      {hasLoads && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />}
      <button onClick={e => { e.stopPropagation(); onDelete(node.id); }} style={{
        background: 'none', border: 'none', color: COLORS.textDim, fontSize: 13, cursor: 'pointer', padding: '0 2px',
      }}>&times;</button>
    </div>
  );
}

function MemberRow({ member, isActive, onSelect, onDelete }) {
  const isTruss = member.type === 'truss';
  return (
    <div onClick={() => onSelect(member.id)} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
      borderRadius: 4, cursor: 'pointer', borderLeft: isActive ? `3px solid ${COLORS.green}` : '3px solid transparent',
      background: isActive ? COLORS.greenGlow : 'transparent', transition: 'all 0.12s',
    }}>
      <span style={{ fontSize: 11, color: COLORS.textPrimary, fontWeight: 600, minWidth: 42 }}>
        {member.startNodeId}&rarr;{member.endNodeId}
      </span>
      <span style={{ fontSize: 11, color: COLORS.textMuted, minWidth: 30 }}>{getMemberLength(member)}m</span>
      <span style={{
        fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 600,
        background: isTruss ? 'rgba(194,65,12,0.15)' : COLORS.bgInput,
        color: isTruss ? '#fb923c' : COLORS.textMuted,
      }}>{isTruss ? 'Truss' : 'Frame'}</span>
      <span style={{ flex: 1 }} />
      <button onClick={e => { e.stopPropagation(); onDelete(member.id); }} style={{
        background: 'none', border: 'none', color: COLORS.textDim, fontSize: 13, cursor: 'pointer', padding: '0 2px',
      }}>&times;</button>
    </div>
  );
}

export default function SidePanel({
  nodes, members, activeNodeId, activeMemberId,
  onSelectNode, onSelectMember, onDeleteNode, onDeleteMember, onUpdateMember,
  globalAxialMode,
}) {
  const activeMember = activeMemberId ? members.find(m => m.id === activeMemberId) : null;
  const info = nodes.length > 0 && members.length > 0 ? classify(nodes, members) : null;

  const dofColor = info
    ? info.status === 'determinate' ? COLORS.green
    : info.status === 'indeterminate' ? '#f59e0b'
    : '#ef4444'
    : COLORS.textDim;

  const dofLabel = info
    ? info.status === 'determinate' ? 'Determinate'
    : info.status === 'indeterminate' ? 'Indeterminate'
    : 'Unstable'
    : '\u2014';

  return (
    <div style={{
      width: 280, background: COLORS.bgPanel, borderRight: `1px solid ${COLORS.border}`,
      padding: 12, fontSize: 12, color: COLORS.textMuted, overflowY: 'auto',
      fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
    }}>
      {/* Section 1: Member Detail */}
      {activeMember && (
        <MemberDetail
          member={activeMember} nodes={nodes}
          onUpdate={onUpdateMember} onDelete={onDeleteMember}
          onClose={() => onSelectMember(null)}
          globalAxialMode={globalAxialMode}
        />
      )}

      {/* Section 2: Nodes list */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>NODES</div>
        {nodes.map(n => (
          <NodeRow key={n.id} node={n} isActive={activeNodeId === n.id}
            onSelect={onSelectNode} onDelete={onDeleteNode} />
        ))}
        {nodes.length === 0 && <div style={{ fontSize: 11, color: COLORS.textDim }}>No nodes yet</div>}
      </div>

      {/* Section 3: Members list */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>MEMBERS</div>
        {members.map(m => (
          <MemberRow key={m.id} member={m} isActive={activeMemberId === m.id}
            onSelect={onSelectMember} onDelete={onDeleteMember} />
        ))}
        {members.length === 0 && <div style={{ fontSize: 11, color: COLORS.textDim }}>No members yet</div>}
      </div>

      {/* Section 4: Summary */}
      <div>
        <div style={sectionTitle}>SUMMARY</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
          <div>Nodes (j): <span style={{ color: COLORS.textPrimary }}>{info?.j ?? 0}</span></div>
          <div>Members (m): <span style={{ color: COLORS.textPrimary }}>{info?.m ?? 0}</span></div>
          <div>Reactions (r): <span style={{ color: COLORS.textPrimary }}>{info?.r ?? 0}</span></div>
          <div>Hinges (c): <span style={{ color: COLORS.textPrimary }}>{info?.c ?? 0}</span></div>
          <div style={{ marginTop: 6, padding: '6px 8px', borderRadius: 4, background: COLORS.bgCard }}>
            <span style={{ color: dofColor, fontWeight: 700 }}>
              DOF = {info?.DOF ?? '?'}
            </span>
            <span style={{ color: COLORS.textDim }}> &middot; </span>
            <span style={{ color: dofColor }}>{dofLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
