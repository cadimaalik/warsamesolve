import DescriptorGroup from './DescriptorGroup'

const descriptorGroups = [
  {
    title: 'Member',
    rows: [
      { label: 'Member type' },
      { label: 'Section' },
    ],
  },
  {
    title: 'Gusset Plates',
    rows: [
      { label: 'Arrangement' },
      { label: 'Plate mode' },
    ],
  },
  {
    title: 'Connection',
    rows: [
      { label: 'Connected part' },
      { label: 'Orientation' },
    ],
  },
  {
    title: 'Bolts',
    rows: [
      { label: 'Bolt diameter' },
      { label: 'Layout', type: 'input' },
    ],
  },
  {
    title: 'Failure Path',
    rows: [
      { label: 'Mode' },
      { label: 'Custom path', type: 'button' },
    ],
  },
]

export default function DescriptorPanel() {
  return (
    <aside className="descriptor-panel" aria-labelledby="descriptor-heading">
      <div className="panel-heading">
        <p className="panel-kicker">Input model</p>
        <h2 id="descriptor-heading">Problem Descriptor</h2>
      </div>

      <div className="descriptor-list">
        {descriptorGroups.map((group) => (
          <DescriptorGroup key={group.title} title={group.title} rows={group.rows} />
        ))}
      </div>
    </aside>
  )
}
