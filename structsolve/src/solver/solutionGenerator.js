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

// ── Fix 5: Equation layout helpers ────────────────────────────────

/**
 * Build LaTeX lines for a single equilibrium equation.
 * Each part (name, symbolic, result) is its own line — Fix 5.
 * Inclined forces use geometric fractions — Fix 4.
 */
function buildEquationLatex(eq, unknowns, reactions, solvedSoFar) {
  const lines = [];
  const n = unknowns.length;

  const activeIndices = [];
  for (let i = 0; i < n; i++) {
    if (Math.abs(eq.coefficients[i]) < 1e-10) continue;
    if (solvedSoFar && solvedSoFar[i] !== undefined) continue;
    activeIndices.push(i);
  }

  // Fix 5: equation name on its own line
  const header = eq.description || '\\text{Equation}';

  if (activeIndices.length === 0) {
    lines.push(`${header} \\checkmark`);
    return lines;
  }

  // Line 1 — equation name (Fix 5)
  lines.push(header + ':');

  // Build LHS terms
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

  // Build RHS
  let adjustedRhs = eq.rhs;
  if (solvedSoFar) {
    for (let i = 0; i < n; i++) {
      if (solvedSoFar[i] !== undefined) {
        adjustedRhs -= eq.coefficients[i] * solvedSoFar[i];
      }
    }
  }
  const rhsStr = fmt(adjustedRhs);

  // Line 2 — symbolic equation (Fix 5)
  lines.push(`${lhsStr} = ${rhsStr}`);

  // Line 3 — result (Fix 5)
  for (const i of activeIndices) {
    const u = unknowns[i];
    const rxn = reactions.find(r => r.nodeId === u.nodeId && r.type === u.type);
    const value = rxn ? rxn.value : 0;
    const label = getReactionLabel(u.label, u.type);
    const dir = getDirectionArrow(value, u.type);

    if (activeIndices.length === 1) {
      const coeff = eq.coefficients[i];
      if (Math.abs(Math.abs(coeff) - 1) > 1e-6) {
        lines.push(`${label} = \\dfrac{${rhsStr}}{${fmt(coeff)}} = ${fmt(value)} \\text{ kN} \\; ${dir}`);
      } else {
        lines.push(`${label} = ${fmt(value)} \\text{ kN} \\; ${dir}`);
      }
    } else {
      lines.push(`${label} = ${fmt(Math.abs(value))} \\text{ kN} \\; ${dir}`);
    }
  }

  return lines;
}

// ── Step builders ──────────────────────────────────────────────────

/**
 * Step 0: Global Free Body Diagram — ALWAYS variable names only (Fix 8).
 */
