import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { useLongPress } from './useLongPress';
import { useTouchUi } from './useTouchUi';

type Point = { clientX: number; clientY: number };

export type MenuOpenEvent = {
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  stopPropagation?: () => void;
};

function toOpenEvent(point: Point): MenuOpenEvent {
  return {
    clientX: point.clientX,
    clientY: point.clientY,
    preventDefault: () => {},
    stopPropagation: () => {},
  };
}

/**
 * Clique direito (desktop) + long-press (touch) para o mesmo menu de contexto.
 * Use `longPress.didFire()` no onClick para ignorar o toque após o menu.
 */
export function useMenuPress(
  onOpen: ((e: MenuOpenEvent) => void) | undefined,
) {
  const touchUi = useTouchUi();
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  const fire = useCallback((point: Point) => {
    openRef.current?.(toOpenEvent(point));
  }, []);

  const lp = useLongPress(fire, { delayMs: 480, moveTolerance: 12 });

  const onContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      if (!onOpen) return;
      onOpen(e);
    },
    [onOpen],
  );

  if (!onOpen) {
    return {
      touchUi,
      onContextMenu: undefined as
        | ((e: ReactMouseEvent) => void)
        | undefined,
      longPress: undefined as ReturnType<typeof useLongPress> | undefined,
    };
  }

  return {
    touchUi,
    onContextMenu,
    longPress: touchUi ? lp : undefined,
  };
}
