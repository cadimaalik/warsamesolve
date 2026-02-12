import { COLORS } from './constants/brand.js';
import useStructure from './state/useStructure.js';
import useUI from './state/useUI.js';
import PinSymbol from './components/svg/PinSymbol.jsx';
import RollerSymbol from './components/svg/RollerSymbol.jsx';
import FixedSymbol from './components/svg/FixedSymbol.jsx';
import GuideSymbol from './components/svg/GuideSymbol.jsx';
import NodeDot from './components/svg/NodeDot.jsx';

export default function App() {
  const { structure } = useStructure();
  const { ui } = useUI();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', fontFamily: "'JetBrains Mono', monospace" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        <span style={{ color: '#fff' }}>Struct</span>
        <span style={{ color: COLORS.green }}>SOLVE</span>
        <span style={{ color: COLORS.textDim, fontSize: 14, marginLeft: 12 }}>Symbol Test</span>
      </h1>
      <svg width={800} height={300} style={{ background: '#fff', borderRadius: 8 }}>
        {/* Row 1: Floor-oriented symbols */}
        <text x={70} y={30} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="JetBrains Mono">Pin</text>
        <PinSymbol x={70} y={60} angle={0} />

        <text x={200} y={30} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="JetBrains Mono">Horiz Roller</text>
        <RollerSymbol x={200} y={60} angle={0} orientation="floor" />

        <text x={350} y={30} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="JetBrains Mono">Fixed</text>
        <FixedSymbol x={350} y={60} angle={0} />

        <text x={500} y={30} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="JetBrains Mono">Horiz Guide</text>
        <GuideSymbol x={500} y={60} angle={0} orientation="floor" />

        {/* Row 2: Wall-oriented symbols */}
        <text x={200} y={150} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="JetBrains Mono">Vert Roller</text>
        <RollerSymbol x={200} y={180} angle={0} orientation="wall" />

        <text x={500} y={150} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="JetBrains Mono">Vert Guide</text>
        <GuideSymbol x={500} y={180} angle={0} orientation="wall" />

        {/* Node dots for reference */}
        <NodeDot node={{ id: 'A', x: 70, y: 60 }} members={[]} isSelected={false} />
        <NodeDot node={{ id: 'B', x: 200, y: 60 }} members={[]} isSelected={true} />
        <NodeDot node={{ id: 'C', x: 350, y: 60 }} members={[]} isSelected={false} />

        {/* Hinge test */}
        <text x={650} y={30} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="JetBrains Mono">Hinge</text>
        <NodeDot
          node={{ id: 'H', x: 650, y: 60 }}
          members={[{ startNodeId: 'H', endNodeId: 'X', startHinge: true, endHinge: false }]}
          isSelected={false}
        />
      </svg>
    </div>
  );
}
