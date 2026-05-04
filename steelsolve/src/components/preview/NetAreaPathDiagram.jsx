const STROKE = '#202020'
const MUTED = '#8f8f8f'
const PATH = '#b45309'
const MEMBER_TOP_Y = 42
const MEMBER_BOTTOM_Y = 192

function getRows(netArea) {
  if (netArea.diagram.layout) {
    return Math.max(
      2,
      netArea.diagram.layout.maxBoltLineLevel + 1,
      netArea.straight.holeCount,
      netArea.zigzag.holeCount,
    )
  }

  const counts = netArea.diagram.boltCounts.slice(0, 2)
  return Math.max(2, netArea.straight.holeCount, netArea.zigzag.holeCount, ...counts)
}

function getPointCoordinates(pathPoint, geometry) {
  return {
    x: geometry.columnXs[pathPoint.columnIndex] ?? geometry.columnXs[0],
    y: geometry.rowYs[pathPoint.rowIndex] ?? geometry.rowYs[geometry.rowYs.length - 1],
  }
}

function getBoltRowsByColumn(netArea) {
  const layout = netArea.diagram.layout

  if (layout?.boltPoints?.length) {
    const rowsByColumn = [[], []]
    const gage = layout.geometry.gage
    const topEdge = layout.geometry.topEdge

    layout.boltPoints.forEach((point) => {
      if (point.columnIndex > 1) {
        return
      }

      rowsByColumn[point.columnIndex].push(
        gage > 0
          ? Math.round((point.y - topEdge) / gage)
          : point.boltIndex,
      )
    })

    return rowsByColumn.map((rows, columnIndex) => (
      rows.length ? rows.sort((first, second) => first - second) : getFallbackBoltRows(netArea, columnIndex)
    ))
  }

  return [0, 1].map((columnIndex) => getFallbackBoltRows(netArea, columnIndex))
}

function getFallbackBoltRows(netArea, columnIndex) {
  const count = netArea.diagram.boltCounts[columnIndex] || 0
  return Array.from({ length: count }, (_, rowIndex) => rowIndex)
}

function DimensionLabel({ x, y, children, rotate = 0 }) {
  return (
    <text
      x={x}
      y={y}
      fill={STROKE}
      fontFamily="JetBrains Mono, monospace"
      fontSize="10"
      textAnchor="middle"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {children}
    </text>
  )
}

function GussetPlate({ rectangular }) {
  if (rectangular) {
    return (
      <rect
        x="42"
        y="28"
        width="172"
        height="184"
        fill="#f8f8f8"
        stroke={STROKE}
        strokeWidth="1.5"
      />
    )
  }

  return (
    <polygon
      points="42,28 214,54 214,186 42,212"
      fill="#f8f8f8"
      stroke={STROKE}
      strokeWidth="1.5"
    />
  )
}

function Dimensions({ netArea, geometry }) {
  const [x1, x2] = geometry.columnXs
  const [y1, y2] = geometry.rowYs

  return (
    <g fill="none" stroke={STROKE} strokeWidth="0.8">
      <line x1={x1} y1="34" x2={x1} y2="18" />
      <line x1={x2} y1="34" x2={x2} y2="18" />
      <line x1={x1} y1="23" x2={x2} y2="23" />
      <DimensionLabel x={(x1 + x2) / 2} y="15">{`s = ${netArea.diagram.pitch_s_mm} mm`}</DimensionLabel>

      <line x1="296" y1={y1} x2="312" y2={y1} />
      <line x1="296" y1={y2} x2="312" y2={y2} />
      <line x1="306" y1={y1} x2="306" y2={y2} />
      <DimensionLabel x="320" y={(y1 + y2) / 2} rotate={-90}>{`g = ${netArea.diagram.gage_g_mm} mm`}</DimensionLabel>

      <line x1="118" y1="192" x2="118" y2="218" />
      <line x1={x1} y1="192" x2={x1} y2="218" />
      <line x1="118" y1="210" x2={x1} y2="210" />
      <DimensionLabel x={(118 + x1) / 2} y="230">{`${netArea.diagram.horizontalEdgeDistance_mm} mm`}</DimensionLabel>
    </g>
  )
}

function BoltGrid({ boltRowsByColumn, geometry }) {
  return (
    <g>
      {geometry.columnXs.map((x) => (
        <line
          key={`column-${x}`}
          x1={x}
          y1="42"
          x2={x}
          y2="192"
          stroke={MUTED}
          strokeWidth="1"
          strokeDasharray="6 6"
        />
      ))}
      {geometry.rowYs.map((y) => (
        <line
          key={`row-${y}`}
          x1="118"
          y1={y}
          x2="288"
          y2={y}
          stroke={MUTED}
          strokeWidth="1"
          strokeDasharray="6 6"
        />
      ))}
      {geometry.columnXs.flatMap((x, columnIndex) => (
        boltRowsByColumn[columnIndex].map((rowIndex) => (
          <circle
            key={`${columnIndex}-${rowIndex}`}
            cx={x}
            cy={geometry.rowYs[rowIndex] ?? geometry.rowYs[geometry.rowYs.length - 1]}
            r="7"
            fill="#ffffff"
            stroke={STROKE}
            strokeWidth="1.6"
          />
        ))
      ))}
    </g>
  )
}

function RupturePath({ path, geometry }) {
  const points = path.pathPoints.map((point) => {
    const nextPoint = path.pathId === 'straight'
      ? { ...point, columnIndex: path.columnIndex }
      : point
    return getPointCoordinates(nextPoint, geometry)
  })

  if (!points.length) {
    return null
  }

  const rupturePoints = [
    { x: points[0].x, y: MEMBER_TOP_Y },
    ...points,
    { x: points[points.length - 1].x, y: MEMBER_BOTTOM_Y },
  ]

  if (rupturePoints.length === 1) {
    const point = rupturePoints[0]
    return (
      <line
        x1={point.x}
        y1={point.y - 28}
        x2={point.x}
        y2={point.y + 28}
        stroke={PATH}
        strokeWidth="3"
        strokeLinecap="round"
      />
    )
  }

  return (
    <polyline
      points={rupturePoints.map((point) => `${point.x},${point.y}`).join(' ')}
      fill="none"
      stroke={PATH}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

export default function NetAreaPathDiagram({ title, path, netArea }) {
  const rowCount = getRows(netArea)
  const rowSpacing = 150 / (rowCount + 1)
  const boltRowsByColumn = getBoltRowsByColumn(netArea)
  const geometry = {
    columnXs: [158, 218],
    rowYs: Array.from({ length: rowCount }, (_, index) => MEMBER_TOP_Y + rowSpacing * (index + 1)),
  }

  return (
    <figure className={`net-area-diagram-card${path.isCritical ? ' net-area-diagram-critical' : ''}`}>
      <figcaption>{title}</figcaption>
      <svg viewBox="0 0 360 250" role="img" aria-label={`${title} net area path`}>
        <GussetPlate rectangular={netArea.diagram.rectangularGusset} />
        <rect x="118" y={MEMBER_TOP_Y} width="170" height="150" fill="none" stroke={STROKE} strokeWidth="1.7" />
        <BoltGrid boltRowsByColumn={boltRowsByColumn} geometry={geometry} />
        <RupturePath path={path} geometry={geometry} />
        <Dimensions netArea={netArea} geometry={geometry} />
      </svg>
    </figure>
  )
}
