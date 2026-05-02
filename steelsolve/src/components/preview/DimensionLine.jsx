const STROKE = '#202020'

export default function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  textX = (x1 + x2) / 2,
  textY = (y1 + y2) / 2,
  rotate = 0,
}) {
  return (
    <g className="dimension-line" fill="none" stroke={STROKE} strokeWidth="1.1" vectorEffect="non-scaling-stroke">
      <line x1={x1} y1={y1} x2={x2} y2={y2} markerStart="url(#dimension-tick)" markerEnd="url(#dimension-tick)" />
      <text
        x={textX}
        y={textY}
        fill={STROKE}
        stroke="none"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={rotate ? `rotate(${rotate} ${textX} ${textY})` : undefined}
      >
        {label}
      </text>
    </g>
  )
}
