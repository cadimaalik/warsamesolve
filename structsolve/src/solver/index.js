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
    const n = unknowns.length;

    // Track solving steps for pedagogical presentation (Prompt #16-PATCH)
    const solvingSteps = [];

    // 3. Branch based on number of unknowns (Prompt #16-PATCH)
    if (n <= 3) {
      // ═══ DIRECT SOLVE: 3 or fewer unknowns ═══
      const { equations, knownForces, momentPoint } = buildEquations(nodes, members, unknowns);
      const A = equations.map(eq => [...eq.coefficients]);
      const b = equations.map(eq => eq.rhs);
      const solution = gaussianElimination(A, b);

      const reactions = unknowns.map((u, i) => ({
        nodeId: u.nodeId,
        label: u.label,
        type: u.type,
        value: roundTo(solution[i], 4),
        node: u.node
      }));

      solvingSteps.push({
        type: 'global',
        description: 'Direct solution — 3 or fewer unknowns',
        equations,
        momentPoint,
        knownForces,
        solvedReactions: reactions
      });

      const trussForces = solveTrussForces(nodes, members, reactions);
      const verification = verifyResults(equations, solution);

      return {
        success: true,
        reactions,
        trussForces,
        solvingSteps,
        verification,
        unknowns,
        nodes,
        members,
        PPM,
        knownForces,
        momentPoint
      };
    } else {
      // ═══ SEQUENTIAL HINGE SOLVE: more than 3 unknowns ═══
      return solveWithHinges(nodes, members, unknowns, PPM);
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SEQUENTIAL HINGE SOLVER (Prompt #16-PATCH)
// ═══════════════════════════════════════════════════════════════
function solveWithHinges(nodes, members, unknowns, PPM) {
  const n = unknowns.length;
  const solvedValues = {};  // unknownIndex → value
  const solvingSteps = [];

  // Find all internal hinge nodes
  const hingeNodes = findInternalHinges(nodes, members);
  const processedHinges = new Set();

  // Greedy loop: always pick the hinge whose easier side has the
  // FEWEST unsolved reaction unknowns.  This ensures we partition at
  // the hinge that yields the most tractable sub-structure first
  // (e.g. hinge C with 1 unknown before hinge E with 3 unknowns).
  let madeProgress = true;
  while (madeProgress) {
    madeProgress = false;

    let bestHinge = null;
    let bestSide = null;
    let bestCount = Infinity;

    for (const hinge of hingeNodes) {
      if (processedHinges.has(hinge.id)) continue;

      const { sideA, sideB } = partitionAtHinge(hinge, nodes, members);
      const unsolvedA = countUnsolved(sideA.nodeIds, unknowns, solvedValues);
      const unsolvedB = countUnsolved(sideB.nodeIds, unknowns, solvedValues);

      const easierCount = Math.min(unsolvedA, unsolvedB);

      if (easierCount === 0) {
        processedHinges.add(hinge.id);
        continue;
      }

      if (easierCount < bestCount) {
        bestCount = easierCount;
        bestHinge = hinge;
        bestSide = unsolvedA <= unsolvedB ? sideA : sideB;
      }
    }

    if (!bestHinge) break;
    processedHinges.add(bestHinge.id);

    // Get the unknowns on the easier side that are still unsolved
    const sideUnknownIndices = unknowns.map((u, i) =>
      bestSide.nodeIds.has(u.nodeId) && solvedValues[i] === undefined ? i : null
    ).filter(i => i !== null);

    // Gather known forces on this side only
    const sideKnownForces = gatherSideForces(
      bestSide.nodeIds, nodes, members, unknowns, solvedValues
    );

    // Build equations for the sub-structure (ΣM about hinge + additional moment eqs)
    const subEquations = buildSubStructureEquations(
      bestHinge, bestSide, nodes, members,
      unknowns, sideUnknownIndices, solvedValues, sideKnownForces
    );

    if (subEquations.length === 0 || sideUnknownIndices.length === 0) continue;

    // KEY FIX: Taking ΣM about the hinge eliminates internal forces V_hinge,x / V_hinge,y.
    // However, some side unknowns may have ZERO moment arm about the hinge (e.g. B_x on a
    // horizontal beam where B and hinge C share the same y-coordinate).  Including those
    // zero-coefficient unknowns in the Gaussian solve creates a singular matrix and causes
    // the solver to throw.
    //
    // Strategy: only solve the unknowns that ACTUALLY appear (non-zero coefficient) in the
    // sub-structure equations.  The remaining side unknowns are left for the global step.
    const firstEq = subEquations[0];
    const solvableIndices = sideUnknownIndices.filter(
      i => Math.abs(firstEq.coefficients[i]) > 1e-10
    );

    // If nothing is solvable from this sub-structure (e.g. all moment arms are zero),
    // mark as processed and continue — the global step will handle everything.
    if (solvableIndices.length === 0) continue;

    // Build the reduced coefficient matrix using only solvableIndices columns.
    // Use as many equations as there are solvable unknowns (no more).
    const useCount = Math.min(solvableIndices.length, subEquations.length);
    const A = subEquations.slice(0, useCount).map(eq => {
      const row = new Array(solvableIndices.length).fill(0);
      for (let j = 0; j < solvableIndices.length; j++) {
        row[j] = eq.coefficients[solvableIndices[j]] || 0;
      }
      return row;
    });
    const b = subEquations.slice(0, useCount).map(eq => eq.rhs);

    // Only attempt the solve when the system is square and non-trivially solvable.
    if (useCount !== solvableIndices.length) continue;

    let solution;
    try {
      solution = gaussianElimination(A, b);
    } catch {
      // Singular sub-structure system (e.g. redundant moment equations) — skip.
      continue;
    }

    // Store solved values
    for (let j = 0; j < solvableIndices.length; j++) {
      solvedValues[solvableIndices[j]] = roundTo(solution[j], 4);
    }

    solvingSteps.push({
      type: 'sub-structure',
      hingeNode: bestHinge,
      side: bestSide,
      sideLabel: Array.from(bestSide.nodeIds).map(id =>
        nodes.find(n => n.id === id)?.label || id
      ).sort().join(''),
      description: `Cut at hinge ${bestHinge.label}, solve ${bestSide.description} side`,
      equations: subEquations,
      knownForces: sideKnownForces,
      momentPoint: bestHinge,
      solvedIndices: solvableIndices,
      solvedValues: solvableIndices.map((idx, j) => ({
        ...unknowns[idx],
        value: solution[j]
      }))
    });

    madeProgress = true;
  }

  // After all hinges processed, solve remaining unknowns with global equations
  const remainingIndices = unknowns.map((_, i) => i).filter(i => solvedValues[i] === undefined);

  if (remainingIndices.length > 0) {
    const { equations: allEquations, knownForces, momentPoint } = buildEquations(nodes, members, unknowns);

    const A = allEquations.map(eq => {
      const row = new Array(remainingIndices.length).fill(0);
      for (let j = 0; j < remainingIndices.length; j++) {
        row[j] = eq.coefficients[remainingIndices[j]];
      }
      return row;
    });
    const b = allEquations.map(eq => {
      let rhs = eq.rhs;
      for (let i = 0; i < unknowns.length; i++) {
        if (solvedValues[i] !== undefined) {
          rhs -= eq.coefficients[i] * solvedValues[i];
        }
      }
      return rhs;
    });

    const useCount = remainingIndices.length;
    const solution = gaussianElimination(
      A.slice(0, useCount),
      b.slice(0, useCount)
    );

    for (let j = 0; j < remainingIndices.length; j++) {
      solvedValues[remainingIndices[j]] = roundTo(solution[j], 4);
    }

    // Pass all 3 global equations (ΣFx, ΣFy, ΣM) for pedagogical display,
    // even if fewer were needed for the solve — user sees full derivation
    // with substitution of previously-solved values.
    const displayEquations = allEquations.slice(0, Math.max(useCount, 3));
    solvingSteps.push({
      type: 'global',
      description: `Global equilibrium — ${remainingIndices.length} remaining unknowns`,
      equations: displayEquations,
      momentPoint,
      knownForces,
      solvedIndices: remainingIndices,
      solvedValues: remainingIndices.map((idx, j) => ({
        ...unknowns[idx],
        value: solution[j]
      }))
    });
  }

  // Assemble all reactions
  const reactions = unknowns.map((u, i) => ({
    ...u,
    value: solvedValues[i] !== undefined ? solvedValues[i] : 0
  }));

  const trussForces = solveTrussForces(nodes, members, reactions);
  const knownForces = gatherKnownForces(nodes, members);
  const momentPoint = pickMomentPoint(nodes, unknowns);
  const allEquations = buildEquations(nodes, members, unknowns).equations;
  const allSolution = unknowns.map((_, i) => solvedValues[i] || 0);
  const verification = verifyResults(allEquations, allSolution);

  return {
    success: true,
    reactions,
    trussForces,
    solvingSteps,
    verification,
    unknowns,
    nodes,
    members,
    PPM,
    knownForces,
    momentPoint
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR SEQUENTIAL HINGE SOLVING (Prompt #16-PATCH)
// ═══════════════════════════════════════════════════════════════

function findInternalHinges(nodes, members) {
  const hinges = [];

  for (const node of nodes) {
    const connected = members.filter(
      m => m.startNodeId === node.id || m.endNodeId === node.id
    );
    if (connected.length < 2) continue;

    const hasFrameHinge = connected.some(m => {
      if (m.type !== 'frame') return false;
      return (m.startNodeId === node.id && m.startHinge) ||
             (m.endNodeId === node.id && m.endHinge);
    });

    if (hasFrameHinge) {
      const branchCount = connected.length;
      hinges.push({
        ...node,
        branchCount,
        conditions: branchCount - 1
      });
    }
  }

  return hinges;
}

function partitionAtHinge(hingeNode, nodes, members) {
  const connectedMembers = members.filter(
    m => m.startNodeId === hingeNode.id || m.endNodeId === hingeNode.id
  );

  if (connectedMembers.length < 2) {
    return {
      sideA: { nodeIds: new Set(), description: 'empty' },
      sideB: { nodeIds: new Set(), description: 'empty' }
    };
  }

  const sideA = bfsFromBranch(hingeNode, connectedMembers[0], nodes, members);
  const sideB = new Set(nodes.map(n => n.id));
  for (const id of sideA) {
    if (id !== hingeNode.id) sideB.delete(id);
  }
  sideA.add(hingeNode.id);

  const sideALabels = nodes.filter(n => sideA.has(n.id)).map(n => n.label).sort().join('');
  const sideBLabels = nodes.filter(n => sideB.has(n.id)).map(n => n.label).sort().join('');

  return {
    sideA: { nodeIds: sideA, description: `Side ${sideALabels}` },
    sideB: { nodeIds: sideB, description: `Side ${sideBLabels}` }
  };
}

function bfsFromBranch(hingeNode, firstMember, nodes, members) {
  const startId = firstMember.startNodeId === hingeNode.id
    ? firstMember.endNodeId
    : firstMember.startNodeId;

  const visited = new Set([hingeNode.id]);
  const queue = [startId];
  const result = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    result.add(current);

    for (const m of members) {
      let other = null;
      if (m.startNodeId === current) other = m.endNodeId;
      else if (m.endNodeId === current) other = m.startNodeId;
      else continue;

      if (other === hingeNode.id) continue;
      if (!visited.has(other)) queue.push(other);
    }
  }

  return result;
}

function countUnsolved(sideNodeIds, unknowns, solvedValues) {
  let count = 0;
  for (let i = 0; i < unknowns.length; i++) {
    if (sideNodeIds.has(unknowns[i].nodeId) && solvedValues[i] === undefined) {
      count++;
    }
  }
  return count;
}

function gatherSideForces(sideNodeIds, nodes, members, unknowns, solvedValues) {
  const forces = [];

  // gatherKnownForces collects both node point loads AND distributed load
  // equivalents in one pass — do NOT add node loads separately before this
  // or they will be double-counted in the sub-structure moment equation.
  const knownForces = gatherKnownForces(nodes, members);
  for (const f of knownForces) {
    const nearestNode = nodes.reduce((closest, n) => {
      const d = Math.sqrt((n.x - f.x) ** 2 + (n.y - f.y) ** 2);
      const cd = Math.sqrt((closest.x - f.x) ** 2 + (closest.y - f.y) ** 2);
      return d < cd ? n : closest;
    }, nodes[0]);

    if (sideNodeIds.has(nearestNode.id)) {
      forces.push(f);
    }
  }

  for (let i = 0; i < unknowns.length; i++) {
    if (solvedValues[i] === undefined) continue;
    if (!sideNodeIds.has(unknowns[i].nodeId)) continue;

    const u = unknowns[i];
    forces.push({
      fx: u.type === 'Rx' ? solvedValues[i] : 0,
      fy: u.type === 'Ry' ? solvedValues[i] : 0,
      m: u.type === 'M' ? solvedValues[i] : 0,
      x: u.node.x,
      y: u.node.y,
      source: `Solved ${u.type} at ${u.label}`
    });
  }

  return forces;
}

function buildSubStructureEquations(hinge, side, nodes, members, unknowns, sideUnknownIndices, solvedValues, sideKnownForces) {
  const equations = [];
  const n = unknowns.length;

  const eqM = {
    coefficients: new Array(n).fill(0),
    rhs: 0,
    description: `\\sum M_{${hinge.label}} = 0 \\text{ (sub-structure)}`,
    type: 'sub-moment',
    hingeNode: hinge,
  };

  for (const idx of sideUnknownIndices) {
    const u = unknowns[idx];
    const dx = u.node.x - hinge.x;
    const dy = u.node.y - hinge.y;

    if (u.type === 'Rx') eqM.coefficients[idx] = -dy;
    else if (u.type === 'Ry') eqM.coefficients[idx] = dx;
    else if (u.type === 'M') eqM.coefficients[idx] = 1;
  }

  for (let i = 0; i < n; i++) {
    if (solvedValues[i] === undefined) continue;
    if (!side.nodeIds.has(unknowns[i].nodeId)) continue;
    const u = unknowns[i];
    const dx = u.node.x - hinge.x;
    const dy = u.node.y - hinge.y;
    let contrib = 0;
    if (u.type === 'Rx') contrib = -dy * solvedValues[i];
    else if (u.type === 'Ry') contrib = dx * solvedValues[i];
    else if (u.type === 'M') contrib = solvedValues[i];
    eqM.rhs -= contrib;
  }

  for (const f of sideKnownForces) {
    const dx = f.x - hinge.x;
    const dy = f.y - hinge.y;
    const moment = dx * f.fy - dy * f.fx + (f.m || 0);
    eqM.rhs -= moment;
  }

  equations.push(eqM);

  if (sideUnknownIndices.length >= 2) {
    const sideSupports = nodes.filter(nd =>
      side.nodeIds.has(nd.id) && nd.support && nd.id !== hinge.id
    );

    for (let s = 0; s < sideSupports.length && equations.length < sideUnknownIndices.length; s++) {
      const mp = sideSupports[s];
      const eqM2 = {
        coefficients: new Array(n).fill(0),
        rhs: 0,
        description: `\\sum M_{${mp.label}} = 0 \\text{ (sub-structure)}`,
        type: 'sub-moment',
        momentPoint: mp,
      };

      for (const idx of sideUnknownIndices) {
        const u = unknowns[idx];
        const dx = u.node.x - mp.x;
        const dy = u.node.y - mp.y;

        if (u.type === 'Rx') eqM2.coefficients[idx] = -dy;
        else if (u.type === 'Ry') eqM2.coefficients[idx] = dx;
        else if (u.type === 'M') eqM2.coefficients[idx] = 1;
      }

      for (let i = 0; i < n; i++) {
        if (solvedValues[i] === undefined) continue;
        if (!side.nodeIds.has(unknowns[i].nodeId)) continue;
        const u = unknowns[i];
        const dx = u.node.x - mp.x;
        const dy = u.node.y - mp.y;
        let contrib = 0;
        if (u.type === 'Rx') contrib = -dy * solvedValues[i];
        else if (u.type === 'Ry') contrib = dx * solvedValues[i];
        else if (u.type === 'M') contrib = solvedValues[i];
        eqM2.rhs -= contrib;
      }

      for (const f of sideKnownForces) {
        const dx = f.x - mp.x;
        const dy = f.y - mp.y;
        const moment = dx * f.fy - dy * f.fx + (f.m || 0);
        eqM2.rhs -= moment;
      }

      equations.push(eqM2);
    }
  }

  return equations;
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

  return best || nodes[0];
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

  // --- Build global equilibrium equations for pedagogical display ---
  // The joint system above solves correctly, but for the solution page we want
  // to show the 3 global equations (ΣFx, ΣFy, ΣM) used to find support reactions.
  const {
    equations: globalEqs,
    knownForces,
    momentPoint,
  } = buildEquations(nodes, members, reactionUnknowns);

  const solvingSteps = [{
    type: 'global',
    description: 'Global equilibrium for support reactions',
    equations: globalEqs,
    knownForces,
    momentPoint,
    solvedReactions: reactions,
  }];

  return {
    success: true,
    reactions,
    trussForces,
    equations,
    unknowns: reactionUnknowns,
    knownForces,
    momentPoint,
    solvingSteps,
    nodes,
    members,
    PPM,
    verification,
  };
}

// ═══════════════════════════════════════════════════════════════
// MIXED FRAME+TRUSS SOLVER
//
// Simultaneous system: unknowns = [reactions, truss forces].
//
// Equations sourced from three pools:
//   1. Global equilibrium (ΣFx, ΣFy, ΣM) — truss forces cancel
//      (internal), so only reaction columns are non-zero.
//   2. Hinge conditions — frame-only BFS partitions the structure
//      so truss members CROSS the cut.  Their forces appear with
//      non-zero moment arms when the truss endpoint on the sub-
//      structure is NOT at the hinge.
//   3. Joint equilibrium at truss-only joints (ΣFx, ΣFy) — both
//      reaction and truss-force columns are non-zero.
//   4. Fallback: extra moment equations about support points.
//
// Together these provide exactly N equations for N unknowns in
// typical DOF = 0 mixed structures (tree-like frame topology).
// ═══════════════════════════════════════════════════════════════
function solveMixedSystem(nodes, members, PPM) {
  const trussMembers = members.filter(m => m.type === 'truss');
  const frameMembers = members.filter(m => m.type !== 'truss');

  // --- Unknowns: reactions first, then truss member forces ---
  const reactionUnknowns = identifyUnknowns(nodes);
  const numR = reactionUnknowns.length;
  const numT = trussMembers.length;
  const N = numR + numT;

  const knownForces = gatherKnownForces(nodes, members);
  const equations = [];

  // ═══ 1. Global ΣFx = 0 ═══
  const eqFx = { coefficients: new Array(N).fill(0), rhs: 0,
    description: '\\sum F_x = 0', type: 'force-x' };
  for (let i = 0; i < numR; i++) {
    if (reactionUnknowns[i].type === 'Rx') eqFx.coefficients[i] = 1;
  }
  for (const f of knownForces) eqFx.rhs -= f.fx;
  equations.push(eqFx);

  // ═══ 1. Global ΣFy = 0 ═══
  const eqFy = { coefficients: new Array(N).fill(0), rhs: 0,
    description: '\\sum F_y = 0', type: 'force-y' };
  for (let i = 0; i < numR; i++) {
    if (reactionUnknowns[i].type === 'Ry') eqFy.coefficients[i] = 1;
  }
  for (const f of knownForces) eqFy.rhs -= f.fy;
  equations.push(eqFy);

  // ═══ 1. Global ΣM about best moment point = 0 ═══
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

  // ═══ 2. Hinge conditions (frame-only BFS) ═══
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

    // Frame-only BFS so truss members cross the cut
    let sideA = frameOnlyBFS(node, nodes, frameMembers);
    let eq = buildMixedHingeEq(node, sideA, reactionUnknowns, trussMembers, knownForces, nodes, numR, N);

    // If all coefficients are zero, try the complementary side
    if (eq.coefficients.every(c => Math.abs(c) < 1e-12)) {
      const sideB = new Set([node.id]);
      for (const nd of nodes) {
        if (!sideA.has(nd.id)) sideB.add(nd.id);
      }
      eq = buildMixedHingeEq(node, sideB, reactionUnknowns, trussMembers, knownForces, nodes, numR, N);
    }

    equations.push(eq);
  }

  // ═══ 3. Joint equilibrium at truss-only joints ═══
  for (const node of nodes) {
    const connTruss = trussMembers.filter(
      m => m.startNodeId === node.id || m.endNodeId === node.id
    );
    if (connTruss.length === 0) continue;

    // Only truss-only joints (no frame connections)
    const hasFrame = members.some(m =>
      m.type !== 'truss' &&
      (m.startNodeId === node.id || m.endNodeId === node.id)
    );
    if (hasFrame) continue;

    // ΣFx = 0 at this joint
    const eqJx = { coefficients: new Array(N).fill(0), rhs: 0,
      description: `\\sum F_{x,${node.label}} = 0`, type: 'joint-force-x' };
    for (let i = 0; i < numR; i++) {
      if (reactionUnknowns[i].nodeId !== node.id) continue;
      if (reactionUnknowns[i].type === 'Rx') eqJx.coefficients[i] = 1;
    }
    for (let t = 0; t < numT; t++) {
      const m = trussMembers[t];
      if (m.startNodeId !== node.id && m.endNodeId !== node.id) continue;
      const otherNodeId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
      const otherNode = nodes.find(n => n.id === otherNodeId);
      const dx = otherNode.x - node.x;
      const dy = otherNode.y - node.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      if (L < 1e-12) continue;
      eqJx.coefficients[numR + t] = dx / L;
    }
    eqJx.rhs = -(node.loads.fx || 0);
    equations.push(eqJx);

    // ΣFy = 0 at this joint
    const eqJy = { coefficients: new Array(N).fill(0), rhs: 0,
      description: `\\sum F_{y,${node.label}} = 0`, type: 'joint-force-y' };
    for (let i = 0; i < numR; i++) {
      if (reactionUnknowns[i].nodeId !== node.id) continue;
      if (reactionUnknowns[i].type === 'Ry') eqJy.coefficients[i] = 1;
    }
    for (let t = 0; t < numT; t++) {
      const m = trussMembers[t];
      if (m.startNodeId !== node.id && m.endNodeId !== node.id) continue;
      const otherNodeId = m.startNodeId === node.id ? m.endNodeId : m.startNodeId;
      const otherNode = nodes.find(n => n.id === otherNodeId);
      const dx = otherNode.x - node.x;
      const dy = otherNode.y - node.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      if (L < 1e-12) continue;
      eqJy.coefficients[numR + t] = dy / L;
    }
    eqJy.rhs = -(node.loads.fy || 0);
    equations.push(eqJy);
  }

  // ═══ 4. Extra moment equations if still under-determined ═══
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

  // Trim to N if over-determined
  if (equations.length > N) equations.length = N;

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
 * BFS from one branch of a hinge, following ONLY frame members.
 * Truss members are excluded so they cross the cut, giving their
 * force a non-zero coefficient in the hinge moment equation.
 */
function frameOnlyBFS(hingeNode, nodes, frameMembers) {
  const connectedFrame = frameMembers.filter(
    m => m.startNodeId === hingeNode.id || m.endNodeId === hingeNode.id
  );
  if (connectedFrame.length === 0) return new Set([hingeNode.id]);

  const firstMember = connectedFrame[0];
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

    for (const m of frameMembers) {
      let otherNodeId = null;
      if (m.startNodeId === currentId) otherNodeId = m.endNodeId;
      else if (m.endNodeId === currentId) otherNodeId = m.startNodeId;
      else continue;
      if (otherNodeId === hingeNode.id) continue;
      if (!visited.has(otherNodeId)) queue.push(otherNodeId);
    }
  }

  return subNodes;
}

/**
 * Build hinge moment equation for a sub-structure, including truss
 * force contributions for members that cross the frame-only cut.
 */
function buildMixedHingeEq(hinge, sideNodes, reactionUnknowns, trussMembers, knownForces, nodes, numR, N) {
  const eq = {
    coefficients: new Array(N).fill(0), rhs: 0,
    description: `\\sum M_{${hinge.label}} = 0 \\text{ (hinge)}`,
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
    if (startIn === endIn) continue; // internal or external — no contribution

    // The endpoint INSIDE the sub-structure feels the truss force
    const inNodeId = startIn ? tm.startNodeId : tm.endNodeId;
    const outNodeId = startIn ? tm.endNodeId : tm.startNodeId;
    const inNode = nodes.find(n => n.id === inNodeId);
    const outNode = nodes.find(n => n.id === outNodeId);

    const dx_t = outNode.x - inNode.x;
    const dy_t = outNode.y - inNode.y;
    const L = Math.sqrt(dx_t * dx_t + dy_t * dy_t);
    if (L < 1e-12) continue;
    const cos_t = dx_t / L;
    const sin_t = dy_t / L;

    // Moment about hinge: r × F
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
