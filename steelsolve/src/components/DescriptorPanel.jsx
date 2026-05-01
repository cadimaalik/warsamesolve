import MemberInputPanel from './MemberInputPanel'
import GussetInputPanel from './GussetInputPanel'
import ConnectionInputPanel from './ConnectionInputPanel'
import BoltInputPanel from './BoltInputPanel'
import FailurePathPanel from './FailurePathPanel'

export default function DescriptorPanel({ steelProblem }) {
  const { problem } = steelProblem

  return (
    <aside className="descriptor-panel" aria-labelledby="descriptor-heading">
      <div className="panel-heading">
        <p className="panel-kicker">Input model</p>
        <h2 id="descriptor-heading">Problem Descriptor</h2>
      </div>

      <div className="descriptor-list">
        <MemberInputPanel steelProblem={steelProblem} />
        <GussetInputPanel steelProblem={steelProblem} />
        <ConnectionInputPanel steelProblem={steelProblem} />
        <BoltInputPanel steelProblem={steelProblem} />
        <FailurePathPanel steelProblem={steelProblem} />
      </div>

      <details className="model-json">
        <summary>Model JSON</summary>
        <pre>{JSON.stringify(problem, null, 2)}</pre>
      </details>
    </aside>
  )
}
