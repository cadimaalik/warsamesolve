// index.js — Main Solver Entry Point
import { extractSolverInput } from './extractInput.js';
import { identifyUnknowns } from './unknowns.js';
import { buildEquations } from './equations.js';
import { gaussianElimination } from './gaussElim.js';
import { solveTrussForces } from './truss.js';

export function solveReactions(structure) {
  try {
    // 1. Extract canvas data into solver format
    const { nodes, members, PPM } = extractSolverInput(structure);

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
