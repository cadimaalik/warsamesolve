function toNumber(value) {
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

function toPositiveInteger(value) {
  const next = Number.parseInt(value, 10)
  return Number.isFinite(next) && next >= 1 ? next : null
}

function parseBoltDiameter(diameter) {
  const match = String(diameter ?? '').match(/\d+/)
  return match ? Number(match[0]) : 24
}

function getBoltCounts(bolts, columnCount) {
  if (bolts.sameBoltCountEachColumn) {
    const boltsPerColumn = toPositiveInteger(bolts.boltsPerColumn)
    return boltsPerColumn ? Array.from({ length: columnCount }, () => boltsPerColumn) : null
  }

  const counts = Array.from({ length: columnCount }, (_, index) => (
    toPositiveInteger(bolts.boltCountsByColumn[index])
  ))

  return counts.every(Boolean) ? counts : null
}

export function getTypicalEndDetailLayout(problem) {
  const bolts = problem.bolts
  const columnCount = toPositiveInteger(bolts.columnCount)

  if (!columnCount) {
    return { status: 'incomplete', message: 'Enter bolt columns and bolt counts' }
  }

  const boltCounts = getBoltCounts(bolts, columnCount)

  if (!boltCounts) {
    return { status: 'incomplete', message: 'Enter bolt columns and bolt counts' }
  }

  const pitch = toNumber(bolts.pitch_s_mm)
  const gage = toNumber(bolts.gage_g_mm)
  const horizontalEdge = toNumber(bolts.horizontalEdgeDistance_mm)
  const topEdge = toNumber(bolts.topEdgeDistance_mm)
  const bottomEdge = toNumber(bolts.bottomEdgeDistance_mm)

  if ([pitch, gage, horizontalEdge, topEdge, bottomEdge].some((value) => value === null || value < 0)) {
    return { status: 'incomplete', message: 'Enter valid spacing and edge distances' }
  }

  const maxBoltCount = Math.max(...boltCounts)
  const isStaggered = !bolts.sameBoltCountEachColumn && new Set(boltCounts).size > 1
  const maxBoltLineLevel = isStaggered ? Math.max(0, 2 * (maxBoltCount - 1)) : Math.max(0, maxBoltCount - 1)
  const warnings = []

  if (columnCount > 1 && pitch === 0) {
    warnings.push('s = 0 with multiple columns')
  }

  if (maxBoltLineLevel > 0 && gage === 0) {
    warnings.push('g = 0 with multiple bolt lines')
  }

  const extension = Math.max(horizontalEdge * 0.6, 40)
  const width = horizontalEdge + Math.max(0, columnCount - 1) * pitch + horizontalEdge + extension
  const height = topEdge + maxBoltLineLevel * gage + bottomEdge

  const boltPoints = boltCounts.flatMap((count, columnIndex) => {
    return Array.from({ length: count }, (_, boltIndex) => ({
      columnIndex,
      boltIndex,
      x: horizontalEdge + columnIndex * pitch,
      y: topEdge + (
        isStaggered
          ? (maxBoltCount - count) + boltIndex * 2
          : boltIndex
      ) * gage,
    }))
  })

  const columnLines = Array.from({ length: columnCount }, (_, columnIndex) => (
    horizontalEdge + columnIndex * pitch
  ))
  const transverseLines = Array.from({ length: maxBoltLineLevel + 1 }, (_, lineIndex) => (
    topEdge + lineIndex * gage
  ))

  return {
    status: 'ready',
    boltDiameter: parseBoltDiameter(bolts.diameter),
    boltCounts,
    maxBoltCount,
    maxBoltLineLevel,
    isStaggered,
    warnings,
    geometry: {
      width,
      height,
      pitch,
      gage,
      horizontalEdge,
      topEdge,
      bottomEdge,
      extension,
    },
    boltPoints,
    columnLines: [...new Set(columnLines)],
    transverseLines: [...new Set(transverseLines)],
  }
}
