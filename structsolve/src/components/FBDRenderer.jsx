/**
 * FBDRenderer.jsx
 * Renders a Free Body Diagram as an SVG.
 * Works entirely in engineering coordinates (meters, y-up) passed from solutionGenerator.
 * Converts to SVG internally (y-flipped, scaled to fit).
 */
import React from 'react';

const COLORS = {
  bg: '#0f0f0f',
  member: '#4ade80',         // green members
  support: '#fbbf24',        // yellow supports
  load: '#ffffff',           // white applied loads
  reaction: '#ffffff',       // white reaction arrows (unknown)
  reactionSolved: '#4ade80', // green for solved reactions on sub-structure/global
  nodeLabel: '#e5e5e5',
  cut: '#e5e5e5',            // open circle at hinge cut
  hinge: '#ffffff',          // internal hinge dot
  dl: 'rgba(255,255,255,0.10)',
  dlStroke: '#ffffff',
};

// ── Coordinate transform ──────────────────────────────────────────
function computeTransform(nodes, svgW, svgH, padPx = 48) {
  if (!nodes || nodes.length === 0) {
    return { scale: 30, offsetX: svgW / 2, offsetY: svgH / 2 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
  }
  const rangeX = Math.max(maxX - minX, 0.1);
  const rangeY = Math.max(maxY - minY, 0.1);
  const drawW = svgW - padPx * 2;
  const drawH = svgH - padPx * 2;
  const scale = Math.min(drawW / rangeX, drawH / rangeY);
  const offsetX = padPx + (drawW - rangeX * scale) / 2 - minX * scale;
  const offsetY = padPx + (drawH - rangeY * scale) / 2 + maxY * scale;
  return { scale, offsetX, offsetY, minX, maxX, minY, maxY };
}

function toSVG(engX, engY, t) {
  return { x: engX * t.scale + t.offsetX, y: -engY * t.scale + t.offsetY };
}

// ── Arrow primitive ───────────────────────────────────────────────
function Arrow({ x1, y1, x2, y2, color, dashed, strokeWidth = 2 }) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return null;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const hw = 5, hl = 10;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={dashed ? '6 3' : 'none'} />
      <polygon
        points={`0,0 ${-hl},${-hw} ${-hl},${hw}`}
        fill={color}
        transform={`translate(${x2},${y2}) rotate(${angle})`}
      />
    </g>
  );
}

