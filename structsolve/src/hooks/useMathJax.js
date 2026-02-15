// useMathJax.js — Custom hook to re-typeset MathJax when content changes
import { useEffect } from 'react';

/**
 * Hook to re-typeset MathJax content when dependencies change.
 *
 * Usage:
 *   const steps = generateSolutionSteps(solverResults);
 *   useMathJax([steps]); // Re-typeset whenever steps change
 *
 * @param {Array} dependencies - Array of dependencies (like useEffect)
 */
export function useMathJax(dependencies) {
  useEffect(() => {
    // Wait for MathJax to be available
    if (window.MathJax) {
      // MathJax v3 (current CDN version)
      if (window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise()
          .catch(err => console.warn('MathJax typeset error:', err));
      }
      // MathJax v2 (fallback for older versions)
      else if (window.MathJax.Hub) {
        window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
      }
    }
  }, dependencies);
}
