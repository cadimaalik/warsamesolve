/**
 * solutionGenerator.js
 * Takes the raw solver output (solverResults) and generates an ordered array of
 * pedagogical "steps", each with: { title, fbd, equations, notes, trussTable? }
 *
 * The FBD data object is consumed by FBDRenderer.jsx.
 * The equations array is consumed by EquationBlock.jsx (MathJax LaTeX strings).
 */

// ── Helpers ────────────────────────────────────────────────────────

function fmt(v) {
  if (v === null || v === undefined) return '0';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  // Up to 4 significant digits, strip trailing zeros
  const s = abs.toFixed(4).replace(/\.?0+$/, '');
  return s;
}

function getReactionLabel(nodeLabel, type) {
  if (type === 'Rx') return `${nodeLabel}_x`;
  if (type === 'Ry') return `${nodeLabel}_y`;
  if (type === 'M')  return `M_{${nodeLabel}}`;
  return nodeLabel;
}

function getDirectionArrow(value, type) {
  if (type === 'Rx') return value >= 0 ? '\\rightarrow'  : '\\leftarrow';
  if (type === 'Ry') return value >= 0 ? '\\uparrow'     : '\\downarrow';
  if (type === 'M')  return value >= 0 ? '\\circlearrowleft' : '\\circlearrowright';
  return '';
}

// Build reaction items array for FBDRenderer
function buildReactionItems(unknowns, reactions, solvedSoFar) {
  return unknowns.map((u, i) => {
    const isSolved = solvedSoFar && solvedSoFar[i] !== undefined;
    const rxn = reactions.find(r => r.nodeId === u.nodeId && r.type === u.type);
    return {
      nodeId: u.nodeId,
      type: u.type,
      label: getReactionLabel(u.label, u.type),
      value: rxn ? rxn.value : 0,
      mode: isSolved ? 'solved' : 'unknown',
    };
  });
}

// Count internal hinges
function countInternalHinges(nodes, members) {
  let count = 0;
  for (const node of nodes) {
    if (node.support) continue;
    const connected = members.filter(
      m => (m.startNodeId === node.id || m.endNodeId === node.id) && m.type === 'frame'
    );
    const hasHinge = connected.some(m =>
      (m.startNodeId === node.id && m.startHinge) ||
      (m.endNodeId   === node.id && m.endHinge)
    );
    if (hasHinge && connected.length >= 2) count++;
  }
  return count;
}

function getHingeLabels(nodes, members) {
  const labels = [];
  for (const node of nodes) {
    if (node.support) continue;
    const connected = members.filter(
      m => (m.startNodeId === node.id || m.endNodeId === node.id) && m.type === 'frame'
    );
    const hasHinge = connected.some(m =>
      (m.startNodeId === node.id && m.startHinge) ||
      (m.endNodeId   === node.id && m.endHinge)
    );
    if (hasHinge && connected.length >= 2) labels.push(node.label || node.id);
  }
  return labels.join(', ');
}

// ── Equation LaTeX generation ──────────────────────────────────────

/**
 * Build LaTeX lines for a single equilibrium equation.
 * Returns an array of LaTeX strings for EquationBlock.
 */
