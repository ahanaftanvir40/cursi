import { useEffect, useRef } from 'react';

/**
 * Measures the root element's scrollHeight after every render and
 * tells the main process to resize the BrowserWindow to match.
 */
export function usePanelResize(ref: React.RefObject<HTMLElement | null>): void {
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!ref.current || !window.desktop?.resizePanel) return;
      const h = Math.max(ref.current.scrollHeight, 52);
      void window.desktop.resizePanel(h);
    };

    // 1. Immediate measure (catches simple cases)
    measure();

    // 2. After first paint — catches layout that wasn't ready on mount
    rafRef.current = requestAnimationFrame(() => {
      measure();
      // 3. After 80ms — catches late-rendering content (images, grid layout)
      timerRef.current = setTimeout(measure, 80);
    });

    // 4. ResizeObserver — catches any subsequent content changes
    const ro = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    });

    if (ref.current) ro.observe(ref.current);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ref]);
}
