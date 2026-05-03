import {
  getBoltInputSummary,
  getMemberInputSummary,
  normalizeMaterialStrength,
} from './steelUtils'

const grossYieldingFactors = {
  phi_t: 0.9,
  omega_t: 1.67,
}

function formatEquationNumber(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }

  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits,
    useGrouping: false,
  })
}

function placeholderCheck(id, title, purpose) {
  return {
    id,
    title,
    status: 'pending',
    area: null,
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

function buildGrossAreaCheck(member) {
  const isSplicePlate = member.type === 'splice-plate'
  const Ag_mm2 = isSplicePlate
    ? member.width_mm * member.thickness_mm
    : member.section?.properties?.A_mm2 ?? null
  const source = isSplicePlate
    ? 'calculated from plate dimensions'
    : 'section database'

  const equations = isSplicePlate
    ? [
      'A_g = b t',
      `A_g = ${formatEquationNumber(member.width_mm)}(${formatEquationNumber(member.thickness_mm)}) = ${formatEquationNumber(Ag_mm2)} \\text{ mm}^2`,
    ]
    : [
      `A_g = ${formatEquationNumber(Ag_mm2)} \\text{ mm}^2`,
    ]

  return {
    check: {
      id: 'gross-area',
      title: 'Gross area',
      status: 'complete',
      area: {
        value_mm2: Ag_mm2,
        source,
      },
      nominal: null,
      lrfd: null,
      asd: null,
      equations,
      steps: [
        {
          id: 'gross-area-source',
          title: 'Area source',
          body: isSplicePlate
            ? 'Use the user-entered splice plate width and thickness for the gross rectangular area.'
            : 'Use the selected rolled section gross area from the section database.',
          equations,
        },
      ],
    },
    Ag_mm2,
    source,
  }
}

function buildGrossSectionYieldingCheck(material, grossArea) {
  const Fy_MPa = material.Fy_MPa
  const Ag_mm2 = grossArea.Ag_mm2
  const Pn_kN = (Fy_MPa * Ag_mm2) / 1000
  const lrfd_kN = grossYieldingFactors.phi_t * Pn_kN
  const asd_kN = Pn_kN / grossYieldingFactors.omega_t
  const equations = [
    'P_n = F_y A_g',
    `P_n = ${formatEquationNumber(Fy_MPa)}(${formatEquationNumber(Ag_mm2)}) / 1000 = ${formatEquationNumber(Pn_kN)} \\text{ kN}`,
    `\\phi_t P_n = 0.90(${formatEquationNumber(Pn_kN)}) = ${formatEquationNumber(lrfd_kN)} \\text{ kN}`,
    `\\frac{P_n}{\\Omega_t} = \\frac{${formatEquationNumber(Pn_kN)}}{1.67} = ${formatEquationNumber(asd_kN)} \\text{ kN}`,
  ]

  return {
    id: 'gross-section-yielding',
    title: 'Gross section yielding',
    status: 'complete',
    area: null,
    nominal: Pn_kN,
    lrfd: lrfd_kN,
    asd: asd_kN,
    equations,
    steps: [
      {
        id: 'gross-section-yielding-nominal',
        title: 'Nominal strength',
        body: 'Calculate gross section yielding strength using Fy and the gross area Ag.',
        equations: equations.slice(0, 2),
      },
      {
        id: 'gross-section-yielding-design',
        title: 'Design strengths',
        body: 'Apply the LRFD resistance factor and ASD safety factor for tensile yielding.',
        equations: equations.slice(2),
      },
    ],
  }
}

function buildWarnings(inputs) {
  const warnings = [
    'Only gross area and gross section yielding are implemented.',
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

  const grossArea = buildGrossAreaCheck(inputs.member)

  const checks = [
    grossArea.check,
    placeholderCheck('net-area', 'Net area', 'Net section area calculation with holes'),
    placeholderCheck('effective-net-area', 'Effective net area', 'Shear lag and effective net area calculation'),
    buildGrossSectionYieldingCheck(inputs.material, grossArea),
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
      'Net area, rupture, block shear, and governing comparison are not evaluated yet.',
    ],
  }
}
