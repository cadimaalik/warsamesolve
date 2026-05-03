import { formatKn, formatMm2 } from '../analysis/steelUtils'

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

function MessageList({ title, items, tone = 'default' }) {
  if (!items.length) {
    return null
  }

  return (
    <section className={`solution-message-list solution-message-list-${tone}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
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
  const hasStrengthValues = check.nominal !== null || check.lrfd !== null || check.asd !== null

  return (
    <article className="solution-check-card">
      <div className="solution-check-heading">
        <h4>{check.title}</h4>
        <span>{check.status}</span>
      </div>
      <div className="solution-check-values">
        {check.area ? (
          <SummaryItem label="Area" value={formatMm2(check.area.value_mm2)} />
        ) : null}
        {hasStrengthValues || !check.area ? (
          <>
            <SummaryItem label="Nominal" value={check.nominal !== null ? formatKn(check.nominal) : 'pending'} />
            <SummaryItem label="LRFD" value={check.lrfd !== null ? formatKn(check.lrfd) : 'pending'} />
            <SummaryItem label="ASD" value={check.asd !== null ? formatKn(check.asd) : 'pending'} />
          </>
        ) : null}
      </div>
      {check.area?.source ? (
        <p className="solution-check-source">Source: {check.area.source}</p>
      ) : null}
      {check.equations.length ? (
        <pre className="solution-equations">{check.equations.join('\n')}</pre>
      ) : null}
      <ol className="solution-step-list">
        {check.steps.map((step) => (
          <li key={typeof step === 'string' ? step : step.id}>
            {typeof step === 'string' ? (
              step
            ) : (
              <>
                <span>{step.title}</span>
                <p>{step.body}</p>
                {step.equations?.length ? (
                  <pre className="solution-equations">{step.equations.join('\n')}</pre>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ol>
    </article>
  )
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
      <MessageList title="Warnings" items={result.warnings} tone="warning" />
      <MessageList title="Assumptions" items={result.assumptions} />

      <section className="solution-section">
        <h3>Calculation Checks</h3>
        <div className="solution-check-grid">
          {result.checks.map((check) => (
            <CheckCard key={check.id} check={check} />
          ))}
        </div>
      </section>

      <section className="solution-governing">
        <h3>Governing Result</h3>
        <p>Pending. Later prompts will compare completed checks and report LRFD/ASD governing strength.</p>
      </section>
    </section>
  )
}

export { SectionInputSummary, MessageList, CheckCard }
