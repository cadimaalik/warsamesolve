export default function TopViewPlaceholder() {
  return (
    <svg viewBox="0 0 620 180" role="img" aria-labelledby="top-view-title">
      <title id="top-view-title">Placeholder top view of a tension member with gusset plates and bolts</title>
      <defs>
        <marker id="top-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" className="svg-marker" />
        </marker>
      </defs>
      <rect x="190" y="72" width="240" height="36" className="svg-member" />
      <polygon points="62,52 190,72 190,108 62,128" className="svg-gusset" />
      <polygon points="558,52 430,72 430,108 558,128" className="svg-gusset" />
      <line x1="70" y1="90" x2="550" y2="90" className="svg-centerline" />
      {[120, 152, 468, 500].map((cx) => (
        <circle key={cx} cx={cx} cy="90" r="8" className="svg-bolt" />
      ))}
      <line x1="46" y1="90" x2="20" y2="90" className="svg-force" markerEnd="url(#top-arrow)" />
      <line x1="574" y1="90" x2="600" y2="90" className="svg-force" markerEnd="url(#top-arrow)" />
      <text x="310" y="42" textAnchor="middle" className="svg-label">member axis</text>
      <text x="138" y="150" textAnchor="middle" className="svg-note">gusset</text>
      <text x="482" y="150" textAnchor="middle" className="svg-note">gusset</text>
    </svg>
  )
}
