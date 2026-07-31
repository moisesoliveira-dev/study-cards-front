import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

type Point = { clientX: number; clientY: number };

type Options = {
  delayMs?: number;
  moveTolerance?: number;
};

/**
 * Long-press para menus em touch (equivalente a clique direito).
 * Não dispara se o ponteiro se mover além da tolerância (evita conflito com scroll/drag).
 */
export function useLongPress(
  onLongPress: (point: Point) => void,
  options: Options = {},
) {
  const delayMs = options.delayMs ?? 480;
  const moveTolerance = options.moveTolerance ?? 10;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<Point | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      fired.current = false;
      origin.current = { clientX: e.clientX, clientY: e.clientY };
      timer.current = setTimeout(() => {
        if (!origin.current) return;
        fired.current = true;
        onLongPress(origin.current);
        try {
          navigator.vibrate?.(10);
        } catch {
          /* ignore */
        }
      }, delayMs);
    },
    [delayMs, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!origin.current || !timer.current) return;
      const dx = Math.abs(e.clientX - origin.current.clientX);
      const dy = Math.abs(e.clientY - origin.current.clientY);
      if (dx > moveTolerance || dy > moveTolerance) clear();
    },
    [clear, moveTolerance],
  );

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  /** true se o long-press já abriu o menu (ignore o click seguinte). */
  const didFire = () => fired.current;

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    didFire,
  };
}
