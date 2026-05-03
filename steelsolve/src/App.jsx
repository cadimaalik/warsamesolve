import { useState } from 'react'
import Header from './components/Header'
import DescriptorPanel from './components/DescriptorPanel'
import DiagramSheet from './components/DiagramSheet'
import ResizableSplit from './components/ResizableSplit'
import SolutionPage from './components/SolutionPage'
import useSteelProblem from './state/useSteelProblem'
import { validateProblem } from './utils/problemValidation'
import { analyzeProblem } from './analysis/analyzeProblem'

export default function App() {
  const steelProblem = useSteelProblem()
  const [analysisResult, setAnalysisResult] = useState(null)
  const [view, setView] = useState('builder')

  const handleAnalyze = () => {
    const issues = validateProblem(steelProblem.problem)

    if (issues.length) {
      setAnalysisResult(null)
      return { issues, result: null }
    }

    const result = analyzeProblem(steelProblem.problem)
    setAnalysisResult(result)
    setView('solution')
    return { issues: [], result }
  }

  const handleClear = () => {
    steelProblem.resetProblem()
    setAnalysisResult(null)
    setView('builder')
  }

  if (view === 'solution') {
    return (
      <div className="app-shell">
        <SolutionPage
          result={analysisResult}
          onBack={() => setView('builder')}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header onAnalyze={handleAnalyze} onClear={handleClear} />
      <ResizableSplit>
        <DescriptorPanel steelProblem={steelProblem} />
        <DiagramSheet problem={steelProblem.problem} />
      </ResizableSplit>
    </div>
  )
}
