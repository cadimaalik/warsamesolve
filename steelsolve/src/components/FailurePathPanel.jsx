import DescriptorGroup, { FieldRow } from './DescriptorGroup'

export default function FailurePathPanel({ steelProblem }) {
  const { problem, updateField } = steelProblem

  return (
    <DescriptorGroup title="Failure Path">
      <FieldRow label="Failure path mode">
        <select
          value={problem.failurePath.mode}
          onChange={(event) => {
            updateField(['failurePath', 'mode'], event.target.value)
            updateField(['failurePath', 'points'], [])
          }}
        >
          <option value="straight">Straight</option>
          <option value="custom">Custom</option>
        </select>
      </FieldRow>
      {problem.failurePath.mode === 'custom' ? (
        <p className="muted-note">Custom path drawing will be added later.</p>
      ) : null}
    </DescriptorGroup>
  )
}
