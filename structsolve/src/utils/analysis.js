import { supportReactions } from '../constants/supports.js';

/**
 * Structural classification using the general formula:
 *   DOF = 3·mf + mt + r − 3·jf − 2·jt − c
 *
 * Where:
 *   mf = frame member count
 *   mt = truss member count
 *   jf = frame joints (connected to at least 1 frame member)
 *   jt = truss-only joints (connected ONLY to truss members)
 *   r  = total reaction count
 *   c  = hinge conditions (moment releases at frame joints)
 *
 * Special cases:
 *   Pure frame: mt=0, jt=0 → DOF = 3m + r − 3j − c
 *   Pure truss: mf=0, jf=0, c=0 → DOF = m + r − 2j
 *   Mixed: uses full formula
 */
export function classify(nodes, members) {
  // Count frame and truss members
  const mf = members.filter(m => m.type !== 'truss').length;
  const mt = members.filter(m => m.type === 'truss').length;

  // Classify joints
  let jf = 0, jt = 0;
  nodes.forEach(n => {
    const connected = members.filter(m => m.startNodeId === n.id || m.endNodeId === n.id);
    if (connected.length === 0) return; // isolated node, skip
    const hasFrameMember = connected.some(m => m.type !== 'truss');
    if (hasFrameMember) {
      jf++;
    } else {
      jt++;
    }
  });

  // Count reactions
  const r = nodes.reduce((sum, n) => sum + supportReactions(n.support), 0);

  // Count hinge conditions at frame joints only
  let c = 0;
  nodes.forEach(n => {
    const connected = members.filter(m => m.startNodeId === n.id || m.endNodeId === n.id);
    if (connected.length === 0) return;
    const hasFrameMember = connected.some(m => m.type !== 'truss');
    if (!hasFrameMember) return; // truss-only joint — no hinge conditions

    // Count hinged member-ends at this frame joint
    let hingedCount = 0;
    connected.forEach(m => {
      if (m.type === 'truss') {
        // Truss members are always hinged at their ends
        hingedCount++;
      } else {
        // Frame member — check if this end is hinged
        if (m.startNodeId === n.id && m.startHinge) hingedCount++;
        if (m.endNodeId === n.id && m.endHinge) hingedCount++;
      }
    });

    const totalMembers = connected.length;
    if (hingedCount === totalMembers && totalMembers > 1) {
      // All member-ends hinged at this joint
      c += totalMembers - 1;
    } else {
      // Only some member-ends hinged
      c += hingedCount;
    }
  });

  // Structure type
  const hasFrame = mf > 0;
  const hasTruss = mt > 0;
  let type;
  if (hasFrame && hasTruss) type = 'Mixed';
  else if (hasFrame) type = 'Frame';
  else type = 'Truss';

  // General formula
  const DOF = 3 * mf + mt + r - 3 * jf - 2 * jt - c;

  let status;
  if (DOF > 0) status = 'indeterminate';
  else if (DOF === 0) status = 'determinate';
  else status = 'unstable';

  return { DOF, status, type, mf, mt, jf, jt, r, c, j: nodes.length, m: members.length };
}
