// distributed.js — Convert Distributed Loads → Equivalent Nodal Forces
// Updated to distribute loads to member end nodes for proper frame analysis

export function convertDistributedLoads(members, nodes) {
  const equivalentForces = [];

  for (const member of members) {
    for (const dl of member.distributedLoads) {
      const sn = nodes.find(n => n.id === member.startNodeId);
      const en = nodes.find(n => n.id === member.endNodeId);
      if (!sn || !en) continue;

      const loadLength = dl.endPos - dl.startPos;
      if (loadLength <= 0) continue;

      const w1 = dl.startIntensity;  // intensity at start of load region
      const w2 = dl.endIntensity;    // intensity at end of load region

      let forceAtStart, forceAtEnd;

      if (Math.abs(w1 - w2) < 1e-10) {
        // UDL: uniform distributed load
        // Total load = w × L
        // Split equally: w×L/2 at each end
        const totalLoad = w1 * loadLength;
        forceAtStart = totalLoad / 2;
        forceAtEnd = totalLoad / 2;

      } else if (Math.abs(w1) < 1e-10 || Math.abs(w2) < 1e-10) {
        // Triangular: one end is zero
        // Total load = 0.5 × w_max × L
        // Distribution based on load shape:
        // - If max at start: 2/3 at start, 1/3 at end
        // - If max at end: 1/3 at start, 2/3 at end
        const totalLoad = 0.5 * (Math.abs(w1) + Math.abs(w2)) * loadLength;

        if (Math.abs(w1) > Math.abs(w2)) {
          // Max at start
          forceAtStart = (2.0 / 3.0) * totalLoad * Math.sign(w1);
          forceAtEnd = (1.0 / 3.0) * totalLoad * Math.sign(w1);
        } else {
          // Max at end
          forceAtStart = (1.0 / 3.0) * totalLoad * Math.sign(w2);
          forceAtEnd = (2.0 / 3.0) * totalLoad * Math.sign(w2);
        }

      } else {
        // Trapezoidal: general case
        // Total load = (w1 + w2) × L / 2
        // Distribution: weighted by intensity
        const totalLoad = (w1 + w2) * loadLength / 2;

        // For trapezoidal load, the distribution is:
        // F_start = (2×w1 + w2) × L / 6
        // F_end = (w1 + 2×w2) × L / 6
        forceAtStart = (2 * w1 + w2) * loadLength / 6;
        forceAtEnd = (w1 + 2 * w2) * loadLength / 6;
      }

      // Get positions of start and end nodes where forces are applied
      const startT = dl.startPos / member.length;
      const endT = dl.endPos / member.length;

      const startX = sn.x + startT * (en.x - sn.x);
      const startY = sn.y + startT * (en.y - sn.y);
      const endX = sn.x + endT * (en.x - sn.x);
      const endY = sn.y + endT * (en.y - sn.y);

      // Resolve into global components based on load direction
      if (dl.direction === 'global-y') {
        equivalentForces.push({
          fx: 0, fy: forceAtStart,
          x: startX, y: startY,
          source: `DL on ${member.startLabel}${member.endLabel} (start)`
        });
        equivalentForces.push({
          fx: 0, fy: forceAtEnd,
          x: endX, y: endY,
          source: `DL on ${member.startLabel}${member.endLabel} (end)`
        });
      } else if (dl.direction === 'global-x') {
        equivalentForces.push({
          fx: forceAtStart, fy: 0,
          x: startX, y: startY,
          source: `DL on ${member.startLabel}${member.endLabel} (start)`
        });
        equivalentForces.push({
          fx: forceAtEnd, fy: 0,
          x: endX, y: endY,
          source: `DL on ${member.startLabel}${member.endLabel} (end)`
        });
      } else if (dl.direction === 'perpendicular') {
        // Perpendicular to member axis: direction = (-sinθ, cosθ)
        equivalentForces.push({
          fx: forceAtStart * (-member.sin),
          fy: forceAtStart * (member.cos),
          x: startX, y: startY,
          source: `DL on ${member.startLabel}${member.endLabel} (start)`
        });
        equivalentForces.push({
          fx: forceAtEnd * (-member.sin),
          fy: forceAtEnd * (member.cos),
          x: endX, y: endY,
          source: `DL on ${member.startLabel}${member.endLabel} (end)`
        });
      }
    }
  }

  return equivalentForces;
}
