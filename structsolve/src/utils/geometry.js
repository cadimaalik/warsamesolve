/**
 * Compute support auto-rotation angle.
 * Returns 0 if support should face DOWN (default).
 * Returns 180 if ALL connected members go downward (support faces UP).
 */
export function computeSupportAngle(node, allNodes, members) {
  const connected = members.filter(
    m => m.startNodeId === node.id || m.endNodeId === node.id
  );
  if (connected.length === 0) return 0;

  let allDown = true;
  connected.forEach(m => {
    const otherId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
    const other = allNodes.find(n => n.id === otherId);
    if (other && other.y <= node.y) allDown = false;
  });
  return allDown ? 180 : 0;
}

/**
 * Next available node label: A, B, C, ..., Z, AA, AB, ...
 */
export function nextNodeLabel(existingIds) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < alpha.length; i++) {
    if (!existingIds.includes(alpha[i])) return alpha[i];
  }
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const label = alpha[i] + alpha[j];
      if (!existingIds.includes(label)) return label;
    }
  }
  return '?';
}

/**
 * Compute real-world coordinates via BFS graph traversal.
 * Each node gets a real-world {x, y} computed from member lengths and pixel directions.
 */
export function computeRealCoordinates(nodes, members) {
  const realCoords = {};
  if (nodes.length === 0) return realCoords;

  realCoords[nodes[0].id] = { x: 0, y: 0 };
  const queue = [nodes[0].id];
  const visited = new Set([nodes[0].id]);

  while (queue.length > 0) {
    const curId = queue.shift();
    const curNode = nodes.find(n => n.id === curId);
    if (!curNode) continue;

    members.forEach(m => {
      let otherId = null;
      if (m.startNodeId === curId) otherId = m.endNodeId;
      else if (m.endNodeId === curId) otherId = m.startNodeId;
      if (!otherId || visited.has(otherId)) return;

      const otherNode = nodes.find(n => n.id === otherId);
      if (!otherNode) return;
      const pdx = otherNode.x - curNode.x;
      const pdy = otherNode.y - curNode.y;
      const pixDist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pixDist < 1) return;

      const scale = m.length / pixDist;
      realCoords[otherId] = {
        x: realCoords[curId].x + pdx * scale,
        y: realCoords[curId].y + pdy * scale,
      };
      visited.add(otherId);
      queue.push(otherId);
    });
  }
  return realCoords;
}

/**
 * Real-world Euclidean distance between two nodes.
 */
export function realDistance(fromId, toId, nodes, members) {
  const coords = computeRealCoordinates(nodes, members);
  if (!coords[fromId] || !coords[toId]) return 0;
  const dx = coords[toId].x - coords[fromId].x;
  const dy = coords[toId].y - coords[fromId].y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

/**
 * Check if a pixel position is within tolerance of an existing node.
 * Returns the matching node or null.
 */
export function findOverlappingNode(x, y, nodes, tolerance = 15) {
  for (const n of nodes) {
    const dx = n.x - x;
    const dy = n.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < tolerance) return n;
  }
  return null;
}
