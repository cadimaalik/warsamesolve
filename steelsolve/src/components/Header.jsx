import { useEffect, useState } from 'react'
import AnalyzeButton from './AnalyzeButton'

export default function Header({ onAnalyze, onClear }) {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const handleAnalyze = () => {
    const { issues, result } = onAnalyze()
    setToast({
      type: issues.length ? 'issues' : 'ready',
      messages: issues.length ? issues : [result?.status ? 'Solution outline generated.' : 'Analysis will be added in a later step.'],
    })
  }

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
        <button type="button" className="clear-button" onClick={onClear}>
          Clear
        </button>
        <AnalyzeButton onAnalyze={handleAnalyze} />
        {toast ? (
          <div className={`analysis-toast analysis-toast-${toast.type}`} role="status">
            {toast.messages.length > 1 ? (
              <ul>
                {toast.messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : (
              toast.messages[0]
            )}
          </div>
        ) : null}
      </div>
    </header>
  )
}
