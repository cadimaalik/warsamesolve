import DescriptorGroup, { FieldRow, StaticRow } from './DescriptorGroup'
import SectionPicker from './SectionPicker'
import SectionProperties from './SectionProperties'
import { getSectionByDesignation } from '../utils/sectionLookup'

const materialGrades = ['S235', 'S275', 'S355', 'custom']
const memberTypes = [
  ['rolled-section', 'Rolled section'],
  ['splice-plate', 'Splice plate'],
  ['built-up', 'Built-up member'],
]

export default function MemberInputPanel({ steelProblem }) {
  const {
    problem,
    updateField,
    updateMemberType,
    updateSectionFamily,
    updateSectionDesignation,
    updateMaterialGrade,
  } = steelProblem
  const { member } = problem
  const selectedSection = getSectionByDesignation(member.sectionFamily, member.sectionDesignation)

  return (
    <DescriptorGroup title="Member">
      <FieldRow label="Member type">
        <select
          className={!member.memberType ? 'select-empty' : ''}
          value={member.memberType}
          onChange={(event) => updateMemberType(event.target.value)}
        >
          <option value="" disabled>Select member type</option>
          {memberTypes.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </FieldRow>

      {member.memberType === 'rolled-section' ? (
        <>
          <SectionPicker
            member={member}
            onFamilyChange={updateSectionFamily}
            onDesignationChange={updateSectionDesignation}
          />
          <SectionProperties section={selectedSection} />
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
          className={!member.material.grade ? 'select-empty' : ''}
          value={member.material.grade}
          onChange={(event) => updateMaterialGrade(event.target.value)}
        >
          <option value="" disabled>Select steel grade</option>
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
