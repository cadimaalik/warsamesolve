import { useState } from 'react'
import Header from './components/Header'
import DescriptorPanel from './components/DescriptorPanel'
import DiagramSheet from './components/DiagramSheet'
import ResizableSplit from './components/ResizableSplit'
import useSteelProblem from './state/useSteelProblem'
import { validateProblem } from './utils/problemValidation'
import { analyzeProblem } from './analysis/analyzeProblem'

export default function App() {
  const steelProblem = useSteelProblem()
  const [analysisResult, setAnalysisResult] = useState(null)

  const handleAnalyze = () => {
    const issues = validateProblem(steelProblem.problem)

    if (issues.length) {
      setAnalysisResult(null)
      return { issues, result: null }
    }

    const result = analyzeProblem(steelProblem.problem)
    setAnalysisResult(result)
    return { issues: [], result }
  }

  const handleClear = () => {
    steelProblem.resetProblem()
    setAnalysisResult(null)
  }

  return (
    <div className="app-shell">
      <Header onAnalyze={handleAnalyze} onClear={handleClear} />
      <ResizableSplit>
        <DescriptorPanel steelProblem={steelProblem} />
        <DiagramSheet problem={steelProblem.problem} analysisResult={analysisResult} />
      </ResizableSplit>
    </div>
  )
}
