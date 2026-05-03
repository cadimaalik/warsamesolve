import { CheckCard, SectionInputSummary, getOrderedChecks } from './SolutionPanel'

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
        <SectionInputSummary inputs={result.inputs} />

        <section className="solution-section">
          <div className="steel-step-heading">
            <span className="step-number">Steps</span>
            <h2>Worked Calculation</h2>
          </div>

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
      </div>
    </main>
  )
}
