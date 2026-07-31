import { IonIcon } from '@ionic/react';
import {
  addOutline,
  folderOutline,
  gridOutline,
  listOutline,
  searchOutline,
} from 'ionicons/icons';
import { motion, useReducedMotion } from 'framer-motion';
import { tapScale } from '../motion';
import { useTouchUi } from '../hooks/useTouchUi';

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
  const touchUi = useTouchUi();

  return (
    <motion.div
      className={`sc-topbar${touchUi ? ' is-touch' : ''}`}
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
      <div className="sc-topbar-actions">
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
            className={`sc-btn${touchUi ? ' is-icon' : ''}`}
            onClick={onNewFolder}
            aria-label="Nova pasta"
            title="Nova pasta"
            whileTap={reduce ? undefined : tapScale}
          >
            {touchUi ? <IonIcon icon={folderOutline} /> : '+ Pasta'}
          </motion.button>
        ) : null}
        {onNewCard ? (
          <motion.button
            type="button"
            className={`sc-btn primary${touchUi ? ' is-icon' : ''}`}
            onClick={onNewCard}
            aria-label="Novo card"
            title="Novo card"
            whileTap={reduce ? undefined : tapScale}
          >
            {touchUi ? <IonIcon icon={addOutline} /> : '+ Card'}
          </motion.button>
        ) : null}
        {!onNewFolder && !onNewCard && onNew ? (
          <motion.button
            type="button"
            className={`sc-btn primary${touchUi ? ' is-icon' : ''}`}
            onClick={onNew}
            aria-label={newLabel}
            whileTap={reduce ? undefined : tapScale}
          >
            {touchUi ? <IonIcon icon={addOutline} /> : `+ ${newLabel}`}
          </motion.button>
        ) : null}
      </div>
    </motion.div>
  );
}
