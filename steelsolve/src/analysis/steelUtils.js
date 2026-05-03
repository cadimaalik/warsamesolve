import { getSectionByDesignation } from '../utils/sectionLookup'

const standardHoleDiameters = {
  M12: 14,
  M16: 18,
  M20: 22,
  M22: 24,
  M24: 26,
  M27: 30,
  M30: 33,
}

export function parseNumericInput(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatNumber(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }

  return Number(value).toLocaleString(undefined, { maximumFractionDigits })
}

export function formatKn(value) {
  return `${formatNumber(value)} kN`
}

export function formatMm2(value) {
  return `${formatNumber(value, 1)} mm2`
}

export function parseBoltLabel(label) {
  const match = String(label ?? '').match(/\d+/)
  return match ? Number(match[0]) : null
}

export function getStandardHoleDiameter(boltLabel) {
  return standardHoleDiameters[boltLabel] ?? null
}

export function normalizeMaterialStrength(member) {
  return {
    grade: member.material.grade || '',
    Fy_MPa: parseNumericInput(member.material.Fy_MPa),
    Fu_MPa: parseNumericInput(member.material.Fu_MPa),
  }
}

export function getSelectedSectionProperties(problem) {
  if (problem.member.memberType !== 'rolled-section') {
    return null
  }

  const section = getSectionByDesignation(
    problem.member.sectionFamily,
    problem.member.sectionDesignation,
  )

  if (!section) {
    return null
  }

  return {
    family: section.family,
    designation: section.designation,
    shapeType: section.shapeType,
    dimensions: section.dimensions ?? {},
    properties: section.properties ?? {},
    verified: Boolean(section.verified),
  }
}

export function getMemberInputSummary(problem) {
  const section = getSelectedSectionProperties(problem)

  if (problem.member.memberType === 'splice-plate') {
    return {
      type: 'splice-plate',
      label: 'Splice plate',
      width_mm: parseNumericInput(problem.member.splicePlate.width_mm),
      thickness_mm: parseNumericInput(problem.member.splicePlate.thickness_mm),
      section,
    }
  }

  return {
    type: 'rolled-section',
    label: 'Rolled section',
    sectionFamily: problem.member.sectionFamily,
    sectionDesignation: problem.member.sectionDesignation,
    connectedElement: problem.connection.connectedElement,
    section,
  }
}

export function getBoltInputSummary(problem) {
  return {
    diameter: problem.bolts.diameter,
    diameter_mm: parseBoltLabel(problem.bolts.diameter),
    standardHoleDiameter_mm: getStandardHoleDiameter(problem.bolts.diameter),
    holeType: problem.bolts.holeType,
    columnCount: parseNumericInput(problem.bolts.columnCount),
    sameBoltCountEachColumn: Boolean(problem.bolts.sameBoltCountEachColumn),
    boltsPerColumn: parseNumericInput(problem.bolts.boltsPerColumn),
    boltCountsByColumn: problem.bolts.boltCountsByColumn.map(parseNumericInput),
    pitch_s_mm: parseNumericInput(problem.bolts.pitch_s_mm),
    gage_g_mm: parseNumericInput(problem.bolts.gage_g_mm),
    horizontalEdgeDistance_mm: parseNumericInput(problem.bolts.horizontalEdgeDistance_mm),
    topEdgeDistance_mm: parseNumericInput(problem.bolts.topEdgeDistance_mm),
    bottomEdgeDistance_mm: parseNumericInput(problem.bolts.bottomEdgeDistance_mm),
  }
}
