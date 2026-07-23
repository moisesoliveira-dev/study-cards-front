import { IonIcon } from '@ionic/react';
import { gridOutline, listOutline, searchOutline } from 'ionicons/icons';

type Props = {
  query: string;
  onQuery: (value: string) => void;
  view: 'grid' | 'list';
  onView: (view: 'grid' | 'list') => void;
  onNew?: () => void;
  newLabel?: string;
  extra?: React.ReactNode;
};

export function DriveTopBar({
  query,
  onQuery,
  view,
  onView,
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
      {onNew ? (
        <button type="button" className="sc-btn" onClick={onNew}>
          + {newLabel}
        </button>
      ) : null}
    </div>
  );
}
