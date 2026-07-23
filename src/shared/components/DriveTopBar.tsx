import { IonIcon } from '@ionic/react';
import { gridOutline, listOutline, searchOutline } from 'ionicons/icons';

type Props = {
  query: string;
  onQuery: (value: string) => void;
  view: 'grid' | 'list';
  onView: (view: 'grid' | 'list') => void;
  onNewFolder?: () => void;
  onNewCard?: () => void;
  onNew?: () => void;
  newLabel?: string;
  extra?: React.ReactNode;
};

export function DriveTopBar({
  query,
  onQuery,
  view,
  onView,
  onNewFolder,
  onNewCard,
  onNew,
  newLabel = 'Novo',
  extra,
}: Props) {
  return (
    <div className="sc-topbar">
      <div className="sc-search-wrap">
        <IonIcon icon={searchOutline} />
        <input
          className="sc-search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar..."
          aria-label="Buscar"
        />
      </div>
      <div className="sc-view-btns" role="group" aria-label="Visualização">
        <button
          type="button"
          className={view === 'grid' ? 'active' : ''}
          onClick={() => onView('grid')}
          aria-label="Grade"
        >
          <IonIcon icon={gridOutline} />
        </button>
        <button
          type="button"
          className={view === 'list' ? 'active' : ''}
          onClick={() => onView('list')}
          aria-label="Lista"
        >
          <IonIcon icon={listOutline} />
        </button>
      </div>
      {extra}
      {onNewFolder ? (
        <button type="button" className="sc-btn" onClick={onNewFolder}>
          + Pasta
        </button>
      ) : null}
      {onNewCard ? (
        <button type="button" className="sc-btn primary" onClick={onNewCard}>
          + Card
        </button>
      ) : null}
      {!onNewFolder && !onNewCard && onNew ? (
        <button type="button" className="sc-btn" onClick={onNew}>
          + {newLabel}
        </button>
      ) : null}
    </div>
  );
}
