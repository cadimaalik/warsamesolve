import { useEffect, useState } from 'react'

export default function Header() {
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (!showToast) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setShowToast(false), 2400)
    return () => window.clearTimeout(timeoutId)
  }, [showToast])

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="title-row">
          <a className="brand-link" href="../index.html" aria-label="Return to metuCE landing page">
            SteelSolve
          </a>
          <span className="subtitle">Tension Member Problem Builder</span>
        </div>
      </div>
      <div className="header-actions">
        <button type="button" className="analyze-button" onClick={() => setShowToast(true)}>
          Analyze
        </button>
        {showToast ? (
          <div className="analysis-toast" role="status">
            Analysis will be added later.
          </div>
        ) : null}
      </div>
    </header>
  )
}
