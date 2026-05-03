import MemberInputPanel from './MemberInputPanel'
import GussetInputPanel from './GussetInputPanel'
import ConnectionInputPanel from './ConnectionInputPanel'
import BoltInputPanel from './BoltInputPanel'

function getDisplayProblem(problem) {
  const { failurePath, ...displayProblem } = problem
  return displayProblem
}

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
        {problem.member.memberType ? <GussetInputPanel steelProblem={steelProblem} /> : null}
        <ConnectionInputPanel steelProblem={steelProblem} />
        <BoltInputPanel steelProblem={steelProblem} />
      </div>

      <details className="model-json">
        <summary>Model JSON</summary>
        <pre>{JSON.stringify(getDisplayProblem(problem), null, 2)}</pre>
      </details>
    </aside>
  )
}
