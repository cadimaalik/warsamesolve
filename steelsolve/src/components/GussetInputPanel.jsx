import DescriptorGroup, { FieldRow } from './DescriptorGroup'

export default function GussetInputPanel({ steelProblem }) {
  const { problem, updateGussetArrangement } = steelProblem

  return (
    <DescriptorGroup title="Gusset Plates">
      <FieldRow label="Gusset arrangement">
        <select
          value={problem.gusset.arrangement}
          onChange={(event) => updateGussetArrangement(event.target.value)}
        >
          <option value="" />
          <option value="single">Single gusset plate</option>
          <option value="double">Double gusset plate</option>
        </select>
      </FieldRow>
      <p className="muted-note">End gussets are mirrored.</p>
    </DescriptorGroup>
  )
}
