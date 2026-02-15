// equations.js — Build Global Equilibrium Equations
import { convertDistributedLoads } from './distributed.js';

export function gatherKnownForces(nodes, members) {
  const forces = [];

  // Point loads at nodes
  for (const node of nodes) {
    if (node.loads.fx !== 0 || node.loads.fy !== 0 || node.loads.m !== 0) {
      forces.push({
        fx: node.loads.fx,
        fy: node.loads.fy,
        m: node.loads.m,
        x: node.x,
        y: node.y,
        source: `Load at ${node.label}`
      });
    }
  }

  // Equivalent forces from distributed loads
  const eqForces = convertDistributedLoads(members, nodes);
  for (const ef of eqForces) {
    forces.push({ ...ef, m: 0 });
  }

  return forces;
}

function pickMomentPoint(nodes, unknowns) {
  let best = null;
  let bestScore = -1;

  for (const node of nodes) {
    if (!node.support) continue;
    const forceUnknowns = unknowns.filter(
      u => u.nodeId === node.id && (u.type === 'Rx' || u.type === 'Ry')
    ).length;
    if (forceUnknowns > bestScore) {
      bestScore = forceUnknowns;
      best = node;
    }
  }

  // Fallback to first node if no supports found
  return best || nodes[0];
}

export function buildEquations(nodes, members, unknowns) {
  const n = unknowns.length;
  const equations = [];
  const knownForces = gatherKnownForces(nodes, members);

  // ═══ ΣFx = 0 ═══
  const eqFx = {
    coefficients: new Array(n).fill(0),
    rhs: 0,
    description: '\\sum F_x = 0',
    type: 'force-x'
  };
  for (let i = 0; i < n; i++) {
    if (unknowns[i].type === 'Rx') eqFx.coefficients[i] = 1;
  }
  for (const f of knownForces) {
    eqFx.rhs -= f.fx;  // move known Fx to RHS (negate)
  }
  equations.push(eqFx);

  // ═══ ΣFy = 0 ═══
  const eqFy = {
    coefficients: new Array(n).fill(0),
    rhs: 0,
    description: '\\sum F_y = 0',
    type: 'force-y'
  };
  for (let i = 0; i < n; i++) {
    if (unknowns[i].type === 'Ry') eqFy.coefficients[i] = 1;
  }
  for (const f of knownForces) {
    eqFy.rhs -= f.fy;
  }
  equations.push(eqFy);

  // ═══ ΣM about moment point = 0 ═══
  const mp = pickMomentPoint(nodes, unknowns);
  const eqM = {
    coefficients: new Array(n).fill(0),
    rhs: 0,
    description: `\\sum M_{${mp.label}} = 0`,
    type: 'moment',
    momentPoint: mp
  };

  for (let i = 0; i < n; i++) {
    const u = unknowns[i];
    const dx = u.node.x - mp.x;
    const dy = u.node.y - mp.y;

    // Moment contribution: M = r × F (cross product z-component)
    // M_z = dx * Fy - dy * Fx
    if (u.type === 'Rx') {
      eqM.coefficients[i] = -dy;   // M = -dy * Rx  (from: dx*0 - dy*Rx)
    } else if (u.type === 'Ry') {
      eqM.coefficients[i] = dx;    // M = dx * Ry  (from: dx*Ry - dy*0)
    } else if (u.type === 'M') {
      eqM.coefficients[i] = 1;     // moment reaction directly adds
    }
  }

  for (const f of knownForces) {
    const dx = f.x - mp.x;
    const dy = f.y - mp.y;
    const moment = dx * f.fy - dy * f.fx + (f.m || 0);
    eqM.rhs -= moment;
  }
  equations.push(eqM);

  // ═══ Additional equations from internal hinges ═══
  const hingeEquations = buildHingeEquations(nodes, members, unknowns, knownForces);
  equations.push(...hingeEquations);

  // ═══ Additional moment equations when more unknowns than equations ═══
  // Common case: pure truss with 2 pin supports → 4 unknowns but only
  // 3 global equations.  Taking ΣM about each additional support point
  // eliminates that support's force unknowns and provides an independent
  // equation.
  const usedMomentPoints = new Set([mp.id]);
  while (equations.length < n) {
    let nextPoint = null;
    let nextScore = -1;
    for (const node of nodes) {
      if (!node.support) continue;
      if (usedMomentPoints.has(node.id)) continue;
      const forceUnknowns = unknowns.filter(
        u => u.nodeId === node.id && (u.type === 'Rx' || u.type === 'Ry')
      ).length;
      if (forceUnknowns > nextScore) {
        nextScore = forceUnknowns;
        nextPoint = node;
      }
    }
    if (!nextPoint) break; // no more support points available

    const eqExtra = {
      coefficients: new Array(n).fill(0),
      rhs: 0,
      description: `\\sum M_{${nextPoint.label}} = 0`,
      type: 'moment',
      momentPoint: nextPoint
    };
    for (let i = 0; i < n; i++) {
      const u = unknowns[i];
      const dx = u.node.x - nextPoint.x;
      const dy = u.node.y - nextPoint.y;
      if (u.type === 'Rx') eqExtra.coefficients[i] = -dy;
      else if (u.type === 'Ry') eqExtra.coefficients[i] = dx;
      else if (u.type === 'M') eqExtra.coefficients[i] = 1;
    }
    for (const f of knownForces) {
      const dx = f.x - nextPoint.x;
      const dy = f.y - nextPoint.y;
      const moment = dx * f.fy - dy * f.fx + (f.m || 0);
      eqExtra.rhs -= moment;
    }
    equations.push(eqExtra);
    usedMomentPoints.add(nextPoint.id);
  }

  // Trim to n equations — pure frame path can be overdetermined when
  // hinge conditions add equations beyond the reaction unknown count
  // (e.g. cyclic frame with 3 hinges but only 3 reactions).
  if (equations.length > n) {
    equations.length = n;
  }

  // Store metadata for LaTeX generation later
  return {
    equations,
    knownForces,
    momentPoint: mp
  };
}

