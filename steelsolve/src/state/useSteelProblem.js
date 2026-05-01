import { useCallback, useState } from 'react'

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
  failurePath: {
    mode: 'straight',
    points: [],
  },
}

const materialDefaults = {
  S235: { Fy_MPa: 235, Fu_MPa: 360 },
  S275: { Fy_MPa: 275, Fu_MPa: 430 },
  S355: { Fy_MPa: 355, Fu_MPa: 510 },
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

export default function useSteelProblem() {
  const [problem, setProblem] = useState(defaultProblem)

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
        connectedElement: memberType === 'splice-plate' ? '' : current.connection.connectedElement,
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
  }
}
