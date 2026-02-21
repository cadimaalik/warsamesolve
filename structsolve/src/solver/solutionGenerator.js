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

// ── Fix 4: Angle fractions — express cos/sin as geometric fractions ──

/**
 * Given member direction from joint (dx, dy) and length L,
 * returns a LaTeX fraction string for the magnitude of the component.
 * e.g. dx=3, L=5 → '\frac{3}{5}'
 */
function geoFracStr(component, L) {
  const abs = Math.abs(component);
  if (abs < 1e-10) return '0';
  if (Math.abs(abs - L) < 1e-6) return '1';
  return `\\frac{${fmt(abs)}}{${fmt(L)}}`;
}

// ── Sub-structure partition helpers (pure truss >3 unknowns) ──────

/**
 * Find connected components in the truss graph after removing a node.
 * Returns an array of Sets, each containing node IDs in one component.
 */
function getGraphComponents(excludeNodeId, nodes, members) {
  const adj = {};
  for (const n of nodes) {
    if (n.id === excludeNodeId) continue;
    adj[n.id] = [];
  }
  for (const m of members) {
    if (m.startNodeId === excludeNodeId || m.endNodeId === excludeNodeId) continue;
    if (adj[m.startNodeId]) adj[m.startNodeId].push(m.endNodeId);
    if (adj[m.endNodeId]) adj[m.endNodeId].push(m.startNodeId);
  }

  const visited = new Set();
  const components = [];

  for (const nodeId of Object.keys(adj)) {
    if (visited.has(nodeId)) continue;
    const component = new Set();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      component.add(current);
      for (const neighbor of (adj[current] || [])) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    components.push(component);
  }

  return components;
}

/**
 * Find the optimal joint to partition a pure truss for sub-structure analysis.
 * Only non-support nodes are candidates. The best candidate splits the graph
 * into two sides with the most balanced reaction-unknown counts.
 */
function findOptimalPartitionJoint(nodes, members, unknowns) {
  const candidates = nodes.filter(n => !n.support);

  let bestJoint = null;
  let bestScore = Infinity;
  let bestBalance = Infinity;

  for (const candidate of candidates) {
    const sides = getGraphComponents(candidate.id, nodes, members);
    if (sides.length < 2) continue;

    const sideCounts = sides.map(sideNodeIds =>
      unknowns.filter(u => sideNodeIds.has(u.nodeId)).length
    );

    const maxCount = Math.max(...sideCounts);
    const balance = Math.abs(sideCounts[0] - (sideCounts[1] || 0));

    if (maxCount < bestScore || (maxCount === bestScore && balance < bestBalance)) {
      bestScore = maxCount;
      bestBalance = balance;
      bestJoint = candidate;
    }
  }

  return bestJoint;
}

/**
 * Build a human-readable label for a sub-structure side.
 * Lists sorted node labels including the cut joint.
 */
function buildSideLabel(sideNodeIds, cutJoint, nodes) {
  const labels = [];
  for (const nodeId of sideNodeIds) {
    const node = nodes.find(n => n.id === nodeId);
    if (node) labels.push(node.label);
  }
  labels.push(cutJoint.label);
  labels.sort();
  return labels.join('');
}

/**
 * Filter knownForces to only include loads on a given sub-structure side.
 * Loads at the cut joint are assigned to the first (primary) side only.
 */
function filterKnownForcesToSide(knownForces, sideNodeIds, cutJointId, nodes, isFirstSide) {
  return knownForces.filter(f => {
    const atNode = nodes.find(n =>
      Math.abs(n.x - f.x) < 0.01 && Math.abs(n.y - f.y) < 0.01
    );
    if (!atNode) return false;
    if (atNode.id === cutJointId) return isFirstSide;
    return sideNodeIds.has(atNode.id);
  });
}

/**
 * Build ΣM equation about a cut joint for a sub-structure side.
 * The internal forces at the cut pass through the moment point and vanish.
 * Returns an equation object compatible with buildEquationLatex.
 */
function buildSubMomentEquation(cutJoint, sideNodeIds, nodes, unknowns, sideKnownForces) {
  const P = cutJoint;
  const n = unknowns.length;
  const eq = {
    coefficients: new Array(n).fill(0),
    rhs: 0,
    description: `\\sum M_{${P.label}} = 0 \\text{ (sub-structure)}`,
    type: 'sub-moment',
    momentPoint: P,
  };

  // Reaction unknowns on this side
  for (let i = 0; i < n; i++) {
    const u = unknowns[i];
    if (!sideNodeIds.has(u.nodeId)) continue;

    const dx = u.node.x - P.x;
    const dy = u.node.y - P.y;

    if (u.type === 'Ry') eq.coefficients[i] = dx;
    else if (u.type === 'Rx') eq.coefficients[i] = -dy;
    else if (u.type === 'M') eq.coefficients[i] = 1;
  }

  // Known forces (external loads) on this side → move to RHS
  for (const f of sideKnownForces) {
    const dx = f.x - P.x;
    const dy = f.y - P.y;
    const moment = dx * f.fy - dy * f.fx + (f.m || 0);
    eq.rhs -= moment;
  }

  return eq;
}

/**
 * Build LaTeX for the simultaneous solving of the 4-equation system.
 * Uses the known reaction values to reconstruct the derivation.
 * Strategy: express groupB unknowns from force equations, substitute into
 * the global moment equation to form a 2×2 system with the sub-structure ΣM.
 */
