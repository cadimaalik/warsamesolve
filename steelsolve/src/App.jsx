import Header from './components/Header'
import DescriptorPanel from './components/DescriptorPanel'
import DiagramSheet from './components/DiagramSheet'
import ResizableSplit from './components/ResizableSplit'
import useSteelProblem from './state/useSteelProblem'
import { validateProblem } from './utils/problemValidation'

export default function App() {
  const steelProblem = useSteelProblem()

  const handleAnalyze = () => validateProblem(steelProblem.problem)

  return (
    <div className="app-shell">
      <Header onAnalyze={handleAnalyze} onClear={steelProblem.resetProblem} />
      <ResizableSplit>
        <DescriptorPanel steelProblem={steelProblem} />
        <DiagramSheet problem={steelProblem.problem} />
      </ResizableSplit>
    </div>
  )
}
