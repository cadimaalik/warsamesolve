function isBlank(value) {
  return value === '' || value === null || value === undefined
}

function asNumber(value) {
  return typeof value === 'number' ? value : Number(value)
}

function isPositive(value) {
  return !isBlank(value) && Number.isFinite(asNumber(value)) && asNumber(value) > 0
}

function isAtLeast(value, minimum) {
  return !isBlank(value) && Number.isFinite(asNumber(value)) && asNumber(value) >= minimum
}

function validateOptionalMinimum(value, minimum, label, issues) {
  if (!isBlank(value) && !isAtLeast(value, minimum)) {
    issues.push(`${label} must be at least ${minimum}.`)
  }
}

export function validateProblem(problem) {
  const issues = []

  if (!problem.member.memberType) {
    issues.push('Member type is required.')
  }

  if (!problem.member.material.grade) {
    issues.push('Steel grade is required.')
  }

  if (problem.member.material.grade === 'custom') {
    if (!isPositive(problem.member.material.Fy_MPa)) {
      issues.push('Custom Fy must be a positive MPa value.')
    }
    if (!isPositive(problem.member.material.Fu_MPa)) {
      issues.push('Custom Fu must be a positive MPa value.')
    }
  }

  if (problem.member.memberType === 'rolled-section' && !problem.member.sectionFamily) {
    issues.push('Section family is required for rolled sections.')
  }

  if (problem.member.memberType === 'splice-plate') {
    if (!isPositive(problem.member.splicePlate.width_mm)) {
      issues.push('Plate width must be a positive mm value.')
    }
    if (!isPositive(problem.member.splicePlate.thickness_mm)) {
      issues.push('Plate thickness must be a positive mm value.')
    }
  }

  if (!problem.gusset.arrangement) {
    issues.push('Gusset arrangement is required.')
  }

  if (problem.member.memberType !== 'splice-plate' && !problem.connection.connectedElement) {
    issues.push('Connected element is required.')
  }

  validateOptionalMinimum(problem.bolts.columnCount, 1, 'Number of longitudinal bolt columns', issues)

  if (problem.bolts.sameBoltCountEachColumn) {
    validateOptionalMinimum(problem.bolts.boltsPerColumn, 1, 'Bolts per column', issues)
  } else if (problem.bolts.boltCountsByColumn.length > 0) {
    problem.bolts.boltCountsByColumn.forEach((count, index) => {
      if (!isAtLeast(count, 1)) {
        issues.push(`Bolts in column ${index + 1} must be at least 1.`)
      }
    })
  }

  if (!isAtLeast(problem.bolts.pitch_s_mm, 0)) {
    issues.push('Pitch, s, must be 0 or greater.')
  }

  if (!isAtLeast(problem.bolts.gage_g_mm, 0)) {
    issues.push('Gage, g, must be 0 or greater.')
  }

  if (!isPositive(problem.bolts.horizontalEdgeDistance_mm)) {
    issues.push('Horizontal edge distance must be positive.')
  }

  if (!isPositive(problem.bolts.topEdgeDistance_mm)) {
    issues.push('Top edge distance must be positive.')
  }

  if (!isPositive(problem.bolts.bottomEdgeDistance_mm)) {
    issues.push('Bottom edge distance must be positive.')
  }

  return issues
}
