// index.js — Main Solver Entry Point
import { extractSolverInput } from './extractInput.js';
import { identifyUnknowns } from './unknowns.js';
import { buildEquations, gatherKnownForces, getSubStructureNodes } from './equations.js';
import { gaussianElimination } from './gaussElim.js';
import { solveTrussForces, detectZeroForceMembers, classifyForce } from './truss.js';

export function solveReactions(structure) {
  try {
    // 1. Extract canvas data into solver format
    const { nodes, members, PPM } = extractSolverInput(structure);

    // Pure truss? → use the full joint equilibrium system
    const isPureTruss = members.length > 0 && members.every(m => m.type === 'truss');
    if (isPureTruss) {
      return solveTrussSystem(nodes, members, PPM);
    }

    // Mixed frame+truss? → solve reactions and truss forces simultaneously
    const hasTruss = members.some(m => m.type === 'truss');
    const hasFrame = members.some(m => m.type !== 'truss');
    if (hasTruss && hasFrame) {
      return solveMixedSystem(nodes, members, PPM);
    }

    // --- Pure frame path ---

    // 2. Identify unknowns from supports
    const unknowns = identifyUnknowns(nodes);

    // 3. Build equilibrium equations
    const { equations, knownForces, momentPoint } = buildEquations(nodes, members, unknowns);

    // 4. Solve the linear system
    const A = equations.map(eq => [...eq.coefficients]);
    const b = equations.map(eq => eq.rhs);
    const solution = gaussianElimination(A, b);

    // 5. Map solution back to named reactions
    const reactions = unknowns.map((u, i) => ({
      nodeId: u.nodeId,
      label: u.label,
      type: u.type,
      value: roundTo(solution[i], 4),
      node: u.node
    }));

    // 6. Solve truss member forces
    const trussForces = solveTrussForces(nodes, members, reactions);

    // 7. Verify: plug reactions back into equations
    const verification = verifyResults(equations, solution);

    // 8. Return everything (16B and 16C will need this)
    return {
      success: true,
      reactions,
      trussForces,
      equations,
      unknowns,
      knownForces,
      momentPoint,
      nodes,
      members,
      PPM,
      verification
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// FULL JOINT EQUILIBRIUM SYSTEM — for pure trusses
//
// Builds a 2J × (R + M) system where:
//   J = number of joints
//   R = number of reaction unknowns
//   M = number of truss members
//
// At each joint j: ΣFx_j = 0, ΣFy_j = 0
// Unknowns: [reaction_1, ..., reaction_R, F_1, ..., F_M]
//
// This avoids the singularity that global-equilibrium-only
// approaches hit when 2 pin supports sit at the same Y level.
// ═══════════════════════════════════════════════════════════════
function solveTrussSystem(nodes, members, PPM) {
  // --- Unknowns: reactions first, then member forces ---
  const reactionUnknowns = [];
  const supportMap = {
    'pin':      ['Rx', 'Ry'],
    'roller-h': ['Ry'],
    'roller-v': ['Rx'],
    'fixed':    ['Rx', 'Ry', 'M'],
    'guide-h':  ['Ry', 'M'],
    'guide-v':  ['Rx', 'M'],
  };

  for (const node of nodes) {
    if (!node.support) continue;
    const types = supportMap[node.support];
    if (!types) continue;
    for (const type of types) {
      reactionUnknowns.push({
        nodeId: node.id,
        label: node.label,
        type,
        node,
      });
    }
  }

  const numR = reactionUnknowns.length;
  const numM = members.length;
  const N = numR + numM;          // total unknowns

  // --- Build coefficient matrix A and RHS vector b ---
  const A = [];
  const b = [];
  const eqDescs = [];

  for (const node of nodes) {
    // ΣFx at this joint
    const rowX = new Array(N).fill(0);
    let rhsX = 0;
    // ΣFy at this joint
    const rowY = new Array(N).fill(0);
    let rhsY = 0;

    // Reaction contributions
    for (let i = 0; i < numR; i++) {
      const u = reactionUnknowns[i];
      if (u.nodeId !== node.id) continue;
      if (u.type === 'Rx') rowX[i] = 1;
      if (u.type === 'Ry') rowY[i] = 1;
    }

    // Member force contributions (tension-positive convention)
    for (let i = 0; i < numM; i++) {
      const m = members[i];
      if (m.startNodeId !== node.id && m.endNodeId !== node.id) continue;

      // Unit direction FROM this node TOWARD the other end
      const otherNodeId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
      const otherNode = nodes.find(n => n.id === otherNodeId);
      const dx = otherNode.x - node.x;
      const dy = otherNode.y - node.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      if (L < 1e-12) continue;

      rowX[numR + i] = dx / L;  // cos
      rowY[numR + i] = dy / L;  // sin
    }

    // External loads → move to RHS
    rhsX = -(node.loads.fx || 0);
    rhsY = -(node.loads.fy || 0);

    A.push(rowX);
    b.push(rhsX);
    eqDescs.push(`\\sum F_x \\text{ at } ${node.label} = 0`);

    A.push(rowY);
    b.push(rhsY);
    eqDescs.push(`\\sum F_y \\text{ at } ${node.label} = 0`);
  }

  // --- Solve ---
  const solution = gaussianElimination(A, b);

  // --- Extract reactions ---
  const reactions = reactionUnknowns.map((u, i) => ({
    nodeId: u.nodeId,
    label: u.label,
    type: u.type,
    value: roundTo(solution[i], 4),
    node: u.node,
  }));

  // --- Extract member forces and flag zero-force members ---
  const zeroForceIds = detectZeroForceMembers(nodes, members, reactions);

  const trussForces = members.map((m, idx) => {
    const force = roundTo(solution[numR + idx], 4);
    return {
      memberId: m.id,
      startLabel: m.startLabel,
      endLabel: m.endLabel,
      force,
      classification: classifyForce(force),
      isZeroForceMember: zeroForceIds.has(m.id),
    };
  });

  // --- Build verification ---
  const equations = eqDescs.map((desc, i) => ({
    coefficients: A[i],
    rhs: b[i],
    description: desc,
    type: i % 2 === 0 ? 'force-x' : 'force-y',
  }));

  const verification = verifyResults(equations, solution);

  return {
    success: true,
    reactions,
    trussForces,
    equations,
    unknowns: reactionUnknowns,
    knownForces: [],
    momentPoint: null,
    nodes,
    members,
    PPM,
    verification,
  };
}

// ═══════════════════════════════════════════════════════════════
// MIXED FRAME+TRUSS SOLVER
//
// For structures with both frame and truss members.
// Unknowns: [reaction_1, ..., reaction_R, trussForce_1, ..., trussForce_T]
//
// Equations:
//   - 3 global equilibrium (ΣFx, ΣFy, ΣM) — truss forces cancel
//   - Hinge conditions — truss forces that cross the cut contribute
//   - Additional moment equations as needed
// ═══════════════════════════════════════════════════════════════
function solveMixedSystem(nodes, members, PPM) {
  const trussMembers = members.filter(m => m.type === 'truss');

  // --- Unknowns: reactions first, then truss member forces ---
  const reactionUnknowns = [];
  const supportMap = {
    'pin':      ['Rx', 'Ry'],
    'roller-h': ['Ry'],
    'roller-v': ['Rx'],
    'fixed':    ['Rx', 'Ry', 'M'],
    'guide-h':  ['Ry', 'M'],
    'guide-v':  ['Rx', 'M'],
  };
  for (const node of nodes) {
    if (!node.support) continue;
    const types = supportMap[node.support];
    if (!types) continue;
    for (const type of types) {
      reactionUnknowns.push({ nodeId: node.id, label: node.label, type, node });
    }
  }

  const numR = reactionUnknowns.length;
  const numT = trussMembers.length;
  const N = numR + numT;

  const knownForces = gatherKnownForces(nodes, members);
  const equations = [];

  // ═══ ΣFx = 0 (global) ═══
  // Truss internal forces cancel in whole-structure equilibrium
  const eqFx = { coefficients: new Array(N).fill(0), rhs: 0,
    description: '\\sum F_x = 0', type: 'force-x' };
  for (let i = 0; i < numR; i++) {
    if (reactionUnknowns[i].type === 'Rx') eqFx.coefficients[i] = 1;
  }
  for (const f of knownForces) eqFx.rhs -= f.fx;
  equations.push(eqFx);

  // ═══ ΣFy = 0 (global) ═══
  const eqFy = { coefficients: new Array(N).fill(0), rhs: 0,
    description: '\\sum F_y = 0', type: 'force-y' };
  for (let i = 0; i < numR; i++) {
    if (reactionUnknowns[i].type === 'Ry') eqFy.coefficients[i] = 1;
  }
  for (const f of knownForces) eqFy.rhs -= f.fy;
  equations.push(eqFy);

  // ═══ ΣM about best moment point = 0 (global) ═══
  let mp = null;
  let bestScore = -1;
  for (const node of nodes) {
    if (!node.support) continue;
    const sc = reactionUnknowns.filter(
      u => u.nodeId === node.id && (u.type === 'Rx' || u.type === 'Ry')
    ).length;
    if (sc > bestScore) { bestScore = sc; mp = node; }
  }
  if (!mp) mp = nodes[0];

  const eqM = { coefficients: new Array(N).fill(0), rhs: 0,
    description: `\\sum M_{${mp.label}} = 0`, type: 'moment' };
  for (let i = 0; i < numR; i++) {
    const u = reactionUnknowns[i];
    const dx = u.node.x - mp.x;
    const dy = u.node.y - mp.y;
    if (u.type === 'Rx') eqM.coefficients[i] = -dy;
    else if (u.type === 'Ry') eqM.coefficients[i] = dx;
    else if (u.type === 'M') eqM.coefficients[i] = 1;
  }
  for (const f of knownForces) {
    const dx = f.x - mp.x;
    const dy = f.y - mp.y;
    eqM.rhs -= (dx * f.fy - dy * f.fx + (f.m || 0));
  }
  equations.push(eqM);

  // ═══ Hinge equations (with truss force contributions) ═══
  for (const node of nodes) {
    const connected = members.filter(
      m => m.startNodeId === node.id || m.endNodeId === node.id
    );
    if (connected.length < 2) continue;

    const hasFrameHinge = connected.some(m => {
      if (m.type !== 'frame') return false;
      if (m.startNodeId === node.id) return m.startHinge;
      if (m.endNodeId === node.id) return m.endHinge;
      return false;
    });
    if (!hasFrameHinge) continue;

    // Get sub-structure on one side of the hinge
    let sideA = getSubStructureNodes(node, nodes, members);
    let eq = buildMixedHingeEq(node, sideA, reactionUnknowns, trussMembers, knownForces, nodes, numR, N);

    // If side A has no useful coefficients, try side B
    if (eq.coefficients.every(c => c === 0)) {
      const sideB = new Set([node.id]);
      for (const nd of nodes) {
        if (!sideA.has(nd.id)) sideB.add(nd.id);
      }
      eq = buildMixedHingeEq(node, sideB, reactionUnknowns, trussMembers, knownForces, nodes, numR, N);
    }

    equations.push(eq);
  }

  // ═══ Additional moment equations if still under-determined ═══
  const usedMomentPoints = new Set([mp.id]);
  while (equations.length < N) {
    let nextPoint = null;
    let nextSc = -1;
    for (const node of nodes) {
      if (!node.support || usedMomentPoints.has(node.id)) continue;
      const sc = reactionUnknowns.filter(
        u => u.nodeId === node.id && (u.type === 'Rx' || u.type === 'Ry')
      ).length;
      if (sc > nextSc) { nextSc = sc; nextPoint = node; }
    }
    if (!nextPoint) break;

    const eqExtra = { coefficients: new Array(N).fill(0), rhs: 0,
      description: `\\sum M_{${nextPoint.label}} = 0`, type: 'moment' };
    for (let i = 0; i < numR; i++) {
      const u = reactionUnknowns[i];
      const dx = u.node.x - nextPoint.x;
      const dy = u.node.y - nextPoint.y;
      if (u.type === 'Rx') eqExtra.coefficients[i] = -dy;
      else if (u.type === 'Ry') eqExtra.coefficients[i] = dx;
      else if (u.type === 'M') eqExtra.coefficients[i] = 1;
    }
    for (const f of knownForces) {
      const dx = f.x - nextPoint.x;
      const dy = f.y - nextPoint.y;
      eqExtra.rhs -= (dx * f.fy - dy * f.fx + (f.m || 0));
    }
    equations.push(eqExtra);
    usedMomentPoints.add(nextPoint.id);
  }

  // --- Solve ---
  const A = equations.map(eq => [...eq.coefficients]);
  const b = equations.map(eq => eq.rhs);
  const solution = gaussianElimination(A, b);

  // --- Extract reactions ---
  const reactions = reactionUnknowns.map((u, i) => ({
    nodeId: u.nodeId, label: u.label, type: u.type,
    value: roundTo(solution[i], 4), node: u.node,
  }));

  // --- Extract truss forces ---
  const zeroForceIds = detectZeroForceMembers(nodes, members, reactions);
  const trussForces = trussMembers.map((m, idx) => {
    const force = roundTo(solution[numR + idx], 4);
    return {
      memberId: m.id, startLabel: m.startLabel, endLabel: m.endLabel,
      force, classification: classifyForce(force),
      isZeroForceMember: zeroForceIds.has(m.id),
    };
  });

  const verification = verifyResults(equations, solution);

  return {
    success: true, reactions, trussForces, equations,
    unknowns: reactionUnknowns, knownForces, momentPoint: mp,
    nodes, members, PPM, verification,
  };
}

/**
 * Build a hinge moment equation for a sub-structure, including truss
 * force contributions for truss members that cross the hinge cut.
 */
function buildMixedHingeEq(hinge, sideNodes, reactionUnknowns, trussMembers, knownForces, nodes, numR, N) {
  const eq = {
    coefficients: new Array(N).fill(0), rhs: 0,
    description: `\\sum M_{${hinge.label}} = 0 \\text{ (hinge condition)}`,
    type: 'hinge-moment',
  };

  // Reaction contributions (only those on this sub-structure)
  for (let i = 0; i < numR; i++) {
    const u = reactionUnknowns[i];
    if (!sideNodes.has(u.nodeId)) continue;
    const dx = u.node.x - hinge.x;
    const dy = u.node.y - hinge.y;
    if (u.type === 'Rx') eq.coefficients[i] = -dy;
    else if (u.type === 'Ry') eq.coefficients[i] = dx;
    else if (u.type === 'M') eq.coefficients[i] = 1;
  }

  // Truss force contributions — only for members crossing the cut
  for (let t = 0; t < trussMembers.length; t++) {
    const tm = trussMembers[t];
    const startIn = sideNodes.has(tm.startNodeId);
    const endIn = sideNodes.has(tm.endNodeId);

    // Both ends on same side → internal, cancels → coefficient = 0
    if (startIn === endIn) continue;

    // One end in sub-structure, other outside → crosses the cut
    const inNodeId = startIn ? tm.startNodeId : tm.endNodeId;
    const outNodeId = startIn ? tm.endNodeId : tm.startNodeId;
    const inNode = nodes.find(n => n.id === inNodeId);
    const outNode = nodes.find(n => n.id === outNodeId);

    // Truss force F (tension-positive) acts at inNode directed toward outNode
    const dx_t = outNode.x - inNode.x;
    const dy_t = outNode.y - inNode.y;
    const L = Math.sqrt(dx_t * dx_t + dy_t * dy_t);
    if (L < 1e-12) continue;
    const cos_t = dx_t / L;
    const sin_t = dy_t / L;

    // Moment about hinge = r × F = (xP - xH) * F·sinθ - (yP - yH) * F·cosθ
    const dx_p = inNode.x - hinge.x;
    const dy_p = inNode.y - hinge.y;
    eq.coefficients[numR + t] = dx_p * sin_t - dy_p * cos_t;
  }

  // Known forces on this sub-structure
  for (const f of knownForces) {
    const nearestNode = nodes.reduce((closest, nd) => {
      const d = Math.sqrt((nd.x - f.x) ** 2 + (nd.y - f.y) ** 2);
      const cd = Math.sqrt((closest.x - f.x) ** 2 + (closest.y - f.y) ** 2);
      return d < cd ? nd : closest;
    }, nodes[0]);
    if (!sideNodes.has(nearestNode.id)) continue;
    const dx = f.x - hinge.x;
    const dy = f.y - hinge.y;
    eq.rhs -= (dx * f.fy - dy * f.fx + (f.m || 0));
  }

  return eq;
}

function verifyResults(equations, solution) {
  return equations.map(eq => {
    let sum = -eq.rhs; // move RHS back to LHS
    for (let i = 0; i < solution.length; i++) {
      sum += eq.coefficients[i] * solution[i];
    }
    return {
      equation: eq.description,
      residual: Math.abs(sum),
      pass: Math.abs(sum) < 0.01
    };
  });
}

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ═══════════════════════════════════════════════════════════════
// SANITY TESTS — Run in development only
// ═══════════════════════════════════════════════════════════════

function runSanityTest() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   SOLVER SANITY TESTS                             ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Test 1: Simple beam with end load
  const testStore1 = {
    nodes: [
      { id: 'A', x: 0, y: 0, support: 'pin', loads: { fx: 0, fy: 0, moment: 0 } },
      { id: 'B', x: 300, y: 0, support: 'roller-h', loads: { fx: 0, fy: -30, moment: 0 } },
    ],
    members: [
      { id: 'm1', startNodeId: 'A', endNodeId: 'B', type: 'frame',
        startHinge: false, endHinge: false, distributedLoads: [] }
    ],
  };

  const result1 = solveReactions(testStore1);

  console.log('Test 1: Simple beam');
  console.log('Pin at A (0,0), Roller at B (6m,0), 30kN down at B');
  console.log('Expected: ΣFy=0 → Ray + Rby = 30');
  console.log('          ΣMa=0 → Rby*6 - 30*6 = 0 → Rby = 30, Ray = 0');
  console.log('          ΣFx=0 → Rax = 0');
  console.log('Result:', result1.reactions);
  console.log('Verification:', result1.verification.map(v => `${v.equation}: ${v.pass ? '✅' : '❌'}`).join(', '));
  console.log('');

  // Test 2: Midspan load
  const testStore2 = {
    nodes: [
      { id: 'A', x: 0, y: 0, support: 'pin', loads: { fx: 0, fy: 0, moment: 0 } },
      { id: 'B', x: 150, y: 0, support: null, loads: { fx: 0, fy: -20, moment: 0 } },
      { id: 'C', x: 300, y: 0, support: 'roller-h', loads: { fx: 0, fy: 0, moment: 0 } },
    ],
    members: [
      { id: 'm1', startNodeId: 'A', endNodeId: 'B', type: 'frame',
        startHinge: false, endHinge: false, distributedLoads: [] },
      { id: 'm2', startNodeId: 'B', endNodeId: 'C', type: 'frame',
        startHinge: false, endHinge: false, distributedLoads: [] }
    ],
  };

  const result2 = solveReactions(testStore2);
  console.log('Test 2: Midspan load');
  console.log('Pin at A, Roller at C, 20kN down at midspan B');
  console.log('Expected: Rax=0, Ray=10, Rcy=10');
  console.log('Result:', result2.reactions);
  console.log('Verification:', result2.verification.map(v => `${v.equation}: ${v.pass ? '✅' : '❌'}`).join(', '));
  console.log('');

  console.log('═══════════════════════════════════════════════════\n');
}

// Run in development only
if (import.meta.env?.DEV) {
  runSanityTest();
}
