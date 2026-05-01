import {
  isAngleFamily,
  isChannelFamily,
  isIShapeFamily,
} from '../utils/sectionLookup'

function formatValue(value) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function PropertyItem({ label, value }) {
  return (
    <div className="section-property">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>
    </div>
  )
}

export default function SectionProperties({ section }) {
  if (!section) {
    return null
  }

  const { dimensions, properties } = section
  const common = [
    ['Designation', section.designation],
    ['Shape type', section.shapeType],
    ['G, kg/m', section.G_kg_per_m],
  ]

  const iShapeFields = [
    ['d, mm', dimensions.d_mm],
    ['bf, mm', dimensions.bf_mm],
    ['tw, mm', dimensions.tw_mm],
    ['tf, mm', dimensions.tf_mm],
    ['A, mm2', properties.A_mm2],
    ['Ix, mm4', properties.Ix_mm4],
    ['Iy, mm4', properties.Iy_mm4],
    ['rx, mm', properties.rx_mm],
    ['ry, mm', properties.ry_mm],
  ]

  const channelFields = [
    ['d, mm', dimensions.d_mm],
    ['bf, mm', dimensions.bf_mm],
    ['tw, mm', dimensions.tw_mm],
    ['tf, mm', dimensions.tf_mm],
    ['A, mm2', properties.A_mm2],
    ['xs, mm', properties.xs_mm],
    ['xm, mm', properties.xm_mm],
  ]

  const angleFields = [
    ['h, mm', dimensions.h_mm],
    ['b, mm', dimensions.b_mm],
    ['t, mm', dimensions.t_mm],
    ['A, mm2', properties.A_mm2],
    ['xs, mm', properties.xs_mm],
    ['ys, mm', properties.ys_mm],
  ]

  const family = section.family
  const fields = [
    ...common,
    ...(isIShapeFamily(family) ? iShapeFields : []),
    ...(isChannelFamily(family) ? channelFields : []),
    ...(isAngleFamily(family) ? angleFields : []),
  ]

  return (
    <section className="section-properties" aria-label="Selected section properties">
      <div className="section-properties-grid">
        {fields.map(([label, value]) => (
          <PropertyItem key={label} label={label} value={value} />
        ))}
      </div>
      {!section.verified ? (
        <p className="section-warning">Section data is unverified. Use for problem description only.</p>
      ) : null}
    </section>
  )
}
