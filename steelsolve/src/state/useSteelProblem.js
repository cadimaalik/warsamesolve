import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'steelsolve_problem_descriptor_v1'

export const defaultProblem = {
  problemType: 'tension-member-connection',
  member: {
    memberType: '',
    sectionFamily: '',
    sectionDesignation: '',
    splicePlate: {
      width_mm: '',
      thickness_mm: '',
    },
    material: {
      grade: '',
      Fy_MPa: '',
      Fu_MPa: '',
    },
  },
  gusset: {
    arrangement: '',
    mirroredEnds: true,
    shape: 'trapezoid',
    assumedRigid: true,
  },
  connection: {
    connectedElement: '',
  },
  bolts: {
    diameter: 'M24',
    holeType: 'standard',
    columnCount: '',
    sameBoltCountEachColumn: true,
    boltsPerColumn: '',
    boltCountsByColumn: [],
    pitch_s_mm: 75,
    gage_g_mm: 100,
    horizontalEdgeDistance_mm: 50,
    topEdgeDistance_mm: 100,
    bottomEdgeDistance_mm: 100,
  },
}

const materialDefaults = {
  S235: { Fy_MPa: 235, Fu_MPa: 360 },
  S275: { Fy_MPa: 275, Fu_MPa: 430 },
  S355: { Fy_MPa: 355, Fu_MPa: 510 },
}

function cloneDefaultProblem() {
  return JSON.parse(JSON.stringify(defaultProblem))
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mergeWithDefault(defaultValue, savedValue) {
  if (Array.isArray(defaultValue)) {
    return Array.isArray(savedValue) ? savedValue : defaultValue
  }

  if (!isPlainObject(defaultValue)) {
    if (savedValue === null || savedValue === undefined || isPlainObject(savedValue) || Array.isArray(savedValue)) {
      return defaultValue
    }

    return savedValue
  }

  if (!isPlainObject(savedValue)) {
    return defaultValue
  }

  return Object.fromEntries(
    Object.entries(defaultValue).map(([key, value]) => [
      key,
      mergeWithDefault(value, savedValue[key]),
    ]),
  )
}

function loadSavedProblem() {
  if (typeof window === 'undefined') {
    return cloneDefaultProblem()
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return cloneDefaultProblem()
    }

    const parsed = JSON.parse(saved)

    if (!isPlainObject(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return cloneDefaultProblem()
    }

    return mergeWithDefault(cloneDefaultProblem(), parsed)
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return cloneDefaultProblem()
  }
}

function setAtPath(source, path, value) {
  const [key, ...rest] = path

  if (!key) {
    return value
  }

  return {
    ...source,
    [key]: rest.length ? setAtPath(source[key], rest, value) : value,
  }
}

function normalizeBoltCounts(columnCount, existingCounts = []) {
  const count = Number.parseInt(columnCount, 10)

  if (!Number.isFinite(count) || count < 1) {
    return []
  }

  return Array.from({ length: count }, (_, index) => existingCounts[index] ?? '')
}

function normalizeConnectedElementForSectionFamily(sectionFamily, connectedElement) {
  if (sectionFamily === 'equal-angle') {
    return 'one-leg'
  }

  if (sectionFamily === 'unequal-angle') {
    return ['short-leg', 'long-leg'].includes(connectedElement) ? connectedElement : 'long-leg'
  }

  return ['web', 'flange'].includes(connectedElement) ? connectedElement : ''
}

export default function useSteelProblem() {
  const [problem, setProblem] = useState(loadSavedProblem)
  const skipNextSave = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(problem))
    } catch {
      // Ignore storage failures so descriptor editing keeps working.
    }
  }, [problem])

  const updateField = useCallback((path, value) => {
    setProblem((current) => setAtPath(current, path, value))
  }, [])

  const updateMemberType = useCallback((memberType) => {
    setProblem((current) => ({
      ...current,
      member: {
        ...current.member,
        memberType,
        sectionFamily: memberType === 'rolled-section' ? current.member.sectionFamily : '',
        sectionDesignation: '',
        splicePlate: memberType === 'splice-plate'
          ? current.member.splicePlate
          : { width_mm: '', thickness_mm: '' },
      },
      connection: {
        ...current.connection,
        connectedElement: memberType === 'rolled-section'
          ? normalizeConnectedElementForSectionFamily(
            current.member.sectionFamily,
            current.connection.connectedElement,
          )
          : '',
      },
    }))
  }, [])

  const updateSectionFamily = useCallback((sectionFamily) => {
    setProblem((current) => ({
      ...current,
      member: {
        ...current.member,
        sectionFamily,
        sectionDesignation: '',
      },
      connection: {
        ...current.connection,
        connectedElement: normalizeConnectedElementForSectionFamily(
          sectionFamily,
          current.connection.connectedElement,
        ),
      },
    }))
  }, [])

  const updateSectionDesignation = useCallback((sectionDesignation) => {
    setProblem((current) => ({
      ...current,
      member: {
        ...current.member,
        sectionDesignation,
      },
    }))
  }, [])

  const updateMaterialGrade = useCallback((grade) => {
    setProblem((current) => ({
      ...current,
      member: {
        ...current.member,
        material: {
          grade,
          Fy_MPa: materialDefaults[grade]?.Fy_MPa ?? '',
          Fu_MPa: materialDefaults[grade]?.Fu_MPa ?? '',
        },
      },
    }))
  }, [])

  const updateGussetArrangement = useCallback((arrangement) => {
    setProblem((current) => ({
      ...current,
      gusset: {
        ...current.gusset,
        arrangement,
        mirroredEnds: true,
        shape: 'trapezoid',
        assumedRigid: true,
      },
    }))
  }, [])

  const updateColumnCount = useCallback((columnCount) => {
    setProblem((current) => ({
      ...current,
      bolts: {
        ...current.bolts,
        columnCount,
        boltCountsByColumn: normalizeBoltCounts(columnCount, current.bolts.boltCountsByColumn),
      },
    }))
  }, [])

  const updateSameBoltCountEachColumn = useCallback((sameBoltCountEachColumn) => {
    setProblem((current) => ({
      ...current,
      bolts: {
        ...current.bolts,
        sameBoltCountEachColumn,
        boltCountsByColumn: sameBoltCountEachColumn
          ? []
          : normalizeBoltCounts(current.bolts.columnCount, current.bolts.boltCountsByColumn),
      },
    }))
  }, [])

  const updateBoltCountByColumn = useCallback((index, value) => {
    setProblem((current) => {
      const boltCountsByColumn = normalizeBoltCounts(
        current.bolts.columnCount,
        current.bolts.boltCountsByColumn,
      )
      boltCountsByColumn[index] = value

      return {
        ...current,
        bolts: {
          ...current.bolts,
          boltCountsByColumn,
        },
      }
    })
  }, [])

  const resetProblem = useCallback(() => {
    if (typeof window !== 'undefined') {
      skipNextSave.current = true
      window.localStorage.removeItem(STORAGE_KEY)
    }

    setProblem(cloneDefaultProblem())
  }, [])

  return {
    problem,
    updateField,
    updateMemberType,
    updateSectionFamily,
    updateSectionDesignation,
    updateMaterialGrade,
    updateGussetArrangement,
    updateColumnCount,
    updateSameBoltCountEachColumn,
    updateBoltCountByColumn,
    resetProblem,
  }
}
