import DescriptorGroup, { FieldRow } from './DescriptorGroup'

export default function ConnectionInputPanel({ steelProblem }) {
  const { problem, updateField } = steelProblem

  if (problem.member.memberType === 'splice-plate') {
    return null
  }

  const isDouble = problem.gusset.arrangement === 'double'

  return (
    <DescriptorGroup title="Connection">
      <FieldRow label="Connected element">
        <select
          value={problem.connection.connectedElement}
          onChange={(event) => updateField(['connection', 'connectedElement'], event.target.value)}
        >
          <option value="" />
          <option value="web">{isDouble ? 'Double web' : 'Web'}</option>
          <option value="flange">{isDouble ? 'Double flange' : 'Flange'}</option>
        </select>
      </FieldRow>
    </DescriptorGroup>
  )
}
