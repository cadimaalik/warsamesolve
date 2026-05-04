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

function allFinite(values) {
  return values.every((value) => Number.isFinite(value))
}

function buildUnavailableCase(caseId, label, note) {
  return {
    caseId,
    label,
    status: 'unavailable',
    U: null,
    equations: [],
    note,
  }
}

function buildIShapeDoubleFlangeX(values) {
  const { d, bf, tw, tf } = values

  if (!allFinite([d, bf, tw, tf]) || d / 2 <= tf) {
    return {
      x: null,
      equations: [],
      note: 'Case 2 x for double flange connection needs d, bf, tw, and tf from the section database.',
    }
  }

  const Af = bf * tf
  const AwHalf = tw * (d / 2 - tf)
  const yf = tf / 2
  const yw = tf + (d / 2 - tf) / 2
  const x = (Af * yf + AwHalf * yw) / (Af + AwHalf)

  return {
    x,
    equations: [
      'A_f = b_f t_f',
      `A_f = ${formatEquationNumber(bf)}(${formatEquationNumber(tf)}) = ${formatEquationNumber(Af)} \\text{ mm}^2`,
      `A_{w,half} = t_w\\left(\\frac{d}{2} - t_f\\right)`,
      `A_{w,half} = ${formatEquationNumber(tw)}\\left(\\frac{${formatEquationNumber(d)}}{2} - ${formatEquationNumber(tf)}\\right) = ${formatEquationNumber(AwHalf)} \\text{ mm}^2`,
      `x = \\frac{A_f y_f + A_{w,half} y_w}{A_f + A_{w,half}} = ${formatEquationNumber(x)} \\text{ mm}`,
    ],
    note: 'For double flange connection, x is based on one connected half-section.',
  }
}

function buildIShapeDoubleWebX(values) {
  const { d, bf, tw, tf } = values

  if (!allFinite([d, bf, tw, tf]) || d <= 2 * tf) {
    return {
      x: null,
      equations: [],
      note: 'Case 2 x for double web connection needs d, bf, tw, and tf from the section database.',
    }
  }

  const topHalf = (bf / 2) * tf
  const bottomHalf = (bf / 2) * tf
  const webHalf = (tw / 2) * (d - 2 * tf)
  const xf = bf / 4
  const xw = tw / 4
  const xBar = (topHalf * xf + bottomHalf * xf + webHalf * xw) / (topHalf + bottomHalf + webHalf)
  const x = Math.abs(xBar - tw / 2)

  return {
    x,
    equations: [
      `A_{top,half} = \\frac{b_f}{2}t_f = ${formatEquationNumber(topHalf)} \\text{ mm}^2`,
      `A_{bottom,half} = \\frac{b_f}{2}t_f = ${formatEquationNumber(bottomHalf)} \\text{ mm}^2`,
      `A_{web,half} = \\frac{t_w}{2}(d - 2t_f) = ${formatEquationNumber(webHalf)} \\text{ mm}^2`,
      `\\bar{x} = \\frac{A_{top,half}x_f + A_{bottom,half}x_f + A_{web,half}x_w}{A_{top,half}+A_{bottom,half}+A_{web,half}} = ${formatEquationNumber(xBar)} \\text{ mm}`,
      `x = \\left|\\bar{x} - \\frac{t_w}{2}\\right| = ${formatEquationNumber(x)} \\text{ mm}`,
    ],
    note: 'For double web connection, x is based on one connected half-section.',
  }
}

