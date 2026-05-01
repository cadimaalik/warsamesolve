export function FieldRow({ label, children, helper }) {
  return (
    <label className="descriptor-row">
      <span>{label}</span>
      <div className="control-stack">
        {children}
        {helper ? <small>{helper}</small> : null}
      </div>
    </label>
  )
}

export function StaticRow({ label, value }) {
  return (
    <div className="descriptor-row">
      <span>{label}</span>
      <div className="fixed-value">{value}</div>
    </div>
  )
}

export default function DescriptorGroup({ title, children }) {
  const headingId = `${title.toLowerCase().replace(/\s+/g, '-')}-heading`

  return (
    <section className="descriptor-group" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      <div className="descriptor-fields">
        {children}
      </div>
    </section>
  )
}
