import type { MouseEvent } from 'react';
import { IonIcon } from '@ionic/react';
import { ellipsisHorizontal } from 'ionicons/icons';
import { useTouchUi } from '../hooks/useTouchUi';
import type { MenuOpenEvent } from '../hooks/useMenuPress';

type Props = {
  label: string;
  onOpen: (e: MenuOpenEvent) => void;
};

/** Botão ⋯ em touch — menus sem conflitar com o long-press do drag. */
export function ItemMoreButton({ label, onOpen }: Props) {
  const touchUi = useTouchUi();
  if (!touchUi) return null;

  return (
    <button
      type="button"
      className="sc-item-more"
      aria-label={`Opções de ${label}`}
      title="Opções"
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen(e);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen(e);
      }}
    >
      <IonIcon icon={ellipsisHorizontal} />
    </button>
  );
}
