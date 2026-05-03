import {
  getBoltInputSummary,
  getMemberInputSummary,
  normalizeMaterialStrength,
} from './steelUtils'

function placeholderCheck(id, title, purpose) {
  return {
    id,
    title,
    status: 'pending',
    nominal: null,
    lrfd: null,
    asd: null,
    equations: [],
    steps: [
      {
        id: `${id}-setup`,
        title: 'Setup',
        body: `${purpose} will be implemented in a later analysis prompt.`,
        equations: [],
      },
      {
        id: `${id}-placeholder`,
        title: 'Calculation placeholder',
        body: 'Inputs are normalized now so equations and LaTeX-rendered steps can plug into this check object.',
        equations: [],
      },
    ],
  }
}

function buildWarnings(inputs) {
  const warnings = [
    'Strength calculations are not implemented yet.',
    'Do not use this outline for design decisions.',
  ]

  if (inputs.member.section && !inputs.member.section.verified) {
    warnings.push('Selected section data is unverified.')
  }

  return warnings
}

export function analyzeProblem(problem) {
  const inputs = {
    problemType: problem.problemType,
    member: getMemberInputSummary(problem),
    material: normalizeMaterialStrength(problem.member),
    gusset: {
      arrangement: problem.gusset.arrangement,
      mirroredEnds: problem.gusset.mirroredEnds,
      shape: problem.gusset.shape,
      assumedRigid: problem.gusset.assumedRigid,
    },
    connection: {
      connectedElement: problem.connection.connectedElement,
    },
    bolts: getBoltInputSummary(problem),
    failurePath: {
      mode: problem.failurePath.mode,
      pointCount: problem.failurePath.points.length,
    },
  }

  const checks = [
    placeholderCheck('gross-area', 'Gross area', 'Gross section area extraction'),
    placeholderCheck('net-area', 'Net area', 'Net section area calculation with holes'),
    placeholderCheck('effective-net-area', 'Effective net area', 'Shear lag and effective net area calculation'),
    placeholderCheck('gross-section-yielding', 'Gross section yielding', 'Gross yielding tensile strength check'),
    placeholderCheck('net-section-rupture', 'Net section rupture', 'Net section rupture tensile strength check'),
    placeholderCheck('block-shear', 'Block shear', 'Block shear rupture/yielding path check'),
    placeholderCheck('governing-result', 'Governing result', 'Governing tensile design strength selection'),
  ]

  return {
    status: 'outline',
    inputs,
    checks,
    governing: {
      status: 'pending',
      checkId: null,
      title: 'Governing result',
      lrfd: null,
      asd: null,
    },
    warnings: buildWarnings(inputs),
    assumptions: [
      'All geometric dimensions are interpreted in mm.',
      'Material strengths are interpreted in MPa.',
      'Bolt holes are treated as standard holes for now.',
      'Gusset plates are mirrored at both ends and modeled as rigid descriptor assumptions.',
      'No fracture path or capacity algorithm has been evaluated yet.',
    ],
  }
}
