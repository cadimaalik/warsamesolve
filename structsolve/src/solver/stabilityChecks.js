// stabilityChecks.js — Edge Case Detection for Structural Stability

/**
 * Check for structural stability edge cases and generate warnings.
 *
 * Based on the edge cases document from Prompt #15, this detects:
 * - Concurrent reactions (all lines of action pass through one point)
 * - Parallel reactions (all reactions act in the same direction)
 * - Singular matrix (solver failed)
 * - Large residuals in verification
 *
 * @param {Object} solverResults - The complete solver output
 * @returns {Array} Array of warning objects
 */
export function checkStabilityWarnings(solverResults) {
  const warnings = [];
  const { nodes, members, reactions, unknowns, verification, success, error } = solverResults;

  // ═══════════════════════════════════════════════════════════
  // Edge Case 1: Solver Failed (Singular Matrix)
  // ═══════════════════════════════════════════════════════════
  if (!success) {
    warnings.push({
      type: 'singular',
      severity: 'error',
      message: 'The equilibrium equations could not be solved.',
      detail: error || 'The structure may be geometrically unstable despite having the correct number of reactions. Check for concurrent or parallel reaction lines.'
    });
    return warnings; // Fatal error — no point checking further
  }

  // ═══════════════════════════════════════════════════════════
  // Edge Case 2: All Reactions are Parallel
  // ═══════════════════════════════════════════════════════════
  const hasRx = unknowns.some(u => u.type === 'Rx');
  const hasRy = unknowns.some(u => u.type === 'Ry');

  if (hasRx && !hasRy) {
    warnings.push({
      type: 'parallel',
      severity: 'error',
      message: 'No vertical reactions present. Structure cannot resist vertical loads.',
      detail: 'All reaction forces are horizontal. The structure is unstable under vertical loading.'
    });
  }

  if (hasRy && !hasRx) {
    // This is common and okay (e.g., pin + roller) — only warn if there are horizontal loads
    const hasHorizontalLoad = nodes.some(n => Math.abs(n.loads.fx) > 1e-10);
    if (hasHorizontalLoad) {
      warnings.push({
        type: 'parallel',
        severity: 'warning',
        message: 'Horizontal loads present but no horizontal reaction.',
        detail: 'ΣFx = 0 may not be satisfiable without a horizontal reaction. Verify support conditions.'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Edge Case 3: All Rollers (Potential Concurrent/Parallel)
  // ═══════════════════════════════════════════════════════════
  const supportNodes = nodes.filter(n => n.support);
  if (supportNodes.length >= 2) {
    const allRollers = supportNodes.every(n =>
      n.support === 'roller-h' || n.support === 'roller-v'
    );
    if (allRollers) {
      warnings.push({
        type: 'concurrent',
        severity: 'warning',
        message: 'All supports are rollers. Reactions may be concurrent or parallel.',
        detail: 'Consider replacing at least one roller with a pin to provide reactions in both directions and ensure stability.'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Edge Case 4: Large Residuals in Verification
  // ═══════════════════════════════════════════════════════════
  if (verification) {
    const failedChecks = verification.filter(v => !v.pass);
    if (failedChecks.length > 0) {
      warnings.push({
        type: 'residual',
        severity: 'warning',
        message: 'Verification check failed — residuals are not close to zero.',
        detail: `Failed equations: ${failedChecks.map(v => v.equation).join(', ')}. Results may be inaccurate due to numerical errors or modeling issues.`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Edge Case 5: Extremely Large Reaction Values (Numerical Warning)
  // ═══════════════════════════════════════════════════════════
  if (reactions) {
    const largeReactions = reactions.filter(r => Math.abs(r.value) > 1e6);
    if (largeReactions.length > 0) {
      warnings.push({
        type: 'magnitude',
        severity: 'warning',
        message: 'Extremely large reaction forces detected.',
        detail: `Some reactions exceed 1,000,000 kN. This may indicate a modeling error, incorrect load magnitudes, or a near-singular configuration.`
      });
    }
  }

  return warnings;
}
