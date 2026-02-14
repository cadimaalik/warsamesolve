// unknowns.js — Identify Reaction Unknowns from Supports

export function identifyUnknowns(nodes) {
  const unknowns = [];

  for (const node of nodes) {
    if (!node.support) continue;

    // Each support type contributes specific reaction components
    const supportMap = {
      'pin':      ['Rx', 'Ry'],           // 2 reactions
      'roller-h': ['Ry'],                  // moves horizontally, blocks vertical
      'roller-v': ['Rx'],                  // moves vertically, blocks horizontal
      'fixed':    ['Rx', 'Ry', 'M'],       // 3 reactions
      'guide-h':  ['Ry', 'M'],             // moves horizontally, blocks Ry + moment
      'guide-v':  ['Rx', 'M'],             // moves vertically, blocks Rx + moment
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
