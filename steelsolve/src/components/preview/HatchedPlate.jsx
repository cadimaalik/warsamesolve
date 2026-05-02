export default function HatchedPlate({
  x,
  y,
  width,
  height,
  patternId,
  stroke = '#202020',
}) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={`url(#${patternId})`}
      stroke={stroke}
      strokeWidth="1.5"
      vectorEffect="non-scaling-stroke"
    />
  )
}
