import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  endDriveDrag,
  moveDriveDrag,
  readDropTarget,
  startDriveDrag,
  subscribeDrag,
  type DragPayload,
  type DropTarget,
} from './drive-dnd';

const MOVE_THRESHOLD = 10;
const LONG_PRESS_MS = 480;

type DragItemProps = {
  payload: DragPayload;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  onContextMenu?: (e: MouseEvent) => void;
};

export function DragItem({
  payload,
  disabled,
  className,
  children,
  onClick,
  onLongPress,
  onContextMenu,
}: DragItemProps) {
  const [dragging, setDragging] = useState(false);
  const pointerId = useRef<number | null>(null);
  const tracking = useRef(false);
  const dragArmed = useRef(false);
  const longPressFired = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      subscribeDrag((s) => {
        setDragging(
          Boolean(
            s &&
              s.payload.id === payload.id &&
              s.payload.kind === payload.kind &&
              s.moved,
          ),
        );
      }),
    [payload.id, payload.kind],
  );

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      className={`sc-drag-item${dragging ? ' is-dragging' : ''}${className ? ` ${className}` : ''}`}
      data-drag-kind={payload.kind}
      data-drag-id={payload.id}
      onContextMenu={onContextMenu}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        pointerId.current = e.pointerId;
        tracking.current = true;
        dragArmed.current = false;
        longPressFired.current = false;
        origin.current = { x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        clearLongPress();
        if (onLongPress) {
          longPressTimer.current = setTimeout(() => {
            if (!tracking.current || dragArmed.current) return;
            longPressFired.current = true;
            onLongPress();
            try {
              navigator.vibrate?.(12);
            } catch {
              /* ignore */
            }
          }, LONG_PRESS_MS);
        }
      }}
      onPointerMove={(e) => {
        if (!tracking.current || pointerId.current !== e.pointerId) return;
        const dx = Math.abs(e.clientX - origin.current.x);
        const dy = Math.abs(e.clientY - origin.current.y);

        if (!dragArmed.current) {
          if (dx <= MOVE_THRESHOLD && dy <= MOVE_THRESHOLD) return;
          clearLongPress();
          if (longPressFired.current) return;
          dragArmed.current = true;
          startDriveDrag(payload, { x: e.clientX, y: e.clientY });
        }

        const over = readDropTarget(
          document.elementFromPoint(e.clientX, e.clientY),
        );
        moveDriveDrag({ x: e.clientX, y: e.clientY }, over);
      }}
      onPointerUp={(e) => {
        if (!tracking.current || pointerId.current !== e.pointerId) return;
        clearLongPress();
        tracking.current = false;
        pointerId.current = null;
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }

        if (longPressFired.current) {
          endDriveDrag();
          dragArmed.current = false;
          return;
        }

        if (!dragArmed.current) {
          onClick?.();
          return;
        }

        const result = endDriveDrag();
        dragArmed.current = false;
        if (result?.moved) {
          window.dispatchEvent(
            new CustomEvent('sc-drive-drop', { detail: result }),
          );
        } else {
          onClick?.();
        }
      }}
      onPointerCancel={() => {
        clearLongPress();
        tracking.current = false;
        pointerId.current = null;
        dragArmed.current = false;
        longPressFired.current = false;
        endDriveDrag();
      }}
    >
      {children}
    </div>
  );
}

type DropZoneProps = {
  target: DropTarget;
  className?: string;
  children: ReactNode;
};

export function DropZone({ target, className, children }: DropZoneProps) {
  const [active, setActive] = useState(false);

  useEffect(
    () =>
      subscribeDrag((s) => {
        if (!s?.over || !s.moved) {
          setActive(false);
          return;
        }
        if (target.kind === 'root') {
          setActive(s.over.kind === 'root');
          return;
        }
        setActive(s.over.kind === target.kind && s.over.id === target.id);
      }),
    [target],
  );

  return (
    <div
      className={`sc-drop-zone${active ? ' is-over' : ''}${className ? ` ${className}` : ''}`}
      data-drop-kind={target.kind}
      data-drop-id={target.kind === 'root' ? undefined : target.id}
    >
      {children}
    </div>
  );
}

export function useDriveDrop(
  handler: (detail: {
    payload: DragPayload;
    over: DropTarget | null;
    moved: boolean;
  }) => void,
) {
  useEffect(() => {
    const onDrop = (event: Event) => {
      const custom = event as CustomEvent<{
        payload: DragPayload;
        over: DropTarget | null;
        moved: boolean;
      }>;
      handler(custom.detail);
    };
    window.addEventListener('sc-drive-drop', onDrop);
    return () => window.removeEventListener('sc-drive-drop', onDrop);
  }, [handler]);
}
