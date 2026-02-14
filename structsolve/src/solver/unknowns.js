// unknowns.js — Identify Reaction Unknowns from Supports

export function identifyUnknowns(nodes) {
  const unknowns = [];

  for (const node of nodes) {
    if (!node.support) continue;

    // Each support type contributes specific reaction components
    const supportMap = {
      'pin':      ['Rx', 'Ry'],
      'roller-h': ['Ry'],
      'roller-v': ['Rx'],
      'fixed':    ['Rx', 'Ry', 'M'],
      'guide-h':  ['Ry', 'M'],
      'guide-v':  ['Rx', 'M'],
    };

    const types = supportMap[node.support];
    if (!types) continue;

    for (const type of types) {
      unknowns.push({
        nodeId: node.id,
        label: node.label,
        type: type,            // 'Rx', 'Ry', or 'M'
        node: node             // reference to the full node object
      });
    }
  }

  return unknowns;
}
