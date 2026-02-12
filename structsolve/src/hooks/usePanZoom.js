import { useState, useCallback, useRef } from 'react';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const ZOOM_SPEED = 0.001;

export default function usePanZoom() {
  const [viewBox, setViewBox] = useState({ x: -50, y: -50, w: 800, h: 500 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e) => {
    // Middle-click or left-click on empty canvas
    if (e.button === 1 || (e.button === 0 && e.target.tagName === 'svg')) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    panStart.current = { x: e.clientX, y: e.clientY };

    setViewBox(v => ({
      ...v,
      x: v.x - dx * (v.w / window.innerWidth),
      y: v.y - dy * (v.h / window.innerHeight),
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    if (!e.currentTarget) return;
    const target = e.currentTarget;
    const factor = 1 + e.deltaY * ZOOM_SPEED;
    const clampedFactor = Math.min(Math.max(factor, MIN_ZOOM / MAX_ZOOM), MAX_ZOOM / MIN_ZOOM);

    setViewBox(v => {
      const newW = v.w * clampedFactor;
      const newH = v.h * clampedFactor;
      if (newW < 100 || newW > 5000) return v;
      // Zoom toward mouse position
      const rect = target.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      return {
        x: v.x + (v.w - newW) * mx,
        y: v.y + (v.h - newH) * my,
        w: newW,
        h: newH,
      };
    });
  }, []);

  const fitToNodes = useCallback((nodes, padding = 80) => {
    if (nodes.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });
    const w = Math.max(maxX - minX + padding * 2, 200);
    const h = Math.max(maxY - minY + padding * 2, 200);
    setViewBox({ x: minX - padding, y: minY - padding, w, h });
  }, []);

  return {
    viewBox,
    svgProps: { onMouseDown, onMouseMove, onMouseUp, onWheel },
    fitToNodes,
  };
}