function buildSimultaneousSolveLatex(systemEquations, unknowns, reactions, allKnownForces, sideAKnownForces, sideAIds) {
  const lines = [];

  // Identify the 4 equation types
  const momGlobal = systemEquations.find(eq => eq.type === 'moment');
  const momSub = systemEquations.find(eq => eq.type === 'sub-moment');
  const eqFx = systemEquations.find(eq => eq.type === 'force-x');
  const eqFy = systemEquations.find(eq => eq.type === 'force-y');

  if (!momGlobal || !momSub || !eqFx || !eqFy) {
    // Fallback: just show the answers
    for (let i = 0; i < unknowns.length; i++) {
      const u = unknowns[i];
      const rxn = reactions.find(r => r.nodeId === u.nodeId && r.type === u.type);
      if (!rxn) continue;
      const label = getReactionLabel(u.label, u.type);
      const dir = getDirectionArrow(rxn.value, u.type);
      const unit = u.type === 'M' ? '\\text{ kN·m}' : '\\text{ kN}';
      lines.push(`${label} = ${fmt(Math.abs(rxn.value))} ${unit} \\; ${dir}`);
    }
    return lines;
  }

  // Group A: unknowns in the sub-structure moment eq (one support)
  // Group B: unknowns in the global moment eq but NOT in sub (other support)
  const groupA = []; // indices
  const groupB = [];
  for (let i = 0; i < unknowns.length; i++) {
    if (Math.abs(momSub.coefficients[i]) > 1e-10) groupA.push(i);
    else if (Math.abs(momGlobal.coefficients[i]) > 1e-10) groupB.push(i);
  }

  // Find the Rx and Ry indices in each group
  const groupARx = groupA.find(i => unknowns[i].type === 'Rx');
  const groupARy = groupA.find(i => unknowns[i].type === 'Ry');
  const groupBRx = groupB.find(i => unknowns[i].type === 'Rx');
  const groupBRy = groupB.find(i => unknowns[i].type === 'Ry');

  // Get reaction values
  const getVal = (idx) => {
    if (idx === undefined) return 0;
    const u = unknowns[idx];
    const rxn = reactions.find(r => r.nodeId === u.nodeId && r.type === u.type);
    return rxn ? rxn.value : 0;
  };

  // ΣFx = 0 gives: Σ(all Rx unknowns) + Σ(horizontal loads) = 0
  // Compute the horizontal load sum from the force-x equation RHS
  const fxRhs = eqFx.rhs; // RHS of ΣFx (after moving loads to right side)
  const fyRhs = eqFy.rhs;

  // ── Line 1: Express groupB unknowns from force equations ──
  if (groupBRx !== undefined && groupARx !== undefined) {
    const bLabel = getReactionLabel(unknowns[groupBRx].label, 'Rx');
    const aLabel = getReactionLabel(unknowns[groupARx].label, 'Rx');
    lines.push(`\\text{From } \\sum F_x = 0: \\quad ${bLabel} = ${fmt(fxRhs)} - ${aLabel}`);
    lines.push('');
  }
  if (groupBRy !== undefined && groupARy !== undefined) {
    const bLabel = getReactionLabel(unknowns[groupBRy].label, 'Ry');
    const aLabel = getReactionLabel(unknowns[groupARy].label, 'Ry');
    lines.push(`\\text{From } \\sum F_y = 0: \\quad ${bLabel} = ${fmt(fyRhs)} - ${aLabel}`);
    lines.push('');
  }

  // ── Line 2: Substitute into global moment equation ──
  // momGlobal has coefficients for groupB unknowns. After substitution:
  //   coeff_Bx * (fxRhs - A_x) + coeff_By * (fyRhs - A_y) + loadMoments = 0
  //   → (-coeff_Bx)*A_x + (-coeff_By)*A_y = -(coeff_Bx*fxRhs + coeff_By*fyRhs + loadMoments)
  // This gives us equation (i) in groupA unknowns only.
  const momGlobalMp = momGlobal.momentPoint;
  const momGlobalDesc = momGlobal.description || `\\sum M = 0`;

  lines.push(`\\text{Substitute into } ${momGlobalDesc}:`);

  // Build the substituted equation coefficients for groupA unknowns
  // After substitution, the new coefficients for groupA unknowns are:
  //   for A_x: -(coeff of B_x in momGlobal) ... since B_x = fxRhs - A_x
  //   for A_y: -(coeff of B_y in momGlobal)
  // And the new RHS absorbs the constant parts

  let substCoeffAx = 0; // coefficient of A_x in substituted eq (i)
  let substCoeffAy = 0; // coefficient of A_y in substituted eq (i)
  let substRhs = momGlobal.rhs; // start with original RHS (loads moved to right)

  // The original momGlobal: Σ coeff_i * unknown_i = rhs  (where rhs = -loadMoments)
  // For groupB unknowns, substitute: B_x = fxRhs - A_x, B_y = fyRhs - A_y
  for (const bIdx of groupB) {
    const coeff = momGlobal.coefficients[bIdx];
    if (Math.abs(coeff) < 1e-10) continue;
    const u = unknowns[bIdx];
    if (u.type === 'Rx' && groupARx !== undefined) {
      // B_x = fxRhs - A_x → coeff * B_x = coeff * fxRhs - coeff * A_x
      substRhs -= coeff * fxRhs; // move constant to RHS
      substCoeffAx -= coeff;     // -coeff * A_x moves to LHS
    } else if (u.type === 'Ry' && groupARy !== undefined) {
      substRhs -= coeff * fyRhs;
      substCoeffAy -= coeff;
    }
  }

  // Also include any existing groupA coefficients from momGlobal
  // (these would be zero if the moment is taken about the groupA support,
  // but handle the general case)
  for (const aIdx of groupA) {
    const coeff = momGlobal.coefficients[aIdx];
    if (Math.abs(coeff) < 1e-10) continue;
    if (unknowns[aIdx].type === 'Rx') substCoeffAx += coeff;
    else if (unknowns[aIdx].type === 'Ry') substCoeffAy += coeff;
  }

  // Show the simplified substituted equation as (i)
  const buildTermStr = (coeff, label) => {
    if (Math.abs(coeff) < 1e-10) return null;
    const absC = Math.abs(coeff);
    const cStr = Math.abs(absC - 1) < 1e-6 ? '' : `${fmt(absC)} \\cdot `;
    return { coeff, str: `${cStr}${label}` };
  };

  const aRxLabel = groupARx !== undefined ? getReactionLabel(unknowns[groupARx].label, 'Rx') : null;
  const aRyLabel = groupARy !== undefined ? getReactionLabel(unknowns[groupARy].label, 'Ry') : null;

  const termI_x = aRxLabel ? buildTermStr(substCoeffAx, aRxLabel) : null;
  const termI_y = aRyLabel ? buildTermStr(substCoeffAy, aRyLabel) : null;

  let eqIStr = '';
  const termsI = [termI_x, termI_y].filter(Boolean);
  for (let t = 0; t < termsI.length; t++) {
    const term = termsI[t];
    if (t === 0) {
      eqIStr += term.coeff < 0 ? `- ${term.str}` : term.str;
    } else {
      eqIStr += term.coeff < 0 ? ` - ${term.str}` : ` + ${term.str}`;
    }
  }
  if (eqIStr) {
    lines.push(`${eqIStr} = ${fmt(substRhs)} \\quad \\cdots \\text{(i)}`);
    lines.push('');
  }

  // ── Line 3: Sub-structure moment equation as (ii) ──
  lines.push(`\\text{From sub-structure } ${momSub.description}:`);

  let eqIIStr = '';
  const termsII = [];
  if (groupARx !== undefined && Math.abs(momSub.coefficients[groupARx]) > 1e-10) {
    termsII.push({ coeff: momSub.coefficients[groupARx], label: aRxLabel });
  }
  if (groupARy !== undefined && Math.abs(momSub.coefficients[groupARy]) > 1e-10) {
    termsII.push({ coeff: momSub.coefficients[groupARy], label: aRyLabel });
  }

  for (let t = 0; t < termsII.length; t++) {
    const { coeff, label } = termsII[t];
    const absC = Math.abs(coeff);
    const cStr = Math.abs(absC - 1) < 1e-6 ? '' : `${fmt(absC)} \\cdot `;
    if (t === 0) {
      eqIIStr += coeff < 0 ? `- ${cStr}${label}` : `${cStr}${label}`;
    } else {
      eqIIStr += coeff < 0 ? ` - ${cStr}${label}` : ` + ${cStr}${label}`;
    }
  }
  if (eqIIStr) {
    lines.push(`${eqIIStr} = ${fmt(momSub.rhs)} \\quad \\cdots \\text{(ii)}`);
    lines.push('');
  }

  // ── Line 4: Solve the 2×2 system ──
  lines.push('\\text{Solving (i) and (ii) simultaneously:}');
  lines.push('');

  // Show groupA results
  for (const aIdx of groupA) {
    const u = unknowns[aIdx];
    const val = getVal(aIdx);
    const label = getReactionLabel(u.label, u.type);
    const dir = getDirectionArrow(val, u.type);
    const unit = u.type === 'M' ? '\\text{ kN·m}' : '\\text{ kN}';
    lines.push(`${label} = ${fmt(Math.abs(val))} ${unit} \\; ${dir}`);
  }
  lines.push('');

  // ── Line 5: Back-substitute for groupB ──
  lines.push('\\text{Back-substitute:}');
  lines.push('');

  for (const bIdx of groupB) {
    const u = unknowns[bIdx];
    const bVal = getVal(bIdx);
    const bLabel = getReactionLabel(u.label, u.type);
    const dir = getDirectionArrow(bVal, u.type);
    const unit = u.type === 'M' ? '\\text{ kN·m}' : '\\text{ kN}';

    // Find the matching groupA unknown
    const aIdx = groupA.find(ai => unknowns[ai].type === u.type);
    if (aIdx !== undefined) {
      const aVal = getVal(aIdx);
      const rhsVal = u.type === 'Rx' ? fxRhs : fyRhs;
      lines.push(`${bLabel} = ${fmt(rhsVal)} - ${fmt(aVal)} = ${fmt(Math.abs(bVal))} ${unit} \\; ${dir}`);
    } else {
      lines.push(`${bLabel} = ${fmt(Math.abs(bVal))} ${unit} \\; ${dir}`);
    }
  }

  return lines;
}

/**
 * Build full verification step: each equation with numbers plugged in.
 * Shows variable form → numbers → residual ≈ 0 ✓
 */
function buildFullEquationVerification(systemEquations, unknowns, reactions, allKnownForces, sideAKnownForces) {
  const eqLines = [];

  for (const eq of systemEquations) {
    const eqKf = eq.type === 'sub-moment' ? sideAKnownForces : allKnownForces;
    const header = eq.description || '\\text{Equation}';

    // Line 1: variable form (same as buildEquationLatex line 1)
    let varForm = '';
    for (let i = 0; i < unknowns.length; i++) {
      if (Math.abs(eq.coefficients[i]) < 1e-10) continue;
      const label = getReactionLabel(unknowns[i].label, unknowns[i].type);
      const coeff = eq.coefficients[i];
      const sign = coeff > 0 ? (varForm.length > 0 ? ' + ' : '') : ' - ';
      const absC = Math.abs(coeff);
      if (Math.abs(absC - 1) < 1e-6) {
        varForm += `${sign}${label}`;
      } else {
        varForm += `${sign}${label} \\times ${fmt(absC)}`;
      }
    }
    const loadTerms = buildLoadTermsStr(eq, eqKf);
    if (loadTerms) varForm += loadTerms;
    eqLines.push(`${header}: \\quad ${varForm} = 0`);

    // Line 2: all numbers plugged in
    let numForm = '';
    let residual = 0;
    for (let i = 0; i < unknowns.length; i++) {
      if (Math.abs(eq.coefficients[i]) < 1e-10) continue;
      const rxn = reactions.find(r => r.nodeId === unknowns[i].nodeId && r.type === unknowns[i].type);
      const val = rxn ? rxn.value : 0;
      const coeff = eq.coefficients[i];
      const term = coeff * val;
      residual += term;

      const sign = term >= 0 ? (numForm.length > 0 ? ' + ' : '') : ' - ';
      const absC = Math.abs(coeff);
      if (Math.abs(absC - 1) < 1e-6) {
        numForm += `${sign}${fmt(Math.abs(val))}`;
      } else {
        numForm += `${sign}${fmt(Math.abs(val))} \\times ${fmt(absC)}`;
      }
    }

    // Add load contributions as numbers
    residual -= eq.rhs; // residual = Σ(coeff*val) - rhs; should ≈ 0

    const pass = Math.abs(residual) < 0.01;
    const checkmark = pass ? '\\checkmark' : '\\times';
    eqLines.push(`\\quad = ${fmt(Math.abs(residual))} \\approx 0 \\; ${checkmark}`);
    eqLines.push('');
  }

  // Remove trailing blank
  while (eqLines.length > 0 && eqLines[eqLines.length - 1] === '') eqLines.pop();

  return eqLines;
}