function getCase2X(member, connection, gusset, shapeKind, values) {
  const isDouble = gusset.arrangement === 'double'
  const connectedElement = connection.connectedElement

  if (shapeKind === 'i-shape') {
    if (connectedElement === 'flange') {
      if (isDouble) {
        return buildIShapeDoubleFlangeX(values)
      }

      if (!Number.isFinite(values.d)) {
        return {
          x: null,
          equations: [],
          note: 'Single flange Case 2 needs d from the section database.',
        }
      }

      return {
        x: values.d / 2,
        equations: [`x = \\frac{d}{2} = \\frac{${formatEquationNumber(values.d)}}{2} = ${formatEquationNumber(values.d / 2)} \\text{ mm}`],
        note: 'Single gusset flange connection uses x = d/2.',
      }
    }

    if (connectedElement === 'web') {
      if (isDouble) {
        return buildIShapeDoubleWebX(values)
      }

      if (!Number.isFinite(values.tw)) {
        return {
          x: null,
          equations: [],
          note: 'Single web Case 2 needs tw from the section database.',
        }
      }

      return {
        x: values.tw / 2,
        equations: [`x = \\frac{t_w}{2} = \\frac{${formatEquationNumber(values.tw)}}{2} = ${formatEquationNumber(values.tw / 2)} \\text{ mm}`],
        note: 'Single gusset web connection uses x = tw/2.',
      }
    }
  }

  if (shapeKind === 'channel') {
    if (connectedElement === 'flange') {
      if (isDouble) {
        return buildIShapeDoubleFlangeX(values)
      }

      if (!Number.isFinite(values.d)) {
        return {
          x: null,
          equations: [],
          note: 'Single flange Case 2 needs d from the section database.',
        }
      }

      return {
        x: values.d / 2,
        equations: [`x = \\frac{d}{2} = \\frac{${formatEquationNumber(values.d)}}{2} = ${formatEquationNumber(values.d / 2)} \\text{ mm}`],
        note: 'Single flange connection uses x = d/2.',
      }
    }

    if (connectedElement === 'web') {
      if (!Number.isFinite(values.xs) || (isDouble && !Number.isFinite(values.tw))) {
        return {
          x: null,
          equations: [],
          note: 'Channel web Case 2 needs xs and tw from the section database.',
        }
      }

      const x = isDouble ? Math.abs(values.xs - values.tw / 2) : values.xs
      const equations = isDouble
        ? [`x = \\left|x_s - \\frac{t_w}{2}\\right| = \\left|${formatEquationNumber(values.xs)} - \\frac{${formatEquationNumber(values.tw)}}{2}\\right| = ${formatEquationNumber(x)} \\text{ mm}`]
        : [`x = x_s = ${formatEquationNumber(x)} \\text{ mm}`]

      return {
        x,
        equations,
        note: isDouble
          ? 'Double web connection uses distance from centroid to connected web face.'
          : 'Single gusset web connection uses the channel centroid distance xs.',
      }
    }
  }

  if (shapeKind === 'equal-angle') {
    if (!Number.isFinite(values.xs) || (isDouble && !Number.isFinite(values.t))) {
      return {
        x: null,
        equations: [],
        note: 'Equal angle Case 2 needs xs and t from the section database.',
      }
    }

    const x = isDouble ? Math.abs(values.xs - values.t / 2) : values.xs
    const equations = isDouble
      ? [`x = \\left|x_s - \\frac{t}{2}\\right| = \\left|${formatEquationNumber(values.xs)} - \\frac{${formatEquationNumber(values.t)}}{2}\\right| = ${formatEquationNumber(x)} \\text{ mm}`]
      : [`x = x_s = y_s = ${formatEquationNumber(x)} \\text{ mm}`]

    return {
      x,
      equations,
      note: isDouble
        ? 'Double gusset equal angle connection uses distance from centroid to connected leg face.'
        : 'Equal angle connection uses xs = ys from the section database.',
    }
  }

  if (shapeKind === 'unequal-angle') {
    const centroid = connectedElement === 'short-leg' ? values.ys : values.xs
    const symbol = connectedElement === 'short-leg' ? 'y_s' : 'x_s'

    if (!Number.isFinite(centroid) || (isDouble && !Number.isFinite(values.t))) {
      return {
        x: null,
        equations: [],
        note: 'Unequal angle Case 2 needs the selected leg centroid and t from the section database.',
      }
    }

    const x = isDouble ? Math.abs(centroid - values.t / 2) : centroid
    const equations = isDouble
      ? [`x = \\left|${symbol} - \\frac{t}{2}\\right| = \\left|${formatEquationNumber(centroid)} - \\frac{${formatEquationNumber(values.t)}}{2}\\right| = ${formatEquationNumber(x)} \\text{ mm}`]
      : [`x = ${symbol} = ${formatEquationNumber(x)} \\text{ mm}`]

    return {
      x,
      equations,
      note: connectedElement === 'short-leg'
        ? 'Unequal angle short-leg connection uses ys from the section database.'
        : 'Unequal angle long-leg connection uses xs from the section database.',
    }
  }

  return {
    x: null,
    equations: [],
    note: 'Case 2 x is unavailable for this member shape.',
  }
}

