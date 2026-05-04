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

function formatU(value) {
  return formatEquationNumber(value, 3)
}

function readNumber(source, keys) {
  for (const key of keys) {
    const value = source?.[key]

    if (Number.isFinite(value)) {
      return value
    }
  }

  return null
}

function readSectionValue(section, keys) {
  return readNumber(section?.dimensions, keys) ?? readNumber(section?.properties, keys)
}

function allFinite(values) {
  return values.every((value) => Number.isFinite(value))
}

function getShapeKind(member) {
  const section = member.section

  if (member.type === 'splice-plate') {
    return 'plate'
  }

  if (section?.shapeType === 'i-shape' || I_SHAPE_FAMILIES.includes(section?.family)) {
    return 'i-shape'
  }

  if (section?.shapeType === 'channel' || section?.family === 'UPN') {
    return 'channel'
  }

  if (['equal-angle', 'unequal-angle'].includes(section?.shapeType)) {
    return section.shapeType
  }

  return 'unknown'
}

function getSectionDimensions(section) {
  return {
    Ag: readSectionValue(section, ['A_mm2', 'A']),
    d: readSectionValue(section, ['d_mm', 'd', 'h_mm', 'h']),
    bf: readSectionValue(section, ['bf_mm', 'bf', 'b_mm', 'b']),
    tw: readSectionValue(section, ['tw_mm', 'tw']),
    tf: readSectionValue(section, ['tf_mm', 'tf']),
    h: readSectionValue(section, ['h_mm', 'h', 'd_mm', 'd']),
    b: readSectionValue(section, ['b_mm', 'b', 'bf_mm', 'bf']),
    t: readSectionValue(section, ['t_mm', 't']),
    xs: readSectionValue(section, ['xs_mm', 'xs']),
    ys: readSectionValue(section, ['ys_mm', 'ys']),
  }
}

function unavailableCase(caseId, label, note) {
  return {
    caseId,
    label,
    status: 'unavailable',
    U: null,
    equations: [],
    note,
  }
}

function buildDoubleFlangeX(values, shapeKind) {
  const { d, bf, tw, tf } = values

  if (!allFinite([d, bf, tw, tf]) || d / 2 <= tf) {
    return {
      x: null,
      equations: [],
      note: 'Composite centroid x needs d, bf, tw, and tf from the section database.',
    }
  }

  const Af = bf * tf
  const AwH = tw * (d / 2 - tf)
  const yf = tf / 2
  const yw = tf + (d / 2 - tf) / 2
  const x = (Af * yf + AwH * yw) / (Af + AwH)

  return {
    x,
    diagram: {
      type: 'double-flange',
      shapeKind,
      values: { d, bf, tw, tf, x },
    },
    equations: [
      'A_f = b_f t_f',
      `A_f = ${formatEquationNumber(bf)}(${formatEquationNumber(tf)}) = ${formatEquationNumber(Af)} \\text{ mm}^2`,
      'A_{w,h} = t_w\\left(\\frac{d}{2} - t_f\\right)',
      `A_{w,h} = ${formatEquationNumber(tw)}\\left(\\frac{${formatEquationNumber(d)}}{2} - ${formatEquationNumber(tf)}\\right) = ${formatEquationNumber(AwH)} \\text{ mm}^2`,
      'y_f = \\frac{t_f}{2}',
      `y_f = \\frac{${formatEquationNumber(tf)}}{2} = ${formatEquationNumber(yf)} \\text{ mm}`,
      'y_w = t_f + \\frac{d/2 - t_f}{2}',
      `y_w = ${formatEquationNumber(tf)} + \\frac{${formatEquationNumber(d)}/2 - ${formatEquationNumber(tf)}}{2} = ${formatEquationNumber(yw)} \\text{ mm}`,
      'x = \\frac{A_f y_f + A_{w,h} y_w}{A_f + A_{w,h}}',
      `x = \\frac{${formatEquationNumber(Af)}(${formatEquationNumber(yf)}) + ${formatEquationNumber(AwH)}(${formatEquationNumber(yw)})}{${formatEquationNumber(Af)} + ${formatEquationNumber(AwH)}} = ${formatEquationNumber(x)} \\text{ mm}`,
    ],
    note: 'Use the connected flange plus half web to locate the composite centroid.',
  }
}

