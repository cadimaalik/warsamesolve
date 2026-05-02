const STROKE = '#202020'
const I_SHAPE_FAMILIES = ['IPN', 'IPE', 'HEA', 'HEB', 'HEM', 'HD']

function getTopViewKind(problem) {
  const { memberType, sectionFamily } = problem?.member ?? {}

  if (memberType === 'splice-plate') {
    return 'splice-plate'
  }

  if (['equal-angle', 'unequal-angle'].includes(sectionFamily)) {
    return 'angle'
  }

  if (sectionFamily === 'UPN') {
    return 'channel'
  }

  if (I_SHAPE_FAMILIES.includes(sectionFamily)) {
    return 'i-shape'
  }

  return 'generic'
}

function TopViewMember({ kind }) {
  const memberHeight = kind === 'splice-plate' ? 26 : 42
  const memberY = 110 - memberHeight / 2
  const x = 185
  const width = 530

  if (kind === 'angle') {
    return (
      <g>
        <rect x={x} y={memberY} width={width} height={memberHeight} />
        <line x1={x} y1={memberY + 13} x2={x + width} y2={memberY + 13} />
        <line x1={x + 26} y1={memberY + 13} x2={x + 26} y2={memberY + memberHeight} />
      </g>
    )
  }

  if (kind === 'channel') {
    return (
      <g>
        <rect x={x} y={memberY} width={width} height={memberHeight} />
        <line x1={x} y1={memberY + 10} x2={x + width} y2={memberY + 10} />
        <line x1={x} y1={memberY + memberHeight - 10} x2={x + width} y2={memberY + memberHeight - 10} />
        <line x1={x + 24} y1={memberY + 10} x2={x + 24} y2={memberY + memberHeight - 10} />
      </g>
    )
  }

  if (kind === 'i-shape') {
    return (
      <g>
        <rect x={x} y={memberY} width={width} height={memberHeight} />
        <line x1={x} y1={memberY + 9} x2={x + width} y2={memberY + 9} />
        <line x1={x} y1={memberY + memberHeight - 9} x2={x + width} y2={memberY + memberHeight - 9} />
        <line x1={x} y1={110} x2={x + width} y2={110} />
      </g>
    )
  }

  return <rect x={x} y={memberY} width={width} height={memberHeight} />
}

export default function TopView({ problem }) {
  const topViewKind = getTopViewKind(problem)

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
        <TopViewMember kind={topViewKind} />
        <line x1="76" y1="110" x2="18" y2="110" markerEnd="url(#top-view-arrow)" />
        <line x1="824" y1="110" x2="882" y2="110" markerEnd="url(#top-view-arrow)" />
      </g>
    </svg>
  )
}
