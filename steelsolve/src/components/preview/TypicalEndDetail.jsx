import BoltGroup from './BoltGroup'
import DimensionLine from './DimensionLine'
import { getTypicalEndDetailLayout } from '../../utils/boltLayout'

const VIEWBOX = { width: 720, height: 360 }
const MARGINS = { left: 112, top: 74, right: 62, bottom: 74 }
const STROKE = '#202020'
const MUTED = '#6b7280'
const WARNING = '#9a6500'
const I_SHAPE_FAMILIES = ['IPN', 'IPE', 'HEA', 'HEB', 'HEM', 'HD']

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function Note({ children, tone = 'muted' }) {
  return (
    <text
      x={VIEWBOX.width / 2}
      y={VIEWBOX.height / 2}
      fill={tone === 'warning' ? WARNING : MUTED}
      fontFamily="JetBrains Mono, monospace"
      fontSize="12"
      textAnchor="middle"
    >
      {children}
    </text>
  )
}

function DrawingDefs() {
  return (
    <defs>
      <marker
        id="typical-end-force-arrow"
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={STROKE} />
      </marker>
      <marker
        id="dimension-tick"
        markerWidth="8"
        markerHeight="8"
        refX="4"
        refY="4"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M 4 0 L 4 8" stroke={STROKE} strokeWidth="1.2" />
      </marker>
    </defs>
  )
}

function usesRectangularGusset(problem) {
  return (
    problem.member.memberType === 'rolled-section'
    && I_SHAPE_FAMILIES.includes(problem.member.sectionFamily)
    && problem.connection.connectedElement === 'web'
  )
}

function GussetPlate({ problem, layout, transform }) {
  const isRectangular = usesRectangularGusset(problem)
  const { geometry } = layout
  const { mapX, region } = transform
  const lastColumnX = geometry.horizontalEdge + Math.max(0, layout.boltCounts.length - 1) * geometry.pitch
  const xLeft = Math.max(18, region.x - clamp(region.width * 0.34, 72, 118))
  const xRight = Math.min(
    region.x + region.width - 14,
    mapX(lastColumnX + geometry.horizontalEdge * 0.88),
  )
  const memberOverlap = clamp(region.height * 0.16, 10, 18)
  const yTop = region.y - memberOverlap
  const yBottom = region.y + region.height + memberOverlap

  if (isRectangular) {
    return (
      <rect
        x={xLeft}
        y={yTop}
        width={xRight - xLeft}
        height={yBottom - yTop}
        fill="#f8f8f8"
        stroke={STROKE}
        strokeWidth="1.7"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  const inset = clamp((yBottom - yTop) * 0.16, 16, 34)
  const points = [
    [xLeft, yTop],
    [xRight, yTop + inset],
    [xRight, yBottom - inset],
    [xLeft, yBottom],
  ].map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <polygon
      points={points}
      fill="#f8f8f8"
      stroke={STROKE}
      strokeWidth="1.7"
      vectorEffect="non-scaling-stroke"
    />
  )
}

function ForceArrow({ region }) {
  const y = region.y + region.height / 2
  const x1 = region.x + region.width + 34
  const x2 = VIEWBOX.width - 16

  return (
    <g fill="none" stroke={STROKE} strokeWidth="2" vectorEffect="non-scaling-stroke">
      <line x1={x1} y1={y} x2={x2} y2={y} markerEnd="url(#typical-end-force-arrow)" />
      <text
        x={(x1 + x2) / 2}
        y={y - 10}
        fill={STROKE}
        stroke="none"
        fontFamily="JetBrains Mono, monospace"
        fontSize="13"
        fontWeight="700"
        textAnchor="middle"
      >
        P
      </text>
    </g>
  )
}

function getDrawingTransform(layout) {
  const { width, height } = layout.geometry
  const availableWidth = VIEWBOX.width - MARGINS.left - MARGINS.right
  const availableHeight = VIEWBOX.height - MARGINS.top - MARGINS.bottom
  const scale = Math.min(availableWidth / Math.max(width, 1), availableHeight / Math.max(height, 1))
  const scaledWidth = width * scale
  const scaledHeight = height * scale
  const origin = {
    x: MARGINS.left + (availableWidth - scaledWidth) / 2,
    y: MARGINS.top + (availableHeight - scaledHeight) / 2,
  }

  return {
    scale,
    origin,
    region: {
      x: origin.x,
      y: origin.y,
      width: scaledWidth,
      height: scaledHeight,
    },
    mapX: (x) => origin.x + x * scale,
    mapY: (y) => origin.y + y * scale,
  }
}

function MemberRegionLinework({ problem, region }) {
  const isAngle = ['equal-angle', 'unequal-angle'].includes(problem.member.sectionFamily)

  if (!isAngle) {
    return null
  }

  const legOffset = Math.min(region.height * 0.28, 22)
  const returnLeg = Math.min(region.width * 0.16, 46)

  return (
    <g stroke={STROKE} strokeWidth="1.4" fill="none" vectorEffect="non-scaling-stroke">
      <line x1={region.x} y1={region.y + legOffset} x2={region.x + region.width} y2={region.y + legOffset} />
      <line x1={region.x + returnLeg} y1={region.y + legOffset} x2={region.x + returnLeg} y2={region.y + region.height} />
    </g>
  )
}

function RegionOutline({ problem, region }) {
  return (
    <g>
      <rect
        x={region.x}
        y={region.y}
        width={region.width}
        height={region.height}
        fill="none"
        stroke={STROKE}
        strokeWidth="1.8"
        vectorEffect="non-scaling-stroke"
      />
      <MemberRegionLinework problem={problem} region={region} />
    </g>
  )
}

function DimensionExtension({ x1, y1, x2, y2 }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={STROKE}
      strokeWidth="0.9"
      vectorEffect="non-scaling-stroke"
    />
  )
}

