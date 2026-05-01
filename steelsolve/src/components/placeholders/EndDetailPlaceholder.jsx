export default function EndDetailPlaceholder() {
  return (
    <svg viewBox="0 0 620 180" role="img" aria-labelledby="end-detail-title">
      <title id="end-detail-title">Placeholder end detail with bolt group and dimensions</title>
      <defs>
        <marker id="dim-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" className="svg-marker" />
        </marker>
      </defs>
      <rect x="86" y="42" width="448" height="96" className="svg-plate" />
      <rect x="86" y="70" width="448" height="40" className="svg-member-light" />
      <line x1="70" y1="90" x2="550" y2="90" className="svg-centerline" />
      <line x1="310" y1="28" x2="310" y2="152" className="svg-centerline" />
      {[258, 362].map((cx) => (
        [70, 110].map((cy) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" className="svg-bolt" />
        ))
      ))}
      <line x1="258" y1="158" x2="362" y2="158" className="svg-dim" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
      <text x="310" y="174" textAnchor="middle" className="svg-note">pitch</text>
      <line x1="558" y1="70" x2="558" y2="110" className="svg-dim" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
      <text x="588" y="94" textAnchor="middle" className="svg-note">gage</text>
      <text x="108" y="62" className="svg-label">end detail</text>
    </svg>
  )
}
