import {
  getBoltInputSummary,
  getMemberInputSummary,
  normalizeMaterialStrength,
} from './steelUtils'
import { getTypicalEndDetailLayout } from '../utils/boltLayout'

const grossYieldingFactors = {
  phi_t: 0.9,
  omega_t: 1.67,
}

const I_SHAPE_FAMILIES = ['IPN', 'IPE', 'HEA', 'HEB', 'HEM', 'HD']

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

function getConnectedThickness(member, connection) {
  if (member.type === 'splice-plate') {
    return {
      value_mm: member.thickness_mm,
      source: 'splice plate thickness',
    }
  }

  const section = member.section
  const dimensions = section?.dimensions ?? {}

  if (section?.shapeType === 'i-shape' || I_SHAPE_FAMILIES.includes(section?.family)) {
    if (connection.connectedElement === 'web') {
      return {
        value_mm: dimensions.tw_mm,
        source: 'section web thickness, t_w',
      }
    }

    return {
      value_mm: dimensions.tf_mm,
      source: 'section flange thickness, t_f',
    }
  }

  if (section?.shapeType === 'channel' || section?.family === 'UPN') {
    if (connection.connectedElement === 'flange') {
      return {
        value_mm: dimensions.tf_mm,
        source: 'channel flange thickness, t_f',
      }
    }

    return {
      value_mm: dimensions.tw_mm,
      source: 'channel web thickness, t_w',
    }
  }

  if (['equal-angle', 'unequal-angle'].includes(section?.shapeType)) {
    return {
      value_mm: dimensions.t_mm,
      source: 'angle leg thickness',
    }
  }

  return {
    value_mm: dimensions.t_mm ?? dimensions.tw_mm ?? dimensions.tf_mm ?? null,
    source: 'connected element thickness',
  }
}

function getBoltCounts(bolts) {
  const columnCount = Math.max(0, Math.trunc(bolts.columnCount ?? 0))

  if (!columnCount) {
    return []
  }

  if (bolts.sameBoltCountEachColumn) {
    const boltsPerColumn = Math.max(0, Math.trunc(bolts.boltsPerColumn ?? 0))
    return Array.from({ length: columnCount }, () => boltsPerColumn)
  }

  return Array.from({ length: columnCount }, (_, index) => (
    Math.max(0, Math.trunc(bolts.boltCountsByColumn[index] ?? 0))
  ))
}

function buildHoleTerm(holeCount, netHoleDiameter_mm, thickness_mm) {
  return `${holeCount}(${formatEquationNumber(netHoleDiameter_mm)})(${formatEquationNumber(thickness_mm)})`
}

function buildZigzagTerm(jumpCount, pitch_mm, gage_mm, thickness_mm) {
  if (!jumpCount) {
    return `0\\left(\\frac{${formatEquationNumber(pitch_mm)}^2}{4(${formatEquationNumber(gage_mm)})}\\right)(${formatEquationNumber(thickness_mm)})`
  }

  return `${jumpCount}\\left(\\frac{${formatEquationNumber(pitch_mm)}^2}{4(${formatEquationNumber(gage_mm)})}\\right)(${formatEquationNumber(thickness_mm)})`
}

function buildPathPoints(pathKind, holeCount, outerColumnIndex) {
  if (holeCount <= 0) {
    return []
  }

  if (pathKind === 'zigzag') {
    return Array.from({ length: holeCount }, (_, index) => ({
      columnIndex: index % 2 === 0 ? outerColumnIndex : Math.max(0, outerColumnIndex - 1),
      rowIndex: index,
    }))
  }

  return Array.from({ length: holeCount }, (_, index) => ({
    columnIndex: outerColumnIndex,
    rowIndex: index,
  }))
}

