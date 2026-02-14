// distributed.js — Convert Distributed Loads → Equivalent Point Forces

export function convertDistributedLoads(members, nodes) {
  const equivalentForces = [];

  for (const member of members) {
    for (const dl of member.distributedLoads) {
      const sn = nodes.find(n => n.id === member.startNodeId);
      const en = nodes.find(n => n.id === member.endNodeId);
      if (!sn || !en) continue;

      const loadLength = dl.endPos - dl.startPos;
      if (loadLength <= 0) continue;

      let resultant, centroidFromStart;

      const w1 = dl.startIntensity;  // intensity at start of load region
      const w2 = dl.endIntensity;    // intensity at end of load region

      if (Math.abs(w1 - w2) < 1e-10) {
        // UDL: uniform distributed load
        resultant = w1 * loadLength;
        centroidFromStart = dl.startPos + loadLength / 2;

      } else if (Math.abs(w1) < 1e-10 || Math.abs(w2) < 1e-10) {
        // Triangular: one end is zero
        const wMax = Math.abs(w1) > Math.abs(w2) ? w1 : w2;
        resultant = 0.5 * wMax * loadLength;
        // Centroid at 1/3 from the max-intensity end
        if (Math.abs(w1) > Math.abs(w2)) {
          // Max at start → centroid at 1/3 from start
          centroidFromStart = dl.startPos + loadLength / 3;
        } else {
          // Max at end → centroid at 2/3 from start
          centroidFromStart = dl.startPos + 2 * loadLength / 3;
        }

      } else {
        // Trapezoidal: decompose into rectangle + triangle
        const wMin = Math.min(w1, w2);
        const wMax = Math.max(w1, w2);
        const sign = w1 > 0 ? 1 : -1; // keep the sign

        const rectForce = wMin * loadLength;
        const triForce = 0.5 * (wMax - wMin) * loadLength;
        resultant = sign * (Math.abs(rectForce) + Math.abs(triForce));

        const rectCentroid = dl.startPos + loadLength / 2;
        let triCentroid;
        if (Math.abs(w1) < Math.abs(w2)) {
          triCentroid = dl.startPos + 2 * loadLength / 3;
        } else {
          triCentroid = dl.startPos + loadLength / 3;
        }

        const totalMag = Math.abs(rectForce) + Math.abs(triForce);
        centroidFromStart = totalMag > 0
          ? (Math.abs(rectForce) * rectCentroid + Math.abs(triForce) * triCentroid) / totalMag
          : dl.startPos + loadLength / 2;
      }

      // Position of resultant in global coordinates
      const t = centroidFromStart / member.length;  // fraction along member
      const globalX = sn.x + t * (en.x - sn.x);
      const globalY = sn.y + t * (en.y - sn.y);

      // Resolve into global components based on load direction
      if (dl.direction === 'global-y') {
        equivalentForces.push({
          fx: 0, fy: resultant,
          x: globalX, y: globalY,
          source: `DL on ${member.startLabel}${member.endLabel}`
        });
      } else if (dl.direction === 'global-x') {
        equivalentForces.push({
          fx: resultant, fy: 0,
          x: globalX, y: globalY,
          source: `DL on ${member.startLabel}${member.endLabel}`
        });
      } else if (dl.direction === 'perpendicular') {
        // Perpendicular to member axis: direction = (-sinθ, cosθ)
        equivalentForces.push({
          fx: resultant * (-member.sin),
          fy: resultant * (member.cos),
          x: globalX, y: globalY,
          source: `DL on ${member.startLabel}${member.endLabel}`
        });
      }
    }
  }

  return equivalentForces;
}
