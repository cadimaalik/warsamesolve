import React, { useRef, useEffect, useState, useCallback } from 'react';
import { COLORS } from '../../constants/brand.js';

export default function PopupAt({ svgRef, nodeX, nodeY, viewBox, children }) {
  const popupRef = useRef(null);
  const [pos, setPos] = useState(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 });

  // Compute initial position from SVG coordinates
  useEffect(() => {
    if (!svgRef?.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    const scaleX = rect.width / viewBox.w;
    const scaleY = rect.height / viewBox.h;
    const screenX = (nodeX - viewBox.x) * scaleX + rect.left;
    const screenY = (nodeY - viewBox.y) * scaleY + rect.top;

    // Measure popup after render
    requestAnimationFrame(() => {
      const el = popupRef.current;
      if (!el) return;
      const pw = el.offsetWidth || 240;
      const ph = el.offsetHeight || 180;
      const pad = 12;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Default: above-right of node
      let left = screenX + 16;
      let top = screenY - ph - 16;

      // Flip below if no room above
      if (top < pad) top = screenY + 24;
      // Flip left if no room on right
      if (left + pw > vw - pad) left = screenX - pw - 16;
      // Clamp all edges
      if (left < pad) left = pad;
      if (left + pw > vw - pad) left = vw - pw - pad;
      if (top < pad) top = pad;
      if (top + ph > vh - pad) top = vh - ph - pad;

      setPos({ left, top });
    });
  }, [svgRef, nodeX, nodeY, viewBox]);

  // Drag handlers
  const onDragStart = useCallback((e) => {
    e.preventDefault();
    dragRef.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      origLeft: pos?.left || 0, origTop: pos?.top || 0,
    };

    function onMove(ev) {
      if (!dragRef.current.active) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({ left: dragRef.current.origLeft + dx, top: dragRef.current.origTop + dy });
    }
    function onUp() {
      dragRef.current.active = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  return (
    <div ref={popupRef} style={{
      position: 'fixed',
      left: pos ? pos.left : -9999,
      top: pos ? pos.top : -9999,
      visibility: pos ? 'visible' : 'hidden',
      zIndex: 100,
      background: COLORS.bgCard, border: `1px solid ${COLORS.borderLight}`,
      borderRadius: 10, minWidth: 200, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: "'JetBrains Mono', monospace", color: COLORS.textPrimary,
    }}
      onClick={e => e.stopPropagation()}
    >
      {/* Drag handle */}
      <div onMouseDown={onDragStart} style={{
        height: 14, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.04)',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: '#404040' }} />
      </div>
      <div style={{ padding: 12 }}>
        {children}
      </div>
    </div>
  );
}
