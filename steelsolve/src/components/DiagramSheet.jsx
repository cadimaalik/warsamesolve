import DrawingCard from './DrawingCard'
import TopView from './preview/TopView'
import EndDetailPlaceholder from './placeholders/EndDetailPlaceholder'
import CrossSectionView from './preview/CrossSectionView'

export default function DiagramSheet({ problem }) {
  return (
    <section className="diagram-sheet" aria-labelledby="diagram-heading">
      <div className="sheet-heading">
        <p className="panel-kicker">Generated problem sheet</p>
        <h2 id="diagram-heading">Diagram Sheet</h2>
      </div>

      <div className="drawing-stack">
        <DrawingCard title="Top View">
          <TopView problem={problem} />
        </DrawingCard>
        <DrawingCard title="Typical End Detail">
          <EndDetailPlaceholder />
        </DrawingCard>
        <DrawingCard title="Cross-Section Detail">
          <CrossSectionView problem={problem} />
        </DrawingCard>
      </div>
    </section>
  )
}
