const STROKE = '#202020'
const MUTED = '#8f8f8f'
const HIGHLIGHT = '#fef3c7'
const ACCENT = '#b45309'

function Label({ x, y, children, rotate = 0 }) {
  return (
    <text
      x={x}
      y={y}
      fill={STROKE}
      fontFamily="JetBrains Mono, monospace"
      fontSize="10"
      fontWeight="700"
      textAnchor="middle"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {children}
    </text>
  )
}

function DimensionLine({ x1, y1, x2, y2, label, labelX, labelY, rotate = 0 }) {
  return (
    <g fill="none" stroke={STROKE} strokeWidth="0.8">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1} y1={y1 - 5} x2={x1} y2={y1 + 5} />
      <line x1={x2} y1={y2 - 5} x2={x2} y2={y2 + 5} />
      <Label x={labelX} y={labelY} rotate={rotate}>{label}</Label>
    </g>
  )
}

function DoubleFlangeDiagram({ diagram }) {
  const { values } = diagram
  const faceY = 46
  const flange = { x: 92, y: faceY, width: 176, height: 34 }
  const web = { x: 166, y: 80, width: 28, height: 105 }
  const halfDepth = values.d / 2
  const centroidY = faceY + Math.min(Math.max((values.x / halfDepth) * 139, 12), 132)
  const centroidX = web.x + web.width / 2

  return (
    <svg viewBox="0 0 360 250" role="img" aria-label="Double flange centroid schematic">
      <rect {...flange} fill={HIGHLIGHT} stroke={STROKE} strokeWidth="1.5" />
      <rect {...web} fill={HIGHLIGHT} stroke={STROKE} strokeWidth="1.5" />
      <line x1="70" y1={faceY} x2="290" y2={faceY} stroke={ACCENT} strokeWidth="2" />
      <text x="292" y={faceY - 5} fill={ACCENT} fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="800">face</text>
      <circle cx={centroidX} cy={centroidY} r="4" fill={ACCENT} />
      <line x1={centroidX + 28} y1={faceY} x2={centroidX + 28} y2={centroidY} stroke={ACCENT} strokeWidth="1.3" />
      <line x1={centroidX + 22} y1={faceY} x2={centroidX + 34} y2={faceY} stroke={ACCENT} strokeWidth="1.3" />
      <line x1={centroidX + 22} y1={centroidY} x2={centroidX + 34} y2={centroidY} stroke={ACCENT} strokeWidth="1.3" />
      <Label x={centroidX + 44} y={(faceY + centroidY) / 2} rotate={-90}>x</Label>

      <DimensionLine x1={flange.x} y1="30" x2={flange.x + flange.width} y2="30" label="b_f" labelX="180" labelY="22" />
      <line x1="82" y1={flange.y} x2="82" y2={flange.y + flange.height} stroke={MUTED} strokeWidth="0.8" />
      <Label x="72" y={flange.y + flange.height / 2} rotate={-90}>t_f</Label>
      <DimensionLine x1={web.x} y1="204" x2={web.x + web.width} y2="204" label="t_w" labelX="180" labelY="222" />
      <line x1="132" y1={web.y} x2="132" y2={web.y + web.height} stroke={MUTED} strokeWidth="0.8" />
      <Label x="120" y={web.y + web.height / 2} rotate={-90}>d/2 - t_f</Label>
    </svg>
  )
}

function DoubleWebDiagram({ diagram }) {
  const { values } = diagram
  const top = { x: 164, y: 48, width: 118, height: 28 }
  const web = { x: 164, y: 76, width: 26, height: 98 }
  const bottom = { x: 164, y: 174, width: 118, height: 28 }
  const faceX = web.x + web.width
  const centroidX = faceX + Math.min(Math.max(values.x * 5, 10), 70)
  const centroidY = 125

  return (
    <svg viewBox="0 0 360 250" role="img" aria-label="Double web centroid schematic">
      <rect {...top} fill={HIGHLIGHT} stroke={STROKE} strokeWidth="1.5" />
      <rect {...web} fill={HIGHLIGHT} stroke={STROKE} strokeWidth="1.5" />
      <rect {...bottom} fill={HIGHLIGHT} stroke={STROKE} strokeWidth="1.5" />
      <line x1={faceX} y1="34" x2={faceX} y2="216" stroke={ACCENT} strokeWidth="2" />
      <text x={faceX + 8} y="36" fill={ACCENT} fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="800">face</text>
      <circle cx={centroidX} cy={centroidY} r="4" fill={ACCENT} />
      <line x1={faceX} y1={centroidY + 18} x2={centroidX} y2={centroidY + 18} stroke={ACCENT} strokeWidth="1.3" />
      <line x1={faceX} y1={centroidY + 12} x2={faceX} y2={centroidY + 24} stroke={ACCENT} strokeWidth="1.3" />
      <line x1={centroidX} y1={centroidY + 12} x2={centroidX} y2={centroidY + 24} stroke={ACCENT} strokeWidth="1.3" />
      <Label x={(faceX + centroidX) / 2} y={centroidY + 36}>x</Label>

      <DimensionLine x1={top.x} y1="30" x2={top.x + top.width} y2="30" label="b_f/2" labelX="223" labelY="22" />
      <line x1="146" y1={top.y} x2="146" y2={top.y + top.height} stroke={MUTED} strokeWidth="0.8" />
      <Label x="136" y={top.y + top.height / 2} rotate={-90}>t_f</Label>
      <DimensionLine x1={web.x} y1="214" x2={web.x + web.width} y2="214" label="t_w/2" labelX="177" labelY="232" />
      <line x1="124" y1={web.y} x2="124" y2={web.y + web.height} stroke={MUTED} strokeWidth="0.8" />
      <Label x="112" y={web.y + web.height / 2} rotate={-90}>d - 2t_f</Label>
    </svg>
  )
}

export default function ShearLagCentroidDiagram({ diagram }) {
  if (!diagram) {
    return null
  }

  const title = diagram.type === 'double-web'
    ? 'Composite centroid'
    : 'Half-section centroid'

  return (
    <figure className="net-area-diagram-card shear-lag-centroid-card">
      <figcaption>{title}</figcaption>
      {diagram.type === 'double-web'
        ? <DoubleWebDiagram diagram={diagram} />
        : <DoubleFlangeDiagram diagram={diagram} />}
    </figure>
  )
}
