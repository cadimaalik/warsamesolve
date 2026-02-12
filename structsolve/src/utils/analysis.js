import { supportReactions } from '../constants/supports.js';

/**
 * Structural classification.
 * For frames:  DOF = 3m + r - 3j - c
 * For trusses: DOF = m + r - 2j
 * DOF > 0 → statically indeterminate
 * DOF = 0 → statically determinate
 * DOF < 0 → unstable mechanism
 */
export function classify(nodes, members) {
  const j = nodes.length;
  const m = members.length;
  const r = nodes.reduce((sum, n) => sum + supportReactions(n.support), 0);
  const c = members.reduce((sum, mb) => sum + (mb.startHinge ? 1 : 0) + (mb.endHinge ? 1 : 0), 0);

  const hasFrame = members.some(mb => mb.type === 'frame');
  const hasTruss = members.some(mb => mb.type === 'truss');

  let DOF, method;
  if (hasFrame && !hasTruss) {
    DOF = 3 * m + r - 3 * j - c;
    method = 'frame';
  } else if (!hasFrame && hasTruss) {
    DOF = m + r - 2 * j;
    method = 'truss';
  } else {
    DOF = 3 * m + r - 3 * j - c;
    method = 'mixed';
  }

  let status;
  if (DOF > 0) status = 'indeterminate';
  else if (DOF === 0) status = 'determinate';
  else status = 'unstable';

  return { DOF, status, method, j, m, r, c };
}
