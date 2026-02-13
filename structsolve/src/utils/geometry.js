/**
 * Compute support auto-rotation angle based on connected members.
 * Returns:
 *   0   — support faces DOWN (default, member goes up)
 *   180 — support faces UP (all members go down)
 *   90  — support faces LEFT (all members go right, wall-mounted)
 *  -90  — support faces RIGHT (all members go left, wall-mounted)
 */
export function computeSupportAngle(node, allNodes, members) {
  const connected = members.filter(
    m => m.startNodeId === node.id || m.endNodeId === node.id
  );
  if (connected.length === 0) return 0;

  // Compute average direction of connected members
  let sumDx = 0, sumDy = 0;
  connected.forEach(m => {
    const otherId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
    const other = allNodes.find(n => n.id === otherId);
    if (!other) return;
    const dx = other.x - node.x;
    const dy = other.y - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) { sumDx += dx / dist; sumDy += dy / dist; }
  });

  const avgAngle = Math.atan2(sumDy, sumDx) * 180 / Math.PI;

  // Members go UP (avg angle ~ -90): support faces down → 0
  if (avgAngle < -45 && avgAngle > -135) return 0;
  // Members go DOWN (avg angle ~ 90): support faces up → 180
  if (avgAngle > 45 && avgAngle < 135) return 180;
  // Members go RIGHT (avg angle ~ 0): support faces left → 90
  if (avgAngle >= -45 && avgAngle <= 45) return 90;
  // Members go LEFT (avg angle ~ ±180): support faces right → -90
  return -90;
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