function buildCase2(member, connection, gusset, bolts, shapeKind, values) {
  const columnCount = bolts.columnCount
  const pitch = bolts.pitch_s_mm
  const l = (columnCount - 1) * pitch

  const setupEquations = [
    'l = (n_{columns} - 1)s',
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
      note: 'Case 2 is unavailable because the connection length l is not positive.',
    }
  }

  const xResult = getCase2X(member, connection, gusset, shapeKind, values)
  const x = xResult.x

  if (!Number.isFinite(x)) {
    return {
      caseId: 'case-2',
      label: 'Case 2',
      status: 'unavailable',
      x_mm: null,
      l_mm: l,
      U: null,
      equations: setupEquations,
      note: xResult.note,
    }
  }

  const U = 1 - x / l
  const isValid = U > 0 && U <= 1

  return {
    caseId: 'case-2',
    label: 'Case 2',
    status: isValid ? 'complete' : 'unavailable',
    x_mm: x,
    l_mm: l,
    U: isValid ? U : null,
    equations: [
      'U_2 = 1 - \\frac{x}{l}',
      ...setupEquations,
      ...xResult.equations,
      `U_2 = 1 - \\frac{${formatEquationNumber(x)}}{${formatEquationNumber(l)}} = ${formatU(U)}`,
    ],
    note: isValid
      ? xResult.note
      : 'Case 2 produced a non-positive U and is not used.',
  }
}

function buildCase7(shapeKind, connection, bolts, values) {
  if (shapeKind !== 'i-shape') {
    return buildUnavailableCase('case-7', 'Case 7', 'Case 7 applies only to I-shaped sections.')
  }

  const n = bolts.columnCount

  if (connection.connectedElement === 'flange') {
    if (n < 3) {
      return buildUnavailableCase('case-7', 'Case 7', 'Case 7 flange connection needs at least 3 fasteners per line.')
    }

    if (!allFinite([values.bf, values.d])) {
      return buildUnavailableCase('case-7', 'Case 7', 'Case 7 needs bf and d from the section database.')
    }

    const limit = (2 * values.d) / 3
    const U = values.bf >= limit ? 0.9 : 0.85

    return {
      caseId: 'case-7',
      label: 'Case 7',
      status: 'complete',
      U,
      equations: [
        `n_{columns} = ${formatEquationNumber(n, 0)} \\ge 3`,
        `\\frac{2d}{3} = \\frac{2(${formatEquationNumber(values.d)})}{3} = ${formatEquationNumber(limit)} \\text{ mm}`,
        `b_f = ${formatEquationNumber(values.bf)} \\text{ mm}`,
        `U_7 = ${formatU(U)}`,
      ],
      note: values.bf >= limit
        ? 'I-shape flange connection satisfies bf >= 2d/3.'
        : 'I-shape flange connection has bf < 2d/3.',
    }
  }

  if (connection.connectedElement === 'web') {
    if (n < 4) {
      return buildUnavailableCase('case-7', 'Case 7', 'Case 7 web connection needs at least 4 fasteners per line.')
    }

    return {
      caseId: 'case-7',
      label: 'Case 7',
      status: 'complete',
      U: 0.7,
      equations: [
        `n_{columns} = ${formatEquationNumber(n, 0)} \\ge 4`,
        'U_7 = 0.70',
      ],
      note: 'I-shape web connection with at least 4 fasteners per line uses Case 7.',
    }
  }

  return buildUnavailableCase('case-7', 'Case 7', 'Case 7 is unavailable for this connected element.')
}

