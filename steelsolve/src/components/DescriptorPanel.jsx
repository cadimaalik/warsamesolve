import DescriptorGroup from './DescriptorGroup'

const descriptorGroups = [
  {
    title: 'Member',
    text: 'Section selection will be added next.',
  },
  {
    title: 'Gusset Plates',
    text: 'Mirrored end gussets will be configured here.',
  },
  {
    title: 'Connection',
    text: 'Connected part and orientation will be configured here.',
  },
  {
    title: 'Bolts',
    text: 'Bolt layout controls will be added here.',
  },
  {
    title: 'Failure Path',
    text: 'Straight and custom paths will be added here.',
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
          <DescriptorGroup key={group.title} title={group.title}>
            {group.text}
          </DescriptorGroup>
        ))}
      </div>
    </aside>
  )
}