function buildDoubleWebX(values) {
  const { d, bf, tw, tf } = values

  if (!allFinite([d, bf, tw, tf]) || d <= 2 * tf) {
    return {
      x: null,
      equations: [],
      note: 'Composite centroid x needs d, bf, tw, and tf from the section database.',
    }
  }

  const topH = (bf / 2) * tf
  const botH = (bf / 2) * tf
  const webH = (tw / 2) * (d - 2 * tf)
  const xf = bf / 4
  const xw = tw / 4
  const xBar = (topH * xf + botH * xf + webH * xw) / (topH + botH + webH)
  const x = Math.abs(xBar - tw / 2)

  return {
    x,
    diagram: {
      type: 'double-web',
      shapeKind: 'i-shape',
      values: { d, bf, tw, tf, x, xBar },
    },
    equations: [
      'A_{top,h} = \\frac{b_f}{2}t_f',
      `A_{top,h} = \\frac{${formatEquationNumber(bf)}}{2}(${formatEquationNumber(tf)}) = ${formatEquationNumber(topH)} \\text{ mm}^2`,
      'A_{bot,h} = \\frac{b_f}{2}t_f',
      `A_{bot,h} = \\frac{${formatEquationNumber(bf)}}{2}(${formatEquationNumber(tf)}) = ${formatEquationNumber(botH)} \\text{ mm}^2`,
      'A_{web,h} = \\frac{t_w}{2}(d - 2t_f)',
      `A_{web,h} = \\frac{${formatEquationNumber(tw)}}{2}(${formatEquationNumber(d)} - 2(${formatEquationNumber(tf)})) = ${formatEquationNumber(webH)} \\text{ mm}^2`,
      'x_f = \\frac{b_f}{4}',
      `x_f = \\frac{${formatEquationNumber(bf)}}{4} = ${formatEquationNumber(xf)} \\text{ mm}`,
      'x_w = \\frac{t_w}{4}',
      `x_w = \\frac{${formatEquationNumber(tw)}}{4} = ${formatEquationNumber(xw)} \\text{ mm}`,
      '\\bar{x} = \\frac{A_{top,h}x_f + A_{bot,h}x_f + A_{web,h}x_w}{A_{top,h}+A_{bot,h}+A_{web,h}}',
      `\\bar{x} = ${formatEquationNumber(xBar)} \\text{ mm}`,
      'x = \\left|\\bar{x} - \\frac{t_w}{2}\\right|',
      `x = \\left|${formatEquationNumber(xBar)} - \\frac{${formatEquationNumber(tw)}}{2}\\right| = ${formatEquationNumber(x)} \\text{ mm}`,
    ],
    note: 'Use one connected half-section and measure from the web face to its centroid.',
  }
}

