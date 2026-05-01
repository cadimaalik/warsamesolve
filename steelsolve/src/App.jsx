import Header from './components/Header'
import DescriptorPanel from './components/DescriptorPanel'
import DiagramSheet from './components/DiagramSheet'
import ResizableSplit from './components/ResizableSplit'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <ResizableSplit>
        <DescriptorPanel />
        <DiagramSheet />
      </ResizableSplit>
    </div>
  )
}
