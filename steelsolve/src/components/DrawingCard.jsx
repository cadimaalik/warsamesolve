export default function DrawingCard({ title, children }) {
  return (
    <article className="drawing-card" aria-label={title}>
      <div className="drawing-titlebar">
        <span>{title}</span>
      </div>
      <div className="drawing-frame">
        {children}
      </div>
    </article>
  )
}