function buildHingeEquations(nodes, members, unknowns, knownForces) {
  const n = unknowns.length;
  const equations = [];

  // Find nodes where frame members have hinges (not truss — truss hinges are already in DOF formula)
  const hingeNodes = [];

  for (const node of nodes) {
    const connectedMembers = members.filter(
      m => m.startNodeId === node.id || m.endNodeId === node.id
    );
    if (connectedMembers.length < 2) continue;

    // Check for frame hinges at this node
    const hasFrameHinge = connectedMembers.some(m => {
      if (m.type !== 'frame') return false;
      if (m.startNodeId === node.id) return m.startHinge;
      if (m.endNodeId === node.id) return m.endHinge;
      return false;
    });

    if (hasFrameHinge) hingeNodes.push(node);
  }

  for (const hinge of hingeNodes) {
    // Get one sub-structure by traversing from one branch
    const sideA = getSubStructureNodes(hinge, nodes, members);

    // Build ΣM about the hinge = 0 for side A
    let eq = buildMomentEqForSide(hinge, sideA, unknowns, knownForces, nodes, n);

    // If side A has no reaction unknowns (all-zero coefficients), use
    // the complementary side B.  This happens when the arbitrary first
    // branch leads to a sub-structure with no supports.
    if (eq.coefficients.every(c => c === 0)) {
      const sideB = new Set([hinge.id]);
      for (const nd of nodes) {
        if (!sideA.has(nd.id)) sideB.add(nd.id);
      }
      eq = buildMomentEqForSide(hinge, sideB, unknowns, knownForces, nodes, n);
    }

    equations.push(eq);
  }

  return equations;
}

function buildMomentEqForSide(hinge, sideNodes, unknowns, knownForces, nodes, n) {
  const eq = {
    coefficients: new Array(n).fill(0),
    rhs: 0,
    description: `\\sum M_{${hinge.label}} = 0 \\text{ (hinge condition)}`,
    type: 'hinge-moment',
    hingeNode: hinge
  };

  // Only include unknowns that are ON this sub-structure
  for (let i = 0; i < n; i++) {
    const u = unknowns[i];
    if (!sideNodes.has(u.nodeId)) continue;

    const dx = u.node.x - hinge.x;
    const dy = u.node.y - hinge.y;

    if (u.type === 'Rx') eq.coefficients[i] = -dy;
    else if (u.type === 'Ry') eq.coefficients[i] = dx;
    else if (u.type === 'M') eq.coefficients[i] = 1;
  }

  // Known forces on this sub-structure
  for (const f of knownForces) {
    const nearestNode = nodes.reduce((closest, node) => {
      const d = Math.sqrt((node.x - f.x) ** 2 + (node.y - f.y) ** 2);
      const cd = Math.sqrt((closest.x - f.x) ** 2 + (closest.y - f.y) ** 2);
      return d < cd ? node : closest;
    }, nodes[0]);

    if (!sideNodes.has(nearestNode.id)) continue;

    const dx = f.x - hinge.x;
    const dy = f.y - hinge.y;
    const moment = dx * f.fy - dy * f.fx + (f.m || 0);
    eq.rhs -= moment;
  }

  return eq;
}

export function getSubStructureNodes(hingeNode, nodes, members) {
  // BFS from one branch of the hinge
  // Returns a Set of node IDs on one side (including the hinge itself)

  const connectedMembers = members.filter(
    m => m.startNodeId === hingeNode.id || m.endNodeId === hingeNode.id
  );

  if (connectedMembers.length === 0) return new Set();

  // Pick the first branch
  const firstMember = connectedMembers[0];
  const startId = firstMember.startNodeId === hingeNode.id
    ? firstMember.endNodeId
    : firstMember.startNodeId;

  const visited = new Set([hingeNode.id]);
  const queue = [startId];
  const subNodes = new Set([hingeNode.id]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    subNodes.add(currentId);

    for (const m of members) {
      let otherNodeId = null;
      if (m.startNodeId === currentId) otherNodeId = m.endNodeId;
      else if (m.endNodeId === currentId) otherNodeId = m.startNodeId;
      else continue;

      if (otherNodeId === hingeNode.id) continue; // don't cross back through hinge
      if (!visited.has(otherNodeId)) queue.push(otherNodeId);
    }
  }

  return subNodes;
}