function buildEquationLatex(eq, unknowns, reactions, solvedSoFar) {
  const lines = [];
  const n = unknowns.length;

  // ── 1. Figure out which unknowns are still active (not yet solved) ──
  const activeIndices = [];
  for (let i = 0; i < n; i++) {
    if (Math.abs(eq.coefficients[i]) < 1e-10) continue;
    if (solvedSoFar && solvedSoFar[i] !== undefined) continue;
    activeIndices.push(i);
  }

  // ── 2. Header ──────────────────────────────────────────────────────
  const header = eq.description || '\\text{Equation}';

  if (activeIndices.length === 0) {
    // All unknowns solved — this equation is a check
    lines.push(`${header} \\checkmark`);
    return lines;
  }

  lines.push(header + ':');

  // ── 3. Build LHS symbolic terms ────────────────────────────────────
  const lhsTerms = [];
  for (const i of activeIndices) {
    const coeff = eq.coefficients[i];
    const label = getReactionLabel(unknowns[i].label, unknowns[i].type);
    const sign = (coeff > 0) ? (lhsTerms.length > 0 ? '+' : '') : '-';
    const absC = Math.abs(coeff);

    if (Math.abs(absC - 1) < 1e-6) {
      lhsTerms.push(`${sign} ${label}`);
    } else {
      lhsTerms.push(`${sign} ${label} \\times ${fmt(absC)}`);
    }
  }
  const lhsStr = lhsTerms.join(' ');

  // ── 4. Build RHS ──────────────────────────────────────────────────
  // Start from eq.rhs, subtract contributions of already-solved unknowns
  let adjustedRhs = eq.rhs;
  if (solvedSoFar) {
    for (let i = 0; i < n; i++) {
      if (solvedSoFar[i] !== undefined) {
        adjustedRhs -= eq.coefficients[i] * solvedSoFar[i];
      }
    }
  }
  const rhsStr = fmt(adjustedRhs);

  // ── 5. Symbolic equation line ──────────────────────────────────────
  lines.push(`${lhsStr} = ${rhsStr}`);

  // ── 6. Result for each active unknown ────────────────────────────
  for (const i of activeIndices) {
    const u = unknowns[i];
    const rxn = reactions.find(r => r.nodeId === u.nodeId && r.type === u.type);
    const value = rxn ? rxn.value : 0;
    const label = getReactionLabel(u.label, u.type);
    const dir = getDirectionArrow(value, u.type);

    if (activeIndices.length === 1) {
      // Solve directly
      const coeff = eq.coefficients[i];
      if (Math.abs(Math.abs(coeff) - 1) > 1e-6) {
        // Show division step
        lines.push(`${label} = \\dfrac{${rhsStr}}{${fmt(coeff)}} = ${fmt(value)} \\text{ kN} \\; ${dir}`);
      } else {
        lines.push(`${label} = ${fmt(value)} \\text{ kN} \\; ${dir}`);
      }
    } else {
      // Multiple unknowns — show each result separately
      lines.push(`${label} = ${fmt(Math.abs(value))} \\text{ kN} \\; ${dir}`);
    }
  }

  return lines;
}

// ── Step builders ──────────────────────────────────────────────────

/** Step 1: Global Free Body Diagram — always first */
function buildGlobalFBDStep(nodes, members, unknowns, reactions, allSolved) {
  const solvedSoFar = allSolved ? Object.fromEntries(unknowns.map((_, i) => [i, 0])) : null;
  const reactionItems = buildReactionItems(unknowns, reactions, solvedSoFar);

  const unknownLabels = unknowns
    .map(u => getReactionLabel(u.label, u.type))
    .join(', ');

  return {
    title: 'Free Body Diagram',
    fbd: { nodes, members, reactionItems, cutNodeIds: [], highlightNodeIds: null },
    equations: [],
    notes: `Support reactions to determine: ${unknownLabels} (${unknowns.length} unknown${unknowns.length !== 1 ? 's' : ''})`,
  };
}

/** Reorder equations: moment first, then Fy, then Fx */
function reorderEquations(equations) {
  const moment = equations.filter(e => e.type === 'moment' || e.type === 'hinge-moment' || e.type === 'sub-moment');
  const fy     = equations.filter(e => e.type === 'force-y');
  const fx     = equations.filter(e => e.type === 'force-x');
  const other  = equations.filter(e => !['moment','hinge-moment','sub-moment','force-y','force-x'].includes(e.type));
  return [...moment, ...fy, ...fx, ...other];
}

/**
 * Direct solve path (≤ 3 unknowns): generate one step per equation.
 * solvingStep is solvingSteps[0] from the solver.
 */
function buildDirectSolveSteps(solvingStep, unknowns, reactions) {
  if (!solvingStep || !solvingStep.equations) return [];
  const steps = [];
  const solvedSoFar = {};
  const ordered = reorderEquations(solvingStep.equations);

  for (let i = 0; i < ordered.length; i++) {
    const eq = ordered[i];
    const eqLines = buildEquationLatex(eq, unknowns, reactions, solvedSoFar);

    // Mark any unknowns solved by this equation
    for (let j = 0; j < unknowns.length; j++) {
      if (Math.abs(eq.coefficients[j]) < 1e-10) continue;
      if (solvedSoFar[j] !== undefined) continue;
      const rxn = reactions.find(r => r.nodeId === unknowns[j].nodeId && r.type === unknowns[j].type);
      if (rxn) solvedSoFar[j] = rxn.value;
    }

    // Step title reflects the equation type
    let title;
    const eq_ = eq;
    if (eq_.type === 'moment' || eq_.type === 'hinge-moment' || eq_.type === 'sub-moment') {
      const mp = eq_.momentPoint || (eq_.hingeNode);
      title = `Moment Equation ${mp ? `about ${mp.label}` : ''}`;
    } else if (eq_.type === 'force-y') {
      title = 'Vertical Force Equation';
    } else if (eq_.type === 'force-x') {
      title = 'Horizontal Force Equation';
    } else {
      title = `Equation ${i + 1}`;
    }

    steps.push({
      title,
      fbd: null,
      equations: eqLines,
      notes: null,
    });
  }

  return steps;
}

