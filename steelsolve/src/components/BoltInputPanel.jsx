import DescriptorGroup, { FieldRow, StaticRow } from './DescriptorGroup'

const diameters = ['M12', 'M16', 'M20', 'M22', 'M24', 'M27', 'M30']

export default function BoltInputPanel({ steelProblem }) {
  const {
    problem,
    updateField,
    updateColumnCount,
    updateSameBoltCountEachColumn,
    updateBoltCountByColumn,
  } = steelProblem
  const { bolts } = problem
  const columnCount = Number.parseInt(bolts.columnCount, 10)
  const customColumnCounts = Number.isFinite(columnCount) && columnCount > 0
    ? Array.from({ length: columnCount })
    : []

  return (
    <DescriptorGroup title="Bolts">
      <FieldRow label="Bolt diameter">
        <select
          value={bolts.diameter}
          onChange={(event) => updateField(['bolts', 'diameter'], event.target.value)}
        >
          {diameters.map((diameter) => (
            <option key={diameter} value={diameter}>{diameter}</option>
          ))}
        </select>
      </FieldRow>

      <StaticRow label="Hole type" value="Standard hole" />

      <FieldRow label="Number of longitudinal bolt columns">
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={bolts.columnCount}
          onChange={(event) => updateColumnCount(event.target.value)}
        />
      </FieldRow>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={bolts.sameBoltCountEachColumn}
          onChange={(event) => updateSameBoltCountEachColumn(event.target.checked)}
        />
        <span>Same number of bolts in each column?</span>
      </label>

      {bolts.sameBoltCountEachColumn ? (
        <FieldRow label="Bolts per column">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={bolts.boltsPerColumn}
            onChange={(event) => updateField(['bolts', 'boltsPerColumn'], event.target.value)}
          />
        </FieldRow>
      ) : (
        customColumnCounts.map((_, index) => (
          <FieldRow key={index} label={`Bolts in column ${index + 1}`}>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={bolts.boltCountsByColumn[index] ?? ''}
              onChange={(event) => updateBoltCountByColumn(index, event.target.value)}
            />
          </FieldRow>
        ))
      )}

      <FieldRow label="Pitch, s, mm" helper="s = longitudinal center-to-center spacing of holes">
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={bolts.pitch_s_mm}
          onChange={(event) => updateField(['bolts', 'pitch_s_mm'], event.target.value)}
        />
      </FieldRow>

      <FieldRow label="Gage, g, mm" helper="g = transverse center-to-center spacing between fastener lines">
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={bolts.gage_g_mm}
          onChange={(event) => updateField(['bolts', 'gage_g_mm'], event.target.value)}
        />
      </FieldRow>

      <FieldRow label="Horizontal edge distance, mm">
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={bolts.horizontalEdgeDistance_mm}
          onChange={(event) => updateField(['bolts', 'horizontalEdgeDistance_mm'], event.target.value)}
        />
      </FieldRow>

      <FieldRow label="Top edge distance, mm">
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={bolts.topEdgeDistance_mm}
          onChange={(event) => updateField(['bolts', 'topEdgeDistance_mm'], event.target.value)}
        />
      </FieldRow>

      <FieldRow label="Bottom edge distance, mm">
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={bolts.bottomEdgeDistance_mm}
          onChange={(event) => updateField(['bolts', 'bottomEdgeDistance_mm'], event.target.value)}
        />
      </FieldRow>
    </DescriptorGroup>
  )
}
