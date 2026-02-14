// truss.js — Method of Joints for Truss Member Forces

export function solveTrussForces(nodes, members, reactions) {
  const trussMembers = members.filter(m => m.type === 'truss');
  if (trussMembers.length === 0) return [];

  // Build node → connected truss members lookup
  const nodeToMembers = {};
  for (const m of trussMembers) {
    if (!nodeToMembers[m.startNodeId]) nodeToMembers[m.startNodeId] = [];
    if (!nodeToMembers[m.endNodeId]) nodeToMembers[m.endNodeId] = [];
    nodeToMembers[m.startNodeId].push(m);
    nodeToMembers[m.endNodeId].push(m);
  }

  const memberForces = {};  // memberId → force value
  const solved = new Set();

  // Iterative: find joints with ≤ 2 unsolved truss members
  let progress = true;
  let maxIterations = trussMembers.length * 2; // safety limit

  while (progress && maxIterations-- > 0) {
    progress = false;

    for (const [nodeId, connMembers] of Object.entries(nodeToMembers)) {
      const node = nodes.find(n => n.id === nodeId);
      const unsolved = connMembers.filter(m => !solved.has(m.id));

      if (unsolved.length === 0 || unsolved.length > 2) continue;

      // Sum known forces at this joint
      let sumFx = node.loads.fx;
      let sumFy = node.loads.fy;

      // Add reactions
      for (const r of reactions) {
        if (r.nodeId !== nodeId) continue;
        if (r.type === 'Rx') sumFx += r.value;
        if (r.type === 'Ry') sumFy += r.value;
      }

      // Add already-solved member forces
      for (const m of connMembers) {
        if (!solved.has(m.id)) continue;
        const dir = getMemberDirectionFromNode(m, nodeId, nodes);
        // Tension (positive F) pulls joint toward other end
        // At the joint: force component = F * (cos, sin) toward other node
        sumFx += memberForces[m.id] * dir.cos;
        sumFy += memberForces[m.id] * dir.sin;
      }

      if (unsolved.length === 1) {
        const m = unsolved[0];
        const dir = getMemberDirectionFromNode(m, nodeId, nodes);

        // ΣFx = sumFx + F*cos = 0  →  F = -sumFx/cos
        // ΣFy = sumFy + F*sin = 0  →  F = -sumFy/sin
        // Use the equation with the larger coefficient for numerical stability
        let F;
        if (Math.abs(dir.cos) > Math.abs(dir.sin)) {
          F = -sumFx / dir.cos;
        } else {
          F = -sumFy / dir.sin;
        }

        memberForces[m.id] = roundTo(F, 4);
        solved.add(m.id);
        progress = true;

      } else if (unsolved.length === 2) {
        const m1 = unsolved[0];
        const m2 = unsolved[1];
        const d1 = getMemberDirectionFromNode(m1, nodeId, nodes);
        const d2 = getMemberDirectionFromNode(m2, nodeId, nodes);

        // Solve 2×2:
        // d1.cos * F1 + d2.cos * F2 = -sumFx
        // d1.sin * F1 + d2.sin * F2 = -sumFy
        const det = d1.cos * d2.sin - d2.cos * d1.sin;
        if (Math.abs(det) < 1e-10) continue; // parallel — skip

        const F1 = (-sumFx * d2.sin - (-sumFy) * d2.cos) / det;
        const F2 = (d1.cos * (-sumFy) - d1.sin * (-sumFx)) / det;

        memberForces[m1.id] = roundTo(F1, 4);
        memberForces[m2.id] = roundTo(F2, 4);
        solved.add(m1.id);
        solved.add(m2.id);
        progress = true;
      }
    }
  }

  // Format results
  return trussMembers.map(m => ({
    memberId: m.id,
    startLabel: m.startLabel,
    endLabel: m.endLabel,
    force: memberForces[m.id] || 0,
    classification: classifyForce(memberForces[m.id] || 0)
  }));
}

// Direction unit vector FROM this node TOWARD the other end of the member
function getMemberDirectionFromNode(member, nodeId, nodes) {
  const otherNodeId = member.startNodeId === nodeId ? member.endNodeId : member.startNodeId;
  const thisNode = nodes.find(n => n.id === nodeId);
  const otherNode = nodes.find(n => n.id === otherNodeId);
  const dx = otherNode.x - thisNode.x;
  const dy = otherNode.y - thisNode.y;
  const L = Math.sqrt(dx * dx + dy * dy);
  return { cos: dx / L, sin: dy / L };
}

function classifyForce(value) {
  if (value > 0.001) return 'Tension (T)';
  if (value < -0.001) return 'Compression (C)';
  return 'Zero Force';
}

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
