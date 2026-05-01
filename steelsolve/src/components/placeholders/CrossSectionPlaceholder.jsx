export default function CrossSectionPlaceholder() {
  return (
    <svg viewBox="0 0 620 180" role="img" aria-labelledby="cross-section-title">
      <title id="cross-section-title">Placeholder channel section detail</title>
      <path d="M 300 42 H 424 V 64 H 328 V 116 H 424 V 138 H 300 Z" className="svg-section" />
      <line x1="300" y1="90" x2="424" y2="90" className="svg-centerline" />
      <line x1="362" y1="30" x2="362" y2="150" className="svg-centerline" />
      <text x="160" y="78" className="svg-label">C/channel placeholder</text>
      <text x="160" y="108" className="svg-note">Section detail</text>
      <text x="362" y="164" textAnchor="middle" className="svg-note">future section data</text>
    </svg>
  )
}
