import { useEffect } from 'react';

export default function useMathJax(deps = []) {
  useEffect(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise().catch(() => {});
    }
  }, deps);
}
