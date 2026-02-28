import React, { useEffect, useRef, useMemo, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { COLORS as BRAND, FONTS } from '../constants/brand.js';
import { generateSolution, computeStrategy } from '../solver/solutionGenerator.js';
import SolutionStep from './SolutionStep.jsx';
import usePanZoom from '../hooks/usePanZoom.js';

// Canvas builder components — reused for read-only structure preview
import MemberLine from './svg/MemberLine.jsx';
import NodeDot from './svg/NodeDot.jsx';
import NodeLabel from './svg/NodeLabel.jsx';
import SupportSymbol from './svg/SupportSymbol.jsx';
import LoadArrows from './svg/LoadArrows.jsx';
import MomentArc from './svg/MomentArc.jsx';
import DistributedLoadArrows from './svg/DistributedLoadArrows.jsx';
import DimensionLine from './svg/DimensionLine.jsx';
import { getMemberLength } from '../utils/geometry.js';

const noop = () => {};

// ── Structure preview (read-only canvas) ──────────────────────────
function StructurePreview({ nodes, members }) {
  const svgRef = useRef(null);
  const { viewBox, fitToNodes } = usePanZoom();

  useEffect(() => {
    if (nodes.length > 0) fitToNodes(nodes);
  }, []);

  return (
    <div style={{
      position: 'relative', background: BRAND.canvasBg,
      border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden',
    }}>
      <svg
        ref={svgRef}
        width="100%" height="280"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{ display: 'block', background: BRAND.canvasBg, pointerEvents: 'none' }}
      >
        <defs>
          <pattern id="grid-solver" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={BRAND.gridLine} strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h}
          width={viewBox.w * 3} height={viewBox.h * 3} fill={BRAND.canvasBg} />
        <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h}
          width={viewBox.w * 3} height={viewBox.h * 3} fill="url(#grid-solver)" />

        {/* Dimension lines */}
        {members.map(m => {
          const sn = nodes.find(n => n.id === m.startNodeId);
          const en = nodes.find(n => n.id === m.endNodeId);
          if (!sn || !en) return null;
          return <DimensionLine key={'dim-' + m.id} startNode={sn} endNode={en} length={getMemberLength(m)} />;
        })}

        {/* Hinge white dots at supports where all members are hinged */}
        {nodes.map(n => {
          if (!n.support) return null;
          const connected = members.filter(m => m.startNodeId === n.id || m.endNodeId === n.id);
          if (connected.length === 0) return null;
          const allHinged = connected.every(m => {
            if (m.startNodeId === n.id) return m.startHinge || m.type === 'truss';
            return m.endHinge || m.type === 'truss';
          });
          if (!allHinged) return null;
          return <circle key={'supdot-' + n.id} cx={n.x} cy={n.y} r={5} fill="#ffffff" stroke="#374151" strokeWidth={1.5} />;
        })}

        {/* Members */}
        {members.map(m => {
          const sn = nodes.find(n => n.id === m.startNodeId);
          const en = nodes.find(n => n.id === m.endNodeId);
          if (!sn || !en) return null;
          return <MemberLine key={'mem-' + m.id} member={m} startNode={sn} endNode={en}
            isSelected={false} onSelect={noop} globalAxialMode={null} />;
        })}

        {/* Distributed loads */}
        {members.map(m => {
          if (!m.distributedLoads || m.distributedLoads.length === 0) return null;
          const sn = nodes.find(n => n.id === m.startNodeId);
          const en = nodes.find(n => n.id === m.endNodeId);
          if (!sn || !en) return null;
          return <DistributedLoadArrows key={'dl-' + m.id} member={m} startNode={sn} endNode={en} />;
        })}

        {/* Supports */}
        {nodes.map(n => (
          <SupportSymbol key={'sup-' + n.id} node={n} allNodes={nodes} members={members} />
        ))}

        {/* Point loads + moment arcs */}
        {nodes.map(n => (
          <React.Fragment key={'load-' + n.id}>
            <LoadArrows node={n} members={members} allNodes={nodes} />
            {n.loads.moment !== 0 && (
              <MomentArc x={n.x} y={n.y} moment={n.loads.moment} node={n} members={members} allNodes={nodes} />
            )}
          </React.Fragment>
        ))}

        {/* Nodes */}
        {nodes.map(n => (
          <NodeDot key={'node-' + n.id} node={n} members={members} allNodes={nodes}
            isSelected={false} isConnectTarget={false} />
        ))}

        {/* Labels */}
        {nodes.map(n => (
          <NodeLabel key={'lbl-' + n.id} node={n} allNodes={nodes} members={members} />
        ))}
      </svg>
    </div>
  );
}

// ── Strategy card ─────────────────────────────────────────────────
function StrategyCard({ strategy }) {
  if (!strategy) return null;
  return (
    <div style={{
      background: '#171717', border: '1px solid #2a2a2a', borderRadius: 8,
      padding: '14px 20px', marginBottom: 32,
      display: 'flex', gap: 12, alignItems: 'baseline',
    }}>
      <span style={{
        color: '#4ade80', fontWeight: 700, fontSize: 12,
        textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap',
      }}>
        Strategy
      </span>
      <span style={{ color: '#d1d5db', fontSize: 14 }}>{strategy.text}</span>
    </div>
  );
}

