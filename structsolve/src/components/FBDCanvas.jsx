// FBDCanvas.jsx — Reusable SVG canvas for Free Body Diagrams
// Renders members, node dots, force arrows, moment arcs, dimension arms
// Coordinates: solver uses engineering y-up; this component converts to SVG y-down
import React from 'react';
import ForceArrow from './ForceArrow.jsx';
import FBDMomentArc from './FBDMomentArc.jsx';

const ARROW_LEN = 40;     // px length of force arrows
const PADDING = 60;        // px padding around auto-fit viewBox
const BG = '#fdf6ee';      // same as canvas background
const GRID_C = '#e0d5c7';
const MEMBER_C = '#1a1f2b';
const TRUSS_C = '#c2410c';
const NODE_C = '#374151';
const DIM_C = '#6b7280';   // gray for dimension arms
const HINGE_FILL = '#ffffff';
const HINGE_STROKE = '#374151';

/**
 * Convert engineering coordinates (y-up) to SVG coordinates (y-down).
 * The solver stores y in engineering convention (positive = up).
 * SVG y-axis points down. We simply negate y.
 */
function toSVG(engX, engY, PPM) {
  return { x: engX * PPM, y: -engY * PPM };
}

/**
 * Auto-fit viewBox to contain all nodes + arrows with padding.
 */
function computeViewBox(svgNodes, arrows, moments) {
  if (svgNodes.length === 0) return { x: 0, y: 0, w: 400, h: 200 };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (const n of svgNodes) {
    minX = Math.min(minX, n.sx);
    maxX = Math.max(maxX, n.sx);
    minY = Math.min(minY, n.sy);
    maxY = Math.max(maxY, n.sy);
  }

  // Expand to contain arrow endpoints
  for (const a of (arrows || [])) {
    minX = Math.min(minX, a.x1, a.x2);
    maxX = Math.max(maxX, a.x1, a.x2);
    minY = Math.min(minY, a.y1, a.y2);
    maxY = Math.max(maxY, a.y1, a.y2);
  }

  // Expand for moments
  for (const m of (moments || [])) {
    const r = 20;
    minX = Math.min(minX, m.cx - r);
    maxX = Math.max(maxX, m.cx + r);
    minY = Math.min(minY, m.cy - r);
    maxY = Math.max(maxY, m.cy + r);
  }

  const w = maxX - minX + PADDING * 2;
  const h = maxY - minY + PADDING * 2;

  return {
    x: minX - PADDING,
    y: minY - PADDING,
    w: Math.max(w, 200),
    h: Math.max(h, 120)
  };
}

/**
 * FBDCanvas renders a free body diagram for a single step.
 *
 * @param {Object} fbd - FBD data from fbdGenerator.js
 *   fbd.nodes - solver nodes to draw (engineering coords)
 *   fbd.members - solver members to draw
 *   fbd.arrows - [{x1e,y1e,x2e,y2e,color,label,style}] in engineering coords
 *   fbd.moments - [{nodeId,value,color,label}]
 *   fbd.dimensionArms - [{fromX,fromY,toX,toY,label}] in engineering coords (moment arms)
 *   fbd.PPM - pixels per meter
 *   fbd.title - optional title
 *   fbd.highlightNodes - set of node IDs to highlight
 */