function buildNetAreaCheck(problem, inputs, grossArea) {
  const layout = getTypicalEndDetailLayout(problem)
  const boltCounts = getBoltCounts(inputs.bolts)
  const connectedThickness = getConnectedThickness(inputs.member, inputs.connection)
  const thickness_mm = connectedThickness.value_mm
  const standardHoleDiameter_mm = inputs.bolts.standardHoleDiameter_mm
  const netHoleDiameter_mm = standardHoleDiameter_mm + 2
  const Ag_mm2 = grossArea.Ag_mm2
  const straightHoleCount = Math.max(...boltCounts, 0)
  const firstTwoBoltCounts = boltCounts.slice(0, 2)
  const outerColumnIndex = firstTwoBoltCounts.length >= 2 ? 1 : 0
  const zigzagHoleCount = firstTwoBoltCounts.length >= 2
    ? Math.max(...firstTwoBoltCounts, 0)
    : straightHoleCount
  const zigzagJumpCount = firstTwoBoltCounts.length >= 2 && inputs.bolts.pitch_s_mm > 0 && inputs.bolts.gage_g_mm > 0
    ? Math.max(0, zigzagHoleCount - 1)
    : 0
  const zigzagAddition_mm2 = zigzagJumpCount
    ? zigzagJumpCount * ((inputs.bolts.pitch_s_mm ** 2) / (4 * inputs.bolts.gage_g_mm)) * thickness_mm
    : 0
  const straightArea_mm2 = Ag_mm2 - straightHoleCount * netHoleDiameter_mm * thickness_mm
  const zigzagArea_mm2 = Ag_mm2 - zigzagHoleCount * netHoleDiameter_mm * thickness_mm + zigzagAddition_mm2
  const criticalPath = straightArea_mm2 <= zigzagArea_mm2 ? 'straight' : 'zigzag'
  const criticalArea_mm2 = Math.min(straightArea_mm2, zigzagArea_mm2)
  const straightEquations = [
    'A_n = A_g - \\sum d_n t',
    `d_n = ${formatEquationNumber(standardHoleDiameter_mm)} + 2 = ${formatEquationNumber(netHoleDiameter_mm)} \\text{ mm}`,
    `A_n = ${formatEquationNumber(Ag_mm2)} - ${buildHoleTerm(straightHoleCount, netHoleDiameter_mm, thickness_mm)} = ${formatEquationNumber(straightArea_mm2)} \\text{ mm}^2`,
  ]
  const zigzagEquations = [
    'A_n = A_g - \\sum d_n t + \\sum \\frac{s^2}{4g}t',
    `A_n = ${formatEquationNumber(Ag_mm2)} - ${buildHoleTerm(zigzagHoleCount, netHoleDiameter_mm, thickness_mm)} + ${buildZigzagTerm(zigzagJumpCount, inputs.bolts.pitch_s_mm, inputs.bolts.gage_g_mm, thickness_mm)} = ${formatEquationNumber(zigzagArea_mm2)} \\text{ mm}^2`,
  ]
  const criticalEquations = [
    `A_{n,crit} = \\min(${formatEquationNumber(straightArea_mm2)}, ${formatEquationNumber(zigzagArea_mm2)}) = ${formatEquationNumber(criticalArea_mm2)} \\text{ mm}^2`,
  ]

  return {
    id: 'net-area',
    title: 'Net area',
    status: 'complete',
    area: {
      value_mm2: criticalArea_mm2,
      source: `${criticalPath} path`,
    },
    nominal: null,
    lrfd: null,
    asd: null,
    equations: criticalEquations,
    netArea: {
      connectedThickness,
      standardHoleDiameter_mm,
      netHoleDiameter_mm,
      straight: {
        pathId: 'straight',
        title: 'Straight path',
        area_mm2: straightArea_mm2,
        holeCount: straightHoleCount,
        jumpCount: 0,
        columnIndex: outerColumnIndex,
        pathPoints: buildPathPoints('straight', straightHoleCount, outerColumnIndex),
        equations: straightEquations,
        isCritical: criticalPath === 'straight',
      },
      zigzag: {
        pathId: 'zigzag',
        title: 'Zigzag path',
        area_mm2: zigzagArea_mm2,
        holeCount: zigzagHoleCount,
        jumpCount: zigzagJumpCount,
        pathPoints: buildPathPoints('zigzag', zigzagHoleCount, outerColumnIndex),
        equations: zigzagEquations,
        isCritical: criticalPath === 'zigzag',
      },
      critical: {
        pathId: criticalPath,
        area_mm2: criticalArea_mm2,
        equations: criticalEquations,
      },
      diagram: {
        layout: layout.status === 'ready' ? layout : null,
        boltCounts,
        pitch_s_mm: inputs.bolts.pitch_s_mm,
        gage_g_mm: inputs.bolts.gage_g_mm,
        horizontalEdgeDistance_mm: inputs.bolts.horizontalEdgeDistance_mm,
        topEdgeDistance_mm: inputs.bolts.topEdgeDistance_mm,
        bottomEdgeDistance_mm: inputs.bolts.bottomEdgeDistance_mm,
        rectangularGusset: (
          inputs.member.type === 'rolled-section'
          && inputs.member.section?.shapeType === 'i-shape'
          && inputs.connection.connectedElement === 'web'
        ),
      },
    },
    steps: [
      {
        id: 'net-area-setup',
        title: 'Setup',
        body: 'Evaluate straight and zigzag net-area paths automatically and select the smaller net area.',
        equations: [],
      },
    ],
  }
}

function buildWarnings(inputs) {
  const warnings = [
    'Only gross area, net area, and gross section yielding are implemented.',
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
  }

  const grossArea = buildGrossAreaCheck(inputs.member)

  const checks = [
    grossArea.check,
    buildNetAreaCheck(problem, inputs, grossArea),
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
      'Effective net area, rupture, block shear, and governing comparison are not evaluated yet.',
    ],
  }
}