// ── Truss joint list — single vertical column (Fix 1) ────────────
function TrussJointGrid({ jointSteps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, margin: '20px 0' }}>
      {jointSteps.map((step, i) => (
        <SolutionStep key={i} step={step} stepNumber={null} inTrussGrid />
      ))}
    </div>
  );
}

// ── Main SolverPage ───────────────────────────────────────────────
export default function SolverPage({ nodes, members, methodName, solverResults, onBack, onEdit }) {
  const bodyRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  async function downloadPDF() {
    setGenerating(true);
    try {
      const element = bodyRef.current;

      // Flatten KaTeX to images — prevents doubled/overlapping text
      const katexElements = element.querySelectorAll('.katex-display, .katex');
      const originals = [];
      for (const el of katexElements) {
        const c = await html2canvas(el, { backgroundColor: null, scale: 2 });
        const img = document.createElement('img');
        img.src = c.toDataURL();
        img.style.width = el.offsetWidth + 'px';
        img.style.height = el.offsetHeight + 'px';
        originals.push({ el, parent: el.parentNode, next: el.nextSibling });
        el.parentNode.replaceChild(img, el);
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#111',
        scale: 2,
        useCORS: true,
      });

      // Restore original KaTeX DOM
      for (const { el, parent, next } of originals) {
        if (next) parent.insertBefore(el, next);
        else parent.appendChild(el);
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;
      const contentHeight = pageHeight - 2 * margin;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = contentWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      let heightLeft = scaledHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, scaledHeight);
      heightLeft -= contentHeight;

      // Additional pages
      while (heightLeft > 0) {
        position -= contentHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, margin + position, contentWidth, scaledHeight);
        heightLeft -= contentHeight;
      }

      pdf.save('StructSOLVE-Solution.pdf');
    } finally {
      setGenerating(false);
    }
  }

  // MathJax retypeset trigger
  useEffect(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise().catch(() => {});
    }
  });

  const steps = useMemo(
    () => solverResults?.success ? generateSolution(solverResults) : [],
    [solverResults]
  );

  const strategy = useMemo(
    () => solverResults?.success ? computeStrategy(solverResults) : null,
    [solverResults]
  );

  if (!solverResults || !solverResults.success) {
    return (
      <div style={{
        background: '#0a0a0a', minHeight: '100vh', color: '#e5e5e5',
        padding: 24, fontFamily: FONTS.mono,
      }}>
        <button onClick={onBack} style={btnStyle('#4ade80')}>
          &larr; Back to Methods
        </button>
        <p style={{ marginTop: 24, color: '#9ca3af' }}>
          {solverResults?.error
            ? `Solver error: ${solverResults.error}`
            : 'No results. Go back and run the solver.'}
        </p>
      </div>
    );
  }

  let stepCounter = 0;

  return (
    <div className="solver-page">
      {/* ── Sticky header ── */}
      <div className="solver-top-bar">
        <button className="solver-nav-btn" onClick={onBack}>
          &larr; Back to Methods
        </button>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 15, fontFamily: FONTS.mono }}>
            StructSOLVE
          </span>
        </a>
        <button
          className="solver-nav-btn"
          onClick={downloadPDF}
          disabled={generating}
          style={{ background: generating ? '#1a3a1a' : '#16361c', color: '#4ade80' }}
        >
          {generating ? 'Generating...' : '↓ Download PDF'}
        </button>
        <button className="solver-nav-btn" onClick={onEdit}>
          &#9998; Edit Structure
        </button>
      </div>

      {/* ── Body ── */}
      <div className="solver-body" ref={bodyRef}>
        {/* Structure preview */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#6b7280', fontSize: 12, fontFamily: FONTS.mono, marginBottom: 8 }}>
            Structure Preview
          </div>
          <StructurePreview nodes={nodes} members={members} />
        </div>

        {/* Strategy card */}
        <StrategyCard strategy={strategy} />

        {/* Solution steps */}
        {steps.map((step, i) => {
          // Steps with a trussJointGrid are rendered with an embedded 2-col grid
          if (step.trussJointGrid) {
            return (
              <div key={i} className="solution-step">
                <div className="step-header">
                  <span className="step-number">Step {++stepCounter}</span>
                  <span className="step-title">{step.title}</span>
                </div>
                {step.notes && <div className="step-notes">{step.notes}</div>}
                <TrussJointGrid jointSteps={step.trussJointGrid} />
              </div>
            );
          }

          // Steps without FBD or equations (pure notes / table steps) get no number
          const hasMath = (step.fbd || (step.equations && step.equations.length > 0) || step.trussTable);
          const num = hasMath ? ++stepCounter : null;

          return (
            <SolutionStep key={i} step={step} stepNumber={num} />
          );
        })}
      </div>
    </div>
  );
}

function btnStyle(color) {
  return {
    background: 'none', border: `1px solid ${color}`, color,
    fontSize: 13, fontFamily: FONTS.mono, fontWeight: 600,
    cursor: 'pointer', padding: '8px 16px', borderRadius: 6,
  };
}
