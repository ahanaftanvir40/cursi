import { useEffect, useRef } from 'react';

/**
 * Measures the root element's scrollHeight after every render and
 * tells the main process to resize the BrowserWindow to match.
 * Fires synchronously on mount so the window is the right size before shown.
 */
export function usePanelResize(ref: React.RefObject<HTMLElement | null>): void {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!ref.current || !window.desktop?.resizePanel) return;
      // Use offsetHeight — includes borders, reflects actual rendered height
      const h = Math.max(ref.current.offsetHeight, 52);
      void window.desktop.resizePanel(h);
    };

    // Immediate sync measure on first mount
    measure();

    // Then watch for size changes via ResizeObserver
    const ro = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    });

    if (ref.current) ro.observe(ref.current);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ref]);
}
