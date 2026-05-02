import DescriptorGroup, { FieldRow, StaticRow } from './DescriptorGroup'

export default function ConnectionInputPanel({ steelProblem }) {
  const { problem, updateField } = steelProblem

  if (
    problem.member.memberType !== 'rolled-section'
    || !problem.member.sectionFamily
    || !problem.gusset.arrangement
  ) {
    return null
  }

  const isDouble = problem.gusset.arrangement === 'double'
  const sectionFamily = problem.member.sectionFamily

  if (sectionFamily === 'equal-angle') {
    return (
      <DescriptorGroup title="Connection">
        <StaticRow label="Connected element" value="One leg" />
      </DescriptorGroup>
    )
  }

  if (sectionFamily === 'unequal-angle') {
    return (
      <DescriptorGroup title="Connection">
        <FieldRow label="Connected element">
          <select
            className={!problem.connection.connectedElement ? 'select-empty' : ''}
            value={problem.connection.connectedElement}
            onChange={(event) => updateField(['connection', 'connectedElement'], event.target.value)}
          >
            <option value="" disabled>Select connected element</option>
            <option value="short-leg">Short leg</option>
            <option value="long-leg">Long leg</option>
          </select>
        </FieldRow>
      </DescriptorGroup>
    )
  }

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