/**
 * Sub-structure solve path (> 3 unknowns).
 * solvingSteps contains sub-structure + global entries.
 */
function buildSubStructureSteps(solvingSteps, unknowns, reactions, nodes, members) {
  const steps = [];
  const solvedSoFar = {};

  for (const solvingStep of solvingSteps) {
    if (solvingStep.type === 'sub-structure') {
      // ── Sub-structure FBD ──
      const hingeId = solvingStep.hingeNode?.id;
      const sideNodeIds = solvingStep.side?.nodeIds || new Set();

      const subFBD = {
        nodes,
        members,
        reactionItems: buildReactionItems(unknowns, reactions, solvedSoFar),
        cutNodeIds: hingeId ? [hingeId] : [],
        highlightNodeIds: sideNodeIds.size > 0 ? sideNodeIds : null,
      };

      // Mark indices being solved in this step
      const targetIndices = solvingStep.solvedIndices || [];

      steps.push({
        title: `Sub-structure ${solvingStep.sideLabel || ''} — FBD`,
        fbd: subFBD,
        equations: [],
        notes: hingeId
          ? `Cut at hinge ${solvingStep.hingeNode.label}. Taking moment about the hinge eliminates internal forces at the cut.`
          : null,
      });

      // ── Sub-structure equations ──
      if (solvingStep.equations && solvingStep.equations.length > 0) {
        const ordered = reorderEquations(solvingStep.equations);
        const eqLines = [];
        for (const eq of ordered) {
          eqLines.push(...buildEquationLatex(eq, unknowns, reactions, solvedSoFar));
          eqLines.push('');
        }
        // Pop last empty
        while (eqLines.length > 0 && eqLines[eqLines.length - 1] === '') eqLines.pop();

        // Mark solved
        for (const idx of targetIndices) {
          const rxn = reactions.find(r => r.nodeId === unknowns[idx].nodeId && r.type === unknowns[idx].type);
          if (rxn) solvedSoFar[idx] = rxn.value;
        }

        steps.push({
          title: `Sub-structure ${solvingStep.sideLabel || ''} — Equations`,
          fbd: null,
          equations: eqLines,
          notes: null,
        });
      } else {
        // Still mark as solved
        for (const idx of targetIndices) {
          const rxn = reactions.find(r => r.nodeId === unknowns[idx].nodeId && r.type === unknowns[idx].type);
          if (rxn) solvedSoFar[idx] = rxn.value;
        }
      }

    } else if (solvingStep.type === 'global') {
      // ── Global equilibrium (with partial solutions known) ──
      const globalFBD = {
        nodes,
        members,
        reactionItems: buildReactionItems(unknowns, reactions, solvedSoFar),
        cutNodeIds: [],
        highlightNodeIds: null,
      };

      steps.push({
        title: 'Global Equilibrium — FBD',
        fbd: globalFBD,
        equations: [],
        notes: 'Already-solved reactions are shown with their computed values.',
      });

      if (solvingStep.equations && solvingStep.equations.length > 0) {
        const ordered = reorderEquations(solvingStep.equations);
        const eqLines = [];
        for (const eq of ordered) {
          eqLines.push(...buildEquationLatex(eq, unknowns, reactions, solvedSoFar));
          eqLines.push('');
        }
        while (eqLines.length > 0 && eqLines[eqLines.length - 1] === '') eqLines.pop();

        const targetIndices = solvingStep.solvedIndices || [];
        for (const idx of targetIndices) {
          const rxn = reactions.find(r => r.nodeId === unknowns[idx].nodeId && r.type === unknowns[idx].type);
          if (rxn) solvedSoFar[idx] = rxn.value;
        }

        steps.push({
          title: 'Global Equilibrium — Equations',
          fbd: null,
          equations: eqLines,
          notes: null,
        });
      }
    }
  }

  return steps;
}

