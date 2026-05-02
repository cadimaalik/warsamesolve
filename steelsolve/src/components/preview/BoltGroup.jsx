const BOLT_STROKE = '#202020'
const CENTERLINE_STROKE = '#8f8f8f'

function uniquePoints(points) {
  const seen = new Set()

  return points.filter((point) => {
    const key = `${point.x.toFixed(3)}:${point.y.toFixed(3)}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

export default function BoltGroup({ layout, mapX, mapY, radius, region }) {
  const boltPoints = uniquePoints(layout.boltPoints)

  return (
    <g>
      {layout.columnLines.map((x) => (
        <line
          key={`column-${x}`}
          x1={mapX(x)}
          y1={region.y}
          x2={mapX(x)}
          y2={region.y + region.height}
          stroke={CENTERLINE_STROKE}
          strokeWidth="1"
          strokeDasharray="7 6"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {layout.transverseLines.map((y) => (
        <line
          key={`line-${y}`}
          x1={region.x}
          y1={mapY(y)}
          x2={region.x + region.width}
          y2={mapY(y)}
          stroke={CENTERLINE_STROKE}
          strokeWidth="1"
          strokeDasharray="7 6"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {boltPoints.map((point) => (
        <circle
          key={`${point.columnIndex}-${point.boltIndex}-${point.x}-${point.y}`}
          cx={mapX(point.x)}
          cy={mapY(point.y)}
          r={radius}
          fill="#ffffff"
          stroke={BOLT_STROKE}
          strokeWidth="1.7"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  )
}
