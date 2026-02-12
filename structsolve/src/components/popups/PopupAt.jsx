import React, { useRef, useEffect, useState } from 'react';
import { COLORS } from '../../constants/brand.js';

export default function PopupAt({ svgRef, nodeX, nodeY, viewBox, children }) {
  const popupRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!svgRef?.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    // Convert SVG coords to screen coords
    const scaleX = rect.width / viewBox.w;
    const scaleY = rect.height / viewBox.h;
    let screenX = (nodeX - viewBox.x) * scaleX + rect.left;
    let screenY = (nodeY - viewBox.y) * scaleY + rect.top;

    // Position above the node by default
    const popupW = 220;
    const popupH = 160;
    let left = screenX - popupW / 2;
    let top = screenY - popupH - 20;

    // Clamp to viewport
    if (left < 8) left = 8;
    if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
    if (top < 8) top = screenY + 30; // flip below if no room above

    setPos({ left, top });
  }, [svgRef, nodeX, nodeY, viewBox]);

  return (
    <div ref={popupRef} style={{
      position: 'fixed', left: pos.left, top: pos.top, zIndex: 100,
      background: COLORS.bgCard, border: `1px solid ${COLORS.borderLight}`,
      borderRadius: 10, padding: 12, minWidth: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: "'JetBrains Mono', monospace", color: COLORS.textPrimary,
    }}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
