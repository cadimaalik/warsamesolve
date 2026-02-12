import { useEffect } from 'react';

export default function useKeyboard({ onUndo, onDelete, onEscape, onFit }) {
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore if user is typing in an input
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ctrl+Z / Cmd+Z → Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        onUndo && onUndo();
        return;
      }

      // Delete / Backspace → Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete && onDelete();
        return;
      }

      // Escape → Close popup / cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape && onEscape();
        return;
      }

      // F → Fit view
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onFit && onFit();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onDelete, onEscape, onFit]);
}
