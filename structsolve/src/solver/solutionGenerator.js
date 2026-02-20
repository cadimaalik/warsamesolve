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
function buildGlobalFBDStep(nodes, members, unknowns, reactions) {
  const reactionItems = buildReactionItems(unknowns, reactions, null);
  const unknownLabels = unknowns.map(u => getReactionLabel(u.label, u.type)).join(', ');
  const n = unknowns.length;

  const isPureTruss = members.length > 0 && members.every(m => m.type === 'truss');

  let notes;
  if (n <= 3) {
    notes = `${n} unknown${n !== 1 ? 's' : ''} (${unknownLabels}), 3 global equations → direct solution.`;
  } else if (isPureTruss) {
    // For a pure truss with > 3 unknowns (e.g. two pin supports), the joint
    // equilibrium system provides enough equations.  For the support reactions
    // specifically, taking moments about each support gives one independent
    // equation per support, reaching n equations total.
    notes =
      `${n} unknowns (${unknownLabels}). ` +
      `Taking ΣM about each support gives ${n} equations total → direct solution.`;
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
function buildTrussJointFBD(jointId, nodes, members, reactions) {
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

  // Fix 10: reactions always shown as VARIABLE NAMES (mode='unknown')
  let reactionItems = [];
  if (isSupport) {
    const nodeReactions = reactions.filter(r => r.nodeId === jointId);
    reactionItems = nodeReactions.map(r => ({
      nodeId: r.nodeId,
      type: r.type,
      label: getReactionLabel(r.label, r.type),
      value: 0,
      mode: 'unknown',
    }));
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
    // Fix 8: Step 0 always shows variable names only
    steps.push(buildGlobalFBDStep(nodes, members, unknowns, reactions));

    // Show HOW reactions were derived — write the equilibrium equations.
    // For pure truss, solveTrussSystem uses joint equilibrium to find reactions,
    // then stores global equations (with extra moment equations for n>3 supports)
    // for pedagogical display.  We ALWAYS use buildDirectSolveSteps here —
    // never buildSubStructureSteps — because trusses don't have frame hinges
    // to partition at; the moment equations about each support are sufficient.
    if (!solvingSteps || solvingSteps.length === 0) {
      // Fallback: just list results
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
    } else if (solvingSteps[0]?.type === 'global') {
      // Direct solve using global equilibrium equations (ΣM about each support,
      // ΣFy, ΣFx) — works for any number of unknowns on a pure truss.
      const directSteps = buildDirectSolveSteps(solvingSteps[0], unknowns, reactions);
      steps.push(...directSteps);
    } else {
      // Fallback for unexpected step types
      const subSteps = buildSubStructureSteps(solvingSteps, unknowns, reactions, nodes, members);
      steps.push(...subSteps);
    }

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
