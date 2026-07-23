import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  endDriveDrag,
  moveDriveDrag,
  readDropTarget,
  startDriveDrag,
  subscribeDrag,
  type DragPayload,
  type DropTarget,
} from './drive-dnd';

type DragItemProps = {
  payload: DragPayload;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export function DragItem({
  payload,
  disabled,
  className,
  children,
  onClick,
}: DragItemProps) {
  const [dragging, setDragging] = useState(false);
  const pointerId = useRef<number | null>(null);
  const started = useRef(false);

  useEffect(() => subscribeDrag((s) => {
    setDragging(Boolean(s && s.payload.id === payload.id && s.payload.kind === payload.kind));
  }), [payload.id, payload.kind]);

  return (
    <div
      className={`sc-drag-item${dragging ? ' is-dragging' : ''}${className ? ` ${className}` : ''}`}
      data-drag-kind={payload.kind}
      data-drag-id={payload.id}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        pointerId.current = e.pointerId;
        started.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        startDriveDrag(payload, { x: e.clientX, y: e.clientY });
      }}
      onPointerMove={(e) => {
        if (!started.current || pointerId.current !== e.pointerId) return;
        const over = readDropTarget(document.elementFromPoint(e.clientX, e.clientY));
        moveDriveDrag({ x: e.clientX, y: e.clientY }, over);
      }}
      onPointerUp={(e) => {
        if (!started.current || pointerId.current !== e.pointerId) return;
        started.current = false;
        pointerId.current = null;
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        const result = endDriveDrag();
        if (!result?.moved) {
          onClick?.();
        } else {
          window.dispatchEvent(
            new CustomEvent('sc-drive-drop', { detail: result }),
          );
        }
      }}
      onPointerCancel={() => {
        started.current = false;
        pointerId.current = null;
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
        if (!s?.over) {
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
