// fbdGenerator.js — Generate Free Body Diagram data for each solution step
//
// FBD types:
//   'global'           — whole structure, all reactions + applied loads
//   'global-fx'        — same but highlights ΣFx arrows
//   'global-fy'        — same but highlights ΣFy arrows
//   'global-moment'    — same with moment arms to moment point
//   'sub-structure'    — cut structure at hinge, show one side
//   'truss-joints'     — individual joint FBDs for method of joints
//   'equivalent'       — DL → equivalent force visualization
//
// Colors (Prompt #16C):
//   Blue   #3b82f6 — reactions
//   Red    #ef4444 — applied loads
//   Amber  #f59e0b — member forces
//   Purple #8b5cf6 — equivalent (DL resultant)
//   Pink   #ec4899 — moments
//   Gray   #6b7280 — dimensions/arms

const C = {
  reaction: '#3b82f6',
  applied:  '#ef4444',
  member:   '#f59e0b',
  equiv:    '#8b5cf6',
  moment:   '#ec4899',
  dim:      '#6b7280',
};

const ARROW_LEN = 0.8; // engineering units (meters) — scaled by PPM in canvas

/**
 * Build a global FBD showing all reactions and applied loads.
 * No support symbols — replaced by reaction arrows.
 *
 * @param {Object} solverResults - full solver output
 * @param {string} [highlight] - 'fx' | 'fy' | null — dim non-highlighted arrows
 * @returns {Object} FBD data for FBDCanvas
 */
export function buildGlobalFBD(solverResults, highlight) {
  const { nodes, members, reactions, knownForces, PPM } = solverResults;
  const arrows = [];
  const moments = [];
  const hingeNodes = getHingeNodeIds(nodes, members);

  // --- Reaction arrows (blue) ---
  for (const r of reactions) {
    const node = nodes.find(n => n.id === r.nodeId);
    if (!node) continue;

    if (r.type === 'Rx') {
      const dir = r.value >= 0 ? 1 : -1;
      const style = highlight === 'fy' ? 'dimmed' : undefined;
      arrows.push(makeArrow(
        node.x - dir * ARROW_LEN, node.y,
        node.x, node.y,
        C.reaction, formatReaction(r), style
      ));
    } else if (r.type === 'Ry') {
      const dir = r.value >= 0 ? 1 : -1;
      const style = highlight === 'fx' ? 'dimmed' : undefined;
      arrows.push(makeArrow(
        node.x, node.y - dir * ARROW_LEN,
        node.x, node.y,
        C.reaction, formatReaction(r), style
      ));
    } else if (r.type === 'M') {
      moments.push({
        nodeId: r.nodeId,
        value: r.value,
        color: C.moment,
        label: formatMomentLabel(r),
      });
    }
  }

  // --- Applied load arrows (red) ---
  for (const node of nodes) {
    if (node.loads.fx !== 0) {
      const dir = node.loads.fx > 0 ? 1 : -1;
      const style = highlight === 'fy' ? 'dimmed' : undefined;
      arrows.push(makeArrow(
        node.x + dir * ARROW_LEN, node.y,
        node.x, node.y,
        C.applied, `${Math.abs(node.loads.fx)} kN`, style
      ));
    }
    if (node.loads.fy !== 0) {
      const dir = node.loads.fy > 0 ? 1 : -1;
      const style = highlight === 'fx' ? 'dimmed' : undefined;
      arrows.push(makeArrow(
        node.x, node.y + dir * ARROW_LEN,
        node.x, node.y,
        C.applied, `${Math.abs(node.loads.fy)} kN`, style
      ));
    }
    if (node.loads.m !== 0) {
      moments.push({
        nodeId: node.id,
        value: node.loads.m,
        color: C.moment,
        label: `${Math.abs(node.loads.m)} kN·m`,
      });
    }
  }

  // --- Equivalent DL forces (purple, dimmed on global FBD) ---
  for (const f of (knownForces || [])) {
    if (!f.source || !f.source.includes('DL')) continue;
    if (f.fy !== 0) {
      const dir = f.fy > 0 ? 1 : -1;
      arrows.push(makeArrow(
        f.x, f.y + dir * ARROW_LEN * 0.6,
        f.x, f.y,
        C.equiv, `${rd(Math.abs(f.fy))} kN`, 'dimmed'
      ));
    }
    if (f.fx !== 0) {
      const dir = f.fx > 0 ? 1 : -1;
      arrows.push(makeArrow(
        f.x + dir * ARROW_LEN * 0.6, f.y,
        f.x, f.y,
        C.equiv, `${rd(Math.abs(f.fx))} kN`, 'dimmed'
      ));
    }
  }

  return {
    id: `global-${highlight || 'all'}`,
    nodes,
    members,
    arrows,
    moments,
    hingeNodes,
    PPM,
    title: highlight === 'fx' ? 'FBD — Horizontal Equilibrium'
      : highlight === 'fy' ? 'FBD — Vertical Equilibrium'
      : 'Free Body Diagram',
  };
}

