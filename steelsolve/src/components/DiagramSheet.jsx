import DrawingCard from './DrawingCard'
import TopViewPlaceholder from './placeholders/TopViewPlaceholder'
import EndDetailPlaceholder from './placeholders/EndDetailPlaceholder'
import CrossSectionPlaceholder from './placeholders/CrossSectionPlaceholder'

export default function DiagramSheet() {
  return (
    <section className="diagram-sheet" aria-labelledby="diagram-heading">
      <div className="sheet-heading">
        <p className="panel-kicker">Generated problem sheet</p>
        <h2 id="diagram-heading">Diagram Sheet</h2>
      </div>

      <div className="drawing-stack">
        <DrawingCard title="Top View">
          <TopViewPlaceholder />
        </DrawingCard>
        <DrawingCard title="Typical End Detail">
          <EndDetailPlaceholder />
        </DrawingCard>
        <DrawingCard title="Cross-Section Detail">
          <CrossSectionPlaceholder />
        </DrawingCard>
      </div>
    </section>
  )
}