function getCase2X(member, connection, gusset, shapeKind, values) {
  const isDouble = gusset.arrangement === 'double'
  const connectedElement = connection.connectedElement

  if (shapeKind === 'i-shape') {
    if (connectedElement === 'flange') {
      return isDouble
        ? buildDoubleFlangeX(values, shapeKind)
        : simpleX(values.d, 'x = \\frac{d}{2}', `x = \\frac{${formatEquationNumber(values.d)}}{2} = ${formatEquationNumber(values.d / 2)} \\text{ mm}`, 'Single gusset flange connection uses x = d/2.')
    }

    if (connectedElement === 'web') {
      return isDouble
        ? buildDoubleWebX(values)
        : simpleX(values.tw, 'x = \\frac{t_w}{2}', `x = \\frac{${formatEquationNumber(values.tw)}}{2} = ${formatEquationNumber(values.tw / 2)} \\text{ mm}`, 'Single gusset web connection uses x = tw/2.', 2)
    }
  }

  if (shapeKind === 'channel') {
    if (connectedElement === 'flange') {
      return isDouble
        ? buildDoubleFlangeX(values, shapeKind)
        : simpleX(values.d, 'x = \\frac{d}{2}', `x = \\frac{${formatEquationNumber(values.d)}}{2} = ${formatEquationNumber(values.d / 2)} \\text{ mm}`, 'Single flange connection uses x = d/2.')
    }

    if (connectedElement === 'web') {
      if (!Number.isFinite(values.xs) || (isDouble && !Number.isFinite(values.tw))) {
        return unavailableX('Channel web Case 2 needs xs and tw from the section database.')
      }

      const x = isDouble ? Math.abs(values.xs - values.tw / 2) : values.xs
      const equations = isDouble
        ? ['x = \\left|x_s - \\frac{t_w}{2}\\right|', `x = \\left|${formatEquationNumber(values.xs)} - \\frac{${formatEquationNumber(values.tw)}}{2}\\right| = ${formatEquationNumber(x)} \\text{ mm}`]
        : ['x = x_s', `x = ${formatEquationNumber(x)} \\text{ mm}`]

      return {
        x,
        equations,
        note: isDouble
          ? 'Double web connection uses the distance from the channel centroid to the connected web face.'
          : 'Single gusset web connection uses xs from the section database.',
      }
    }
  }

  if (shapeKind === 'equal-angle') {
    if (!Number.isFinite(values.xs) || (isDouble && !Number.isFinite(values.t))) {
      return unavailableX('Equal angle Case 2 needs xs and t from the section database.')
    }

    const x = isDouble ? Math.abs(values.xs - values.t / 2) : values.xs
    const equations = isDouble
      ? ['x = \\left|x_s - \\frac{t}{2}\\right|', `x = \\left|${formatEquationNumber(values.xs)} - \\frac{${formatEquationNumber(values.t)}}{2}\\right| = ${formatEquationNumber(x)} \\text{ mm}`]
      : ['x = x_s = y_s', `x = ${formatEquationNumber(x)} \\text{ mm}`]

    return {
      x,
      equations,
      note: isDouble
        ? 'Double gusset equal angle connection uses the distance from centroid to connected leg face.'
        : 'Equal angle connection uses xs = ys from the section database.',
    }
  }

  if (shapeKind === 'unequal-angle') {
    const centroid = connectedElement === 'short-leg' ? values.ys : values.xs
    const symbol = connectedElement === 'short-leg' ? 'y_s' : 'x_s'

    if (!Number.isFinite(centroid) || (isDouble && !Number.isFinite(values.t))) {
      return unavailableX('Unequal angle Case 2 needs the selected leg centroid and t from the section database.')
    }

    const x = isDouble ? Math.abs(centroid - values.t / 2) : centroid
    const equations = isDouble
      ? [`x = \\left|${symbol} - \\frac{t}{2}\\right|`, `x = \\left|${formatEquationNumber(centroid)} - \\frac{${formatEquationNumber(values.t)}}{2}\\right| = ${formatEquationNumber(x)} \\text{ mm}`]
      : [`x = ${symbol}`, `x = ${formatEquationNumber(x)} \\text{ mm}`]

    return {
      x,
      equations,
      note: connectedElement === 'short-leg'
        ? 'Unequal angle short-leg connection uses ys from the section database.'
        : 'Unequal angle long-leg connection uses xs from the section database.',
    }
  }

  return unavailableX('Case 2 x is unavailable for this member shape.')
}

function simpleX(value, symbolic, numeric, note, divisor = 2) {
  if (!Number.isFinite(value)) {
    return unavailableX('Case 2 x needs the required section dimension from the database.')
  }

  return {
    x: value / divisor,
    equations: [symbolic, numeric],
    note,
  }
}

function unavailableX(note) {
  return {
    x: null,
    equations: [],
    note,
  }
}

