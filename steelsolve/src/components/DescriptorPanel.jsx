import DescriptorGroup from './DescriptorGroup'

const descriptorGroups = [
  {
    title: 'Member',
    rows: [
      { label: 'Member type', value: 'Section picker coming next' },
      { label: 'Section', value: 'Not configured' },
    ],
  },
  {
    title: 'Gusset Plates',
    rows: [
      { label: 'Arrangement', value: 'Mirrored trapezoid gussets' },
      { label: 'Plate mode', value: 'Single / double coming next' },
    ],
  },
  {
    title: 'Connection',
    rows: [
      { label: 'Connected part', value: 'Web / flange / leg coming next' },
      { label: 'Orientation', value: 'Front / back / top / bottom coming next' },
    ],
  },
  {
    title: 'Bolts',
    rows: [
      { label: 'Bolt diameter', value: 'M24' },
      { label: 'Layout', type: 'input', value: '2 rows x 2 columns' },
    ],
  },
  {
    title: 'Failure Path',
    rows: [
      { label: 'Mode', value: 'Straight path' },
      { label: 'Custom path', type: 'button', value: 'Coming next' },
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