// ── Equation layout helpers ────────────────────────────────────────

/**
 * Build LaTeX string for the LOAD terms in an equation (from knownForces).
 * Returns a string like " - 20 \times 3 + 5" ready to append to the unknown terms.
 * Falls back to showing the net RHS if knownForces is unavailable.
 */
function buildLoadTermsStr(eq, knownForces) {
  if (!knownForces || knownForces.length === 0) return null; // signal: no data

  const terms = [];

  // Note: load terms always follow unknown terms in the equation string,
  // so every load term needs an explicit sign regardless of position.
  if (eq.type === 'force-x') {
    for (const f of knownForces) {
      if (Math.abs(f.fx) < 1e-10) continue;
      const sign = f.fx > 0 ? ' +' : ' -';
      terms.push(`${sign} ${fmt(Math.abs(f.fx))}`);
    }
  } else if (eq.type === 'force-y') {
    for (const f of knownForces) {
      if (Math.abs(f.fy) < 1e-10) continue;
      const sign = f.fy > 0 ? ' +' : ' -';
      terms.push(`${sign} ${fmt(Math.abs(f.fy))}`);
    }
  } else if (['moment', 'hinge-moment', 'sub-moment'].includes(eq.type)) {
    const mp = eq.momentPoint || eq.hingeNode;
    if (!mp) return null;
    for (const f of knownForces) {
      const dx = f.x - mp.x;
      const dy = f.y - mp.y;
      // Vertical force creates moment: f.fy * dx
      if (Math.abs(f.fy) > 1e-10 && Math.abs(dx) > 1e-10) {
        const val = f.fy * dx;
        const sign = val > 0 ? ' +' : ' -';
        terms.push(`${sign} ${fmt(Math.abs(f.fy))} \\times ${fmt(Math.abs(dx))}`);
      }
      // Horizontal force creates moment: -f.fx * dy
      if (Math.abs(f.fx) > 1e-10 && Math.abs(dy) > 1e-10) {
        const val = -(f.fx * dy);
        const sign = val > 0 ? ' +' : ' -';
        terms.push(`${sign} ${fmt(Math.abs(f.fx))} \\times ${fmt(Math.abs(dy))}`);
      }
      // Direct moment
      if (Math.abs(f.m || 0) > 1e-10) {
        const val = f.m;
        const sign = val > 0 ? ' +' : ' -';
        terms.push(`${sign} ${fmt(Math.abs(val))}`);
      }
    }
  }

  return terms.length > 0 ? terms.join('') : null;
}

/**
 * Build LaTeX lines for a single equilibrium equation showing the full derivation:
 *   Line 1: "ΣM_A = 0: C_y × 6 - 20 × 3 = 0"   (header + full equation)
 *   Line 2: "A_y + 10 - 20 = 0"                   (substitution, if some solved)
 *   Line 3: "C_y = 60/6 = 10 kN ↑"               (result)
 *
 * knownForces is optional — if absent we fall back to "lhs = rhs" form.
 */
function buildEquationLatex(eq, unknowns, reactions, solvedSoFar, knownForces) {
  const lines = [];
  const n = unknowns.length;

  // All indices with non-zero coefficients in this equation
  const allActiveIndices = [];
  for (let i = 0; i < n; i++) {
    if (Math.abs(eq.coefficients[i]) > 1e-10) allActiveIndices.push(i);
  }

  // Unsolved subset
  const unsolvedIndices = allActiveIndices.filter(
    i => !solvedSoFar || solvedSoFar[i] === undefined
  );

  const header = eq.description || '\\text{Equation}';

  if (unsolvedIndices.length === 0) {
    lines.push(`${header} \\checkmark`);
    return lines;
  }

  // ── Build unknown terms (variable names for ALL active indices) ──
  let unknownTermsFull = '';
  for (const i of allActiveIndices) {
    const coeff = eq.coefficients[i];
    const label = getReactionLabel(unknowns[i].label, unknowns[i].type);
    const sign = coeff > 0
      ? (unknownTermsFull.length > 0 ? ' +' : '')
      : ' -';
    const absC = Math.abs(coeff);
    if (Math.abs(absC - 1) < 1e-6) {
      unknownTermsFull += `${sign} ${label}`;
    } else {
      unknownTermsFull += `${sign} ${label} \\times ${fmt(absC)}`;
    }
  }
  unknownTermsFull = unknownTermsFull.trim();

  // ── Adjusted RHS (subtract already-solved unknowns) ──
  let adjustedRhs = eq.rhs;
  if (solvedSoFar) {
    for (let i = 0; i < n; i++) {
      if (solvedSoFar[i] !== undefined) {
        adjustedRhs -= eq.coefficients[i] * solvedSoFar[i];
      }
    }
  }

  // ── Line 1: header + full equation ──
  const loadTerms = buildLoadTermsStr(eq, knownForces);
  if (loadTerms !== null) {
    // Full "all terms = 0" form with individual load terms
    lines.push(`${header}: \\quad ${unknownTermsFull}${loadTerms} = 0`);
  } else {
    // Fallback: combine header with "lhs = rhs" (still better than two separate lines)
    const rhsStr = fmt(adjustedRhs);
    if (allActiveIndices.length === unsolvedIndices.length) {
      // No solved values yet — show lhs = rhs
      lines.push(`${header}: \\quad ${unknownTermsFull} = ${rhsStr}`);
    } else {
      // Some solved — build lhs with only unsolved variables
      let unsolvedLhs = '';
      for (const i of unsolvedIndices) {
        const coeff = eq.coefficients[i];
        const label = getReactionLabel(unknowns[i].label, unknowns[i].type);
        const sign = coeff > 0 ? (unsolvedLhs.length > 0 ? ' +' : '') : ' -';
        const absC = Math.abs(coeff);
        if (Math.abs(absC - 1) < 1e-6) {
          unsolvedLhs += `${sign} ${label}`;
        } else {
          unsolvedLhs += `${sign} ${label} \\times ${fmt(absC)}`;
        }
      }
      lines.push(`${header}: \\quad ${unsolvedLhs.trim()} = ${rhsStr}`);
    }
  }

  // ── Line 2: substitution (if some unknowns already solved AND loadTerms available) ──
  const solvedInEq = allActiveIndices.filter(
    i => solvedSoFar && solvedSoFar[i] !== undefined
  );
  if (loadTerms !== null && solvedInEq.length > 0 && unsolvedIndices.length > 0) {
    let substStr = '';
    for (const i of allActiveIndices) {
      const coeff = eq.coefficients[i];
      let termStr;
      if (solvedSoFar && solvedSoFar[i] !== undefined) {
        const rxn = reactions.find(r => r.nodeId === unknowns[i].nodeId && r.type === unknowns[i].type);
        const val = rxn ? rxn.value : solvedSoFar[i];
        const effVal = coeff * val;
        const sign = effVal >= 0
          ? (substStr.length > 0 ? ' +' : '')
          : ' -';
        const absC = Math.abs(coeff);
        if (Math.abs(absC - 1) < 1e-6) {
          termStr = `${sign} ${fmt(Math.abs(val))}`;
        } else {
          termStr = `${sign} ${fmt(Math.abs(val))} \\times ${fmt(absC)}`;
        }
      } else {
        const label = getReactionLabel(unknowns[i].label, unknowns[i].type);
        const sign = coeff > 0 ? (substStr.length > 0 ? ' +' : '') : ' -';
        const absC = Math.abs(coeff);
        if (Math.abs(absC - 1) < 1e-6) {
          termStr = `${sign} ${label}`;
        } else {
          termStr = `${sign} ${label} \\times ${fmt(absC)}`;
        }
      }
      substStr += termStr;
    }
    lines.push(`${substStr.trim()}${loadTerms} = 0`);
  }

  // ── Line 3: result ──
  for (const i of unsolvedIndices) {
    const u = unknowns[i];
    const rxn = reactions.find(r => r.nodeId === u.nodeId && r.type === u.type);
    const value = rxn ? rxn.value : 0;
    const label = getReactionLabel(u.label, u.type);
    const dir = getDirectionArrow(value, u.type);
    const unit = u.type === 'M' ? '\\text{ kN·m}' : '\\text{ kN}';

    if (unsolvedIndices.length === 1) {
      const coeff = eq.coefficients[i];
      if (Math.abs(Math.abs(coeff) - 1) > 1e-6) {
        lines.push(`${label} = \\dfrac{${fmt(adjustedRhs)}}{${fmt(coeff)}} = ${fmt(value)} ${unit} \\; ${dir}`);
      } else {
        lines.push(`${label} = ${fmt(value)} ${unit} \\; ${dir}`);
      }
    } else {
      lines.push(`${label} = ${fmt(Math.abs(value))} ${unit} \\; ${dir}`);
    }
  }

  return lines;
}

// ── Step builders ──────────────────────────────────────────────────

/**
 * Step 0: Global Free Body Diagram — ALWAYS variable names only.
 * For N > 3 unknowns, adds a note explaining the solving strategy.
 */