function buildCase2(member, connection, gusset, bolts, shapeKind, values) {
  const columnCount = bolts.columnCount
  const pitch = bolts.pitch_s_mm
  const l = (columnCount - 1) * pitch
  const setupEquations = [
    'U_2 = 1 - \\frac{x}{l}',
    'l = (\\text{number of fasteners per line in the direction of loading} - 1)s',
    `l = (${formatEquationNumber(columnCount, 0)} - 1)(${formatEquationNumber(pitch)}) = ${formatEquationNumber(l)} \\text{ mm}`,
  ]

  if (!Number.isFinite(l) || l <= 0) {
    return {
      caseId: 'case-2',
      label: 'Case 2',
      status: 'unavailable',
      x_mm: null,
      l_mm: l,
      U: null,
      equations: setupEquations,
      note: 'Connection length is not positive, so Case 2 is unavailable.',
    }
  }

  const xResult = getCase2X(member, connection, gusset, shapeKind, values)

  if (!Number.isFinite(xResult.x)) {
    return {
      caseId: 'case-2',
      label: 'Case 2',
      status: 'unavailable',
      x_mm: null,
      l_mm: l,
      U: null,
      equations: setupEquations,
      note: xResult.note,
      diagram: xResult.diagram,
    }
  }

  const U = 1 - xResult.x / l
  const isValid = U > 0 && U <= 1

  return {
    caseId: 'case-2',
    label: 'Case 2',
    status: isValid ? 'complete' : 'unavailable',
    x_mm: xResult.x,
    l_mm: l,
    U: isValid ? U : null,
    equations: [
      ...setupEquations,
      ...xResult.equations,
      `U_2 = 1 - \\frac{${formatEquationNumber(xResult.x)}}{${formatEquationNumber(l)}} = ${formatU(U)}`,
    ],
    note: isValid ? xResult.note : 'Case 2 produced a non-positive U and is not used.',
    diagram: xResult.diagram,
  }
}

function buildCase7(shapeKind, connection, bolts, values) {
  if (shapeKind !== 'i-shape') {
    return unavailableCase('case-7', 'Case 7', 'Case 7 applies only to W/M/S/HP/I-shape style sections.')
  }

  const n = bolts.columnCount
  const baseRules = [
    'U_7 = 0.90 \\quad \\text{if } b_f \\ge \\frac{2d}{3}',
    'U_7 = 0.85 \\quad \\text{if } b_f < \\frac{2d}{3}',
    'U_7 = 0.70 \\quad \\text{for web connection with 4 or more fasteners per line in the direction of loading}',
  ]

  if (connection.connectedElement === 'flange') {
    if (n < 3) {
      return unavailableCase('case-7', 'Case 7', 'Case 7 flange connection needs at least 3 fasteners per line.')
    }

    if (!allFinite([values.bf, values.d])) {
      return unavailableCase('case-7', 'Case 7', 'Case 7 needs bf and d from the section database.')
    }

    const limit = (2 * values.d) / 3
    const U = values.bf >= limit ? 0.9 : 0.85

    return {
      caseId: 'case-7',
      label: 'Case 7',
      status: 'complete',
      U,
      equations: [
        ...baseRules,
        `\\text{number of fasteners per line in the direction of loading} = ${formatEquationNumber(n, 0)}`,
        `b_f = ${formatEquationNumber(values.bf)} \\text{ mm}`,
        `\\frac{2d}{3} = \\frac{2(${formatEquationNumber(values.d)})}{3} = ${formatEquationNumber(limit)} \\text{ mm}`,
        `U_7 = ${formatU(U)}`,
      ],
      note: values.bf >= limit ? 'The flange width satisfies bf >= 2d/3.' : 'The flange width is less than 2d/3.',
    }
  }

  if (connection.connectedElement === 'web') {
    if (n < 4) {
      return unavailableCase('case-7', 'Case 7', 'Case 7 web connection needs at least 4 fasteners per line.')
    }

    return {
      caseId: 'case-7',
      label: 'Case 7',
      status: 'complete',
      U: 0.7,
      equations: [
        ...baseRules,
        `\\text{number of fasteners per line in the direction of loading} = ${formatEquationNumber(n, 0)}`,
        'U_7 = 0.70',
      ],
      note: 'The web connection has at least 4 fasteners per line.',
    }
  }

  return unavailableCase('case-7', 'Case 7', 'Case 7 is unavailable for this connected element.')
}