/**
 * Build a moment FBD with dimension arms from moment point to each force.
 */
export function buildMomentFBD(solverResults, momentPoint) {
  const baseFBD = buildGlobalFBD(solverResults, null);
  const dimensionArms = [];

  if (!momentPoint) return { ...baseFBD, id: 'global-moment', title: 'FBD — Moment Equilibrium' };

  // Draw dimension arms from moment point to each force application point
  const { reactions, nodes } = solverResults;

  for (const r of reactions) {
    if (r.type === 'M') continue; // no arm for pure moments
    const node = nodes.find(n => n.id === r.nodeId);
    if (!node) continue;
    if (node.id === momentPoint.id) continue; // no arm to self

    const dx = node.x - momentPoint.x;
    const dy = node.y - momentPoint.y;
    const arm = r.type === 'Rx' ? Math.abs(dy) : Math.abs(dx);
    if (arm < 1e-6) continue;

    if (r.type === 'Ry') {
      // Horizontal arm
      dimensionArms.push({
        fromX: momentPoint.x, fromY: momentPoint.y,
        toX: node.x, toY: momentPoint.y,
        label: `${rd(arm)} m`,
      });
    } else if (r.type === 'Rx') {
      // Vertical arm
      dimensionArms.push({
        fromX: momentPoint.x, fromY: momentPoint.y,
        toX: momentPoint.x, toY: node.y,
        label: `${rd(arm)} m`,
      });
    }
  }

  // Arms for applied loads
  for (const node of nodes) {
    if (node.id === momentPoint.id) continue;
    if (node.loads.fy !== 0) {
      const dx = Math.abs(node.x - momentPoint.x);
      if (dx > 1e-6) {
        dimensionArms.push({
          fromX: momentPoint.x, fromY: momentPoint.y,
          toX: node.x, toY: momentPoint.y,
          label: `${rd(dx)} m`,
        });
      }
    }
    if (node.loads.fx !== 0) {
      const dy = Math.abs(node.y - momentPoint.y);
      if (dy > 1e-6) {
        dimensionArms.push({
          fromX: momentPoint.x, fromY: momentPoint.y,
          toX: momentPoint.x, toY: node.y,
          label: `${rd(dy)} m`,
        });
      }
    }
  }

  // Deduplicate arms by endpoint
  const unique = [];
  const seen = new Set();
  for (const arm of dimensionArms) {
    const key = `${rd(arm.toX)},${rd(arm.toY)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(arm);
    }
  }

  // Highlight the moment point
  const highlightNodes = new Set([momentPoint.id]);

  return {
    ...baseFBD,
    id: 'global-moment',
    dimensionArms: unique,
    highlightNodes,
    title: `FBD — Moment about ${momentPoint.label}`,
  };
}

/**
 * Build a sub-structure FBD for hinge cut analysis.
 * Shows only nodes/members on the chosen side.
 * Reactions on this side shown as blue arrows.
 * Already-solved reactions shown as dashed blue arrows.
 */
export function buildSubStructureFBD(solverResults, solvingStep) {
  const { nodes, members, reactions, knownForces, PPM } = solverResults;
  const { side, hingeNode, solvedValues } = solvingStep;
  const sideNodeIds = side.nodeIds;

  const arrows = [];
  const moments = [];
  const dimensionArms = [];

  // Filter nodes and members to this side
  const sideNodes = nodes.filter(n => sideNodeIds.has(n.id));
  const sideMembers = members.filter(m =>
    sideNodeIds.has(m.startNodeId) && sideNodeIds.has(m.endNodeId)
  );

  const hingeNodes = getHingeNodeIds(nodes, members);

  // --- Reaction arrows on this side ---
  for (const r of reactions) {
    if (!sideNodeIds.has(r.nodeId)) continue;
    const node = nodes.find(n => n.id === r.nodeId);
    if (!node) continue;

    // Check if this reaction was solved in THIS step or earlier
    const isSolvedHere = solvedValues && solvedValues.some(
      sv => sv.nodeId === r.nodeId && sv.type === r.type
    );
    const style = isSolvedHere ? undefined : 'dashed';

    if (r.type === 'Rx') {
      const dir = r.value >= 0 ? 1 : -1;
      arrows.push(makeArrow(
        node.x - dir * ARROW_LEN, node.y,
        node.x, node.y,
        C.reaction, formatReaction(r), style
      ));
    } else if (r.type === 'Ry') {
      const dir = r.value >= 0 ? 1 : -1;
      arrows.push(makeArrow(
        node.x, node.y - dir * ARROW_LEN,
        node.x, node.y,
        C.reaction, formatReaction(r), style
      ));
    } else if (r.type === 'M') {
      moments.push({
        nodeId: r.nodeId,
        value: r.value,
        color: C.moment,
        label: formatMomentLabel(r),
      });
    }
  }

  // --- Applied loads on this side ---
  for (const node of sideNodes) {
    if (node.loads.fx !== 0) {
      const dir = node.loads.fx > 0 ? 1 : -1;
      arrows.push(makeArrow(
        node.x + dir * ARROW_LEN, node.y,
        node.x, node.y,
        C.applied, `${Math.abs(node.loads.fx)} kN`
      ));
    }
    if (node.loads.fy !== 0) {
      const dir = node.loads.fy > 0 ? 1 : -1;
      arrows.push(makeArrow(
        node.x, node.y + dir * ARROW_LEN,
        node.x, node.y,
        C.applied, `${Math.abs(node.loads.fy)} kN`
      ));
    }
    if (node.loads.m !== 0) {
      moments.push({
        nodeId: node.id,
        value: node.loads.m,
        color: C.moment,
        label: `${Math.abs(node.loads.m)} kN·m`,
      });
    }
  }

  // --- Equivalent DL forces on this side ---
  for (const f of (knownForces || [])) {
    if (!f.source || !f.source.includes('DL')) continue;
    const nearestNode = findNearestNode(f.x, f.y, sideNodes);
    if (!nearestNode) continue;
    if (f.fy !== 0) {
      const dir = f.fy > 0 ? 1 : -1;
      arrows.push(makeArrow(
        f.x, f.y + dir * ARROW_LEN * 0.6,
        f.x, f.y,
        C.equiv, `${rd(Math.abs(f.fy))} kN`, 'dimmed'
      ));
    }
    if (f.fx !== 0) {
      const dir = f.fx > 0 ? 1 : -1;
      arrows.push(makeArrow(
        f.x + dir * ARROW_LEN * 0.6, f.y,
        f.x, f.y,
        C.equiv, `${rd(Math.abs(f.fx))} kN`, 'dimmed'
      ));
    }
  }

  // --- Dimension arms from hinge to forces ---
  if (hingeNode) {
    for (const r of reactions) {
      if (!sideNodeIds.has(r.nodeId)) continue;
      if (r.type === 'M') continue;
      const node = nodes.find(n => n.id === r.nodeId);
      if (!node || node.id === hingeNode.id) continue;

      const dx = node.x - hingeNode.x;
      const dy = node.y - hingeNode.y;
      const arm = r.type === 'Rx' ? Math.abs(dy) : Math.abs(dx);
      if (arm < 1e-6) continue;

      if (r.type === 'Ry') {
        dimensionArms.push({
          fromX: hingeNode.x, fromY: hingeNode.y,
          toX: node.x, toY: hingeNode.y,
          label: `${rd(arm)} m`,
        });
      } else if (r.type === 'Rx') {
        dimensionArms.push({
          fromX: hingeNode.x, fromY: hingeNode.y,
          toX: hingeNode.x, toY: node.y,
          label: `${rd(arm)} m`,
        });
      }
    }
  }

  const highlightNodes = hingeNode ? new Set([hingeNode.id]) : undefined;

  return {
    id: `sub-${solvingStep.sideLabel || 'side'}`,
    nodes: sideNodes,
    members: sideMembers,
    arrows,
    moments,
    dimensionArms,
    hingeNodes,
    highlightNodes,
    PPM,
    title: `FBD — Sub-structure (${solvingStep.sideLabel || 'side'}) — Cut at ${hingeNode?.label || '?'}`,
  };
}

/**
 * Build an equivalent force FBD for distributed load conversion step.
 * Shows original DL region + equivalent forces.
 */
export function buildEquivalentFBD(solverResults) {
  const { nodes, members, knownForces, PPM } = solverResults;
  const arrows = [];
  const hingeNodes = getHingeNodeIds(nodes, members);

  // Show equivalent forces from DLs in purple
  for (const f of (knownForces || [])) {
    if (!f.source || !f.source.includes('DL')) continue;
    if (f.fy !== 0) {
      const dir = f.fy > 0 ? 1 : -1;
      arrows.push(makeArrow(
        f.x, f.y + dir * ARROW_LEN,
        f.x, f.y,
        C.equiv, `${rd(Math.abs(f.fy))} kN`
      ));
    }
    if (f.fx !== 0) {
      const dir = f.fx > 0 ? 1 : -1;
      arrows.push(makeArrow(
        f.x + dir * ARROW_LEN, f.y,
        f.x, f.y,
        C.equiv, `${rd(Math.abs(f.fx))} kN`
      ));
    }
  }

  return {
    id: 'equivalent-dl',
    nodes,
    members,
    arrows,
    moments: [],
    hingeNodes,
    PPM,
    title: 'Equivalent Nodal Forces from Distributed Loads',
  };
}

/**
 * Build individual joint FBDs for truss method of joints.
 * Returns an array of FBD objects, one per joint analyzed.
 */
export function buildTrussJointFBDs(solverResults) {
  const { nodes, members, reactions, trussForces, PPM } = solverResults;
  if (!trussForces || trussForces.length === 0) return [];

  const fbds = [];
  const trussMembers = members.filter(m => m.type === 'truss');

  // For each node that connects truss members, build a joint FBD
  const jointNodes = nodes.filter(node => {
    return trussMembers.some(m => m.startNodeId === node.id || m.endNodeId === node.id);
  });

  for (const joint of jointNodes) {
    const arrows = [];
    const moments = [];

    // Reactions at this joint (blue)
    const jointReactions = reactions.filter(r => r.nodeId === joint.id);
    for (const r of jointReactions) {
      if (r.type === 'Rx') {
        const dir = r.value >= 0 ? 1 : -1;
        arrows.push(makeArrow(
          joint.x - dir * ARROW_LEN, joint.y,
          joint.x, joint.y,
          C.reaction, `${rd(Math.abs(r.value))} kN`
        ));
      } else if (r.type === 'Ry') {
        const dir = r.value >= 0 ? 1 : -1;
        arrows.push(makeArrow(
          joint.x, joint.y - dir * ARROW_LEN,
          joint.x, joint.y,
          C.reaction, `${rd(Math.abs(r.value))} kN`
        ));
      }
    }

    // Applied loads at this joint (red)
    if (joint.loads.fx !== 0) {
      const dir = joint.loads.fx > 0 ? 1 : -1;
      arrows.push(makeArrow(
        joint.x + dir * ARROW_LEN, joint.y,
        joint.x, joint.y,
        C.applied, `${Math.abs(joint.loads.fx)} kN`
      ));
    }
    if (joint.loads.fy !== 0) {
      const dir = joint.loads.fy > 0 ? 1 : -1;
      arrows.push(makeArrow(
        joint.x, joint.y + dir * ARROW_LEN,
        joint.x, joint.y,
        C.applied, `${Math.abs(joint.loads.fy)} kN`
      ));
    }

    // Member forces — tension arrows point AWAY from joint
    const connectedTruss = trussMembers.filter(
      m => m.startNodeId === joint.id || m.endNodeId === joint.id
    );

    for (const m of connectedTruss) {
      const tf = trussForces.find(t => t.memberId === m.id);
      if (!tf) continue;

      const otherId = m.startNodeId === joint.id ? m.endNodeId : m.startNodeId;
      const otherNode = nodes.find(n => n.id === otherId);
      if (!otherNode) continue;

      const dx = otherNode.x - joint.x;
      const dy = otherNode.y - joint.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      if (L < 1e-10) continue;

      // Direction unit vector from joint toward other node
      const ux = dx / L;
      const uy = dy / L;

      // Tension-positive: arrow AWAY from joint (toward other end)
      // If compression (negative), arrow toward joint (from outside)
      const force = tf.force;
      const isTension = force > 0.001;
      const isCompression = force < -0.001;
      const isZero = !isTension && !isCompression;

      if (isZero) continue;

      const forceAbs = Math.abs(force);
      const label = `${rd(forceAbs)} kN ${isTension ? '(T)' : '(C)'}`;
      const arrowLen = ARROW_LEN * 0.8;

      if (isTension) {
        // Arrow from joint outward along member direction
        arrows.push(makeArrow(
          joint.x, joint.y,
          joint.x + ux * arrowLen, joint.y + uy * arrowLen,
          C.member, label
        ));
      } else {
        // Compression: arrow from outside toward joint
        arrows.push(makeArrow(
          joint.x + ux * arrowLen, joint.y + uy * arrowLen,
          joint.x, joint.y,
          C.member, label
        ));
      }
    }

    // Only add joint FBD if there are forces to show
    if (arrows.length > 0 || moments.length > 0) {
      fbds.push({
        id: `joint-${joint.id}`,
        nodes: [joint],
        members: [],
        arrows,
        moments,
        PPM,
        title: `Joint ${joint.label}`,
      });
    }
  }

  return fbds;
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function makeArrow(x1e, y1e, x2e, y2e, color, label, style) {
  return { x1e, y1e, x2e, y2e, color, label, style };
}

function formatReaction(r) {
  const name = r.type === 'Rx' ? `R${r.label}x`
    : r.type === 'Ry' ? `R${r.label}y`
    : `M${r.label}`;
  return `${name}=${rd(Math.abs(r.value))} kN`;
}

function formatMomentLabel(r) {
  return `M${r.label}=${rd(Math.abs(r.value))} kN·m`;
}

function rd(val) {
  return parseFloat(Math.round(val * 1000) / 1000).toString();
}

function getHingeNodeIds(nodes, members) {
  const hinges = new Set();
  for (const node of nodes) {
    const connected = members.filter(
      m => m.startNodeId === node.id || m.endNodeId === node.id
    );
    if (connected.length < 2) continue;
    const hasHinge = connected.some(m => {
      if (m.type === 'truss') return true;
      if (m.startNodeId === node.id && m.startHinge) return true;
      if (m.endNodeId === node.id && m.endHinge) return true;
      return false;
    });
    if (hasHinge) hinges.add(node.id);
  }
  return hinges;
}

function findNearestNode(x, y, nodes) {
  let best = null;
  let bestDist = Infinity;
  for (const n of nodes) {
    const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  return best;
}
