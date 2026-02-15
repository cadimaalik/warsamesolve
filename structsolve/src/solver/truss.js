// truss.js — Method of Joints for Truss Member Forces

/**
 * Detect zero-force members before the main Method of Joints loop.
 *
 * Rules (applied at joints with NO external load and NO reactions):
 *
 * 1. Two non-collinear members meet → BOTH are zero-force.
 * 2. Three members meet and two are collinear → the THIRD is zero-force.
 *
 * This is iterated because eliminating a zero-force member can reveal
 * new zero-force members at neighbouring joints.
 */
export function detectZeroForceMembers(nodes, members, reactions) {
  const zeroForce = new Set();

  // Helper: does this joint have any external load or reaction?
  function hasExternalForce(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return false;
    const fx = node.loads?.fx || 0;
    const fy = node.loads?.fy || 0;
    if (Math.abs(fx) > 1e-10 || Math.abs(fy) > 1e-10) return true;
    return reactions.some(r => r.nodeId === nodeId);
  }

  // Helper: unit direction vector of a member FROM a given node
  function unitDir(member, fromNodeId) {
    const other = member.startNodeId === fromNodeId ? member.endNodeId : member.startNodeId;
    const fn = nodes.find(n => n.id === fromNodeId);
    const on = nodes.find(n => n.id === other);
    const dx = on.x - fn.x;
    const dy = on.y - fn.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1e-12) return { cos: 0, sin: 0 };
    return { cos: dx / L, sin: dy / L };
  }

  // Helper: are two direction vectors collinear (parallel or anti-parallel)?
  function areCollinear(d1, d2) {
    // Cross product ≈ 0 → collinear
    return Math.abs(d1.cos * d2.sin - d1.sin * d2.cos) < 1e-6;
  }

  let progress = true;
  while (progress) {
    progress = false;

    for (const node of nodes) {
      if (hasExternalForce(node.id)) continue;

      // Active (non-zero-force) truss members at this joint
      const active = members.filter(m =>
        m.type === 'truss' &&
        !zeroForce.has(m.id) &&
        (m.startNodeId === node.id || m.endNodeId === node.id)
      );

      if (active.length === 0) continue;

      // Rule 1: exactly 2 non-collinear members → both zero-force
      if (active.length === 2) {
        const d1 = unitDir(active[0], node.id);
        const d2 = unitDir(active[1], node.id);
        if (!areCollinear(d1, d2)) {
          zeroForce.add(active[0].id);
          zeroForce.add(active[1].id);
          progress = true;
        }
      }

      // Rule 2: exactly 3 members, two collinear → third is zero-force
      if (active.length === 3) {
        const dirs = active.map(m => unitDir(m, node.id));
        for (let i = 0; i < 3; i++) {
          const j = (i + 1) % 3;
          const k = (i + 2) % 3;
          if (areCollinear(dirs[j], dirs[k])) {
            // j and k are collinear → member i is zero-force
            if (!zeroForce.has(active[i].id)) {
              zeroForce.add(active[i].id);
              progress = true;
            }
          }
        }
      }

      // Rule 1 extended: single member at an unloaded joint → zero-force
      if (active.length === 1) {
        zeroForce.add(active[0].id);
        progress = true;
      }
    }
  }

  return zeroForce;
}

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

  // --- Phase 1: Detect and mark zero-force members ---
  const zeroForceIds = detectZeroForceMembers(nodes, trussMembers, reactions);
  for (const id of zeroForceIds) {
    memberForces[id] = 0;
    solved.add(id);
  }

  // --- Phase 2: Iterative Method of Joints ---
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
    classification: classifyForce(memberForces[m.id] || 0),
    isZeroForceMember: zeroForceIds.has(m.id),
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

export function classifyForce(value) {
  if (value > 0.001) return 'Tension (T)';
  if (value < -0.001) return 'Compression (C)';
  return 'Zero Force';
}

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
