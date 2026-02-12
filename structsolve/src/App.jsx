import { COLORS } from './constants/brand.js';
import { DIRECTIONS } from './constants/directions.js';
import { SUPPORT_TYPES } from './constants/supports.js';
import { nextNodeLabel, realDistance } from './utils/geometry.js';
import { computeLabelOffset } from './utils/labels.js';
import { classify } from './utils/analysis.js';
import useStructure from './state/useStructure.js';
import useUI from './state/useUI.js';

export default function App() {
  const { structure } = useStructure();
  const { ui } = useUI();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: COLORS ? "'JetBrains Mono', monospace" : 'monospace' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700 }}>
          <span style={{ color: '#fff' }}>Struct</span>
          <span style={{ color: COLORS.green }}>SOLVE</span>
        </h1>
        <p style={{ color: COLORS.textDim, marginTop: 8, fontSize: 14 }}>
          2D Structural Analysis · formula252.com
        </p>
        <p style={{ color: COLORS.textMuted, marginTop: 16, fontSize: 12 }}>
          ✓ {Object.keys(DIRECTIONS).length} directions ·
          ✓ {Object.keys(SUPPORT_TYPES).length} support types ·
          ✓ {structure.nodes.length} nodes
        </p>
      </div>
    </div>
  );
}
