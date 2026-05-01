import Header from './components/Header'
import DescriptorPanel from './components/DescriptorPanel'
import DiagramSheet from './components/DiagramSheet'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="workspace" aria-label="SteelSolve tension member problem builder">
        <DescriptorPanel />
        <DiagramSheet />
      </main>
    </div>
  )
}
