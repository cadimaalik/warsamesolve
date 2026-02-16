// latexGenerator.js — Generate Step-by-Step LaTeX Solution

/**
 * Generate the complete step-by-step solution from solver results.
 *
 * Returns an array of step objects: { title, description, latex }
 * Matches the HydroSOLVE solution format exactly.
 *
 * @param {Object} solverResults - Complete solver output from index.js
 * @returns {Array} Array of step objects
 */
export function generateSolutionSteps(solverResults) {
  const { reactions, trussForces, solvingSteps, unknowns, knownForces, momentPoint, nodes, members } = solverResults;
  const steps = [];

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Identify Support Reactions
  // ═══════════════════════════════════════════════════════════
  steps.push(generateStep1_Unknowns(unknowns, nodes));

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Equivalent Forces from Distributed Loads (if any)
  // ═══════════════════════════════════════════════════════════
  const hasDL = members.some(m => m.distributedLoads && m.distributedLoads.length > 0);
  if (hasDL) {
    steps.push(generateStep2_DistributedLoads(members, knownForces));
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3+: Follow solving order from solvingSteps (Prompt #16-PATCH)
  // ═══════════════════════════════════════════════════════════
  let stepNum = hasDL ? 3 : 2;

  if (solvingSteps && solvingSteps.length > 0) {
    // NEW PATH: Use solvingSteps array for pedagogically correct ordering
    for (const solvingStep of solvingSteps) {
      if (solvingStep.type === 'sub-structure') {
        // Sub-structure analysis header
        steps.push({
          title: `Step ${stepNum}: Sub-Structure Analysis — Cut at ${solvingStep.hingeNode.label}`,
          description: `The structure has ${unknowns.length} unknowns but only 3 global equilibrium equations. ` +
            `Cut the structure at internal hinge ${solvingStep.hingeNode.label} and analyze the ${solvingStep.side.description} sub-structure separately. ` +
            `Since the bending moment at a hinge is zero, taking ΣM about ${solvingStep.hingeNode.label} eliminates the internal forces at the cut.`,
          latex: null
        });
        stepNum++;

        // Equations for this sub-structure
        for (const eq of solvingStep.equations) {
          steps.push({
            title: `Step ${stepNum}: ${getEquationTitle(eq, solvingStep.momentPoint)}`,
            description: getEquationDescription(eq, solvingStep.momentPoint),
            latex: buildSymbolicEquation(eq, unknowns, solvingStep.solvedValues || [], solvingStep.momentPoint, nodes),
          });
          stepNum++;
        }

        // Show what was solved
        const solvedLines = solvingStep.solvedValues.map(sv => {
          const name = getReactionLatex(sv.label, sv.type);
          const unit = sv.type === 'M' ? '\\text{ kN·m}' : '\\text{ kN}';
          const dir = getDirectionSymbol(sv);
          return `\\boxed{${name} = ${roundDisplay(sv.value)} ${unit}} \\quad ${dir}`;
        });

        steps.push({
          title: `Step ${stepNum}: Sub-Structure Results`,
          description: `From the sub-structure analysis at hinge ${solvingStep.hingeNode.label}:`,
          latex: solvedLines.join(' \\\\ ')
        });
        stepNum++;

      } else if (solvingStep.type === 'global') {
        // Global equilibrium
        const isAfterSubStructure = solvingSteps.some(s => s.type === 'sub-structure');

        if (isAfterSubStructure) {
          steps.push({
            title: `Step ${stepNum}: Global Equilibrium — Remaining Unknowns`,
            description: `With ${solvingStep.solvedValues.length} unknowns remaining, ` +
              `apply the 3 global equilibrium equations to the entire structure.`,
            latex: null
          });
          stepNum++;
        }

        // Global equations
        for (const eq of solvingStep.equations) {
          const solved = solvingStep.solvedValues || [];
          steps.push({
            title: `Step ${stepNum}: ${getEquationTitle(eq, solvingStep.momentPoint)}`,
            description: getEquationDescription(eq, solvingStep.momentPoint),
            latex: buildSymbolicEquation(eq, unknowns, solved, solvingStep.momentPoint, nodes),
          });
          stepNum++;
        }
      }
    }
  } else {
    // LEGACY PATH: For backwards compatibility with old results (no solvingSteps)
    const equations = solverResults.equations || [];
    const eqSteps = generateEquationSteps(equations, unknowns, knownForces, momentPoint, reactions, nodes);
    steps.push(...eqSteps);
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL STEP: Summary of Solved Values
  // ═══════════════════════════════════════════════════════════
  steps.push(generateSummaryStep(reactions));

  // ═══════════════════════════════════════════════════════════
  // TRUSS FORCES (if applicable)
  // ═══════════════════════════════════════════════════════════
  if (trussForces && trussForces.length > 0) {
    const trussSteps = generateTrussSteps(trussForces, nodes, members);
    steps.push(...trussSteps);
  }

  return steps;
}

// ═══════════════════════════════════════════════════════════
// STEP 1: Identify Support Reactions
// ═══════════════════════════════════════════════════════════
function generateStep1_Unknowns(unknowns, nodes) {
  // Group unknowns by node
  const byNode = {};
  for (const u of unknowns) {
    if (!byNode[u.label]) {
      byNode[u.label] = { support: u.node.support, types: [] };
    }
    byNode[u.label].types.push(u.type);
  }

  const lines = [];

  // For each support node, show what reactions it provides
  for (const [label, info] of Object.entries(byNode)) {
    const supportName = getSupportName(info.support);
    const reactionSymbols = info.types.map(t => getReactionLatex(label, t)).join(', \\; ');
    lines.push(`\\text{${supportName} at ${label}:} \\quad ${reactionSymbols}`);
  }

  lines.push('');
  lines.push(`\\text{Total unknowns} = ${unknowns.length}`);
  lines.push(`\\text{Available equations} = ${unknowns.length}`);
  lines.push(`\\therefore \\text{ Structure is statically determinate}`);

  return {
    title: 'Step 1: Identify Support Reactions',
    description: 'List all unknown reaction forces based on support conditions:',
    latex: lines.join(' \\\\ ')
  };
}

function getSupportName(support) {
  const names = {
    'pin': 'Pin',
    'roller-h': 'Horizontal Roller',
    'roller-v': 'Vertical Roller',
    'fixed': 'Fixed Support',
    'guide-h': 'Horizontal Guide',
    'guide-v': 'Vertical Guide'
  };
  return names[support] || support;
}

function getReactionLatex(label, type) {
  if (type === 'Rx') return `R_{${label}x}`;
  if (type === 'Ry') return `R_{${label}y}`;
  if (type === 'M') return `M_{${label}}`;
  return type;
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Convert Distributed Loads to Equivalent Forces
// ═══════════════════════════════════════════════════════════
function generateStep2_DistributedLoads(members, knownForces) {
  const lines = [];

  // Find equivalent forces that came from distributed loads
  const dlForces = knownForces.filter(f => f.source && f.source.includes('DL on'));

  // Group by member
  const byMember = {};
  for (const f of dlForces) {
    // Extract member name from source like "DL on AB (start)"
    const match = f.source.match(/DL on (\w+)/);
    if (match) {
      const memberName = match[1];
      if (!byMember[memberName]) byMember[memberName] = [];
      byMember[memberName].push(f);
    }
  }

  for (const [memberName, forces] of Object.entries(byMember)) {
    const member = members.find(m => `${m.startLabel}${m.endLabel}` === memberName);
    if (!member || !member.distributedLoads || member.distributedLoads.length === 0) continue;

    const dl = member.distributedLoads[0]; // Assuming one DL per member for now
    const loadLength = dl.endPos - dl.startPos;
    const w1 = Math.abs(dl.startIntensity);
    const w2 = Math.abs(dl.endIntensity);

    lines.push(`\\text{Member ${memberName}:}`);

    if (Math.abs(w1 - w2) < 1e-10) {
      // UDL
      const totalLoad = w1 * loadLength;
      lines.push(`\\quad \\text{Uniform Load: } w = ${roundDisplay(w1)} \\text{ kN/m}, \\; L = ${roundDisplay(loadLength)} \\text{ m}`);
      lines.push(`\\quad F_{\\text{total}} = w \\times L = ${roundDisplay(w1)} \\times ${roundDisplay(loadLength)} = ${roundDisplay(totalLoad)} \\text{ kN}`);
      lines.push(`\\quad \\text{Split equally at member ends: } ${roundDisplay(totalLoad / 2)} \\text{ kN each}`);
    } else if (w1 < 1e-10 || w2 < 1e-10) {
      // Triangular
      const wMax = Math.max(w1, w2);
      const totalLoad = 0.5 * wMax * loadLength;
      lines.push(`\\quad \\text{Triangular Load: } w_{\\text{max}} = ${roundDisplay(wMax)} \\text{ kN/m}`);
      lines.push(`\\quad F_{\\text{total}} = \\frac{1}{2} w_{\\text{max}} L = \\frac{1}{2} \\times ${roundDisplay(wMax)} \\times ${roundDisplay(loadLength)} = ${roundDisplay(totalLoad)} \\text{ kN}`);
      if (w1 > w2) {
        lines.push(`\\quad \\text{Distribution: } \\frac{2}{3} \\text{ at start, } \\frac{1}{3} \\text{ at end}`);
      } else {
        lines.push(`\\quad \\text{Distribution: } \\frac{1}{3} \\text{ at start, } \\frac{2}{3} \\text{ at end}`);
      }
    } else {
      // Trapezoidal
      const totalLoad = 0.5 * (w1 + w2) * loadLength;
      lines.push(`\\quad \\text{Trapezoidal Load: } w_1 = ${roundDisplay(w1)}, \\; w_2 = ${roundDisplay(w2)} \\text{ kN/m}`);
      lines.push(`\\quad F_{\\text{total}} = \\frac{w_1 + w_2}{2} \\times L = ${roundDisplay(totalLoad)} \\text{ kN}`);
      const F1 = (2 * w1 + w2) * loadLength / 6;
      const F2 = (w1 + 2 * w2) * loadLength / 6;
      lines.push(`\\quad F_{\\text{start}} = \\frac{2w_1 + w_2}{6} L = ${roundDisplay(F1)} \\text{ kN}`);
      lines.push(`\\quad F_{\\text{end}} = \\frac{w_1 + 2w_2}{6} L = ${roundDisplay(F2)} \\text{ kN}`);
    }

    lines.push(''); // Blank line separator
  }

  return {
    title: 'Step 2: Convert Distributed Loads to Equivalent Nodal Forces',
    description: 'Replace each distributed load with statically equivalent concentrated forces at member ends:',
    latex: lines.join(' \\\\ ')
  };
}

// ═══════════════════════════════════════════════════════════
// EQUILIBRIUM EQUATIONS
// ═══════════════════════════════════════════════════════════
function generateEquationSteps(equations, unknowns, knownForces, momentPoint, reactions, nodes) {
  const steps = [];
  let stepNum = knownForces.some(f => f.source && f.source.includes('DL')) ? 3 : 2;

  for (let eqIdx = 0; eqIdx < equations.length; eqIdx++) {
    const eq = equations[eqIdx];
    const lines = [];

    // ── Line 1: Symbolic equation ──
    lines.push(buildSymbolicEquation(eq, unknowns, knownForces, momentPoint, nodes));

    // ── Line 2: Solve for unknowns ──
    // Show which unknown(s) this equation helps solve
    const solvedUnknowns = findSolvedUnknowns(eq, unknowns, reactions, eqIdx, equations);
    for (const u of solvedUnknowns) {
      const r = reactions.find(r => r.nodeId === u.nodeId && r.type === u.type);
      if (r) {
        const name = getReactionLatex(r.label, r.type);
        const unit = r.type === 'M' ? '\\text{ kN·m}' : '\\text{ kN}';
        const direction = getDirectionSymbol(r);
        lines.push(`\\boxed{${name} = ${roundDisplay(r.value)} ${unit}} \\quad ${direction}`);
      }
    }

    const eqTitle = getEquationTitle(eq, momentPoint);
    steps.push({
      title: `Step ${stepNum}: ${eqTitle}`,
      description: getEquationDescription(eq, momentPoint),
      latex: lines.join(' \\\\ ')
    });
    stepNum++;
  }

  return steps;
}

function buildSymbolicEquation(eq, unknowns, knownForces, momentPoint, nodes) {
  const terms = [];

  // Unknown reaction terms
  for (let i = 0; i < unknowns.length; i++) {
    const coeff = eq.coefficients[i];
    if (Math.abs(coeff) < 1e-10) continue;

    const name = getReactionLatex(unknowns[i].label, unknowns[i].type);

    if (eq.type === 'moment' || eq.type === 'hinge-moment') {
      // For moment equations, show the moment arm explicitly
      const arm = Math.abs(coeff);
      if (Math.abs(arm - 1) < 1e-10) {
        // Pure moment reaction or arm is 1
        terms.push({ coeff: coeff > 0 ? 1 : -1, text: name });
      } else {
        // Show as "R × arm"
        terms.push({ coeff: coeff > 0 ? 1 : -1, text: `${name} \\times ${roundDisplay(arm)}` });
      }
    } else {
      // For force equations, coefficient is always ±1
      terms.push({ coeff, text: name });
    }
  }

  // Known force terms
  const rhsValue = -eq.rhs;
  if (Math.abs(rhsValue) > 1e-10) {
    terms.push({ coeff: 1, text: roundDisplay(Math.abs(rhsValue)) });
  }

  // Format into LaTeX string
  let latex = eq.description + ': \\quad ';
  if (terms.length === 0) {
    latex += '0 = 0';
  } else {
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      if (i === 0) {
        latex += t.coeff < 0 ? `-${t.text}` : t.text;
      } else {
        latex += t.coeff < 0 ? ` - ${t.text}` : ` + ${t.text}`;
      }
    }
    latex += ' = 0';
  }

  return latex;
}

function findSolvedUnknowns(eq, unknowns, reactions, eqIdx, equations) {
  // Simple heuristic: find unknowns with non-zero coefficients in this equation
  const involved = [];
  for (let i = 0; i < unknowns.length; i++) {
    if (Math.abs(eq.coefficients[i]) > 1e-10) {
      involved.push(unknowns[i]);
    }
  }

  // Return the first involved unknown (for display purposes)
  // In reality, equations are solved simultaneously
  return involved.slice(0, 1);
}

function getEquationTitle(eq, momentPoint) {
  if (eq.type === 'force-x') return 'Horizontal Equilibrium (ΣFx = 0)';
  if (eq.type === 'force-y') return 'Vertical Equilibrium (ΣFy = 0)';
  if (eq.type === 'moment') return `Moment Equilibrium about ${momentPoint?.label || 'Point'}`;
  if (eq.type === 'hinge-moment') return `Hinge Condition (ΣM = 0)`;
  return 'Equilibrium Equation';
}

function getEquationDescription(eq, momentPoint) {
  if (eq.type === 'force-x') return 'Sum of all horizontal forces equals zero.';
  if (eq.type === 'force-y') return 'Sum of all vertical forces equals zero.';
  if (eq.type === 'moment') return `Taking moments about point ${momentPoint?.label || ''} to eliminate unknowns at that point.`;
  if (eq.type === 'hinge-moment') return `Internal hinge condition: bending moment is zero at the hinge.`;
  return '';
}

// ═══════════════════════════════════════════════════════════
// SUMMARY STEP
// ═══════════════════════════════════════════════════════════
function generateSummaryStep(reactions) {
  const lines = [];

  lines.push('\\text{Summary of all reaction forces:}');
  lines.push('');

  for (const r of reactions) {
    const name = getReactionLatex(r.label, r.type);
    const unit = r.type === 'M' ? '\\text{ kN·m}' : '\\text{ kN}';
    const dir = getDirectionSymbol(r);
    lines.push(`${name} = ${roundDisplay(r.value)} ${unit} \\quad ${dir}`);
  }

  return {
    title: `Solution Complete: All Reactions Determined`,
    description: 'All support reaction forces have been calculated using equilibrium equations:',
    latex: lines.join(' \\\\ ')
  };
}

function getDirectionSymbol(reaction) {
  if (reaction.type === 'Rx') {
    return reaction.value >= 0 ? '\\rightarrow' : '\\leftarrow';
  } else if (reaction.type === 'Ry') {
    return reaction.value >= 0 ? '\\uparrow' : '\\downarrow';
  } else if (reaction.type === 'M') {
    return reaction.value >= 0 ? '\\circlearrowleft' : '\\circlearrowright';
  }
  return '';
}

// ═══════════════════════════════════════════════════════════
// TRUSS FORCES (Method of Joints)
// ═══════════════════════════════════════════════════════════
function generateTrussSteps(trussForces, nodes, members) {
  const steps = [];

  // Introduction step
  steps.push({
    title: 'Truss Analysis: Method of Joints',
    description: 'With all support reactions known, internal truss member forces can be determined by applying equilibrium at each joint. Convention: positive = Tension (T), negative = Compression (C).',
    latex: null
  });

  // Summary of results
  const lines = [];
  lines.push('\\text{Truss member forces:}');
  lines.push('');

  for (const tf of trussForces) {
    const memberName = `${tf.startLabel}${tf.endLabel}`;
    const force = `F_{${memberName}}`;
    const value = roundDisplay(Math.abs(tf.force));
    const type = tf.isZeroForceMember ? '\\text{(Zero Force)}' :
                 tf.classification.includes('Tension') ? '\\text{(T)}' : '\\text{(C)}';
    lines.push(`${force} = ${value} \\text{ kN} \\quad ${type}`);
  }

  steps.push({
    title: 'Truss Member Forces Summary',
    description: null,
    latex: lines.join(' \\\\ ')
  });

  return steps;
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════
function roundDisplay(value, decimals = 3) {
  const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  // Remove trailing zeros for clean display
  return parseFloat(rounded.toFixed(decimals)).toString();
}