/**
 * For pure truss / mixed: build equation steps from the equations array
 * (global + hinge + joint equilibrium). We only display the global equations
 * and a summary note for truss joints (those are handled by truss steps).
 */
function buildMixedFrameEquationSteps(solverResults, unknowns, reactions) {
  const { equations } = solverResults;
  if (!equations || equations.length === 0) return [];

  // Only use global equilibrium equations (type: 'force-x', 'force-y', 'moment')
  const globalEqs = equations.filter(e =>
    ['force-x', 'force-y', 'moment'].includes(e.type)
  );
  if (globalEqs.length === 0) return [];

  const ordered = reorderEquations(globalEqs);
  const solvedSoFar = {};
  const eqLines = [];
  const steps = [];

  for (const eq of ordered) {
    const lines = buildEquationLatex(eq, unknowns, reactions, solvedSoFar);
    for (let i = 0; i < unknowns.length; i++) {
      if (Math.abs(eq.coefficients[i]) > 1e-10 && solvedSoFar[i] === undefined) {
        const rxn = reactions.find(r => r.nodeId === unknowns[i].nodeId && r.type === unknowns[i].type);
        if (rxn) solvedSoFar[i] = rxn.value;
      }
    }
    eqLines.push(...lines);
    eqLines.push('');
  }
  while (eqLines.length > 0 && eqLines[eqLines.length - 1] === '') eqLines.pop();

  steps.push({
    title: 'Global Equilibrium — Support Reactions',
    fbd: null,
    equations: eqLines,
    notes: null,
  });

  return steps;
}

// ── Truss steps ────────────────────────────────────────────────────

function buildTrussJointFBD(jointId, nodes, members, trussForces, reactions, solvedMemberIds) {
  const joint = nodes.find(n => n.id === jointId);
  if (!joint) return null;

  // Only include the joint itself in the "subset" for display
  // But show all truss members connected to it (as lines radiating out)
  const connTruss = members.filter(
    m => m.type === 'truss' && (m.startNodeId === jointId || m.endNodeId === jointId)
  );

  // Provide just this node and its connected members for the small joint FBD
  const jointNodes = [joint];
  // Also include the far ends so member lines can be drawn
  for (const m of connTruss) {
    const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
    const other = nodes.find(n => n.id === otherId);
    if (other && !jointNodes.find(n => n.id === other.id)) jointNodes.push(other);
  }

  // Reaction items at this joint
  const jointReactions = reactions
    .filter(r => r.nodeId === jointId)
    .map(r => ({
      nodeId: r.nodeId,
      type: r.type,
      label: `${fmt(r.value)} kN`,
      value: r.value,
      mode: 'solved',
    }));

  return {
    nodes: jointNodes,
    members: connTruss,
    reactionItems: jointReactions,
    cutNodeIds: [],
    highlightNodeIds: new Set([jointId]),
    maxHeight: 200,
  };
}