function buildGlobalFBDStep(nodes, members, unknowns, reactions) {
  // Always mode='unknown' so only variable names shown (Fix 8)
  const reactionItems = buildReactionItems(unknowns, reactions, null);

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
 * Direct solve path (≤ 3 unknowns): one step per equation (Fix 5 layout).
 */
function buildDirectSolveSteps(solvingStep, unknowns, reactions) {
  if (!solvingStep || !solvingStep.equations) return [];
  const steps = [];
  const solvedSoFar = {};
  const ordered = reorderEquations(solvingStep.equations);

  for (let i = 0; i < ordered.length; i++) {
    const eq = ordered[i];
    // Fix 5: each equation name, symbolic, result on separate lines
    const eqLines = buildEquationLatex(eq, unknowns, reactions, solvedSoFar);

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
 */
function buildSubStructureSteps(solvingSteps, unknowns, reactions, nodes, members) {
  const steps = [];
  const solvedSoFar = {};

  for (const solvingStep of solvingSteps) {
    if (solvingStep.type === 'sub-structure') {
      const hingeId = solvingStep.hingeNode?.id;
      const sideNodeIds = solvingStep.side?.nodeIds || new Set();

      const subFBD = {
        nodes,
        members,
        reactionItems: buildReactionItems(unknowns, reactions, solvedSoFar),
        cutNodeIds: hingeId ? [hingeId] : [],
        highlightNodeIds: sideNodeIds.size > 0 ? sideNodeIds : null,
      };

      const targetIndices = solvingStep.solvedIndices || [];

      steps.push({
        title: `Sub-structure ${solvingStep.sideLabel || ''} — FBD`,
        fbd: subFBD,
        equations: [],
        notes: hingeId
          ? `Cut at hinge ${solvingStep.hingeNode.label}. Taking moment about the hinge eliminates internal forces at the cut.`
          : null,
      });

      if (solvingStep.equations && solvingStep.equations.length > 0) {
        const ordered = reorderEquations(solvingStep.equations);
        const eqLines = [];
        for (const eq of ordered) {
          // Fix 5: separate lines
          eqLines.push(...buildEquationLatex(eq, unknowns, reactions, solvedSoFar));
          eqLines.push('');
        }
        while (eqLines.length > 0 && eqLines[eqLines.length - 1] === '') eqLines.pop();

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
        for (const idx of targetIndices) {
          const rxn = reactions.find(r => r.nodeId === unknowns[idx].nodeId && r.type === unknowns[idx].type);
          if (rxn) solvedSoFar[idx] = rxn.value;
        }
      }

    } else if (solvingStep.type === 'global') {
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

function buildMixedFrameEquationSteps(solverResults, unknowns, reactions) {
  const { equations } = solverResults;
  if (!equations || equations.length === 0) return [];

  const globalEqs = equations.filter(e =>
    ['force-x', 'force-y', 'moment'].includes(e.type)
  );
  if (globalEqs.length === 0) return [];

  const ordered = reorderEquations(globalEqs);
  const solvedSoFar = {};
  const eqLines = [];

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
function buildTrussJointFBD(jointId, nodes, members, reactions) {
  const joint = nodes.find(n => n.id === jointId);
  if (!joint) return null;

  const connTruss = members.filter(
    m => m.type === 'truss' && (m.startNodeId === jointId || m.endNodeId === jointId)
  );

  // Include far-end nodes for direction computation and member line drawing
  const jointNodes = [joint];
  for (const m of connTruss) {
    const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
    const other = nodes.find(n => n.id === otherId);
    if (other && !jointNodes.find(n => n.id === other.id)) jointNodes.push(other);
  }

  const isSupport = !!joint.support;

  // Fix 10: reactions always shown as VARIABLE NAMES (mode='unknown')
  let reactionItems = [];
  if (isSupport) {
    const nodeReactions = reactions.filter(r => r.nodeId === jointId);
    reactionItems = nodeReactions.map(r => ({
      nodeId: r.nodeId,
      type: r.type,
      label: getReactionLabel(r.label, r.type),
      value: 0,
      mode: 'unknown', // always variable names in joint FBD (Fix 10)
    }));
  }

  // Fix 10: member forces as arrows with variable names (tension = away from joint)
  const memberForceArrows = connTruss.map(m => {
    const otherId = m.startNodeId === jointId ? m.endNodeId : m.startNodeId;
    // Plain text label for SVG rendering
    return {
      nodeId: jointId,
      otherNodeId: otherId,
      label: `F_${m.startLabel}${m.endLabel}`,
    };
  });

  return {
    nodes: jointNodes,
    // Fix 10: support nodes isolated — no member lines
    members: isSupport ? [] : connTruss,
    reactionItems,
    memberForceArrows,
    cutNodeIds: [],
    highlightNodeIds: new Set([jointId]),
    maxHeight: 220,
  };
}

/**
 * Fix 9: Determine the order in which to solve truss joints.
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
      const lbl = `F_{${m.startLabel}${m.endLabel}}`;
      eqLines.push(`${lbl}_{,x} = ${xSign}${geoFracStr(dx, L)}\\, ${lbl}`);
      eqLines.push('');
      eqLines.push(`${lbl}_{,y} = ${ySign}${geoFracStr(dy, L)}\\, ${lbl}`);
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
    // Fix 8: Step 0 always shows variable names only
    steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions));

    // Support reactions summary — Issue 5: each on its own display block
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
