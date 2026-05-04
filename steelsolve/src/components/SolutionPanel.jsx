import { formatKn, formatMm2 } from '../analysis/steelUtils'
import EquationBlock from './EquationBlock'
import NetAreaPathDiagram from './preview/NetAreaPathDiagram'
import ShearLagCentroidDiagram from './preview/ShearLagCentroidDiagram'

const solutionCheckOrder = [
  'gross-area',
  'gross-section-yielding',
  'net-area',
  'effective-net-area',
  'net-section-rupture',
  'block-shear',
  'governing-result',
]

function DisplayValue({ value }) {
  return <strong>{value === null || value === undefined || value === '' ? '-' : value}</strong>
}

function SummaryItem({ label, value }) {
  return (
    <div className="solution-summary-item">
      <span>{label}</span>
      <DisplayValue value={value} />
    </div>
  )
}

function SectionInputSummary({ inputs }) {
  const { member, material, bolts, gusset, connection } = inputs
  const section = member.section
  const sectionArea = section?.properties?.A_mm2

  return (
    <section className="solution-section">
      <h3>Interpreted Inputs</h3>
      <div className="solution-summary-grid">
        <SummaryItem label="Member" value={member.label} />
        <SummaryItem label="Section family" value={member.sectionFamily ?? '-'} />
        <SummaryItem label="Section" value={member.sectionDesignation ?? `${member.width_mm ?? '-'} mm x ${member.thickness_mm ?? '-'} mm`} />
        <SummaryItem label="Shape type" value={section?.shapeType ?? '-'} />
        <SummaryItem label="Area" value={sectionArea ? formatMm2(sectionArea) : '-'} />
        <SummaryItem label="Steel grade" value={material.grade} />
        <SummaryItem label="Fy" value={material.Fy_MPa ? `${material.Fy_MPa} MPa` : '-'} />
        <SummaryItem label="Fu" value={material.Fu_MPa ? `${material.Fu_MPa} MPa` : '-'} />
        <SummaryItem label="Gusset arrangement" value={gusset.arrangement} />
        <SummaryItem label="Connected element" value={connection.connectedElement || 'not applicable'} />
        <SummaryItem label="Bolt" value={`${bolts.diameter} / standard hole ${bolts.standardHoleDiameter_mm ?? '-'} mm`} />
        <SummaryItem label="Bolt layout" value={`${bolts.columnCount ?? '-'} columns`} />
        <SummaryItem label="Pitch, s" value={bolts.pitch_s_mm !== null ? `${bolts.pitch_s_mm} mm` : '-'} />
        <SummaryItem label="Gage, g" value={bolts.gage_g_mm !== null ? `${bolts.gage_g_mm} mm` : '-'} />
      </div>
    </section>
  )
}

