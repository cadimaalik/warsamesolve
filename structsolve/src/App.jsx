import React from 'react';
import { COLORS } from './constants/brand.js';
import useStructure from './state/useStructure.js';
import useUI from './state/useUI.js';
import Canvas from './components/Canvas.jsx';
import SidePanel from './components/SidePanel.jsx';

export default function App() {
  const { structure, setNodeSupport, setNodeLoads } = useStructure();
  const { ui, selectNode, selectMember, reset, cancelConnect } = useUI();

  // Create test structure on first render
  const [init, setInit] = React.useState(false);
  React.useEffect(() => {
    if (init) return;
    setInit(true);
    // Manually set initial structure for testing
  }, [init]);

  // For now, use a hardcoded test structure
  const testNodes = [
    { id: 'A', x: 150, y: 250, support: 'pin', loads: { fx: 0, fy: 0, moment: 50 } },
    { id: 'B', x: 450, y: 250, support: 'roller-h', loads: { fx: 0, fy: -80, moment: 0 } },
    { id: 'C', x: 450, y: 80, support: null, loads: { fx: 30, fy: 0, moment: 0 } },
    { id: 'D', x: 150, y: 80, support: null, loads: { fx: 0, fy: 0, moment: 0 } },
  ];
  const testMembers = [
    { id: 'm1', startNodeId: 'A', endNodeId: 'B', length: 6, type: 'frame', EI_factor: 1, startHinge: false, endHinge: false },
    { id: 'm2', startNodeId: 'B', endNodeId: 'C', length: 4, type: 'frame', EI_factor: 2, startHinge: false, endHinge: true },
    { id: 'm3', startNodeId: 'C', endNodeId: 'D', length: 6, type: 'truss', EI_factor: 1, startHinge: false, endHinge: false },
    { id: 'm4', startNodeId: 'D', endNodeId: 'A', length: 4, type: 'frame', EI_factor: 1, startHinge: true, endHinge: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Temp header */}
      <div style={{
        height: 48, background: COLORS.bgDark, display: 'flex',
        alignItems: 'center', padding: '0 16px',
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: '#fff' }}>Struct</span>
          <span style={{ color: COLORS.green }}>SOLVE</span>
        </span>
        <span style={{ marginLeft: 16, color: COLORS.textDim, fontSize: 12 }}>
          Canvas Test · Pan (drag svg) · Zoom (scroll) · Click nodes
        </span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SidePanel
          nodes={testNodes}
          members={testMembers}
          activeNodeId={ui.activeNodeId}
          activeMemberId={ui.activeMemberId}
          onSelectNode={selectNode}
          onSelectMember={selectMember}
          onDeleteNode={(id) => console.log('delete node', id)}
          onDeleteMember={(id) => console.log('delete member', id)}
          onUpdateMember={(id, updates) => console.log('update member', id, updates)}
        />

        {/* Canvas on the RIGHT */}
        <Canvas
          nodes={testNodes}
          members={testMembers}
          ui={ui}
          onSelectNode={selectNode}
          onSelectMember={selectMember}
          onCanvasClick={reset}
        />
      </div>
    </div>
  );
}
