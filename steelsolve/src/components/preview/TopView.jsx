const STROKE = '#202020'

export default function TopView({ problem }) {
  const isSplicePlate = problem?.member?.memberType === 'splice-plate'
  const memberHeight = isSplicePlate ? 26 : 34
  const memberY = 110 - memberHeight / 2

  return (
    <svg viewBox="0 0 900 220" role="img" aria-label="Overall top view schematic">
      <defs>
        <marker
          id="top-view-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={STROKE} />
        </marker>
      </defs>

      <g fill="none" stroke={STROKE} strokeWidth="2" vectorEffect="non-scaling-stroke">
        <path d="M 42 36 L 205 74 L 205 146 L 42 184 Z" />
        <path d="M 858 36 L 695 74 L 695 146 L 858 184 Z" />
        <rect x="185" y={memberY} width="530" height={memberHeight} />
        <line x1="76" y1="110" x2="18" y2="110" markerEnd="url(#top-view-arrow)" />
        <line x1="824" y1="110" x2="882" y2="110" markerEnd="url(#top-view-arrow)" />
      </g>
    </svg>
  )
}
