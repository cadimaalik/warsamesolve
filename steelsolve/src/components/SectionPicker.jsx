import { FieldRow } from './DescriptorGroup'
import {
  getSectionDesignations,
  getSectionFamilies,
} from '../utils/sectionLookup'

export default function SectionPicker({ member, onFamilyChange, onDesignationChange }) {
  const families = getSectionFamilies()
  const designations = getSectionDesignations(member.sectionFamily)

  return (
    <>
      <FieldRow label="Section family">
        <select
          className={!member.sectionFamily ? 'select-empty' : ''}
          value={member.sectionFamily}
          onChange={(event) => onFamilyChange(event.target.value)}
        >
          <option value="" disabled>Select section family</option>
          {families.map((family) => (
            <option key={family.value} value={family.value}>{family.label}</option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="Section designation">
        <select
          className={!member.sectionDesignation ? 'select-empty' : ''}
          value={member.sectionDesignation}
          onChange={(event) => onDesignationChange(event.target.value)}
          disabled={!member.sectionFamily}
        >
          <option value="" disabled>
            {member.sectionFamily ? 'Select section designation' : 'Select family first'}
          </option>
          {designations.map((designation) => (
            <option key={designation} value={designation}>{designation}</option>
          ))}
        </select>
      </FieldRow>
    </>
  )
}