export default function FBDCanvas({ fbd }) {
  if (!fbd || !fbd.nodes || fbd.nodes.length === 0) return null;

  const PPM = fbd.PPM || 50;

  // Convert nodes to SVG coordinates
  const svgNodes = fbd.nodes.map(n => {
    const { x, y } = toSVG(n.x, n.y, PPM);
    return { ...n, sx: x, sy: y };
  });

  // Convert arrows to SVG coordinates
  const svgArrows = (fbd.arrows || []).map((a, i) => {
    const from = toSVG(a.x1e, a.y1e, PPM);
    const to = toSVG(a.x2e, a.y2e, PPM);
    return { ...a, x1: from.x, y1: from.y, x2: to.x, y2: to.y, key: i };
  });

  // Convert moments to SVG coordinates
  const svgMoments = (fbd.moments || []).map((m, i) => {
    const node = svgNodes.find(n => n.id === m.nodeId);
    if (!node) return null;
    return { ...m, cx: node.sx, cy: node.sy, key: i };
  }).filter(Boolean);

  // Convert dimension arms to SVG coordinates
  const svgDimArms = (fbd.dimensionArms || []).map((d, i) => {
    const from = toSVG(d.fromX, d.fromY, PPM);
    const to = toSVG(d.toX, d.toY, PPM);
    return { ...d, x1: from.x, y1: from.y, x2: to.x, y2: to.y, key: i };
  });

  const viewBox = computeViewBox(svgNodes, svgArrows, svgMoments);

  // Build node lookup
  const nodeMap = {};
  for (const n of svgNodes) nodeMap[n.id] = n;

  return (
    <div style={{
      background: BG,
      border: '1px solid #e0d5c7',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {fbd.title && (
        <div style={{
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 700,
          color: '#374151',
          fontFamily: "'JetBrains Mono', monospace",
          borderBottom: '1px solid #e0d5c7',
          background: '#f5efe6',
        }}>
          {fbd.title}
        </div>
      )}
      <svg
        width="100%"
        height={Math.min(viewBox.h, 250)}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{ display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid */}
        <defs>
          <pattern id={`fbd-grid-${fbd.id || 0}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={GRID_C} strokeWidth={0.5} />
          </pattern>
        </defs>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill={BG} />
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h}
          fill={`url(#fbd-grid-${fbd.id || 0})`} />

        {/* Layer 1: Dimension arms (moment arms in moment-step FBDs) */}
        {svgDimArms.map(d => (
          <g key={'dim-' + d.key}>
            <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
              stroke={DIM_C} strokeWidth={1} strokeDasharray="4,3" />
            {/* Small circles at endpoints */}
            <circle cx={d.x1} cy={d.y1} r={2} fill={DIM_C} />
            <circle cx={d.x2} cy={d.y2} r={2} fill={DIM_C} />
            {/* Label at midpoint */}
            {d.label && (
              <text
                x={(d.x1 + d.x2) / 2}
                y={(d.y1 + d.y2) / 2 - 6}
                textAnchor="middle"
                fontSize={8}
                fill={DIM_C}
                fontFamily="'JetBrains Mono', monospace"
              >
                {d.label}
              </text>
            )}
          </g>
        ))}

        {/* Layer 2: Members */}
        {(fbd.members || []).map(m => {
          const sn = nodeMap[m.startNodeId];
          const en = nodeMap[m.endNodeId];
          if (!sn || !en) return null;
          const isTruss = m.type === 'truss';
          return (
            <line key={'mem-' + m.id}
              x1={sn.sx} y1={sn.sy}
              x2={en.sx} y2={en.sy}
              stroke={isTruss ? TRUSS_C : MEMBER_C}
              strokeWidth={isTruss ? 1.5 : 2.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Layer 3: Node dots — NO support symbols, just dots */}
        {svgNodes.map(n => {
          const isHinge = fbd.hingeNodes && fbd.hingeNodes.has(n.id);
          const isHighlight = fbd.highlightNodes && fbd.highlightNodes.has(n.id);
          return (
            <g key={'node-' + n.id}>
              {isHighlight && (
                <circle cx={n.sx} cy={n.sy} r={8}
                  fill="rgba(74, 222, 128, 0.2)" stroke="#4ade80" strokeWidth={1} />
              )}
              <circle cx={n.sx} cy={n.sy}
                r={isHinge ? 4.5 : 3.5}
                fill={isHinge ? HINGE_FILL : '#1a1f2b'}
                stroke={isHinge ? HINGE_STROKE : NODE_C}
                strokeWidth={1.5}
              />
              {/* Node label */}
              <text
                x={n.sx} y={n.sy - 8}
                textAnchor="middle"
                fontSize={9}
                fill="#374151"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={600}
              >
                {n.label}
              </text>
            </g>
          );
        })}

        {/* Layer 4: Force arrows */}
        {svgArrows.map(a => (
          <ForceArrow
            key={'arrow-' + a.key}
            x1={a.x1} y1={a.y1}
            x2={a.x2} y2={a.y2}
            color={a.color}
            label={a.label}
            style={a.style}
            strokeWidth={a.strokeWidth}
          />
        ))}

        {/* Layer 5: Moment arcs */}
        {svgMoments.map(m => (
          <FBDMomentArc
            key={'moment-' + m.key}
            cx={m.cx} cy={m.cy}
            value={m.value}
            color={m.color}
            label={m.label}
          />
        ))}
      </svg>
    </div>
  );
}