// ── Moment arc (CCW = positive in engineering) ────────────────────
function MomentArcSVG({ cx, cy, r, ccw, color, label }) {
  // Draw an arc + arrowhead. ccw=true → CCW in engineering (= CW in SVG since y is flipped)
  const startA = ccw ? -30 : 30;   // degrees from east
  const sweepA = ccw ? -240 : 240;
  const rad = (a) => a * Math.PI / 180;
  const x1 = cx + r * Math.cos(rad(startA));
  const y1 = cy + r * Math.sin(rad(startA));
  const endA = startA + sweepA;
  const x2 = cx + r * Math.cos(rad(endA));
  const y2 = cy + r * Math.sin(rad(endA));
  const largeArc = Math.abs(sweepA) > 180 ? 1 : 0;
  const sweep = sweepA > 0 ? 1 : 0;
  const angle = (endA + (ccw ? 90 : -90)) * Math.PI / 180;
  const hw = 5, hl = 10;
  return (
    <g>
      <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`}
        fill="none" stroke={color} strokeWidth={2} />
      <polygon
        points={`0,0 ${-hl},${-hw} ${-hl},${hw}`}
        fill={color}
        transform={`translate(${x2},${y2}) rotate(${angle * 180 / Math.PI})`}
      />
      {label && (
        <text x={cx + (r + 14) * (ccw ? -1 : 1)} y={cy + 5}
          fill={color} fontSize={12} fontFamily="'JetBrains Mono', monospace"
          textAnchor={ccw ? 'end' : 'start'}>
          {label}
        </text>
      )}
    </g>
  );
}

// ── Support symbols (in SVG px coords) ───────────────────────────
function SupportSVG({ type, sx, sy, angle, color }) {
  // angle in degrees: 0 = below node (standard), 90 = right, 180 = above, 270 = left
  const rad = angle * Math.PI / 180;
  const cosA = Math.cos(rad), sinA = Math.sin(rad);
  // Transform: rotate(angle) then translate to (sx,sy)
  const T = `translate(${sx},${sy}) rotate(${angle})`;

  switch (type) {
    case 'pin': {
      // Triangle pointing "outward" (downward by default, rotated by angle)
      // Ground line + hatching
      return (
        <g transform={T} stroke={color} strokeWidth={1.5} fill="none">
          <polygon points="0,0 -10,16 10,16" />
          <line x1="-13" y1="16" x2="13" y2="16" />
          {[-8, -3, 2, 7].map(ox => (
            <line key={ox} x1={ox} y1="16" x2={ox - 4} y2="22" strokeWidth={1} />
          ))}
        </g>
      );
    }
    case 'roller-h': {
      // Triangle + 3 circles below (vertical reaction only)
      return (
        <g transform={T} stroke={color} strokeWidth={1.5} fill="none">
          <polygon points="0,0 -10,14 10,14" />
          <circle cx="-6" cy="20" r="4" />
          <circle cx="0"  cy="20" r="4" />
          <circle cx="6"  cy="20" r="4" />
          <line x1="-13" y1="25" x2="13" y2="25" />
          {[-8, -3, 2, 7].map(ox => (
            <line key={ox} x1={ox} y1="25" x2={ox - 4} y2="31" strokeWidth={1} />
          ))}
        </g>
      );
    }
    case 'roller-v': {
      // Same as roller-h but rotated 90° → vertical member with horizontal reaction
      return (
        <g transform={T} stroke={color} strokeWidth={1.5} fill="none">
          <polygon points="0,0 -10,14 10,14" />
          <circle cx="-6" cy="20" r="4" />
          <circle cx="0"  cy="20" r="4" />
          <circle cx="6"  cy="20" r="4" />
          <line x1="-13" y1="25" x2="13" y2="25" />
          {[-8, -3, 2, 7].map(ox => (
            <line key={ox} x1={ox} y1="25" x2={ox - 4} y2="31" strokeWidth={1} />
          ))}
        </g>
      );
    }
    case 'fixed': {
      // Hatched wall plate
      return (
        <g transform={T} stroke={color} strokeWidth={1.5} fill="none">
          <line x1="0" y1="-18" x2="0" y2="18" strokeWidth={2.5} />
          {[-14, -8, -2, 4, 10].map(oy => (
            <line key={oy} x1="0" y1={oy} x2="8" y2={oy + 6} strokeWidth={1} />
          ))}
        </g>
      );
    }
    case 'guide-h': {
      // Roller + fixed: reaction is Ry + M
      return (
        <g transform={T} stroke={color} strokeWidth={1.5} fill="none">
          <circle cx="-6" cy="6" r="4" />
          <circle cx="0"  cy="6" r="4" />
          <circle cx="6"  cy="6" r="4" />
          <line x1="-12" y1="11" x2="12" y2="11" strokeWidth={2} />
          {[-8, -3, 2, 7].map(ox => (
            <line key={ox} x1={ox} y1="11" x2={ox - 4} y2="17" strokeWidth={1} />
          ))}
        </g>
      );
    }
    case 'guide-v': {
      return (
        <g transform={T} stroke={color} strokeWidth={1.5} fill="none">
          <circle cx="6" cy="-6" r="4" />
          <circle cx="6" cy="0"  r="4" />
          <circle cx="6" cy="6"  r="4" />
          <line x1="11" y1="-12" x2="11" y2="12" strokeWidth={2} />
          {[-8, -3, 2, 7].map(oy => (
            <line key={oy} x1="11" y1={oy} x2="17" y2={oy - 4} strokeWidth={1} />
          ))}
        </g>
      );
    }
    default: return null;
  }
}

// ── Determine which way a support faces ──────────────────────────
// Returns angle in degrees for the support symbol rotation.
// 0 = symbol points "down" (outward = below node = typical for beams)
function getSupportAngle(nodeId, nodes, members, supportType) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return 0;
  const connected = members.filter(
    m => m.startNodeId === nodeId || m.endNodeId === nodeId
  );
  if (connected.length === 0) return 0;

  // Average direction FROM node TOWARD connected structure
  let sumDx = 0, sumDy = 0;
  for (const m of connected) {
    const otherId = m.startNodeId === nodeId ? m.endNodeId : m.startNodeId;
    const other = nodes.find(n => n.id === otherId);
    if (!other) continue;
    const dx = other.x - node.x, dy = other.y - node.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1e-12) continue;
    sumDx += dx / L; sumDy += dy / L;
  }
  // The support "faces away" from the structure → invert
  // In engineering space (y-up), angle from +x axis:
  const engAngle = Math.atan2(-sumDy, -sumDx) * 180 / Math.PI;

  // Snap to nearest 90°
  let snapped = Math.round(engAngle / 90) * 90;

  // For fixed/guide: they typically face perpendicular to the member
  // For roller/pin: face directly away from structure
  // Convert from engineering (y-up, CCW positive) to SVG (y-down, CW positive)
  // In SVG: the "downward" direction is +y, so:
  // Engineering 0° (right) → SVG 0° rotates the symbol rightward
  // Engineering 90° (up) → SVG -90° (rotated so symbol points "right/up in SVG")
  // The symbol default is drawn pointing "downward" in SVG (outward = SVG +y direction)
  // "Outward from structure" in engineering:
  //   -90° (pointing down in eng) → SVG: 0° (default, symbol points down in SVG)
  //   +90° (pointing up in eng) → SVG: 180° (symbol points up in SVG)
  //   0° (pointing right in eng) → SVG: 90° (symbol points right in SVG)
  //   180° (pointing left in eng) → SVG: 270° or -90° (symbol points left in SVG)

  // SVG angle = -(engineering_outward_angle + 90°)
  const outwardEng = snapped; // degrees, CCW from +x
  const svgAngle = -(outwardEng + 90);
  return svgAngle;
}

// ── Distributed load shape ────────────────────────────────────────
function DistributedLoadShape({ member, dl, nodes, t }) {
  const sn = nodes.find(n => n.id === member.startNodeId);
  const en = nodes.find(n => n.id === member.endNodeId);
  if (!sn || !en) return null;
  const loadLen = dl.endPos - dl.startPos;
  if (loadLen <= 0) return null;

  const pStart = toSVG(sn.x, sn.y, t);
  const pEnd   = toSVG(en.x, en.y, t);
  const memDx = pEnd.x - pStart.x, memDy = pEnd.y - pStart.y;
  const memLen = Math.sqrt(memDx * memDx + memDy * memDy);
  if (memLen < 1) return null;

  // Member unit vector (SVG)
  const ux = memDx / memLen, uy = memDy / memLen;
  // Normal (perpendicular, pointing "upward" relative to member in SVG)
  // For "global-y" loads: perpendicular is SVG upward (-y)
  let nx, ny;
  if (dl.direction === 'global-y') {
    nx = 0; ny = -1; // upward in SVG
  } else if (dl.direction === 'global-x') {
    nx = 1; ny = 0;
  } else {
    // perpendicular to member (left-hand normal in SVG)
    nx = -uy; ny = ux;
  }

  const tStart = (member.length > 0) ? dl.startPos / member.length : 0;
  const tEnd   = (member.length > 0) ? dl.endPos   / member.length : 1;

  const p1 = { x: pStart.x + tStart * memDx, y: pStart.y + tStart * memDy };
  const p2 = { x: pStart.x + tEnd   * memDx, y: pStart.y + tEnd   * memDy };

  const LOAD_SCALE = 3; // px per kN/m
  const h1 = Math.abs(dl.startIntensity) * LOAD_SCALE;
  const h2 = Math.abs(dl.endIntensity)   * LOAD_SCALE;

  // Direction of arrows (positive intensity → in the +normal direction)
  const sign = (dl.startIntensity !== 0 ? dl.startIntensity : dl.endIntensity) < 0 ? -1 : 1;

  const pts = [
    `${p1.x},${p1.y}`,
    `${p2.x},${p2.y}`,
    `${p2.x + nx * h2 * sign},${p2.y + ny * h2 * sign}`,
    `${p1.x + nx * h1 * sign},${p1.y + ny * h1 * sign}`,
  ].join(' ');

  // Small arrows inside shape
  const arrowCount = Math.max(3, Math.min(8, Math.floor(loadLen / 0.5) + 2));
  const smallArrows = [];
  for (let i = 0; i <= arrowCount; i++) {
    const frac = i / arrowCount;
    const pos = dl.startPos + frac * loadLen;
    const pFrac = pos / member.length;
    const px = pStart.x + pFrac * memDx;
    const py = pStart.y + pFrac * memDy;
    const w = dl.startIntensity + frac * (dl.endIntensity - dl.startIntensity);
    const h = Math.abs(w) * LOAD_SCALE;
    if (h < 2) continue;
    const tx1 = px + nx * h * sign, ty1 = py + ny * h * sign;
    smallArrows.push(
      <line key={i} x1={tx1} y1={ty1} x2={px} y2={py}
        stroke={COLORS.load} strokeWidth={1} opacity={0.6} />
    );
  }

  // Labels
  const labelOffset = 12;
  const labels = [];
  if (Math.abs(dl.startIntensity) > 1e-10) {
    const lx = p1.x + nx * h1 * sign + nx * labelOffset;
    const ly = p1.y + ny * h1 * sign + ny * labelOffset;
    labels.push(
      <text key="s" x={lx} y={ly} fill={COLORS.load} fontSize={10}
        fontFamily="'JetBrains Mono', monospace" textAnchor="middle">
        {Math.abs(dl.startIntensity)} kN/m
      </text>
    );
  }
  if (Math.abs(dl.endIntensity - dl.startIntensity) > 1e-10 && Math.abs(dl.endIntensity) > 1e-10) {
    const lx = p2.x + nx * h2 * sign + nx * labelOffset;
    const ly = p2.y + ny * h2 * sign + ny * labelOffset;
    labels.push(
      <text key="e" x={lx} y={ly} fill={COLORS.load} fontSize={10}
        fontFamily="'JetBrains Mono', monospace" textAnchor="middle">
        {Math.abs(dl.endIntensity)} kN/m
      </text>
    );
  }
  if (Math.abs(dl.startIntensity - dl.endIntensity) < 1e-10 && Math.abs(dl.startIntensity) > 1e-10) {
    // UDL: center label
    const midT = (tStart + tEnd) / 2;
    const mx = pStart.x + midT * memDx + nx * h1 * sign + nx * labelOffset;
    const my = pStart.y + midT * memDy + ny * h1 * sign + ny * labelOffset;
    labels.push(
      <text key="m" x={mx} y={my} fill={COLORS.load} fontSize={10}
        fontFamily="'JetBrains Mono', monospace" textAnchor="middle">
        {Math.abs(dl.startIntensity)} kN/m
      </text>
    );
    // Remove the startIntensity label (replace with center)
    labels.splice(0, 1);
  }

  return (
    <g>
      <polygon points={pts} fill={COLORS.dl} stroke={COLORS.dlStroke} strokeWidth={1} />
      {smallArrows}
      {labels}
    </g>
  );
}

// ── Point load arrow in SVG coords ───────────────────────────────
function PointLoadArrow({ sx, sy, fx, fy, scale, color, label }) {
  const ARROW_LEN = Math.max(28, Math.min(60, scale * 0.7));
  const HEAD_W = 4, HEAD_L = 9;
  const elements = [];

  if (Math.abs(fy) > 1e-10) {
    // SVG y is flipped: fy > 0 (upward eng) → arrow pointing up (negative SVG y)
    const dir = fy > 0 ? -1 : 1; // -1 = up in SVG, +1 = down in SVG
    const tx = sx;
    const ty = sy; // arrow HEAD is at the node
    const tailY = ty - dir * ARROW_LEN;
    const angle = dir > 0 ? 90 : -90; // 90 = pointing down, -90 = pointing up
    // Label at tail (top of arrow body), not at head
    const lblY = dir > 0 ? tailY - 8 : tailY + 12;
    elements.push(
      <g key="fy">
        <line x1={tx} y1={tailY} x2={tx} y2={ty} stroke={color} strokeWidth={2} />
        <polygon points={`0,0 ${-HEAD_L},${-HEAD_W} ${-HEAD_L},${HEAD_W}`}
          fill={color} transform={`translate(${tx},${ty}) rotate(${angle})`} />
        <text x={tx + 7} y={lblY} fill={color} fontSize={11}
          fontFamily="'JetBrains Mono', monospace">
          {Math.abs(fy)} kN
        </text>
      </g>
    );
  }

  if (Math.abs(fx) > 1e-10) {
    // fx > 0 → pointing right (positive SVG x)
    const dir = fx > 0 ? 1 : -1;
    const tx = sx; // HEAD at node
    const tailX = tx - dir * ARROW_LEN;
    const angle = fx > 0 ? 0 : 180;
    // Label at tail (start of arrow body)
    const lblX = dir > 0 ? tailX - 4 : tailX + 4;
    elements.push(
      <g key="fx">
        <line x1={tailX} y1={sy} x2={tx} y2={sy} stroke={color} strokeWidth={2} />
        <polygon points={`0,0 ${-HEAD_L},${-HEAD_W} ${-HEAD_L},${HEAD_W}`}
          fill={color} transform={`translate(${tx},${sy}) rotate(${angle})`} />
        <text x={lblX} y={sy - 6} fill={color} fontSize={11}
          fontFamily="'JetBrains Mono', monospace"
          textAnchor={dir > 0 ? 'end' : 'start'}>
          {Math.abs(fx)} kN
        </text>
      </g>
    );
  }

  return elements.length > 0 ? <g>{elements}</g> : null;
}

// ── Reaction arrow ────────────────────────────────────────────────
// type: 'Rx'|'Ry'|'M', label: 'A_x', value (if solved), mode: 'unknown'|'solved'
function ReactionArrow({ nodeId, type, label, value, mode, nodes, t }) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  const { x: sx, y: sy } = toSVG(node.x, node.y, t);

  const ARROW_LEN = Math.max(30, t.scale * 0.5);
  const color = mode === 'solved' ? COLORS.reactionSolved : COLORS.reaction;

  // For solved reactions, reverse direction if negative
  const actualValue = mode === 'solved' ? value : 0;
  const displayLabel = mode === 'solved'
    ? `${Math.abs(actualValue).toFixed(2)} kN`
    : label;

  if (type === 'Rx') {
    // Horizontal reaction. Assumed → right (positive). If solved & negative → actual is left.
    const dir = (mode === 'solved' && actualValue < 0) ? -1 : 1;
    // Arrow pointing in the force direction, HEAD at arrowhead
    const headX = sx + dir * ARROW_LEN;
    return (
      <g>
        <Arrow x1={sx} y1={sy} x2={headX} y2={sy} color={color} />
        <text x={headX + dir * 6} y={sy + 4} fill={color} fontSize={11}
          fontFamily="'JetBrains Mono', monospace"
          textAnchor={dir > 0 ? 'start' : 'end'}>
          {displayLabel}
        </text>
      </g>
    );
  }

  if (type === 'Ry') {
    // Vertical reaction. Assumed → up (positive). In SVG: up = negative y.
    const dir = (mode === 'solved' && actualValue < 0) ? 1 : -1; // -1 = up in SVG
    const headY = sy + dir * ARROW_LEN;
    return (
      <g>
        <Arrow x1={sx} y1={sy} x2={sx} y2={headY} color={color} />
        <text x={sx + 7} y={headY + (dir < 0 ? -4 : 16)} fill={color} fontSize={11}
          fontFamily="'JetBrains Mono', monospace">
          {displayLabel}
        </text>
      </g>
    );
  }

  if (type === 'M') {
    // Moment reaction. Assumed → CCW (positive). SVG: CCW = engineered CCW (y flipped → CW in screen space)
    // When y is flipped, CCW in engineering = CW in SVG. We draw the arc appropriately.
    const ccw = !(mode === 'solved' && actualValue < 0);
    const r = Math.max(18, t.scale * 0.35);
    return <MomentArcSVG cx={sx} cy={sy} r={r} ccw={ccw} color={color} label={displayLabel} />;
  }

  return null;
}

// ── Internal hinge indicator ──────────────────────────────────────
function HingeIndicator({ nodeId, nodes, t }) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  const { x: sx, y: sy } = toSVG(node.x, node.y, t);
  return <circle cx={sx} cy={sy} r={6} fill="none" stroke={COLORS.cut} strokeWidth={1.5} strokeDasharray="3 2" />;
}

// ── Internal hinge (between connected members, no support) ─────────
function InternalHingeDot({ nodeId, nodes, t }) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  const { x: sx, y: sy } = toSVG(node.x, node.y, t);
  return <circle cx={sx} cy={sy} r={4} fill={COLORS.hinge} stroke="#374151" strokeWidth={1.5} />;
}

// ── Member force arrow (for truss joint FBDs — variable name labels) ─
function MemberForceArrow({ nodeId, otherNodeId, label, nodes, t }) {
  const node = nodes.find(n => n.id === nodeId);
  const other = nodes.find(n => n.id === otherNodeId);
  if (!node || !other) return null;

  const { x: sx, y: sy } = toSVG(node.x, node.y, t);

  const dx = other.x - node.x;
  const dy = other.y - node.y;
  const L = Math.sqrt(dx * dx + dy * dy);
  if (L < 1e-12) return null;

  // Unit direction in SVG coords (y-flipped)
  const ux = dx / L;
  const uy = -dy / L; // flip y for SVG

  const ARROW_LEN = Math.max(28, Math.min(60, t.scale * 0.7));
  const headX = sx + ux * ARROW_LEN;
  const headY = sy + uy * ARROW_LEN;

  // Place label beyond arrowhead
  const lblX = headX + ux * 14;
  const lblY = headY + uy * 14;

  return (
    <g>
      <Arrow x1={sx} y1={sy} x2={headX} y2={headY} color={COLORS.reaction} strokeWidth={2} />
      <text x={lblX} y={lblY + 4}
        fill={COLORS.reaction} fontSize={11}
        fontFamily="'JetBrains Mono', monospace"
        textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function FBDRenderer({
  nodes,                  // solver nodes (meters, y-up)
  members,                // solver members
  reactionItems,          // [{nodeId, type, label, value?, mode:'unknown'|'solved'}]
  memberForceArrows,      // [{nodeId, otherNodeId, label}] — truss joint force arrows
  memberClassifications,  // {[memberId]: 'Tension (T)'|'Compression (C)'|'Zero Force'} — for coloring
  showLegend,             // boolean — show T/C/zero legend
  cutNodeIds,             // Set or array of nodeIds to show as hinge cuts (open ⊘)
  highlightNodeIds,       // if non-null/Set, only draw members/nodes in this set (subset mode)
  maxHeight = 300,
}) {
  const SVG_W = 600;
  const SVG_H = maxHeight;
  const PAD = 60;

  if (!nodes || nodes.length === 0) return null;

  // Compute transform always from full nodes array so joint FBDs get proper scale
  const t = computeTransform(nodes, SVG_W, SVG_H, PAD);

  // Visible nodes/members for rendering (subset mode for joint FBDs)
  const visibleNodes = highlightNodeIds
    ? nodes.filter(n => highlightNodeIds.has(n.id))
    : nodes;

  // Filter members if subset
  const visibleMembers = highlightNodeIds
    ? members.filter(m => highlightNodeIds.has(m.startNodeId) && highlightNodeIds.has(m.endNodeId))
    : members;

  const cutSet = new Set(cutNodeIds || []);

  // Find internal hinges: frame members with hinge at both ends of a node, no support
  const internalHingeIds = new Set();
  for (const node of nodes) {
    if (node.support) continue;
    const connected = members.filter(
      m => (m.startNodeId === node.id || m.endNodeId === node.id) && m.type === 'frame'
    );
    const hasHinge = connected.some(m => {
      if (m.startNodeId === node.id) return m.startHinge;
      return m.endHinge;
    });
    if (hasHinge && connected.length >= 2) internalHingeIds.add(node.id);
  }

  return (
    <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ background: COLORS.bg, borderRadius: 8, border: '1px solid #2a2a2a', display: 'block' }}>

      {/* Layer 1: Distributed load shapes */}
      {visibleMembers.map(m => {
        if (!m.distributedLoads || m.distributedLoads.length === 0) return null;
        return m.distributedLoads.map((dl, di) => (
          <DistributedLoadShape key={`${m.id}-dl-${di}`} member={m} dl={dl} nodes={nodes} t={t} />
        ));
      })}

      {/* Layer 2: Members — colored by T/C classification if provided */}
      {visibleMembers.map(m => {
        const sn = nodes.find(n => n.id === m.startNodeId);
        const en = nodes.find(n => n.id === m.endNodeId);
        if (!sn || !en) return null;
        const p1 = toSVG(sn.x, sn.y, t);
        const p2 = toSVG(en.x, en.y, t);
        const isTruss = m.type === 'truss';
        const cls = memberClassifications?.[m.id];
        const color = cls === 'Tension (T)'    ? '#4ade80'
                    : cls === 'Compression (C)' ? '#60a5fa'
                    : cls === 'Zero Force'       ? '#6b7280'
                    : COLORS.member;
        return (
          <line key={m.id}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={color}
            strokeWidth={isTruss ? 2.5 : 3}
            strokeDasharray={isTruss ? 'none' : 'none'}
          />
        );
      })}

      {/* Legend — shown when memberClassifications is provided */}
      {showLegend && (
        <g transform="translate(12, 12)">
          <rect x={-4} y={-4} width={110} height={64} rx={4}
            fill="#0a0a0a" stroke="#2a2a2a" strokeWidth={1} />
          <rect x={0} y={4}  width={12} height={12} rx={2} fill="#4ade80" />
          <text x={16} y={14} fill="#e5e5e5" fontSize={10}
            fontFamily="'JetBrains Mono', monospace">Tension</text>
          <rect x={0} y={22} width={12} height={12} rx={2} fill="#60a5fa" />
          <text x={16} y={32} fill="#e5e5e5" fontSize={10}
            fontFamily="'JetBrains Mono', monospace">Compression</text>
          <rect x={0} y={40} width={12} height={12} rx={2} fill="#6b7280" />
          <text x={16} y={50} fill="#e5e5e5" fontSize={10}
            fontFamily="'JetBrains Mono', monospace">Zero force</text>
        </g>
      )}

      {/* Layer 3: Hinge cut markers (open circle at cut) */}
      {Array.from(cutSet).map(nid => (
        <HingeIndicator key={`cut-${nid}`} nodeId={nid} nodes={nodes} t={t} />
      ))}

      {/* Layer 3b: Internal hinge dots */}
      {Array.from(internalHingeIds).map(nid => (
        <InternalHingeDot key={`hinge-${nid}`} nodeId={nid} nodes={nodes} t={t} />
      ))}

      {/* Layer 4: Support symbols */}
      {visibleNodes.map(n => {
        if (!n.support) return null;
        const { x: sx, y: sy } = toSVG(n.x, n.y, t);
        const angle = getSupportAngle(n.id, nodes, members, n.support);
        return (
          <SupportSVG key={`sup-${n.id}`} type={n.support} sx={sx} sy={sy}
            angle={angle} color={COLORS.support} />
        );
      })}

      {/* Layer 5: Applied point loads */}
      {visibleNodes.map(n => {
        const { fx = 0, fy = 0, m: moment = 0 } = n.loads || {};
        const { x: sx, y: sy } = toSVG(n.x, n.y, t);
        const elements = [];
        if (Math.abs(fx) > 1e-10 || Math.abs(fy) > 1e-10) {
          elements.push(
            <PointLoadArrow key={`pl-${n.id}`} sx={sx} sy={sy}
              fx={fx} fy={fy} scale={t.scale} color={COLORS.load} />
          );
        }
        if (Math.abs(moment) > 1e-10) {
          elements.push(
            <MomentArcSVG key={`ma-${n.id}`}
              cx={sx} cy={sy} r={Math.max(14, t.scale * 0.3)}
              ccw={moment > 0} color={COLORS.load}
              label={`${Math.abs(moment)} kN·m`} />
          );
        }
        return elements.length > 0 ? <g key={`loads-${n.id}`}>{elements}</g> : null;
      })}

      {/* Layer 6: Reaction arrows */}
      {(reactionItems || []).map((r, i) => (
        <ReactionArrow key={`rxn-${i}`} {...r} nodes={nodes} t={t} />
      ))}

      {/* Layer 6b: Member force arrows (truss joint FBDs) */}
      {(memberForceArrows || []).map((mfa, i) => (
        <MemberForceArrow key={`mfa-${i}`} {...mfa} nodes={nodes} t={t} />
      ))}

      {/* Layer 7: Node dots */}
      {visibleNodes.map(n => {
        const { x: sx, y: sy } = toSVG(n.x, n.y, t);
        const isHinge = internalHingeIds.has(n.id);
        return (
          <circle key={`nd-${n.id}`} cx={sx} cy={sy} r={4}
            fill={isHinge ? '#ffffff' : '#1a1f2b'}
            stroke={isHinge ? '#374151' : '#4ade80'}
            strokeWidth={1.5} />
        );
      })}

      {/* Layer 8: Node labels */}
      {visibleNodes.map(n => {
        const { x: sx, y: sy } = toSVG(n.x, n.y, t);
        // Label offset: try to place away from members
        const connected = members.filter(
          m => m.startNodeId === n.id || m.endNodeId === n.id
        );
        let offX = 0, offY = -14;
        if (connected.length > 0) {
          let sumDx = 0, sumDy = 0;
          for (const m of connected) {
            const oid = m.startNodeId === n.id ? m.endNodeId : m.startNodeId;
            const o = nodes.find(nd => nd.id === oid);
            if (!o) continue;
            const p1 = toSVG(n.x, n.y, t), p2 = toSVG(o.x, o.y, t);
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const L = Math.sqrt(dx * dx + dy * dy);
            if (L > 0) { sumDx += dx / L; sumDy += dy / L; }
          }
          if (sumDx * sumDx + sumDy * sumDy > 0.01) {
            const L = Math.sqrt(sumDx * sumDx + sumDy * sumDy);
            offX = -sumDx / L * 14;
            offY = -sumDy / L * 14;
          }
        }
        return (
          <text key={`lbl-${n.id}`} x={sx + offX} y={sy + offY}
            fill={COLORS.nodeLabel} fontSize={12}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={700} textAnchor="middle">
            {n.label || n.id}
          </text>
        );
      })}
    </svg>
  );
}