function buildCase8(shapeKind, bolts) {
  if (!['equal-angle', 'unequal-angle'].includes(shapeKind)) {
    return unavailableCase('case-8', 'Case 8', 'Case 8 applies only to single or double angles.')
  }

  const n = bolts.columnCount
  const baseRules = [
    'U_8 = 0.80 \\quad \\text{for 4 or more fasteners per line in the direction of loading}',
    'U_8 = 0.60 \\quad \\text{for 3 fasteners per line in the direction of loading}',
  ]

  if (n >= 4) {
    return {
      caseId: 'case-8',
      label: 'Case 8',
      status: 'complete',
      U: 0.8,
      equations: [
        ...baseRules,
        `\\text{number of fasteners per line in the direction of loading} = ${formatEquationNumber(n, 0)}`,
        'U_8 = 0.80',
      ],
      note: 'The angle connection has at least 4 fasteners per line.',
    }
  }

  if (n === 3) {
    return {
      caseId: 'case-8',
      label: 'Case 8',
      status: 'complete',
      U: 0.6,
      equations: [
        ...baseRules,
        '\\text{number of fasteners per line in the direction of loading} = 3',
        'U_8 = 0.60',
      ],
      note: 'The angle connection has 3 fasteners per line.',
    }
  }

  return unavailableCase('case-8', 'Case 8', 'Case 8 needs at least 3 fasteners per line.')
}

function buildSelection(candidates) {
  const validCandidates = candidates.filter((candidate) => candidate.status === 'complete' && Number.isFinite(candidate.U))

  if (!validCandidates.length) {
    return null
  }

  return validCandidates.reduce((best, candidate) => (candidate.U > best.U ? candidate : best), validCandidates[0])
}

function buildSelectionEquations(case2, specialCase, selected) {
  const valid = [case2, specialCase].filter((item) => item?.status === 'complete' && Number.isFinite(item.U))

  if (!selected || !valid.length) {
    return ['U \\text{ is unavailable}']
  }

  if (valid.length === 1) {
    const label = valid[0].caseId === 'case-2' ? 'U_2' : `U_${valid[0].caseId.split('-')[1]}`
    return [`U = ${label} = ${formatU(selected.U)}`]
  }

  const labels = valid.map((item) => (item.caseId === 'case-2' ? 'U_2' : `U_${item.caseId.split('-')[1]}`))
  const values = valid.map((item) => `${item.caseId === 'case-2' ? 'U_2' : `U_${item.caseId.split('-')[1]}`} = ${formatU(item.U)}`)

  return [
    `U = \\max(${labels.join(', ')})`,
    `U = \\max(${values.join(', ')}) = ${formatU(selected.U)}`,
  ]
}

function flattenEquations(sections) {
  return sections.flatMap((section, index) => [
    ...(index ? [''] : []),
    ...section.equations,
  ])
}

function makeSection(id, heading, equations, note = '', diagram = null) {
  return {
    id,
    heading,
    equations,
    note,
    diagram,
  }
}

