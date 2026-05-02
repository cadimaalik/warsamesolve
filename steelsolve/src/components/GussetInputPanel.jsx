import DescriptorGroup, { FieldRow, StaticRow } from './DescriptorGroup'

export default function GussetInputPanel({ steelProblem }) {
  const { problem, updateGussetArrangement } = steelProblem
  const isAngleSection = ['equal-angle', 'unequal-angle'].includes(problem.member.sectionFamily)

  return (
    <DescriptorGroup title="Gusset Plates">
      {isAngleSection ? (
        <StaticRow label="Gusset arrangement" value="Single gusset plate" />
      ) : (
        <FieldRow label="Gusset arrangement">
          <select
            className={!problem.gusset.arrangement ? 'select-empty' : ''}
            value={problem.gusset.arrangement}
            onChange={(event) => updateGussetArrangement(event.target.value)}
          >
            <option value="" disabled>Select gusset arrangement</option>
            <option value="single">Single gusset plate</option>
            <option value="double">Double gusset plate</option>
          </select>
        </FieldRow>
      )}
      <p className="muted-note">End gussets are mirrored.</p>
    </DescriptorGroup>
  )
}
