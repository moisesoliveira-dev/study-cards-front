import { IonIcon } from '@ionic/react';
import { gridOutline, listOutline, searchOutline } from 'ionicons/icons';
import { motion, useReducedMotion } from 'framer-motion';
import { tapScale } from '../motion';

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
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="sc-topbar"
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
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
        <motion.button
          type="button"
          className={view === 'grid' ? 'active' : ''}
          onClick={() => onView('grid')}
          aria-label="Grade"
          whileTap={reduce ? undefined : tapScale}
        >
          <IonIcon icon={gridOutline} />
        </motion.button>
        <motion.button
          type="button"
          className={view === 'list' ? 'active' : ''}
          onClick={() => onView('list')}
          aria-label="Lista"
          whileTap={reduce ? undefined : tapScale}
        >
          <IonIcon icon={listOutline} />
        </motion.button>
      </div>
      {extra}
      {onNewFolder ? (
        <motion.button
          type="button"
          className="sc-btn"
          onClick={onNewFolder}
          whileTap={reduce ? undefined : tapScale}
        >
          + Pasta
        </motion.button>
      ) : null}
      {onNewCard ? (
        <motion.button
          type="button"
          className="sc-btn primary"
          onClick={onNewCard}
          whileTap={reduce ? undefined : tapScale}
        >
          + Card
        </motion.button>
      ) : null}
      {!onNewFolder && !onNewCard && onNew ? (
        <motion.button
          type="button"
          className="sc-btn"
          onClick={onNew}
          whileTap={reduce ? undefined : tapScale}
        >
          + {newLabel}
        </motion.button>
      ) : null}
    </motion.div>
  );
}