function buildPlateCheck(An_mm2) {
  const sections = [
    makeSection(
      'case-1',
      'Case 1 — Direct load transfer',
      [
        '\\text{All cross-sectional elements are directly connected.}',
        'U = 1.0',
      ],
      'Direct load transfer applies for the current bolted plate scope.',
    ),
    makeSection(
      'effective-area',
      'Effective net area',
      [
        'A_e = A_n U',
        `A_e = (${formatEquationNumber(An_mm2)})(1.0) = ${formatEquationNumber(An_mm2)} \\text{ mm}^2`,
      ],
    ),
  ]

  return {
    id: 'effective-net-area',
    title: 'Effective net area',
    status: 'complete',
    area: { value_mm2: An_mm2, source: 'direct plate connection' },
    nominal: null,
    lrfd: null,
    asd: null,
    equations: flattenEquations(sections),
    effectiveNetArea: {
      An_mm2,
      Ae_mm2: An_mm2,
      U: 1,
      selectedCase: 'direct-plate',
      selectedReason: 'Direct load transfer applies.',
      case1: { status: 'complete', U: 1 },
      case2: null,
      specialCase: null,
      sections,
    },
    steps: [],
  }
}

export function buildEffectiveNetAreaCheck({ inputs, netAreaCheck }) {
  const An_mm2 = netAreaCheck?.netArea?.critical?.area_mm2

  if (!Number.isFinite(An_mm2)) {
    return {
      id: 'effective-net-area',
      title: 'Effective net area',
      status: 'pending',
      area: null,
      nominal: null,
      lrfd: null,
      asd: null,
      equations: [],
      effectiveNetArea: null,
      steps: [],
    }
  }

  if (inputs.member.type === 'splice-plate') {
    return buildPlateCheck(An_mm2)
  }

  const shapeKind = getShapeKind(inputs.member)
  const values = getSectionDimensions(inputs.member.section)
  const case2 = buildCase2(inputs.member, inputs.connection, inputs.gusset, inputs.bolts, shapeKind, values)
  const specialCase = shapeKind === 'i-shape'
    ? buildCase7(shapeKind, inputs.connection, inputs.bolts, values)
    : buildCase8(shapeKind, inputs.bolts)
  const selected = buildSelection([case2, specialCase])
  const U = selected?.U ?? null
  const Ae_mm2 = Number.isFinite(U) ? An_mm2 * U : null
  const sections = [
    makeSection(
      'case-1',
      'Case 1 — Direct load transfer',
      ['\\text{Not all cross-sectional elements are directly connected.}'],
      'Shear lag must be considered.',
    ),
    makeSection(
      'case-2',
      'Case 2 — General shear lag',
      case2.equations,
      case2.note,
      case2.diagram,
    ),
  ]

  if (specialCase.status === 'complete') {
    sections.push(makeSection(
      specialCase.caseId,
      specialCase.caseId === 'case-7' ? 'Case 7 — W/M/S/HP rule' : 'Case 8 — Angle rule',
      specialCase.equations,
      specialCase.note,
    ))
  }

  sections.push(makeSection(
    'selection',
    'Selection of final U',
    buildSelectionEquations(case2, specialCase, selected),
    selected ? 'Use the larger valid shear lag factor.' : 'No valid shear lag factor is available from the current inputs.',
  ))

  sections.push(makeSection(
    'effective-area',
    'Effective net area',
    Number.isFinite(Ae_mm2)
      ? [
        'A_e = A_n U',
        `A_e = (${formatEquationNumber(An_mm2)})(${formatU(U)}) = ${formatEquationNumber(Ae_mm2)} \\text{ mm}^2`,
      ]
      : ['A_e = A_n U'],
  ))

  return {
    id: 'effective-net-area',
    title: 'Effective net area',
    status: 'complete',
    area: Number.isFinite(Ae_mm2)
      ? { value_mm2: Ae_mm2, source: selected.label }
      : null,
    nominal: null,
    lrfd: null,
    asd: null,
    equations: flattenEquations(sections),
    effectiveNetArea: {
      An_mm2,
      Ae_mm2,
      U,
      selectedCase: selected?.caseId ?? null,
      selectedReason: selected?.note ?? 'No valid shear lag factor is available from the current inputs.',
      case1: { status: 'unavailable', U: null },
      case2,
      specialCase,
      sections,
    },
    steps: [],
  }
}
