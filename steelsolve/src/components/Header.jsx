export default function Header() {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <p className="eyebrow">METU CE Steel Design</p>
        <div className="title-row">
          <h1>SteelSolve</h1>
          <span className="subtitle">Tension Member Problem Builder</span>
        </div>
      </div>
      <div className="status-pill" aria-label="Current app mode">
        Problem description mode
      </div>
    </header>
  )
}
