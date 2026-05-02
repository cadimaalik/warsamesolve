const SECTION_STROKE = '#202020'
const SECTION_FILL = '#fbfbfb'

function ShapeRect({ x, y, width, height }) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={SECTION_FILL}
      stroke={SECTION_STROKE}
      strokeWidth="1.6"
      vectorEffect="non-scaling-stroke"
    />
  )
}

function IShape({ geometry }) {
  const { x, y, bf, d, tw, tf } = geometry
  const webX = x + (bf - tw) / 2

  return (
    <g>
      <ShapeRect x={x} y={y} width={bf} height={tf} />
      <ShapeRect x={webX} y={y + tf} width={tw} height={d - 2 * tf} />
      <ShapeRect x={x} y={y + d - tf} width={bf} height={tf} />
    </g>
  )
}

function ChannelShape({ geometry }) {
  const { x, y, d, bf, tw, tf } = geometry

  return (
    <g>
      <ShapeRect x={x} y={y} width={tw} height={d} />
      <ShapeRect x={x} y={y} width={bf} height={tf} />
      <ShapeRect x={x} y={y + d - tf} width={bf} height={tf} />
    </g>
  )
}

function AngleShape({ geometry }) {
  const { x, y, h, b, t } = geometry

  return (
    <g>
      <ShapeRect x={x} y={y} width={t} height={h} />
      <ShapeRect x={x} y={y + h - t} width={b} height={t} />
    </g>
  )
}

function PlateShape({ geometry }) {
  const { x, y, width, height } = geometry

  return <ShapeRect x={x} y={y} width={width} height={height} />
}

export default function SectionShape({ geometry }) {
  if (!geometry) {
    return null
  }

  if (geometry.kind === 'i-shape') {
    return <IShape geometry={geometry} />
  }

  if (geometry.kind === 'channel') {
    return <ChannelShape geometry={geometry} />
  }

  if (geometry.kind === 'angle') {
    return <AngleShape geometry={geometry} />
  }

  if (geometry.kind === 'plate') {
    return <PlateShape geometry={geometry} />
  }

  return null
}
