import type { MouseEvent } from 'react';
import { IonIcon } from '@ionic/react';
import { folderOutline, folderOpenOutline } from 'ionicons/icons';
import { motion, useReducedMotion } from 'framer-motion';
import { hoverLift, staggerItem, tapScale } from '../motion';

type Props = {
  name: string;
  subtitle?: string;
  color?: string;
  dashed?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onContextMenu?: (e: MouseEvent) => void;
};

export function DriveFolderItem({
  name,
  subtitle,
  color = '#BA7517',
  dashed,
  onClick,
  onDelete,
  onContextMenu,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`sc-item folder${dashed ? ' dashed' : ''}${onDelete ? ' has-delete' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      variants={reduce ? undefined : staggerItem}
      initial={reduce ? false : 'hidden'}
      animate="show"
      whileHover={reduce || !onClick ? undefined : hoverLift}
      whileTap={reduce || !onClick ? undefined : tapScale}
    >
      {onDelete ? (
        <button
          type="button"
          className="sc-item-delete"
          aria-label={`Excluir ${name}`}
          title="Excluir"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          ×
        </button>
      ) : null}
      <div className="thumb">
        <IonIcon
          icon={dashed ? folderOpenOutline : folderOutline}
          style={{ color: dashed ? 'var(--text-muted)' : color, fontSize: 32 }}
        />
      </div>
      <div className="item-meta">
        <div
          className="item-name"
          style={dashed ? { color: 'var(--text-muted)' } : undefined}
        >
          {name}
        </div>
        {subtitle ? <div className="item-sub">{subtitle}</div> : null}
      </div>
    </motion.div>
  );
}
