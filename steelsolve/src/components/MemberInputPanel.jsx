import DescriptorGroup, { FieldRow, StaticRow } from './DescriptorGroup'

const memberTypes = [
  ['rolled-section', 'Rolled section'],
  ['splice-plate', 'Splice plate'],
  ['built-up', 'Built-up member'],
]

const sectionFamilies = [
  ['IPN', 'IPN'],
  ['IPE', 'IPE'],
  ['HEA', 'HEA'],
  ['HEB', 'HEB'],
  ['HEM', 'HEM'],
  ['HD', 'HD'],
  ['UPN', 'UPN'],
  ['equal-angle', 'Equal angle'],
  ['unequal-angle', 'Unequal angle'],
]

const materialGrades = ['S235', 'S275', 'S355', 'custom']

export default function MemberInputPanel({ steelProblem }) {
  const { problem, updateField, updateMemberType, updateMaterialGrade } = steelProblem
  const { member } = problem

  return (
    <DescriptorGroup title="Member">
      <FieldRow label="Member type">
        <select
          value={member.memberType}
          onChange={(event) => updateMemberType(event.target.value)}
        >
          <option value="" />
          {memberTypes.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </FieldRow>

      {member.memberType === 'rolled-section' ? (
        <>
          <FieldRow label="Section family">
            <select
              value={member.sectionFamily}
              onChange={(event) => updateField(['member', 'sectionFamily'], event.target.value)}
            >
              <option value="" />
              {sectionFamilies.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Section designation">
            <select value={member.sectionDesignation} disabled>
              <option value="" />
            </select>
          </FieldRow>
        </>
      ) : null}

      {member.memberType === 'splice-plate' ? (
        <>
          <FieldRow label="Plate width, mm">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={member.splicePlate.width_mm}
              onChange={(event) => updateField(['member', 'splicePlate', 'width_mm'], event.target.value)}
            />
          </FieldRow>
          <FieldRow label="Plate thickness, mm">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={member.splicePlate.thickness_mm}
              onChange={(event) => updateField(['member', 'splicePlate', 'thickness_mm'], event.target.value)}
            />
          </FieldRow>
        </>
      ) : null}

      {member.memberType === 'built-up' ? (
        <p className="muted-note">Built-up member editor will be added in a separate step.</p>
      ) : null}

      <FieldRow label="Steel grade">
        <select
          value={member.material.grade}
          onChange={(event) => updateMaterialGrade(event.target.value)}
        >
          <option value="" />
          {materialGrades.map((grade) => (
            <option key={grade} value={grade}>{grade === 'custom' ? 'Custom' : grade}</option>
          ))}
        </select>
      </FieldRow>

      {member.material.grade === 'custom' ? (
        <>
          <FieldRow label="Fy, MPa">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={member.material.Fy_MPa}
              onChange={(event) => updateField(['member', 'material', 'Fy_MPa'], event.target.value)}
            />
          </FieldRow>
          <FieldRow label="Fu, MPa">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={member.material.Fu_MPa}
              onChange={(event) => updateField(['member', 'material', 'Fu_MPa'], event.target.value)}
            />
          </FieldRow>
        </>
      ) : member.material.grade ? (
        <>
          <StaticRow label="Fy, MPa" value={member.material.Fy_MPa} />
          <StaticRow label="Fu, MPa" value={member.material.Fu_MPa} />
        </>
      ) : null}
    </DescriptorGroup>
  )
}
