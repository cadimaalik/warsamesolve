function DisabledRow({ label, type = 'select', value }) {
  return (
    <label className="descriptor-row">
      <span>{label}</span>
      {type === 'button' ? (
        <button type="button" disabled>{value}</button>
      ) : type === 'input' ? (
        <input value={value} disabled readOnly />
      ) : (
        <select value={value} disabled>
          <option>{value}</option>
        </select>
      )}
    </label>
  )
}

export default function DescriptorGroup({ title, rows }) {
  const headingId = `${title.toLowerCase().replace(/\s+/g, '-')}-heading`

  return (
    <section className="descriptor-group" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      <div className="descriptor-fields">
        {rows.map((row) => (
          <DisabledRow key={row.label} {...row} />
        ))}
      </div>
    </section>
  )
}