function CheckCard({ check }) {
  const isComplete = check.status === 'complete'
  const notes = getCheckNotes(check)

  if (check.id === 'net-area' && check.netArea) {
    return <NetAreaCheckCard check={check} notes={notes} />
  }

  if (check.id === 'effective-net-area' && check.effectiveNetArea) {
    return <EffectiveNetAreaCheckCard check={check} notes={notes} />
  }

  if (check.id === 'net-section-rupture' && check.netSectionRupture) {
    return <NetSectionRuptureCheckCard check={check} />
  }

  return (
    <article className={`solution-check-card${isComplete ? '' : ' solution-check-card-pending'}`}>
      <div className="solution-check-notes">
        {notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>

      {isComplete ? (
        <EquationBlock equations={check.equations} />
      ) : null}

      {isComplete && check.nominal !== null ? (
        <div className="solution-strength-summary">
          <SummaryItem label="Nominal" value={formatKn(check.nominal)} />
          <SummaryItem label="LRFD" value={formatKn(check.lrfd)} />
          <SummaryItem label="ASD" value={formatKn(check.asd)} />
        </div>
      ) : null}
    </article>
  )
}

function NetAreaCheckCard({ check, notes }) {
  return (
    <article className="solution-check-card">
      <div className="solution-check-notes">
        {notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>

      <div className="net-area-workout">
        <section>
          <NetAreaPathDiagram
            title="Straight path"
            path={check.netArea.straight}
            netArea={check.netArea}
          />
          <EquationBlock equations={check.netArea.straight.equations} />
          {check.netArea.straight.note ? (
            <p className="solution-case-note">{check.netArea.straight.note}</p>
          ) : null}
        </section>

        <section>
          <NetAreaPathDiagram
            title="Zigzag path"
            path={check.netArea.zigzag}
            netArea={check.netArea}
          />
          <EquationBlock equations={check.netArea.zigzag.equations} />
          {check.netArea.zigzag.note ? (
            <p className="solution-case-note">{check.netArea.zigzag.note}</p>
          ) : null}
        </section>

        <section className="net-area-critical">
          <p>Critical net area is the smaller of the straight and zigzag path results.</p>
          <EquationBlock equations={check.netArea.critical.equations} />
          <div className="solution-strength-summary">
            <SummaryItem label="Critical net area" value={formatMm2(check.netArea.critical.area_mm2)} />
            <SummaryItem label="Critical path" value={check.netArea.critical.pathId} />
            <SummaryItem label="Connected thickness" value={`${check.netArea.connectedThickness.value_mm} mm`} />
          </div>
        </section>
      </div>
    </article>
  )
}

function formatU(value) {
  return value === null || value === undefined ? '-' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function EffectiveNetAreaCheckCard({ check, notes }) {
  const effectiveNetArea = check.effectiveNetArea
  const sections = effectiveNetArea.sections ?? []

  return (
    <article className="solution-check-card">
      <div className="shear-lag-workout">
        {sections.map((section) => (
          <section key={section.id} className="shear-lag-case">
            <h4 className="solution-case-heading">{section.heading}</h4>
            <ShearLagCentroidDiagram diagram={section.diagram} />
            <EquationBlock equations={section.equations} />
            {section.note ? <p className="solution-case-note">{section.note}</p> : null}
          </section>
        ))}
      </div>

      <div className="solution-strength-summary">
        <SummaryItem label="Selected U" value={formatU(effectiveNetArea.U)} />
        <SummaryItem label="Selected case" value={effectiveNetArea.selectedCase ?? '-'} />
        <SummaryItem label="Effective net area" value={formatMm2(effectiveNetArea.Ae_mm2)} />
      </div>
    </article>
  )
}

function NetSectionRuptureCheckCard({ check }) {
  const rupture = check.netSectionRupture

  return (
    <article className="solution-check-card">
      <section className="shear-lag-case">
        <h4 className="solution-case-heading">{rupture.heading}</h4>
        <EquationBlock equations={check.equations} />
        <p className="solution-case-note">{rupture.note}</p>
      </section>

      <div className="solution-strength-summary">
        <SummaryItem label="Effective net area" value={formatMm2(rupture.Ae_mm2)} />
        <SummaryItem label="Fu" value={`${rupture.Fu_MPa} MPa`} />
        <SummaryItem label="Nominal" value={formatKn(check.nominal)} />
        <SummaryItem label="LRFD" value={formatKn(check.lrfd)} />
        <SummaryItem label="ASD" value={formatKn(check.asd)} />
      </div>
    </article>
  )
}

function getCheckNotes(check) {
  if (check.id === 'gross-area') {
    return [
      check.area?.source === 'section database'
        ? 'Gross area is taken directly from the selected rolled section database entry.'
        : 'Gross area is calculated from the user-entered splice plate width and thickness.',
    ]
  }

  if (check.id === 'gross-section-yielding') {
    return ['AISC tension yielding uses the gross area of the member.']
  }

  if (check.id === 'net-area') {
    return [
      'Straight and zigzag net-area paths are checked automatically; the smaller net area is used as critical.',
    ]
  }

  if (check.id === 'effective-net-area') {
    const notes = [
      check.effectiveNetArea?.selectedReason
        ?? 'Effective net area is calculated from the critical net area and selected shear lag factor.',
      ...(check.effectiveNetArea?.notes ?? []),
    ].filter(Boolean)

    return [...new Set(notes)]
  }

  if (check.id === 'net-section-rupture') {
    return ['AISC D2(b) uses Fu and the effective net area for tensile rupture in the net section.']
  }

  return ['This check remains a placeholder for a later analysis step.']
}

function getOrderedChecks(checks) {
  const checksById = new Map(checks.map((check) => [check.id, check]))
  const orderedChecks = solutionCheckOrder
    .map((id) => checksById.get(id))
    .filter(Boolean)
  const remainingChecks = checks.filter((check) => !solutionCheckOrder.includes(check.id))

  return [...orderedChecks, ...remainingChecks]
}

export default function SolutionPanel({ result }) {
  if (!result) {
    return null
  }

  return (
    <section className="solution-panel" aria-label="SteelSolve solution outline">
      <div className="solution-heading">
        <p className="panel-kicker">Analyze output</p>
        <h2>Solution Outline</h2>
        <span>{result.status}</span>
      </div>

      <SectionInputSummary inputs={result.inputs} />

      <section className="solution-section">
        {getOrderedChecks(result.checks).map((check, index) => (
          <div key={check.id} className="solution-step">
            <div className="step-header">
              <span className="step-number">Step {index + 1}</span>
              <span className="step-title">{check.title}</span>
            </div>
            <CheckCard check={check} />
          </div>
        ))}
      </section>
    </section>
  )
}

export { SectionInputSummary, CheckCard, getOrderedChecks }