function Dimensions({ layout, transform }) {
  const { geometry, maxBoltLineLevel } = layout
  const { region, mapX, mapY } = transform
  const firstColumnX = mapX(geometry.horizontalEdge)
  const secondColumnX = mapX(geometry.horizontalEdge + geometry.pitch)
  const topBoltY = mapY(geometry.topEdge)
  const secondBoltLineY = mapY(geometry.topEdge + geometry.gage)
  const lastBoltY = mapY(geometry.topEdge + maxBoltLineLevel * geometry.gage)
  const below = region.y + region.height + 28
  const above = region.y - 26
  const left = region.x - 26
  const right = region.x + region.width + 28

  return (
    <g>
      <DimensionExtension x1={region.x} y1={region.y + region.height} x2={region.x} y2={below + 12} />
      <DimensionExtension x1={firstColumnX} y1={topBoltY} x2={firstColumnX} y2={below + 12} />
      <DimensionLine
        x1={region.x}
        y1={below}
        x2={firstColumnX}
        y2={below}
        label={`${geometry.horizontalEdge} mm`}
        textY={below + 14}
      />

      {layout.boltCounts.length >= 2 && geometry.pitch > 0 ? (
        <>
          <DimensionExtension x1={firstColumnX} y1={region.y} x2={firstColumnX} y2={above - 11} />
          <DimensionExtension x1={secondColumnX} y1={region.y} x2={secondColumnX} y2={above - 11} />
          <DimensionLine
            x1={firstColumnX}
            y1={above}
            x2={secondColumnX}
            y2={above}
            label={`s = ${geometry.pitch} mm`}
            textY={above - 13}
          />
        </>
      ) : null}

      <DimensionExtension x1={region.x} y1={region.y} x2={left - 10} y2={region.y} />
      <DimensionExtension x1={firstColumnX} y1={topBoltY} x2={left - 10} y2={topBoltY} />
      <DimensionLine
        x1={left}
        y1={region.y}
        x2={left}
        y2={topBoltY}
        label={`${geometry.topEdge} mm`}
        textX={left - 13}
        rotate={-90}
      />

      {maxBoltLineLevel >= 1 && geometry.gage > 0 ? (
        <>
          <DimensionExtension x1={firstColumnX} y1={topBoltY} x2={right + 10} y2={topBoltY} />
          <DimensionExtension x1={firstColumnX} y1={secondBoltLineY} x2={right + 10} y2={secondBoltLineY} />
          <DimensionLine
            x1={right}
            y1={topBoltY}
            x2={right}
            y2={secondBoltLineY}
            label={`g = ${geometry.gage} mm`}
            textX={right + 13}
            rotate={-90}
          />
        </>
      ) : null}

      <DimensionExtension x1={region.x} y1={lastBoltY} x2={left - 10} y2={lastBoltY} />
      <DimensionExtension x1={region.x} y1={region.y + region.height} x2={left - 10} y2={region.y + region.height} />
      <DimensionLine
        x1={left}
        y1={lastBoltY}
        x2={left}
        y2={region.y + region.height}
        label={`${geometry.bottomEdge} mm`}
        textX={left - 13}
        rotate={-90}
      />
    </g>
  )
}

function Warnings({ warnings }) {
  if (!warnings.length) {
    return null
  }

  return (
    <g>
      {warnings.map((warning, index) => (
        <text
          key={warning}
          x={VIEWBOX.width / 2}
          y={24 + index * 15}
          fill={WARNING}
          fontFamily="JetBrains Mono, monospace"
          fontSize="11"
          textAnchor="middle"
        >
          {warning}
        </text>
      ))}
    </g>
  )
}

function ReadyEndDetail({ problem, layout }) {
  const transform = getDrawingTransform(layout)
  const boltRadius = clamp((layout.boltDiameter * transform.scale) / 2, 4.5, 8.5)

  return (
    <>
      <GussetPlate problem={problem} layout={layout} transform={transform} />
      <RegionOutline problem={problem} region={transform.region} />
      <BoltGroup
        layout={layout}
        mapX={transform.mapX}
        mapY={transform.mapY}
        radius={boltRadius}
        region={transform.region}
      />
      <Dimensions layout={layout} transform={transform} />
      <Warnings warnings={layout.warnings} />
      <ForceArrow region={transform.region} />
    </>
  )
}

export default function TypicalEndDetail({ problem }) {
  const layout = getTypicalEndDetailLayout(problem)

  return (
    <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="img" aria-label="Typical end detail">
      <DrawingDefs />
      {layout.status === 'ready' ? (
        <ReadyEndDetail problem={problem} layout={layout} />
      ) : (
        <Note>{layout.message}</Note>
      )}
    </svg>
  )
}
