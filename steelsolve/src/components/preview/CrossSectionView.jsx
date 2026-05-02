import HatchedPlate from './HatchedPlate'
import SectionShape from './SectionShape'
import { getSectionByDesignation } from '../../utils/sectionLookup'

const VIEWBOX = { width: 360, height: 260 }
const CENTER = { x: 180, y: 135 }
const HATCH_ID = 'cross-section-hatch'
const PLATE_THICKNESS = 14
const CONTACT_RATIO = 0.66

function toNumber(value) {
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

function hasPositiveDimensions(values) {
  return values.every((value) => toNumber(value) > 0)
}

function Note({ children }) {
  return (
    <text
      x={CENTER.x}
      y={CENTER.y}
      fill="#6b7280"
      fontFamily="JetBrains Mono, monospace"
      fontSize="11"
      textAnchor="middle"
    >
      {children}
    </text>
  )
}

function HatchDefs() {
  return (
    <defs>
      <pattern id={HATCH_ID} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#404040" strokeWidth="1" />
      </pattern>
    </defs>
  )
}

function getArrangement(problem) {
  return problem.gusset.arrangement === 'double' ? 'double' : 'single'
}

function scaledIShape(section) {
  const { d_mm: d, bf_mm: bf, tw_mm: tw, tf_mm: tf } = section.dimensions ?? {}

  if (!hasPositiveDimensions([d, bf, tw, tf])) {
    return null
  }

  const scale = Math.min(185 / bf, 172 / d)
  const scaled = {
    kind: 'i-shape',
    bf: bf * scale,
    d: d * scale,
    tw: Math.max(tw * scale, 5),
    tf: Math.max(tf * scale, 5),
  }

  return {
    ...scaled,
    x: CENTER.x - scaled.bf / 2,
    y: CENTER.y - scaled.d / 2,
  }
}

function scaledChannel(section) {
  const { d_mm: d, bf_mm: bf, tw_mm: tw, tf_mm: tf } = section.dimensions ?? {}

  if (!hasPositiveDimensions([d, bf, tw, tf])) {
    return null
  }

  const scale = Math.min(185 / bf, 172 / d)
  const scaled = {
    kind: 'channel',
    bf: bf * scale,
    d: d * scale,
    tw: Math.max(tw * scale, 5),
    tf: Math.max(tf * scale, 5),
  }

  return {
    ...scaled,
    x: CENTER.x - scaled.bf / 2,
    y: CENTER.y - scaled.d / 2,
  }
}

function scaledAngle(section) {
  const { h_mm: h, b_mm: b, t_mm: t } = section.dimensions ?? {}

  if (!hasPositiveDimensions([h, b, t])) {
    return null
  }

  const scale = Math.min(160 / b, 172 / h)
  const scaled = {
    kind: 'angle',
    h: h * scale,
    b: b * scale,
    t: Math.max(t * scale, 6),
    sourceH: h,
    sourceB: b,
  }

  return {
    ...scaled,
    x: CENTER.x - scaled.b / 2,
    y: CENTER.y - scaled.h / 2,
  }
}

function scaledSplicePlate(problem) {
  const width = toNumber(problem.member.splicePlate.width_mm)
  const thickness = toNumber(problem.member.splicePlate.thickness_mm)

  if (!(width > 0 && thickness > 0)) {
    return null
  }

  const scale = Math.min(190 / width, 55 / thickness)
  const scaled = {
    kind: 'plate',
    width: width * scale,
    height: Math.max(thickness * scale, 8),
  }

  return {
    ...scaled,
    x: CENTER.x - scaled.width / 2,
    y: CENTER.y - scaled.height / 2,
  }
}

function webPlates(geometry, arrangement) {
  const webX = geometry.kind === 'i-shape'
    ? geometry.x + (geometry.bf - geometry.tw) / 2
    : geometry.x
  const webY = geometry.y + geometry.tf
  const webHeight = geometry.d - 2 * geometry.tf
  const plateHeight = webHeight * CONTACT_RATIO
  const y = webY + (webHeight - plateHeight) / 2
  const plates = [
    { x: webX - PLATE_THICKNESS, y, width: PLATE_THICKNESS, height: plateHeight },
  ]

  if (arrangement === 'double') {
    plates.push({ x: webX + geometry.tw, y, width: PLATE_THICKNESS, height: plateHeight })
  }

  return plates
}

function flangePlates(geometry, arrangement) {
  const plateWidth = geometry.bf * CONTACT_RATIO
  const x = geometry.x + (geometry.bf - plateWidth) / 2
  const plates = [
    { x, y: geometry.y + geometry.d, width: plateWidth, height: PLATE_THICKNESS },
  ]

  if (arrangement === 'double') {
    plates.push({ x, y: geometry.y - PLATE_THICKNESS, width: plateWidth, height: PLATE_THICKNESS })
  }

  return plates
}

function anglePlates(geometry, selectedLeg, arrangement) {
  if (selectedLeg === 'horizontal') {
    const plateWidth = geometry.b * CONTACT_RATIO
    const x = geometry.x + (geometry.b - plateWidth) / 2
    const plates = [
      { x, y: geometry.y + geometry.h, width: plateWidth, height: PLATE_THICKNESS },
    ]

    if (arrangement === 'double') {
      plates.push({
        x,
        y: geometry.y + geometry.h - geometry.t - PLATE_THICKNESS,
        width: plateWidth,
        height: PLATE_THICKNESS,
      })
    }

    return plates
  }

  const plateHeight = geometry.h * CONTACT_RATIO
  const y = geometry.y + (geometry.h - plateHeight) / 2
  const plates = [
    { x: geometry.x - PLATE_THICKNESS, y, width: PLATE_THICKNESS, height: plateHeight },
  ]

  if (arrangement === 'double') {
    plates.push({ x: geometry.x + geometry.t, y, width: PLATE_THICKNESS, height: plateHeight })
  }

  return plates
}

function splicePlateContacts(geometry, arrangement) {
  const plateWidth = geometry.width * CONTACT_RATIO
  const x = geometry.x + (geometry.width - plateWidth) / 2
  const plates = [
    { x, y: geometry.y - PLATE_THICKNESS, width: plateWidth, height: PLATE_THICKNESS },
  ]

  if (arrangement === 'double') {
    plates.push({ x, y: geometry.y + geometry.height, width: plateWidth, height: PLATE_THICKNESS })
  }

  return plates
}

function renderSectionWithPlates(geometry, plates) {
  return (
    <>
      {plates.map((plate, index) => (
        <HatchedPlate key={`${plate.x}-${plate.y}-${index}`} {...plate} patternId={HATCH_ID} />
      ))}
      <SectionShape geometry={geometry} />
    </>
  )
}

function IShapeCrossSection({ problem, section }) {
  const geometry = scaledIShape(section)

  if (!geometry) {
    return <Note>Section dimensions unavailable</Note>
  }

  const connectedElement = problem.connection.connectedElement
  const arrangement = getArrangement(problem)

  if (!['web', 'flange'].includes(connectedElement)) {
    return null
  }

  const plates = connectedElement === 'web'
    ? webPlates(geometry, arrangement)
    : flangePlates(geometry, arrangement)

  return renderSectionWithPlates(geometry, plates)
}

function ChannelCrossSection({ problem, section }) {
  const geometry = scaledChannel(section)

  if (!geometry) {
    return <Note>Section dimensions unavailable</Note>
  }

  const connectedElement = problem.connection.connectedElement
  const arrangement = getArrangement(problem)

  if (!['web', 'flange'].includes(connectedElement)) {
    return null
  }

  const plates = connectedElement === 'web'
    ? webPlates(geometry, arrangement)
    : flangePlates(geometry, arrangement)

  return renderSectionWithPlates(geometry, plates)
}

function EqualAngleCrossSection({ problem, section }) {
  const geometry = scaledAngle(section)

  if (!geometry) {
    return <Note>Section dimensions unavailable</Note>
  }

  return renderSectionWithPlates(
    geometry,
    anglePlates(geometry, 'vertical', getArrangement(problem)),
  )
}

function UnequalAngleCrossSection({ problem, section }) {
  const geometry = scaledAngle(section)

  if (!geometry) {
    return <Note>Section dimensions unavailable</Note>
  }

  const connectedElement = problem.connection.connectedElement || 'long-leg'
  const verticalIsLong = geometry.sourceH >= geometry.sourceB
  const selectedLeg = connectedElement === 'short-leg'
    ? (verticalIsLong ? 'horizontal' : 'vertical')
    : (verticalIsLong ? 'vertical' : 'horizontal')

  return renderSectionWithPlates(
    geometry,
    anglePlates(geometry, selectedLeg, getArrangement(problem)),
  )
}

function SplicePlateCrossSection({ problem }) {
  const geometry = scaledSplicePlate(problem)

  if (!geometry) {
    return <Note>Enter splice plate dimensions</Note>
  }

  return renderSectionWithPlates(
    geometry,
    splicePlateContacts(geometry, getArrangement(problem)),
  )
}

function RolledSectionCrossSection({ problem }) {
  if (!problem.member.sectionDesignation) {
    return null
  }

  if (!problem.gusset.arrangement) {
    return null
  }

  const section = getSectionByDesignation(
    problem.member.sectionFamily,
    problem.member.sectionDesignation,
  )

  if (!section) {
    return <Note>Section dimensions unavailable</Note>
  }

  if (section.shapeType === 'i-shape') {
    return <IShapeCrossSection problem={problem} section={section} />
  }

  if (section.shapeType === 'channel') {
    return <ChannelCrossSection problem={problem} section={section} />
  }

  if (section.shapeType === 'equal-angle') {
    return <EqualAngleCrossSection problem={problem} section={section} />
  }

  if (section.shapeType === 'unequal-angle') {
    return <UnequalAngleCrossSection problem={problem} section={section} />
  }

  return <Note>Section dimensions unavailable</Note>
}

export default function CrossSectionView({ problem }) {
  let content = null

  if (problem.member.memberType === 'rolled-section') {
    content = <RolledSectionCrossSection problem={problem} />
  } else if (problem.member.memberType === 'splice-plate') {
    content = <SplicePlateCrossSection problem={problem} />
  }

  return (
    <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="img" aria-label="Cross-section detail">
      <HatchDefs />
      {content}
    </svg>
  )
}
