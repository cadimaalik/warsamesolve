import { CheckCard, MessageList, SectionInputSummary } from './SolutionPanel'

export default function SolutionPage({ result, onBack }) {
  if (!result) {
    return (
      <main className="steel-solver-page">
        <div className="steel-solver-top-bar">
          <button className="steel-solver-nav-btn" type="button" onClick={onBack}>
            &larr; Back to Builder
          </button>
        </div>
        <div className="steel-solver-body">
          <p className="steel-solver-empty">No solution outline is available. Return to the builder and run Analyze.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="steel-solver-page">
      <div className="steel-solver-top-bar">
        <button className="steel-solver-nav-btn" type="button" onClick={onBack}>
          &larr; Back to Builder
        </button>
      </div>

      <div className="steel-solver-body">
        <section className="steel-solver-hero">
          <p className="panel-kicker">SteelSolve analysis</p>
          <h1>Tension Member Solution Outline</h1>
          <p>
            This page captures the interpreted problem statement and the placeholder calculation
            sequence. Real steel-design checks will plug into these cards in later prompts.
          </p>
        </section>

        <SectionInputSummary inputs={result.inputs} />

        <div className="steel-solver-message-grid">
          <MessageList title="Warnings" items={result.warnings} tone="warning" />
          <MessageList title="Assumptions" items={result.assumptions} />
        </div>

        <section className="solution-section">
          <div className="steel-step-heading">
            <span className="step-number">Steps</span>
            <h2>Placeholder Calculation Flow</h2>
          </div>

          {result.checks.map((check, index) => (
            <div key={check.id} className="solution-step">
              <div className="step-header">
                <span className="step-number">Step {index + 1}</span>
                <span className="step-title">{check.title}</span>
              </div>
              <CheckCard check={check} />
            </div>
          ))}
        </section>

        <section className="solution-governing">
          <h3>Governing Result</h3>
          <p>Pending. Later prompts will compare completed checks and report LRFD/ASD governing strength.</p>
        </section>
      </div>
    </main>
  )
}
