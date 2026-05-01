export default function DescriptorGroup({ title, children }) {
  return (
    <section className="descriptor-group" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}>
      <h3 id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}>{title}</h3>
      <p>{children}</p>
    </section>
  )
}
