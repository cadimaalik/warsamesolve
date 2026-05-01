export default function EndDetailPlaceholder() {
  return (
    <svg viewBox="0 0 760 240" role="img" aria-labelledby="end-detail-title">
      <title id="end-detail-title">Placeholder end detail with bolt group and dimensions</title>
      <defs>
        <marker id="dim-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M 0 0 L 9 4.5 L 0 9 z" fill="#102018" />
        </marker>
      </defs>
      <rect x="120" y="58" width="520" height="124" rx="6" className="svg-plate" />
      <rect x="120" y="92" width="520" height="56" className="svg-member-light" />
      <line x1="100" y1="120" x2="660" y2="120" className="svg-centerline" />
      <line x1="380" y1="42" x2="380" y2="198" className="svg-centerline" />
      {[310, 450].map((cx) => (
        [92, 148].map((cy) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="14" className="svg-bolt" />
        ))
      ))}
      <line x1="310" y1="212" x2="450" y2="212" className="svg-dim" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
      <text x="380" y="232" textAnchor="middle" className="svg-note">pitch placeholder</text>
      <line x1="676" y1="92" x2="676" y2="148" className="svg-dim" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
      <text x="710" y="123" textAnchor="middle" className="svg-note">gage</text>
      <text x="150" y="80" className="svg-label">end connection region</text>
    </svg>
  )
}