function buildTrussSteps(nodes, members, trussForces, reactions) {
  const steps = [];
  const trussMembers = members.filter(m => m.type === 'truss');
  if (trussMembers.length === 0) return [];

  // Identify pure truss joints (no frame connections)
  const pureTrussJoints = [];
  for (const node of nodes) {
    const hasFrame = members.some(m =>
      m.type === 'frame' &&
      (m.startNodeId === node.id || m.endNodeId === node.id)
    );
    const hasTruss = trussMembers.some(
      m => m.startNodeId === node.id || m.endNodeId === node.id
    );
    if (hasTruss && !hasFrame) pureTrussJoints.push(node.id);
  }

  // Zero force member identification step (if any)
  const zeroForces = trussForces.filter(tf => tf.isZeroForceMember && Math.abs(tf.force) < 1e-10);
  if (zeroForces.length > 0) {
    const zeroEqs = zeroForces.map(tf =>
      `F_{${tf.startLabel}${tf.endLabel}} = 0 \\quad \\text{(zero-force member)}`
    );
    steps.push({
      title: 'Zero-Force Member Identification',
      fbd: null,
      equations: zeroEqs,
      notes: 'These members carry no force under the current loading (identified before method of joints).',
    });
  }

  // Gather solved member IDs
  const solvedMemberIds = new Set(zeroForces.map(tf => tf.memberId));

  // Group joint steps for 2-column grid
  const jointSteps = [];
  for (const jointId of pureTrussJoints) {
    const joint = nodes.find(n => n.id === jointId);
    if (!joint) continue;

    const connTruss = trussMembers.filter(
      m => m.startNodeId === jointId || m.endNodeId === jointId
    );

    // Build ΣFx and ΣFy equations for this joint
    const tfAtJoint = trussForces.filter(tf =>
      connTruss.some(m => m.id === tf.memberId)
    );

    const eqLines = [];
    eqLines.push('\\text{Assume all unknown forces in tension (away from joint)}');
    eqLines.push('');

    // ΣFx = 0
    let fxTerms = [];
    let fxRhs = -(joint.loads?.fx || 0);
    for (const r of reactions) {
      if (r.nodeId !== jointId) continue;
      if (r.type === 'Rx') fxRhs -= r.value;
    }
    for (const m of connTruss) {
      const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
      const other = nodes.find(n => n.id === otherId);
      if (!other) continue;
      const dx = other.x - joint.x, dy = other.y - joint.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      const cosA = dx / L;
      if (Math.abs(cosA) < 1e-10) continue;
      fxTerms.push(`${fmt(cosA)} F_{${m.startLabel}${m.endLabel}}`);
    }
    if (fxTerms.length > 0) {
      eqLines.push(`\\sum F_x = 0: \\quad ${fxTerms.join(' + ')} = ${fmt(fxRhs)}`);
    }

    // ΣFy = 0
    let fyTerms = [];
    let fyRhs = -(joint.loads?.fy || 0);
    for (const r of reactions) {
      if (r.nodeId !== jointId) continue;
      if (r.type === 'Ry') fyRhs -= r.value;
    }
    for (const m of connTruss) {
      const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
      const other = nodes.find(n => n.id === otherId);
      if (!other) continue;
      const dx = other.x - joint.x, dy = other.y - joint.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      const sinA = dy / L;
      if (Math.abs(sinA) < 1e-10) continue;
      fyTerms.push(`${fmt(sinA)} F_{${m.startLabel}${m.endLabel}}`);
    }
    if (fyTerms.length > 0) {
      eqLines.push(`\\sum F_y = 0: \\quad ${fyTerms.join(' + ')} = ${fmt(fyRhs)}`);
    }

    // Results for this joint's truss forces
    eqLines.push('');
    for (const tf of tfAtJoint) {
      const sign = tf.force > 0.001 ? '\\text{(T)}' : tf.force < -0.001 ? '\\text{(C)}' : '\\text{(zero)}';
      eqLines.push(`F_{${tf.startLabel}${tf.endLabel}} = ${fmt(Math.abs(tf.force))} \\text{ kN} \\; ${sign}`);
    }

    const fbd = buildTrussJointFBD(jointId, nodes, members, trussForces, reactions, solvedMemberIds);
    for (const m of connTruss) solvedMemberIds.add(m.id);

    jointSteps.push({
      title: `Joint ${joint.label || jointId}`,
      fbd,
      equations: eqLines,
      notes: null,
    });
  }

  if (jointSteps.length > 0) {
    steps.push({
      title: 'Method of Joints',
      fbd: null,
      equations: [],
      notes: 'Solving each pure truss joint:',
      trussJointGrid: jointSteps,
    });
  }

  // Truss results table
  if (trussForces.length > 0) {
    steps.push({
      title: 'Truss Member Forces — Summary',
      fbd: null,
      equations: [],
      notes: null,
      trussTable: trussForces,
    });
  }

  return steps;
}

/** Final verification step */
function buildVerificationStep(verification, reactions) {
  if (!verification || verification.length === 0) {
    return {
      title: 'Verification',
      fbd: null,
      equations: reactions.map(r => {
        const label = getReactionLabel(r.label, r.type);
        const dir = getDirectionArrow(r.value, r.type);
        return `${label} = ${fmt(Math.abs(r.value))} \\text{ kN} \\; ${dir}`;
      }),
      notes: 'All support reactions solved.',
    };
  }

  const allPass = verification.every(v => v.pass);
  const eqLines = verification.map(v =>
    `${v.equation} \\quad \\Rightarrow \\quad ${fmt(v.residual)} \\approx 0 \\; ${v.pass ? '\\checkmark' : '\\times'}`
  );

  return {
    title: 'Verification',
    fbd: null,
    equations: eqLines,
    notes: allPass
      ? 'All equilibrium equations are satisfied. ✅'
      : '⚠️ Some equations do not satisfy equilibrium. Check your structure.',
  };
}

