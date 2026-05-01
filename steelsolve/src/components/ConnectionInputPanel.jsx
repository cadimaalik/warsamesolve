import DescriptorGroup, { FieldRow } from './DescriptorGroup'

export default function ConnectionInputPanel({ steelProblem }) {
  const { problem, updateField } = steelProblem

  if (problem.member.memberType !== 'rolled-section' || !problem.gusset.arrangement) {
    return null
  }

  const isDouble = problem.gusset.arrangement === 'double'

  return (
    <DescriptorGroup title="Connection">
      <FieldRow label="Connected element">
        <select
          className={!problem.connection.connectedElement ? 'select-empty' : ''}
          value={problem.connection.connectedElement}
          onChange={(event) => updateField(['connection', 'connectedElement'], event.target.value)}
        >
          <option value="" disabled>Select connected element</option>
          <option value="web">{isDouble ? 'Double web' : 'Web'}</option>
          <option value="flange">{isDouble ? 'Double flange' : 'Flange'}</option>
        </select>
      </FieldRow>
    </DescriptorGroup>
  )
}
