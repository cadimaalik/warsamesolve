import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'steelsolve:descriptor-split'
const DEFAULT_SPLIT = 66.67
const MIN_DESCRIPTOR_WIDTH = 360
const MIN_DIAGRAM_WIDTH = 320

function getStoredSplit() {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  const parsed = stored ? Number(stored) : DEFAULT_SPLIT
  return Number.isFinite(parsed) ? parsed : DEFAULT_SPLIT
}

export default function ResizableSplit({ children }) {
  const containerRef = useRef(null)
  const [split, setSplit] = useState(getStoredSplit)
  const [isDragging, setIsDragging] = useState(false)

  const clampSplit = useCallback((nextSplit) => {
    const container = containerRef.current
    if (!container) {
      return nextSplit
    }

    const width = container.getBoundingClientRect().width
    const minLeft = (MIN_DESCRIPTOR_WIDTH / width) * 100
    const maxLeft = 100 - (MIN_DIAGRAM_WIDTH / width) * 100
    return Math.min(Math.max(nextSplit, minLeft), maxLeft)
  }, [])

  const updateFromPointer = useCallback((clientX) => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const rect = container.getBoundingClientRect()
    const nextSplit = ((clientX - rect.left) / rect.width) * 100
    setSplit(clampSplit(nextSplit))
  }, [clampSplit])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(split))
  }, [split])

  useEffect(() => {
    if (!isDragging) {
      return undefined
    }

    const handlePointerMove = (event) => updateFromPointer(event.clientX)
    const handlePointerUp = () => setIsDragging(false)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, updateFromPointer])

  return (
    <main
      ref={containerRef}
      className={`workspace${isDragging ? ' is-resizing' : ''}`}
      style={{ '--descriptor-width': `${split}%` }}
      aria-label="SteelSolve tension member problem builder"
    >
      <div className="workspace-panel workspace-panel-left">{children[0]}</div>
      <button
        className="splitter"
        type="button"
        aria-label="Resize descriptor and diagram panels"
        onPointerDown={(event) => {
          event.preventDefault()
          setIsDragging(true)
          updateFromPointer(event.clientX)
        }}
      />
      <div className="workspace-panel workspace-panel-right">{children[1]}</div>
    </main>
  )
}