// ── Main export ────────────────────────────────────────────────────

export function generateSolution(solverResults) {
  if (!solverResults || !solverResults.success) return [];

  const {
    nodes, members, reactions, trussForces,
    unknowns, solvingSteps, verification, knownForces, momentPoint,
  } = solverResults;

  const isPureTruss = members.length > 0 && members.every(m => m.type === 'truss');
  const hasTruss    = members.some(m => m.type === 'truss');
  const hasFrame    = members.some(m => m.type !== 'truss');

  const steps = [];

  if (isPureTruss) {
    // ── Pure truss ──────────────────────────────────────────────────
    steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions, true));
    steps.push({
      title: 'Support Reactions',
      fbd: null,
      equations: reactions.map(r => {
        const label = getReactionLabel(r.label, r.type);
        const dir = getDirectionArrow(r.value, r.type);
        return `${label} = ${fmt(Math.abs(r.value))} \\text{ kN} \\; ${dir}`;
      }),
      notes: 'Reactions solved from the full joint equilibrium system (2J equations).',
    });
    const trussSteps = buildTrussSteps(nodes, members, trussForces || [], reactions);
    steps.push(...trussSteps);

  } else if (hasTruss && hasFrame) {
    // ── Mixed frame + truss ─────────────────────────────────────────
    steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions, false));
    const frameEqSteps = buildMixedFrameEquationSteps(solverResults, unknowns, reactions);
    steps.push(...frameEqSteps);
    if (trussForces && trussForces.length > 0) {
      const trussSteps = buildTrussSteps(nodes, members, trussForces, reactions);
      steps.push(...trussSteps);
    }

  } else {
    // ── Pure frame ─────────────────────────────────────────────────
    steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions, false));

    if (!solvingSteps || solvingSteps.length === 0) {
      // Fallback
      steps.push({
        title: 'Solution',
        fbd: null,
        equations: reactions.map(r => {
          const label = getReactionLabel(r.label, r.type);
          const dir = getDirectionArrow(r.value, r.type);
          return `${label} = ${fmt(Math.abs(r.value))} \\text{ kN} \\; ${dir}`;
        }),
        notes: null,
      });
    } else if (unknowns.length <= 3 && solvingSteps[0]?.type === 'global') {
      // Direct solve
      const directSteps = buildDirectSolveSteps(solvingSteps[0], unknowns, reactions);
      steps.push(...directSteps);
    } else {
      // Sub-structure solve
      const subSteps = buildSubStructureSteps(solvingSteps, unknowns, reactions, nodes, members);
      steps.push(...subSteps);
    }

    // Truss forces after frame reactions (for mixed-type members edge case)
    if (trussForces && trussForces.length > 0) {
      const trussSteps = buildTrussSteps(nodes, members, trussForces, reactions);
      steps.push(...trussSteps);
    }
  }

  // Verification always last
  steps.push(buildVerificationStep(verification, reactions));

  return steps;
}

export function computeStrategy(solverResults) {
  if (!solverResults || !solverResults.success) return { text: 'N/A' };
  const { unknowns, members, nodes } = solverResults;

  const isPureTruss = members.length > 0 && members.every(m => m.type === 'truss');
  const hasTruss    = members.some(m => m.type === 'truss');
  const hasFrame    = members.some(m => m.type !== 'truss');

  if (isPureTruss) {
    const j = nodes.length;
    return { text: `Pure truss — full joint equilibrium (2×${j} = ${2*j} equations), then method of joints for member forces` };
  }

  if (hasTruss && hasFrame) {
    return { text: `Mixed frame + truss — global equilibrium for support reactions, then method of joints for member forces` };
  }

  const hingeCount = countInternalHinges(nodes, members);
  const hingeLabels = getHingeLabels(nodes, members);
  const availableEqs = 3 + hingeCount;

  if (unknowns.length <= 3) {
    return { text: `${unknowns.length} unknowns, 3 global equilibrium equations → direct solution` };
  } else {
    const hingeStr = hingeCount === 1
      ? `hinge ${hingeLabels}`
      : `hinges ${hingeLabels}`;
    return {
      text: `${unknowns.length} unknowns, ${availableEqs} equations (3 global + ${hingeCount} from ${hingeStr}) → sub-structure partitioning`,
    };
  }
}