function buildCase8(shapeKind, bolts) {
  if (!['equal-angle', 'unequal-angle'].includes(shapeKind)) {
    return buildUnavailableCase('case-8', 'Case 8', 'Case 8 applies only to single or double angles.')
  }

  const n = bolts.columnCount

  if (n >= 4) {
    return {
      caseId: 'case-8',
      label: 'Case 8',
      status: 'complete',
      U: 0.8,
      equations: [
        `n_{columns} = ${formatEquationNumber(n, 0)} \\ge 4`,
        'U_8 = 0.80',
      ],
      note: 'Angle connection with at least 4 fasteners per line uses Case 8.',
    }
  }

  if (n === 3) {
    return {
      caseId: 'case-8',
      label: 'Case 8',
      status: 'complete',
      U: 0.6,
      equations: [
        'n_{columns} = 3',
        'U_8 = 0.60',
      ],
      note: 'Angle connection with 3 fasteners per line uses Case 8.',
    }
  }

  return buildUnavailableCase('case-8', 'Case 8', 'Case 8 needs at least 3 fasteners per line.')
}

function buildConnectedArea(shapeKind, connection, gusset, values) {
  const isDouble = gusset.arrangement === 'double'
  const connectedElement = connection.connectedElement

  if (shapeKind === 'i-shape' || shapeKind === 'channel') {
    if (connectedElement === 'flange' && allFinite([values.bf, values.tf])) {
      const multiplier = isDouble ? 2 : 1
      return {
        area: multiplier * values.bf * values.tf,
        equation: `A_{connected} = ${multiplier === 2 ? '2' : ''}b_f t_f = ${formatEquationNumber(multiplier * values.bf * values.tf)} \\text{ mm}^2`,
      }
    }

    if (connectedElement === 'web' && allFinite([values.tw, values.d, values.tf])) {
      return {
        area: values.tw * (values.d - 2 * values.tf),
        equation: `A_{connected} = t_w(d - 2t_f) = ${formatEquationNumber(values.tw * (values.d - 2 * values.tf))} \\text{ mm}^2`,
      }
    }
  }

  if (shapeKind === 'equal-angle' && allFinite([values.h, values.t])) {
    return {
      area: values.h * values.t,
      equation: `A_{connected} = h t = ${formatEquationNumber(values.h * values.t)} \\text{ mm}^2`,
    }
  }

  if (shapeKind === 'unequal-angle' && allFinite([values.h, values.b, values.t])) {
    const leg = connectedElement === 'short-leg' ? values.b : values.h
    const symbol = connectedElement === 'short-leg' ? 'b' : 'h'

    return {
      area: leg * values.t,
      equation: `A_{connected} = ${symbol}t = ${formatEquationNumber(leg * values.t)} \\text{ mm}^2`,
    }
  }

  return null
}

function buildLowerBound(shapeKind, member, connection, gusset, values) {
  if (shapeKind === 'plate') {
    return buildUnavailableCase('lower-bound', 'Open-section lower bound', 'The open-section lower-bound rule is not applied to plates.')
  }

  if (!Number.isFinite(values.Ag)) {
    return buildUnavailableCase('lower-bound', 'Open-section lower bound', 'Gross area is unavailable, so Umin is skipped.')
  }

  const connectedArea = buildConnectedArea(shapeKind, connection, gusset, values)

  if (!connectedArea?.area || connectedArea.area <= 0) {
    return buildUnavailableCase('lower-bound', 'Open-section lower bound', 'Connected-element gross area is not clear from the section properties, so Umin is skipped.')
  }

  const U = connectedArea.area / values.Ag

  return {
    caseId: 'lower-bound',
    label: 'Open-section lower bound',
    status: 'complete',
    U,
    A_connected_mm2: connectedArea.area,
    equations: [
      'U_{min} = \\frac{A_{connected}}{A_g}',
      connectedArea.equation,
      `U_{min} = \\frac{${formatEquationNumber(connectedArea.area)}}{${formatEquationNumber(values.Ag)}} = ${formatU(U)}`,
    ],
    note: 'Apply the open-section lower-bound ratio for the connected element.',
  }
}

function getCandidateEquations(candidates) {
  return candidates
    .filter((candidate) => candidate.status === 'complete' && Number.isFinite(candidate.U))
    .map((candidate) => `${candidate.caseId === 'lower-bound' ? 'U_{min}' : `U_${candidate.caseId.split('-')[1]}`} = ${formatU(candidate.U)}`)
}

