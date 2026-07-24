import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { IonIcon } from '@ionic/react';

export type ContextMenuItem = {
  id: string;
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Visual separator before this item */
  separator?: boolean;
  onSelect: () => void;
};

export type ContextMenuState = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  title?: string;
};

type OpenEvent = {
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  stopPropagation?: () => void;
};

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const close = useCallback(() => setMenu(null), []);

  const open = useCallback(
    (
      event: OpenEvent,
      items: ContextMenuItem[],
      title?: string,
    ) => {
      event.preventDefault();
      event.stopPropagation?.();
      const filtered = items.filter(Boolean);
      if (!filtered.length) return;
      setMenu({
        x: event.clientX,
        y: event.clientY,
        items: filtered,
        title,
      });
    },
    [],
  );

  return { menu, open, close };
}

type MenuProps = {
  menu: ContextMenuState | null;
  onClose: () => void;
};

export function ContextMenu({ menu, onClose }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const left = Math.min(
      menu.x,
      window.innerWidth - rect.width - pad,
    );
    const top = Math.min(
      menu.y,
      window.innerHeight - rect.height - pad,
    );
    setPos({
      left: Math.max(pad, left),
      top: Math.max(pad, top),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  return createPortal(
    <div className="sc-ctx-root" role="presentation">
      <button
        type="button"
        className="sc-ctx-backdrop"
        aria-label="Fechar menu"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={ref}
        className="sc-ctx-menu"
        role="menu"
        style={{ left: pos.left, top: pos.top }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {menu.title ? (
          <div className="sc-ctx-title">{menu.title}</div>
        ) : null}
        {menu.items.map((item) => (
          <div key={item.id}>
            {item.separator ? <div className="sc-ctx-sep" /> : null}
            <button
              type="button"
              role="menuitem"
              className={`sc-ctx-item${item.danger ? ' is-danger' : ''}`}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                onClose();
                item.onSelect();
              }}
            >
              {item.icon ? <IonIcon icon={item.icon} /> : null}
              <span>{item.label}</span>
            </button>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

/** Helper to attach right-click without fighting nested handlers */
export function contextMenuHandler(
  open: (
    event: OpenEvent,
    items: ContextMenuItem[],
    title?: string,
  ) => void,
  items: ContextMenuItem[] | ((e: ReactMouseEvent) => ContextMenuItem[]),
  title?: string,
) {
  return (e: ReactMouseEvent) => {
    const list = typeof items === 'function' ? items(e) : items;
    open(e, list, title);
  };
}

export type ContextMenuHostProps = {
  children: ReactNode;
  items: ContextMenuItem[];
  title?: string;
  className?: string;
  disabled?: boolean;
};

/** Wraps children with right-click context menu (self-contained). */
export function ContextMenuHost({
  children,
  items,
  title,
  className,
  disabled,
}: ContextMenuHostProps) {
  const { menu, open, close } = useContextMenu();
  return (
    <div
      className={className}
      onContextMenu={
        disabled
          ? undefined
          : (e) => open(e, items, title)
      }
    >
      {children}
      <ContextMenu menu={menu} onClose={close} />
    </div>
  );
}
