import { COLORS } from './constants/brand.js';
import SupportSymbol from './components/svg/SupportSymbol.jsx';
import NodeDot from './components/svg/NodeDot.jsx';
import NodeLabel from './components/svg/NodeLabel.jsx';
import MemberLine from './components/svg/MemberLine.jsx';
import DimensionLine from './components/svg/DimensionLine.jsx';
import LoadArrows from './components/svg/LoadArrows.jsx';
import MomentArc from './components/svg/MomentArc.jsx';

export default function App() {
  // Test structure: A-B horizontal beam, B-C vertical column
  const nodes = [
    { id: 'A', x: 100, y: 200, support: 'pin', loads: { fx: 0, fy: 0, moment: 50 } },
    { id: 'B', x: 400, y: 200, support: 'roller-h', loads: { fx: 0, fy: -100, moment: 0 } },
    { id: 'C', x: 400, y: 50, support: null, loads: { fx: 30, fy: 0, moment: 0 } },
  ];
  const members = [
    { id: 'm1', startNodeId: 'A', endNodeId: 'B', length: 6, type: 'frame', EI_factor: 1, startHinge: false, endHinge: false },
    { id: 'm2', startNodeId: 'B', endNodeId: 'C', length: 4, type: 'frame', EI_factor: 2, startHinge: false, endHinge: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', fontFamily: "'JetBrains Mono', monospace" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        <span style={{ color: '#fff' }}>Struct</span>
        <span style={{ color: COLORS.green }}>SOLVE</span>
        <span style={{ color: COLORS.textDim, fontSize: 14, marginLeft: 12 }}>Rendering Test</span>
      </h1>
      <svg width={600} height={320} style={{ background: '#fff', borderRadius: 8 }}>
        {/* Dimensions */}
        <DimensionLine startNode={nodes[0]} endNode={nodes[1]} length={6} />
        <DimensionLine startNode={nodes[1]} endNode={nodes[2]} length={4} />

        {/* Members */}
        <MemberLine member={members[0]} startNode={nodes[0]} endNode={nodes[1]}
          isSelected={false} onSelect={() => {}} />
        <MemberLine member={members[1]} startNode={nodes[1]} endNode={nodes[2]}
          isSelected={true} onSelect={() => {}} />

        {/* Supports */}
        {nodes.map(n => (
          <SupportSymbol key={n.id} node={n} allNodes={nodes} members={members} />
        ))}

        {/* Loads */}
        {nodes.map(n => (
          <LoadArrows key={'load-' + n.id} node={n} />
        ))}

        {/* Moments */}
        <MomentArc x={nodes[0].x} y={nodes[0].y} moment={nodes[0].loads.moment} />

        {/* Nodes */}
        {nodes.map(n => (
          <NodeDot key={'dot-' + n.id} node={n} members={members}
            isSelected={n.id === 'A'} isConnectTarget={false} />
        ))}

        {/* Labels */}
        {nodes.map(n => (
          <NodeLabel key={'lbl-' + n.id} node={n} allNodes={nodes} members={members} />
        ))}
      </svg>
      <p style={{ color: COLORS.textDim, marginTop: 12, fontSize: 12 }}>
        A(pin, 50kN·m) → B(roller, -100kN↓) → C(none, 30kN→) · m2 selected (teal, EI=2)
      </p>
    </div>
  );
}