function buildSelection(candidates) {
  const validCandidates = candidates.filter((candidate) => (
    candidate.status === 'complete' && Number.isFinite(candidate.U)
  ))

  if (!validCandidates.length) {
    return null
  }

  return validCandidates.reduce((best, candidate) => (
    candidate.U > best.U ? candidate : best
  ), validCandidates[0])
}

export function buildEffectiveNetAreaCheck({ inputs, grossArea, netAreaCheck }) {
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
    const equations = [
      'U = 1.0',
      'A_e = A_n U',
      `A_e = (${formatEquationNumber(An_mm2)})(1.0) = ${formatEquationNumber(An_mm2)} \\text{ mm}^2`,
    ]

    return {
      id: 'effective-net-area',
      title: 'Effective net area',
      status: 'complete',
      area: {
        value_mm2: An_mm2,
        source: 'direct plate connection',
      },
      nominal: null,
      lrfd: null,
      asd: null,
      equations,
      effectiveNetArea: {
        An_mm2,
        Ae_mm2: An_mm2,
        U: 1,
        selectedCase: 'direct-plate',
        selectedReason: 'Plate/splice plate uses U = 1.0 for the current bolted plate scope.',
        case2: null,
        specialCase: null,
        lowerBound: null,
        notes: ['Plate/splice plate is treated as direct connection with no shear lag in the current scope.'],
      },
      steps: [],
    }
  }

  const member = inputs.member
  const shapeKind = getShapeKind(member)
  const values = getSectionDimensions(member.section)
  const case2 = buildCase2(member, inputs.connection, inputs.gusset, inputs.bolts, shapeKind, values)
  const specialCase = shapeKind === 'i-shape'
    ? buildCase7(shapeKind, inputs.connection, inputs.bolts, values)
    : buildCase8(shapeKind, inputs.bolts)
  const lowerBound = buildLowerBound(shapeKind, member, inputs.connection, inputs.gusset, {
    ...values,
    Ag: grossArea.Ag_mm2 ?? values.Ag,
  })
  const selected = buildSelection([case2, specialCase, lowerBound])

  if (!selected) {
    const equations = [
      ...case2.equations,
      'A_e = A_n U',
    ]

    return {
      id: 'effective-net-area',
      title: 'Effective net area',
      status: 'complete',
      area: null,
      nominal: null,
      lrfd: null,
      asd: null,
      equations,
      effectiveNetArea: {
        An_mm2,
        Ae_mm2: null,
        U: null,
        selectedCase: null,
        selectedReason: 'No valid shear-lag case was available from the current inputs.',
        case2,
        specialCase,
        lowerBound,
        notes: [case2.note, specialCase.note, lowerBound.note].filter(Boolean),
      },
      steps: [],
    }
  }

  const U = selected.U
  const Ae_mm2 = An_mm2 * U
  const candidateEquations = getCandidateEquations([case2, specialCase, lowerBound])
  const equations = [
    ...case2.equations,
    '',
    ...(specialCase.status === 'complete' ? specialCase.equations : []),
    '',
    ...(lowerBound.status === 'complete' ? lowerBound.equations : []),
    '',
    `U = \\max(${candidateEquations.join(', ')}) = ${formatU(U)}`,
    'A_e = A_n U',
    `A_e = (${formatEquationNumber(An_mm2)})(${formatU(U)}) = ${formatEquationNumber(Ae_mm2)} \\text{ mm}^2`,
  ].filter((line, index, source) => !(line === '' && source[index - 1] === ''))

  return {
    id: 'effective-net-area',
    title: 'Effective net area',
    status: 'complete',
    area: {
      value_mm2: Ae_mm2,
      source: selected.label,
    },
    nominal: null,
    lrfd: null,
    asd: null,
    equations,
    effectiveNetArea: {
      An_mm2,
      Ae_mm2,
      U,
      selectedCase: selected.caseId,
      selectedReason: selected.note,
      case2,
      specialCase,
      lowerBound,
      notes: [case2.note, specialCase.note, lowerBound.note].filter(Boolean),
    },
    steps: [],
  }
}
