export default function CrossSectionPlaceholder() {
  return (
    <svg viewBox="0 0 760 220" role="img" aria-labelledby="cross-section-title">
      <title id="cross-section-title">Placeholder channel section detail</title>
      <path d="M 330 54 H 502 V 86 H 370 V 134 H 502 V 166 H 330 Z" className="svg-section" />
      <line x1="330" y1="110" x2="502" y2="110" className="svg-centerline" />
      <line x1="416" y1="40" x2="416" y2="182" className="svg-centerline" />
      <text x="220" y="96" className="svg-label">C/channel placeholder</text>
      <text x="220" y="128" className="svg-note">Section detail</text>
      <text x="416" y="202" textAnchor="middle" className="svg-note">future section table data</text>
    </svg>
  )
}
