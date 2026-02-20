import { useRef, useEffect } from 'react';

/**
 * Trigger MathJax typesetting when dependencies change.
 * Returns a ref to attach to the container element.
 */
export function useMathJax(deps = []) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, deps);

  return ref;
}