function buildGlobalFBDStep(nodes, members, unknowns, reactions, cutJointLabel) {
  const reactionItems = buildReactionItems(unknowns, reactions, null);
  const unknownLabels = unknowns.map(u => getReactionLabel(u.label, u.type)).join(', ');
  const n = unknowns.length;

  const isPureTruss = members.length > 0 && members.every(m => m.type === 'truss');

  let notes;
  if (n <= 3) {
    notes = `${n} unknown${n !== 1 ? 's' : ''} (${unknownLabels}), 3 global equations → direct solution.`;
  } else if (isPureTruss) {
    notes =
      `${n} unknowns (${unknownLabels}), 3 global equations — NOT directly solvable. ` +
      `Partition at joint ${cutJointLabel || '?'} for the additional equation ` +
      `(${n} equations, ${n} unknowns).`;
  } else {
    const hingeCount = countInternalHinges(nodes, members);
    const hingeLabels = getHingeLabels(nodes, members);
    const availableEqs = 3 + hingeCount;
    notes =
      `${n} unknowns (${unknownLabels}), 3 global equations — NOT directly solvable. ` +
      `Internal hinge${hingeCount > 1 ? 's' : ''} at ${hingeLabels} provide${hingeCount > 1 ? '' : 's'} ` +
      `${hingeCount} additional equation${hingeCount > 1 ? 's' : ''} → ${availableEqs} total. ` +
      `Partition the structure at the hinge.`;
  }

  return {
    title: 'Free Body Diagram',
    fbd: { nodes, members, reactionItems, cutNodeIds: [], highlightNodeIds: null },
    equations: [],
    notes,
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
 * Direct solve path (≤ 3 unknowns): one step per equation with full derivation.
 */
function buildDirectSolveSteps(solvingStep, unknowns, reactions) {
  if (!solvingStep || !solvingStep.equations) return [];
  const steps = [];
  const solvedSoFar = {};
  const ordered = reorderEquations(solvingStep.equations);
  const knownForces = solvingStep.knownForces || null;

  for (let i = 0; i < ordered.length; i++) {
    const eq = ordered[i];
    const eqLines = buildEquationLatex(eq, unknowns, reactions, solvedSoFar, knownForces);

    for (let j = 0; j < unknowns.length; j++) {
      if (Math.abs(eq.coefficients[j]) < 1e-10) continue;
      if (solvedSoFar[j] !== undefined) continue;
      const rxn = reactions.find(r => r.nodeId === unknowns[j].nodeId && r.type === unknowns[j].type);
      if (rxn) solvedSoFar[j] = rxn.value;
    }

    let title;
    if (eq.type === 'moment' || eq.type === 'hinge-moment' || eq.type === 'sub-moment') {
      const mp = eq.momentPoint || eq.hingeNode;
      title = `Moment Equation ${mp ? `about ${mp.label}` : ''}`;
    } else if (eq.type === 'force-y') {
      title = 'Vertical Force Equation';
    } else if (eq.type === 'force-x') {
      title = 'Horizontal Force Equation';
    } else {
      title = `Equation ${i + 1}`;
    }

    steps.push({ title, fbd: null, equations: eqLines, notes: null });
  }

  return steps;
}

/**
 * Sub-structure solve path (> 3 unknowns).
 * Follows the exact methodology:
 *   Step 1 — sub-structure FBD with internal forces V_{B,x}/V_{B,y} at hinge cut
 *   Step 2 — sub-structure equations (ΣM about hinge eliminates internal forces)
 *   Step 3 — global FBD with already-solved values shown as numbers
 *   Step 4 — global equations with substitution
 */
function buildSubStructureSteps(solvingSteps, unknowns, reactions, nodes, members) {
  const steps = [];
  const solvedSoFar = {};       // index → solved value (accumulated as we go)
  const allSolvedSoFar = [];    // human-readable solved labels for global-step note

  for (const solvingStep of solvingSteps) {

    // ── Sub-structure step ──────────────────────────────────────────
    if (solvingStep.type === 'sub-structure') {
      const hingeId   = solvingStep.hingeNode?.id;
      const hingeNode = solvingStep.hingeNode;
      const sideNodeIds = solvingStep.side?.nodeIds || new Set();
      const targetIndices = solvingStep.solvedIndices || [];

      // Count reaction unknowns that are still unsolved on this sub-structure side
      const sideUnsolvedCount = unknowns.filter(
        (u, i) => sideNodeIds.has(u.nodeId) && solvedSoFar[i] === undefined
      ).length;
      // Total sub-structure unknowns: side reactions + 2 internal forces at cut
      const totalSubUnknowns = sideUnsolvedCount + (hingeId ? 2 : 0);

      // Internal force arrows at the hinge cut (V_{B,x} and V_{B,y})
      const cutForceItems = hingeId ? [
        {
          nodeId: hingeId,
          type: 'Rx',
          label: `V_{${hingeNode.label}x}`,
          value: 0,
          mode: 'unknown',
        },
        {
          nodeId: hingeId,
          type: 'Ry',
          label: `V_{${hingeNode.label}y}`,
          value: 0,
          mode: 'unknown',
        },
      ] : [];

      // Only show reactions for nodes ON this sub-structure side.
      // The other side's reactions must not appear in the sub-structure FBD.
      const sideReactionItems = buildReactionItems(unknowns, reactions, solvedSoFar)
        .filter(r => sideNodeIds.has(r.nodeId));

      const subFBD = {
        nodes,
        members,
        reactionItems: [...sideReactionItems, ...cutForceItems],
        cutNodeIds: hingeId ? [hingeId] : [],
        highlightNodeIds: sideNodeIds.size > 0 ? sideNodeIds : null,
      };

      const subNote = hingeId
        ? `Sub-structure ${solvingStep.sideLabel || ''}: ${totalSubUnknowns} unknowns, 3 equations. ` +
          `Internal forces V_{${hingeNode.label}x} and V_{${hingeNode.label}y} at the hinge cut. ` +
          `Taking ΣM about ${hingeNode.label} eliminates both internal forces → independent equation for the support reactions on this side.`
        : null;

      steps.push({
        title: `Sub-structure ${solvingStep.sideLabel || ''} — FBD`,
        fbd: subFBD,
        equations: [],
        notes: subNote,
      });

      // ── Sub-structure equations ───────────────────────────────────
      if (solvingStep.equations && solvingStep.equations.length > 0) {
        const ordered = reorderEquations(solvingStep.equations);
        const eqLines = [];
        const stepKnownForces = solvingStep.knownForces || null;
        for (const eq of ordered) {
          eqLines.push(...buildEquationLatex(eq, unknowns, reactions, solvedSoFar, stepKnownForces));
          eqLines.push('');
        }
        while (eqLines.length > 0 && eqLines[eqLines.length - 1] === '') eqLines.pop();

        // Mark newly-solved unknowns (AFTER building LaTeX so derivation shows unsolved form)
        for (const idx of targetIndices) {
          const rxn = reactions.find(r => r.nodeId === unknowns[idx].nodeId && r.type === unknowns[idx].type);
          if (rxn) {
            solvedSoFar[idx] = rxn.value;
            allSolvedSoFar.push(
              `${getReactionLabel(unknowns[idx].label, unknowns[idx].type)} = ${fmt(Math.abs(rxn.value))} kN`
            );
          }
        }

        steps.push({
          title: `Sub-structure ${solvingStep.sideLabel || ''} — Equations`,
          fbd: null,
          equations: eqLines,
          notes: null,
        });
      } else {
        for (const idx of targetIndices) {
          const rxn = reactions.find(r => r.nodeId === unknowns[idx].nodeId && r.type === unknowns[idx].type);
          if (rxn) {
            solvedSoFar[idx] = rxn.value;
            allSolvedSoFar.push(
              `${getReactionLabel(unknowns[idx].label, unknowns[idx].type)} = ${fmt(Math.abs(rxn.value))} kN`
            );
          }
        }
      }

    // ── Global equilibrium step ─────────────────────────────────────
    } else if (solvingStep.type === 'global') {
      const globalFBD = {
        nodes,
        members,
        reactionItems: buildReactionItems(unknowns, reactions, solvedSoFar),
        cutNodeIds: [],
        highlightNodeIds: null,
      };

      // Count how many are still unsolved
      const remainingCount = unknowns.filter((_, i) => solvedSoFar[i] === undefined).length;
      const solvedStr = allSolvedSoFar.length > 0
        ? allSolvedSoFar.join(', ') + ' found from sub-structure analysis. '
        : '';
      const globalNote =
        `${solvedStr}` +
        `${remainingCount} remaining unknown${remainingCount !== 1 ? 's' : ''}, ` +
        `3 global equations — solvable. Already-solved reactions shown as numbers.`;

      steps.push({
        title: 'Global Equilibrium — FBD',
        fbd: globalFBD,
        equations: [],
        notes: globalNote,
      });

      if (solvingStep.equations && solvingStep.equations.length > 0) {
        const ordered = reorderEquations(solvingStep.equations);
        const eqLines = [];
        const stepKnownForces = solvingStep.knownForces || null;
        for (const eq of ordered) {
          eqLines.push(...buildEquationLatex(eq, unknowns, reactions, solvedSoFar, stepKnownForces));
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

function buildMixedFrameEquationSteps(solverResults, unknowns, reactions) {
  const { equations, knownForces } = solverResults;
  if (!equations || equations.length === 0) return [];

  const globalEqs = equations.filter(e =>
    ['force-x', 'force-y', 'moment'].includes(e.type)
  );
  if (globalEqs.length === 0) return [];

  const ordered = reorderEquations(globalEqs);
  const solvedSoFar = {};
  const eqLines = [];

  for (const eq of ordered) {
    const lines = buildEquationLatex(eq, unknowns, reactions, solvedSoFar, knownForces || null);
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

  return [{
    title: 'Global Equilibrium — Support Reactions',
    fbd: null,
    equations: eqLines,
    notes: null,
  }];
}

// ── Truss steps ────────────────────────────────────────────────────

/**
 * Build the FBD for a single truss joint (Fix 10).
 * - Member force arrows with VARIABLE NAMES (pointing away = tension)
 * - Applied loads with numbers
 * - For support nodes: reactions shown with variable labels; member lines hidden
 * - For non-support nodes: members drawn as lines; no reactions
 */
function buildTrussJointFBD(jointId, nodes, members, reactions, unknowns, solvedSoFar) {
  const joint = nodes.find(n => n.id === jointId);
  if (!joint) return null;

  const connTruss = members.filter(
    m => m.type === 'truss' && (m.startNodeId === jointId || m.endNodeId === jointId)
  );

  // Issue 2: Create virtual stub nodes at a fixed distance so the FBD always
  // has a consistent, readable scale regardless of actual truss dimensions.
  const STUB_DIST = 0.5; // units — chosen so the joint fills the SVG nicely
  const fbdNodes = [{ ...joint }];
  const memberForceArrows = [];

  for (const m of connTruss) {
    const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
    const other = nodes.find(n => n.id === otherId);
    if (!other) continue;
    const dx = other.x - joint.x;
    const dy = other.y - joint.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1e-12) continue;

    // Virtual stub at fixed distance in the member direction
    const stubId = `stub-${m.id}-${jointId}`;
    fbdNodes.push({
      id: stubId,
      x: joint.x + (dx / L) * STUB_DIST,
      y: joint.y + (dy / L) * STUB_DIST,
      label: '',
      loads: { fx: 0, fy: 0, moment: 0 },
      support: null,
    });

    memberForceArrows.push({
      nodeId: jointId,
      otherNodeId: stubId,
      label: `F_${m.startLabel}${m.endLabel}`,
    });
  }

  const isSupport = !!joint.support;

  // Reactions: if unknowns/solvedSoFar provided, show solved ones as numbers (green),
  // otherwise show all as variable names (white).
  let reactionItems = [];
  if (isSupport) {
    const nodeReactions = reactions.filter(r => r.nodeId === jointId);
    reactionItems = nodeReactions.map(r => {
      let isSolved = false;
      let value = 0;
      if (unknowns && solvedSoFar) {
        const idx = unknowns.findIndex(u => u.nodeId === r.nodeId && u.type === r.type);
        if (idx >= 0 && solvedSoFar[idx] !== undefined) {
          isSolved = true;
          value = r.value;
        }
      }
      return {
        nodeId: r.nodeId,
        type: r.type,
        label: getReactionLabel(r.label, r.type),
        value,
        mode: isSolved ? 'solved' : 'unknown',
      };
    });
  }

  return {
    nodes: fbdNodes,
    members: [], // no member lines — force arrows show the directions
    reactionItems,
    memberForceArrows,
    cutNodeIds: [],
    highlightNodeIds: new Set([jointId]),
    maxHeight: 280,
  };
}

// ── Truss >3 unknowns: phased reaction determination ───────────────

/**
 * Build the ΣFx equation display for a support joint where the horizontal
 * reaction is the sole unknown (all member forces already solved by the
 * Method of Joints).  Treats Rx as LHS unknown, all member forces as RHS knowns.
 */
function buildJointHorzEquationLatex(jointId, nodes, members, reactions, trussForces) {
  const joint = nodes.find(n => n.id === jointId);
  if (!joint) return [];

  const connTruss = members.filter(
    m => m.type === 'truss' && (m.startNodeId === jointId || m.endNodeId === jointId)
  );

  const rxnAtJoint = reactions.filter(r => r.nodeId === jointId);
  const rxn_x = rxnAtJoint.find(r => r.type === 'Rx');
  const rxn_y = rxnAtJoint.find(r => r.type === 'Ry');

  const rxLabel = rxn_x ? getReactionLabel(rxn_x.label, rxn_x.type) : 'R_x';
  const ryLabel = rxn_y ? getReactionLabel(rxn_y.label, rxn_y.type) : 'R_y';
  const ryVal   = rxn_y ? rxn_y.value : 0;
  const rxVal   = rxn_x ? rxn_x.value : 0;

  const eqLines = [];

  // Known values header
  eqLines.push('\\text{Known at this joint:}');
  eqLines.push('');
  const ryDir = getDirectionArrow(ryVal, 'Ry');
  eqLines.push(
    `${ryLabel} = ${fmt(Math.abs(ryVal))} \\text{ kN} \\; ${ryDir} \\text{ (from global } \\sum M\\text{)}`
  );
  eqLines.push('');

  // Member force contributions to ΣFx
  let memberXSum = 0;
  const memberContribLines = [];
  for (const m of connTruss) {
    const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
    const other = nodes.find(n => n.id === otherId);
    if (!other) continue;
    const dx = other.x - joint.x;
    const dy = other.y - joint.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    const cosA = dx / L;
    if (Math.abs(cosA) < 1e-10) continue;

    const tf = trussForces.find(tf => tf.memberId === m.id);
    if (!tf) continue;
    const xContrib = tf.force * cosA;
    memberXSum += xContrib;
    const typeStr = tf.force > 1e-4 ? 'T' : tf.force < -1e-4 ? 'C' : '0';
    const contribDir = xContrib >= 0 ? '\\rightarrow' : '\\leftarrow';
    const fLabel = `F_{${m.startLabel}${m.endLabel}}`;
    memberContribLines.push(
      `${fLabel} = ${fmt(Math.abs(tf.force))} \\text{ kN }(${typeStr}) \\Rightarrow` +
      ` ${fmt(Math.abs(xContrib))} \\text{ kN} \\; ${contribDir}`
    );
  }
  for (const line of memberContribLines) {
    eqLines.push(line);
    eqLines.push('');
  }

  // ΣFx equation
  const loadX = joint.loads?.fx || 0;
  const rhs = -(memberXSum + loadX);
  const rhsStr = fmt(Math.abs(rhs));
  const rxDir  = getDirectionArrow(rxVal, 'Rx');

  // Show equation: B_x + member contributions + load = 0
  const memberSignStr = memberXSum >= 0
    ? `+ ${fmt(Math.abs(memberXSum))}`
    : `- ${fmt(Math.abs(memberXSum))}`;
  const loadStr = Math.abs(loadX) > 1e-10
    ? (loadX > 0 ? ` + ${fmt(loadX)}` : ` - ${fmt(Math.abs(loadX))}`)
    : '';

  eqLines.push(`\\sum F_x = 0 \\text{ at joint ${joint.label}}:`);
  eqLines.push('');
  eqLines.push(`\\quad ${rxLabel} ${memberSignStr}${loadStr} = 0`);
  eqLines.push('');
  eqLines.push(`\\quad ${rxLabel} = ${rhsStr} \\text{ kN} \\; ${rxDir}`);

  return eqLines;
}

/**
 * For an inclined-span truss: show BOTH ΣFy and ΣFx at the primary support
 * joint, treating both reactions as unknowns (all member forces are known from
 * the preceding method-of-joints analysis).
 */
function buildJointBothReactionsLatex(jointId, nodes, members, reactions, trussForces) {
  const joint = nodes.find(n => n.id === jointId);
  if (!joint) return [];

  const connTruss = members.filter(
    m => m.type === 'truss' && (m.startNodeId === jointId || m.endNodeId === jointId)
  );

  const rxnAtJoint = reactions.filter(r => r.nodeId === jointId);
  const rxn_x = rxnAtJoint.find(r => r.type === 'Rx');
  const rxn_y = rxnAtJoint.find(r => r.type === 'Ry');
  const rxLabel = rxn_x ? getReactionLabel(rxn_x.label, rxn_x.type) : 'R_x';
  const ryLabel = rxn_y ? getReactionLabel(rxn_y.label, rxn_y.type) : 'R_y';
  const rxVal   = rxn_x ? rxn_x.value : 0;
  const ryVal   = rxn_y ? rxn_y.value : 0;

  const eqLines = [];
  eqLines.push('\\text{All member forces at this joint now known. Applying joint equilibrium:}');
  eqLines.push('');

  // Compute member x and y contributions
  let memberXSum = 0, memberYSum = 0;
  for (const m of connTruss) {
    const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
    const other = nodes.find(n => n.id === otherId);
    if (!other) continue;
    const dx = other.x - joint.x;
    const dy = other.y - joint.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    const tf = trussForces.find(tf => tf.memberId === m.id);
    if (!tf) continue;
    memberXSum += tf.force * (dx / L);
    memberYSum += tf.force * (dy / L);
  }

  const loadX = joint.loads?.fx || 0;
  const loadY = joint.loads?.fy || 0;

  // ΣFy → R_y
  const rhsY   = -(memberYSum + loadY);
  const ryDir  = getDirectionArrow(ryVal, 'Ry');
  const mYSign = memberYSum >= 0 ? `+ ${fmt(Math.abs(memberYSum))}` : `- ${fmt(Math.abs(memberYSum))}`;
  const lYStr  = Math.abs(loadY) > 1e-10 ? (loadY > 0 ? ` + ${fmt(loadY)}` : ` - ${fmt(Math.abs(loadY))}`) : '';
  eqLines.push(`\\sum F_y = 0 \\text{ at joint ${joint.label}}:`);
  eqLines.push('');
  eqLines.push(`\\quad ${ryLabel} ${mYSign}${lYStr} = 0`);
  eqLines.push('');
  eqLines.push(`\\quad ${ryLabel} = ${fmt(Math.abs(rhsY))} \\text{ kN} \\; ${ryDir}`);
  eqLines.push('');

  // ΣFx → R_x
  const rhsX   = -(memberXSum + loadX);
  const rxDir  = getDirectionArrow(rxVal, 'Rx');
  const mXSign = memberXSum >= 0 ? `+ ${fmt(Math.abs(memberXSum))}` : `- ${fmt(Math.abs(memberXSum))}`;
  const lXStr  = Math.abs(loadX) > 1e-10 ? (loadX > 0 ? ` + ${fmt(loadX)}` : ` - ${fmt(Math.abs(loadX))}`) : '';
  eqLines.push(`\\sum F_x = 0 \\text{ at joint ${joint.label}}:`);
  eqLines.push('');
  eqLines.push(`\\quad ${rxLabel} ${mXSign}${lXStr} = 0`);
  eqLines.push('');
  eqLines.push(`\\quad ${rxLabel} = ${fmt(Math.abs(rhsX))} \\text{ kN} \\; ${rxDir}`);

  return eqLines;
}

/**
 * Start with the joint that has the fewest unknown member forces (≤ 2),
 * cascade as forces become known, stop when all done.
 */
function buildTrussJointOrder(pureTrussJoints, trussMembers, nodes, reactions, initialKnownIds) {
  const knownIds = new Set(initialKnownIds); // member IDs whose forces are known
  const remaining = new Set(pureTrussJoints);
  const order = [];

  // Helper: count unknown members at a joint
  function unknownCount(jointId) {
    return trussMembers.filter(
      m => (m.startNodeId === jointId || m.endNodeId === jointId) && !knownIds.has(m.id)
    ).length;
  }

  // Helper: does a joint have at least one "driving" known
  // (a reaction, applied load, or previously solved member force)?
  function hasKnown(jointId) {
    const node = nodes.find(n => n.id === jointId);
    if (!node) return false;
    if (reactions.some(r => r.nodeId === jointId)) return true;
    if (Math.abs(node.loads?.fx || 0) > 1e-10) return true;
    if (Math.abs(node.loads?.fy || 0) > 1e-10) return true;
    // Any previously solved (known) member at this joint?
    return trussMembers.some(
      m => (m.startNodeId === jointId || m.endNodeId === jointId) && knownIds.has(m.id)
    );
  }

  let maxPasses = pureTrussJoints.length + 1;
  while (remaining.size > 0 && maxPasses-- > 0) {
    // Find the joint with the fewest unknowns (≤ 2) that has at least one known
    let best = null;
    let bestCount = 3;

    for (const jid of remaining) {
      const unk = unknownCount(jid);
      if (unk <= 2 && hasKnown(jid) && unk < bestCount) {
        bestCount = unk;
        best = jid;
        if (unk === 0) break; // can't do better
      }
    }

    if (!best) {
      // No solvable joint found — add remaining in original order (shouldn't happen)
      for (const jid of remaining) order.push(jid);
      break;
    }

    order.push(best);
    remaining.delete(best);

    // Mark the members at this joint as known
    for (const m of trussMembers) {
      if (m.startNodeId === best || m.endNodeId === best) {
        knownIds.add(m.id);
      }
    }

    // Fix 9: stop when all member forces are known
    const allKnown = trussMembers.every(m => knownIds.has(m.id));
    if (allKnown) break;
  }

  return order;
}

/**
 * Build truss joint steps with all fixes applied.
 */
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

  // Zero-force member step (Fix 6: no DOF formula in notes)
  const zeroForces = trussForces.filter(tf => tf.isZeroForceMember && Math.abs(tf.force) < 1e-10);
  const knownMemberIds = new Set();

  if (zeroForces.length > 0) {
    const zeroEqs = zeroForces.map(tf =>
      `F_{${tf.startLabel}${tf.endLabel}} = 0 \\quad \\text{(zero-force member)}`
    );
    steps.push({
      title: 'Zero-Force Member Identification',
      fbd: null,
      equations: zeroEqs,
      notes: 'These members carry no force under the current loading.',
    });
    for (const tf of zeroForces) knownMemberIds.add(tf.memberId);
  }

  // Fix 9: determine joint solving order (fewest unknowns first)
  const jointOrder = buildTrussJointOrder(
    pureTrussJoints, trussMembers, nodes, reactions, knownMemberIds
  );

  // Track which step index each member was solved in (for Fix 11 "Known" references)
  const memberSolvedAtLabel = new Map(); // memberId → "Joint X"
  for (const tf of zeroForces) {
    memberSolvedAtLabel.set(tf.memberId, 'zero-force');
  }

  // Build joint steps in determined order
  const jointSteps = [];
  const solvedMemberIds = new Set(knownMemberIds);

  for (const jointId of jointOrder) {
    const joint = nodes.find(n => n.id === jointId);
    if (!joint) continue;

    const connTruss = trussMembers.filter(
      m => m.startNodeId === jointId || m.endNodeId === jointId
    );

    const tfAtJoint = trussForces.filter(tf =>
      connTruss.some(m => m.id === tf.memberId)
    );

    // Count unknowns at this joint BEFORE solving (Fix 6, Fix 11)
    const unknownMembers = connTruss.filter(m => !solvedMemberIds.has(m.id));
    const unknownCount = unknownMembers.length;

    const eqLines = [];

    // Issue 2: Known forces — each on its own line (separate display blocks)
    const allKnownItems = [];
    for (const r of reactions) {
      if (r.nodeId !== jointId) continue;
      allKnownItems.push(
        `${getReactionLabel(r.label, r.type)} = ${fmt(Math.abs(r.value))} \\text{ kN (from reactions)}`
      );
    }
    for (const m of connTruss) {
      if (!solvedMemberIds.has(m.id)) continue;
      const tf = trussForces.find(tf => tf.memberId === m.id);
      if (!tf) continue;
      const typeStr = tf.force > 0.001 ? 'T' : tf.force < -0.001 ? 'C' : 'zero';
      const src = memberSolvedAtLabel.get(m.id) || 'previous';
      allKnownItems.push(
        `F_{${tf.startLabel}${tf.endLabel}} = ${fmt(Math.abs(tf.force))} \\text{ kN } (${typeStr},\\; ${src})`
      );
    }

    if (allKnownItems.length > 0) {
      eqLines.push('\\text{Known:}');
      eqLines.push('');
      for (const item of allKnownItems) {
        eqLines.push(item);
        eqLines.push('');
      }
    }

    // Unknowns — own block
    const unknownLabels = unknownMembers.map(m => `F_{${m.startLabel}${m.endLabel}}`).join(',\\; ');
    if (unknownLabels) {
      eqLines.push(`\\text{Unknowns: } ${unknownLabels}`);
      eqLines.push('');
    }

    // Solvability note — own block (no DOF formula)
    eqLines.push(`\\text{${unknownCount} unknown${unknownCount !== 1 ? 's' : ''}, 2 equations — solvable}`);
    eqLines.push('');

    // Issue 6: component definitions — each on its own block
    for (const m of connTruss) {
      const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
      const other = nodes.find(n => n.id === otherId);
      if (!other) continue;
      const dx = other.x - joint.x;
      const dy = other.y - joint.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      if (L < 1e-12) continue;

      const isInclined = Math.abs(dx) > 1e-10 && Math.abs(dy) > 1e-10;
      if (!isInclined) continue;

      const xSign = dx > 0 ? '' : '-';
      const ySign = dy > 0 ? '' : '-';
      const baseLabel = `${m.startLabel}${m.endLabel}`;
      const xLbl = `F_{${baseLabel},x}`;
      const yLbl = `F_{${baseLabel},y}`;
      const forceLbl = `F_{${baseLabel}}`;
      eqLines.push(`${xLbl} = ${xSign}${geoFracStr(dx, L)}\\, ${forceLbl}`);
      eqLines.push('');
      eqLines.push(`${yLbl} = ${ySign}${geoFracStr(dy, L)}\\, ${forceLbl}`);
      eqLines.push('');
    }

    // Issue 5: ΣFx = 0 — name, equation, solve step each as own block
    let fxTerms = [];
    let fxRhs = -(joint.loads?.fx || 0);
    for (const r of reactions) {
      if (r.nodeId !== jointId) continue;
      if (r.type === 'Rx') fxRhs -= r.value;
    }
    // Collect unknown F terms; known forces go to RHS
    for (const m of connTruss) {
      const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
      const other = nodes.find(n => n.id === otherId);
      if (!other) continue;
      const dx = other.x - joint.x;
      const dy = other.y - joint.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      const cosA = dx / L;
      if (Math.abs(cosA) < 1e-10) continue;
      const lbl = `F_{${m.startLabel}${m.endLabel}}`;
      const isInclined = Math.abs(dx) > 1e-10 && Math.abs(dy) > 1e-10;
      if (solvedMemberIds.has(m.id)) {
        const tf = trussForces.find(tf => tf.memberId === m.id);
        if (tf) fxRhs -= tf.force * cosA;
      } else if (isInclined) {
        const sign = cosA > 0 ? (fxTerms.length > 0 ? '+' : '') : '-';
        fxTerms.push(`${sign} ${geoFracStr(dx, L)}\\, ${lbl}`);
      } else {
        const sign = cosA > 0 ? (fxTerms.length > 0 ? '+' : '') : '-';
        fxTerms.push(`${sign} ${lbl}`);
      }
    }
    if (fxTerms.length > 0) {
      eqLines.push('\\sum F_x = 0:');
      eqLines.push('');
      eqLines.push(`${fxTerms.join(' ')} = ${fmt(fxRhs)}`);
      eqLines.push('');
      // Solve step: if 1 unknown, show the solved value
      if (unknownMembers.length === 1) {
        const m = unknownMembers[0];
        if (fxTerms.length === 1) {
          const tf = trussForces.find(tf => tf.memberId === m.id);
          if (tf) {
            const sign = tf.force > 0.001 ? '\\text{(T)}' : tf.force < -0.001 ? '\\text{(C)}' : '\\text{(zero)}';
            eqLines.push(`F_{${tf.startLabel}${tf.endLabel}} = ${fmt(Math.abs(tf.force))} \\text{ kN} \\; ${sign}`);
            eqLines.push('');
          }
        }
      }
    }

    // Issue 5: ΣFy = 0 — same pattern
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
      const dx = other.x - joint.x;
      const dy = other.y - joint.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      const sinA = dy / L;
      if (Math.abs(sinA) < 1e-10) continue;
      const lbl = `F_{${m.startLabel}${m.endLabel}}`;
      const isInclined = Math.abs(dx) > 1e-10 && Math.abs(dy) > 1e-10;
      if (solvedMemberIds.has(m.id)) {
        const tf = trussForces.find(tf => tf.memberId === m.id);
        if (tf) fyRhs -= tf.force * sinA;
      } else if (isInclined) {
        const sign = sinA > 0 ? (fyTerms.length > 0 ? '+' : '') : '-';
        fyTerms.push(`${sign} ${geoFracStr(dy, L)}\\, ${lbl}`);
      } else {
        const sign = sinA > 0 ? (fyTerms.length > 0 ? '+' : '') : '-';
        fyTerms.push(`${sign} ${lbl}`);
      }
    }
    if (fyTerms.length > 0) {
      eqLines.push('\\sum F_y = 0:');
      eqLines.push('');
      eqLines.push(`${fyTerms.join(' ')} = ${fmt(fyRhs)}`);
      eqLines.push('');
      // Solve step for remaining unknown
      const stillUnknown = unknownMembers.filter(m => {
        const dx = (nodes.find(n => n.id === (m.startNodeId === jointId ? m.endNodeId : m.startNodeId))?.x || 0) - joint.x;
        const dy2 = (nodes.find(n => n.id === (m.startNodeId === jointId ? m.endNodeId : m.startNodeId))?.y || 0) - joint.y;
        const L2 = Math.sqrt(dx*dx + dy2*dy2);
        return L2 > 1e-12 && Math.abs(dy2 / L2) > 1e-10;
      });
      if (stillUnknown.length === 1 && fyTerms.length === 1) {
        const m = stillUnknown[0];
        const tf = trussForces.find(tf => tf.memberId === m.id);
        if (tf) {
          const sign = tf.force > 0.001 ? '\\text{(T)}' : tf.force < -0.001 ? '\\text{(C)}' : '\\text{(zero)}';
          eqLines.push(`F_{${tf.startLabel}${tf.endLabel}} = ${fmt(Math.abs(tf.force))} \\text{ kN} \\; ${sign}`);
          eqLines.push('');
        }
      }
    }

    // Results summary for all unknowns at this joint
    eqLines.push('\\text{Results:}');
    eqLines.push('');
    for (const m of unknownMembers) {
      const tf = trussForces.find(tf => tf.memberId === m.id);
      if (!tf) continue;
      const sign = tf.force > 0.001 ? '\\text{(T)}' : tf.force < -0.001 ? '\\text{(C)}' : '\\text{(zero)}';
      eqLines.push(`F_{${tf.startLabel}${tf.endLabel}} = ${fmt(Math.abs(tf.force))} \\text{ kN} \\; ${sign}`);
      eqLines.push('');
    }

    // Clean trailing empty lines
    while (eqLines.length > 0 && eqLines[eqLines.length - 1] === '') eqLines.pop();

    // Build the FBD for this joint (Fix 10)
    const fbd = buildTrussJointFBD(jointId, nodes, members, reactions);

    // Mark this joint's members as solved and record where
    for (const m of connTruss) {
      solvedMemberIds.add(m.id);
      if (!memberSolvedAtLabel.has(m.id)) {
        memberSolvedAtLabel.set(m.id, `Joint ${joint.label || jointId}`);
      }
    }

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
      notes: 'Solving each truss joint starting with fewest unknowns:',
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

/**
 * Fix 7: Resultant Support Reactions step — second-to-last, full FBD with solved values.
 * For truss structures, passes memberClassifications so members are colored T/C.
 */
function buildResultantReactionsStep(nodes, members, unknowns, reactions, trussForces) {
  const solvedAll = Object.fromEntries(unknowns.map((_, i) => [i, reactions[i]?.value ?? 0]));
  const reactionItems = buildReactionItems(unknowns, reactions, solvedAll);

  // Issue 3: build member color map from truss forces
  const hasTruss = members.some(m => m.type === 'truss');
  let memberClassifications = null;
  let showLegend = false;
  if (hasTruss && trussForces && trussForces.length > 0) {
    memberClassifications = {};
    for (const tf of trussForces) {
      memberClassifications[tf.memberId] = tf.classification;
    }
    showLegend = true;
  }

  // Issue 1/5: each reaction on its own display block (separated by '')
  const eqLines = reactions.flatMap((r, i) => {
    const label = getReactionLabel(r.label, r.type);
    const dir = getDirectionArrow(r.value, r.type);
    const unit = r.type === 'M' ? '\\text{ kN·m}' : '\\text{ kN}';
    const line = `${label} = ${fmt(Math.abs(r.value))} ${unit} \\; ${dir}`;
    return i < reactions.length - 1 ? [line, ''] : [line];
  });

  return {
    title: 'Resultant Support Reactions',
    fbd: { nodes, members, reactionItems, memberClassifications, showLegend, cutNodeIds: [], highlightNodeIds: null },
    equations: eqLines,
    notes: null,
  };
}

/** Verification step — Issue 1: each check on its own display block */
function buildVerificationStep(verification, reactions) {
  if (!verification || verification.length === 0) {
    return {
      title: 'Verification',
      fbd: null,
      equations: reactions.flatMap((r, i) => {
        const label = getReactionLabel(r.label, r.type);
        const dir = getDirectionArrow(r.value, r.type);
        const line = `${label} = ${fmt(Math.abs(r.value))} \\text{ kN} \\; ${dir}`;
        return i < reactions.length - 1 ? [line, ''] : [line];
      }),
      notes: 'All support reactions solved.',
    };
  }

  const allPass = verification.every(v => v.pass);
  // Issue 1: each verification line separated by '' → its own display block
  const eqLines = verification.flatMap((v, i) => {
    const line = `${v.equation} \\quad \\Rightarrow \\quad ${fmt(v.residual)} \\approx 0 \\; ${v.pass ? '\\checkmark' : '\\times'}`;
    return i < verification.length - 1 ? [line, ''] : [line];
  });

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

    if (!solvingSteps || solvingSteps.length === 0) {
      // No solving steps available — show reactions directly
      steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions));
      steps.push({
        title: 'Support Reactions',
        fbd: null,
        equations: reactions.flatMap((r, i) => {
          const label = getReactionLabel(r.label, r.type);
          const dir = getDirectionArrow(r.value, r.type);
          const line = `${label} = ${fmt(Math.abs(r.value))} \\text{ kN} \\; ${dir}`;
          return i < reactions.length - 1 ? [line, ''] : [line];
        }),
        notes: 'Reactions solved from the full joint equilibrium system.',
      });
      const trussSteps = buildTrussSteps(nodes, members, trussForces || [], reactions);
      steps.push(...trussSteps);

    } else if (unknowns.length > 3 && solvingSteps[0]?.type === 'global') {
      // ═══ PURE TRUSS WITH >3 UNKNOWNS — SUB-STRUCTURE PARTITION METHOD ═══
      // Presents 4 equations (3 global + 1 sub-structure ΣM) as a simultaneous
      // system. NEVER solves 2 unknowns from 1 equation.

      const globalStep = solvingSteps[0];
      const kf = globalStep.knownForces || [];

      // 1. Find optimal partition joint
      const cutJoint = findOptimalPartitionJoint(nodes, members, unknowns);

      // Step 1: Global FBD with partition note
      steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions, cutJoint?.label));

      if (cutJoint) {
        // 2. Partition the graph at the cut joint
        const sides = getGraphComponents(cutJoint.id, nodes, members);

        // Determine which side is "primary" (fewer support reaction unknowns)
        let sideAIds, sideBIds;
        if (sides.length >= 2) {
          const count0 = unknowns.filter(u => sides[0].has(u.nodeId)).length;
          const count1 = unknowns.filter(u => sides[1].has(u.nodeId)).length;
          if (count0 <= count1) {
            sideAIds = sides[0];
            sideBIds = sides[1];
          } else {
            sideAIds = sides[1];
            sideBIds = sides[0];
          }
        } else {
          sideAIds = sides[0] || new Set();
          sideBIds = new Set();
        }

        const sideALabel = buildSideLabel(sideAIds, cutJoint, nodes);
        const sideBLabel = buildSideLabel(sideBIds, cutJoint, nodes);

        const sideAReactionCount = unknowns.filter(u => sideAIds.has(u.nodeId)).length;

        const sideAReactionLabels = unknowns
          .filter(u => sideAIds.has(u.nodeId))
          .map(u => getReactionLabel(u.label, u.type))
          .join(', ');
        const sideBReactionLabels = unknowns
          .filter(u => sideBIds.has(u.nodeId))
          .map(u => getReactionLabel(u.label, u.type))
          .join(', ');

        // Filter known forces for each side
        const sideAKnownForces = filterKnownForcesToSide(kf, sideAIds, cutJoint.id, nodes, true);
        const sideBKnownForces = filterKnownForcesToSide(kf, sideBIds, cutJoint.id, nodes, false);

        const sideAHighlight = new Set([...sideAIds, cutJoint.id]);
        const sideBHighlight = new Set([...sideBIds, cutJoint.id]);

        const cutLabel = cutJoint.label;

        // ── Step 2: Sub-structure Left — FBD ──
        const sideAReactionItems = buildReactionItems(unknowns, reactions, null)
          .filter(r => sideAIds.has(r.nodeId));
        const cutForceItemsA = [
          { nodeId: cutJoint.id, type: 'Rx', label: `${cutLabel}_x`, value: 0, mode: 'unknown' },
          { nodeId: cutJoint.id, type: 'Ry', label: `${cutLabel}_y`, value: 0, mode: 'unknown' },
        ];

        steps.push({
          title: `Sub-structure: ${sideALabel} — FBD`,
          fbd: {
            nodes, members,
            reactionItems: [...sideAReactionItems, ...cutForceItemsA],
            cutNodeIds: [cutJoint.id],
            highlightNodeIds: sideAHighlight,
          },
          equations: [],
          notes: `Sub-structure has ${sideAReactionCount + 2} unknowns ` +
                 `(${sideAReactionLabels}, ${cutLabel}_x, ${cutLabel}_y), ` +
                 `3 equations. Taking ΣM about ${cutLabel} eliminates ` +
                 `${cutLabel}_x and ${cutLabel}_y (zero moment arm) — ` +
                 `1 equation relating ${sideAReactionLabels}.`,
        });

        // ── Step 3: Sub-structure Right — FBD ──
        const sideBReactionItems = buildReactionItems(unknowns, reactions, null)
          .filter(r => sideBIds.has(r.nodeId));
        const cutForceItemsB = [
          { nodeId: cutJoint.id, type: 'Rx', label: `${cutLabel}_x`, value: 0, mode: 'unknown' },
          { nodeId: cutJoint.id, type: 'Ry', label: `${cutLabel}_y`, value: 0, mode: 'unknown' },
        ];

        steps.push({
          title: `Sub-structure: ${sideBLabel} — FBD`,
          fbd: {
            nodes, members,
            reactionItems: [...sideBReactionItems, ...cutForceItemsB],
            cutNodeIds: [cutJoint.id],
            highlightNodeIds: sideBHighlight,
          },
          equations: [],
          notes: `Internal forces at ${cutLabel} act in opposite direction (Newton's 3rd law). ` +
                 `ΣM about ${cutLabel} → 1 equation relating ${sideBReactionLabels}.`,
        });

        // ── Step 4: Equilibrium Equations — 4 Equations, 4 Unknowns ──
        // Gather the 3 global equations and build the sub-structure equation
        const globalEqs = globalStep.equations;
        const globalMomentEq = globalEqs.find(eq => eq.type === 'moment');
        const globalFxEq = globalEqs.find(eq => eq.type === 'force-x');
        const globalFyEq = globalEqs.find(eq => eq.type === 'force-y');
        const subMomentEq = buildSubMomentEquation(cutJoint, sideAIds, nodes, unknowns, sideAKnownForces);

        // Present in order: global ΣM, sub ΣM, ΣFx, ΣFy
        const systemEquations = [globalMomentEq, subMomentEq, globalFxEq, globalFyEq].filter(Boolean);

        // Build variable-form lines for each equation
        const systemLines = [];
        for (let eqIdx = 0; eqIdx < systemEquations.length; eqIdx++) {
          const eq = systemEquations[eqIdx];
          const eqKf = eq.type === 'sub-moment' ? sideAKnownForces : kf;
          // Show each equation in variable form (no solved values)
          const lines = buildEquationLatex(eq, unknowns, reactions, {}, eqKf);
          const eqNum = eqIdx + 1;
          // Prepend equation number to the first line
          if (lines.length > 0) {
            lines[0] = `\\text{Eq ${eqNum}: } ${lines[0]}`;
          }
          systemLines.push(...lines, '');
        }
        while (systemLines.length > 0 && systemLines[systemLines.length - 1] === '') systemLines.pop();

        steps.push({
          title: `Equilibrium Equations — ${systemEquations.length} Equations, ${unknowns.length} Unknowns`,
          fbd: null,
          equations: systemLines,
          notes: `${systemEquations.length} independent equations, ${unknowns.length} unknowns — solvable. ` +
                 `Solving simultaneously:`,
        });

        // ── Step 5: Solving the System ──
        const solveLines = buildSimultaneousSolveLatex(
          systemEquations, unknowns, reactions, kf, sideAKnownForces, sideAIds
        );

        steps.push({
          title: 'Solving the System',
          fbd: null,
          equations: solveLines,
          notes: null,
        });

        // ── Step 6: Verification — Full Equations with Numbers ──
        const verifyLines = buildFullEquationVerification(
          systemEquations, unknowns, reactions, kf, sideAKnownForces
        );

        steps.push({
          title: 'Verification',
          fbd: null,
          equations: verifyLines,
          notes: 'All equilibrium equations verified with solved values.',
        });

      } else {
        // Fallback if no valid partition joint found
        steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions));
      }

      // Method of Joints steps
      const trussStepsRaw = buildTrussSteps(nodes, members, trussForces || [], reactions);
      const summaryStp = trussStepsRaw.find(s => s.trussTable);
      const preJointSteps = trussStepsRaw.filter(s => !s.trussTable);
      steps.push(...preJointSteps);

      // Member forces summary — after all reaction steps
      if (summaryStp) steps.push(summaryStp);

    } else if (solvingSteps[0]?.type === 'global') {
      // ≤3 unknowns: direct solve from global equations
      steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions));
      const directSteps = buildDirectSolveSteps(solvingSteps[0], unknowns, reactions);
      steps.push(...directSteps);
      const trussSteps = buildTrussSteps(nodes, members, trussForces || [], reactions);
      steps.push(...trussSteps);

    } else {
      // Fallback
      steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions));
      const subSteps = buildSubStructureSteps(solvingSteps, unknowns, reactions, nodes, members);
      steps.push(...subSteps);
      const trussSteps = buildTrussSteps(nodes, members, trussForces || [], reactions);
      steps.push(...trussSteps);
    }

  } else if (hasTruss && hasFrame) {
    // ── Mixed frame + truss ─────────────────────────────────────────
    steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions));
    const frameEqSteps = buildMixedFrameEquationSteps(solverResults, unknowns, reactions);
    steps.push(...frameEqSteps);
    if (trussForces && trussForces.length > 0) {
      const trussSteps = buildTrussSteps(nodes, members, trussForces, reactions);
      steps.push(...trussSteps);
    }

  } else {
    // ── Pure frame ─────────────────────────────────────────────────
    // Fix 8: always variable names in step 0
    steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions));

    if (!solvingSteps || solvingSteps.length === 0) {
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
      const directSteps = buildDirectSolveSteps(solvingSteps[0], unknowns, reactions);
      steps.push(...directSteps);
    } else {
      const subSteps = buildSubStructureSteps(solvingSteps, unknowns, reactions, nodes, members);
      steps.push(...subSteps);
    }

    if (trussForces && trussForces.length > 0) {
      const trussSteps = buildTrussSteps(nodes, members, trussForces, reactions);
      steps.push(...trussSteps);
    }
  }

  // Fix 7: Resultant Support Reactions — second-to-last step (before verification)
  steps.push(buildResultantReactionsStep(nodes, members, unknowns, reactions, trussForces));

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
    return { text: `Pure truss — joint equilibrium system for reactions, then method of joints for member forces` };
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
