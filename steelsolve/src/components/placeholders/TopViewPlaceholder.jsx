export default function TopViewPlaceholder() {
  return (
    <svg viewBox="0 0 760 220" role="img" aria-labelledby="top-view-title">
      <title id="top-view-title">Placeholder top view of a tension member with gusset plates and bolts</title>
      <defs>
        <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f8f4d" />
        </marker>
      </defs>
      <rect x="230" y="82" width="300" height="56" rx="4" className="svg-member" />
      <polygon points="80,58 230,82 230,138 80,162" className="svg-gusset" />
      <polygon points="680,58 530,82 530,138 680,162" className="svg-gusset" />
      <line x1="90" y1="110" x2="670" y2="110" className="svg-centerline" />
      {[150, 190, 570, 610].map((cx) => (
        <circle key={cx} cx={cx} cy="110" r="13" className="svg-bolt" />
      ))}
      <line x1="42" y1="110" x2="14" y2="110" className="svg-force" markerEnd="url(#arrow-green)" />
      <line x1="718" y1="110" x2="746" y2="110" className="svg-force" markerEnd="url(#arrow-green)" />
      <text x="380" y="54" textAnchor="middle" className="svg-label">axial tension member</text>
      <text x="150" y="190" textAnchor="middle" className="svg-note">left gusset</text>
      <text x="610" y="190" textAnchor="middle" className="svg-note">right gusset</text>
    </svg>
  )
}
