// extractInput.js — Canvas Store → Solver Data Bridge
import { PIXELS_PER_METER } from '../constants/directions.js';

export function extractSolverInput(structure) {
  const PPM = PIXELS_PER_METER; // 50 pixels = 1 meter

  // Convert each node from pixel coords to engineering coords
  const nodes = structure.nodes.map(n => ({
    id: n.id,
    label: n.id, // Use id as label (nodes don't have separate label field)
    x: n.x / PPM,            // pixels → meters
    y: -(n.y) / PPM,         // FLIP Y: SVG y-down → engineering y-up
    support: n.support || null,
    loads: {
      fx: n.loads?.fx || 0,    // kN, positive = rightward
      fy: n.loads?.fy || 0,    // kN, positive = upward (user enters in engineering convention)
      m: n.loads?.moment || 0  // kN·m, positive = CCW
    }
  }));

  // Convert members: compute real length, angle, direction cosines
  const members = structure.members.map(m => {
    const sn = nodes.find(n => n.id === m.startNodeId);
    const en = nodes.find(n => n.id === m.endNodeId);
    if (!sn || !en) {
      console.warn(`Member ${m.id} references non-existent nodes`);
      return null;
    }
    const dx = en.x - sn.x;
    const dy = en.y - sn.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx); // radians from positive x-axis

    return {
      id: m.id,
      startNodeId: m.startNodeId,
      endNodeId: m.endNodeId,
      startLabel: sn.label,
      endLabel: en.label,
      type: m.type || 'frame',          // 'frame' or 'truss'
      length: length,
      angle: angle,
      cos: length > 0 ? dx / length : 1,
      sin: length > 0 ? dy / length : 0,
      startHinge: m.startHinge || m.type === 'truss',  // truss members are always pinned
      endHinge: m.endHinge || m.type === 'truss',
      distributedLoads: (m.distributedLoads || []).map(dl => ({
        id: dl.id,
        startPos: dl.startPos,           // meters along member
        endPos: dl.endPos,               // meters along member
        startIntensity: dl.startIntensity,  // kN/m
        endIntensity: dl.endIntensity,      // kN/m
        direction: dl.direction          // 'global-y', 'global-x', or 'perpendicular'
      }))
    };
  }).filter(m => m !== null);

  return { nodes, members, PPM };
}
