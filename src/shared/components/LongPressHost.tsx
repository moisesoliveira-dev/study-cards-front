import type { ReactNode, MouseEvent as ReactMouseEvent } from 'react';
import { useMenuPress, type MenuOpenEvent } from '../hooks/useMenuPress';

type Props = {
  children: ReactNode;
  className?: string;
  onMenu?: (e: MenuOpenEvent) => void;
  as?: 'div' | 'article';
};

/** Wrapper com clique direito + long-press para menu (telas sem DnD). */
export function LongPressHost({
  children,
  className,
  onMenu,
  as = 'div',
}: Props) {
  const menu = useMenuPress(onMenu);
  const Comp = as;

  return (
    <Comp
      className={className}
      onContextMenu={
        menu.onContextMenu as ((e: ReactMouseEvent) => void) | undefined
      }
      onPointerDown={menu.longPress?.onPointerDown}
      onPointerMove={menu.longPress?.onPointerMove}
      onPointerUp={menu.longPress?.onPointerUp}
      onPointerCancel={menu.longPress?.onPointerCancel}
      onClickCapture={(e) => {
        if (!menu.longPress?.didFire()) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </Comp>
  );
}
