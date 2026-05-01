import { sectionsDatabase } from '../data/sections'

const familyOrder = [
  'IPN',
  'IPE',
  'HEA',
  'HEB',
  'HEM',
  'HD',
  'UPN',
  'equal-angle',
  'unequal-angle',
]

export function getSectionFamilies() {
  return familyOrder
    .filter((family) => sectionsDatabase.families[family])
    .map((family) => ({
      value: family,
      label: sectionsDatabase.families[family].label,
      shapeType: sectionsDatabase.families[family].shapeType,
    }))
}

export function getSectionsByFamily(family) {
  return sectionsDatabase.families[family]?.sections ?? []
}

export function getSectionDesignations(family) {
  return getSectionsByFamily(family).map((section) => section.designation)
}

export function getSectionByDesignation(family, designation) {
  return getSectionsByFamily(family).find((section) => section.designation === designation) ?? null
}

export function getShapeType(family) {
  return sectionsDatabase.families[family]?.shapeType ?? ''
}

export function isIShapeFamily(family) {
  return getShapeType(family) === 'i-shape'
}

export function isChannelFamily(family) {
  return getShapeType(family) === 'channel'
}

export function isAngleFamily(family) {
  return ['equal-angle', 'unequal-angle'].includes(getShapeType(family))
}
