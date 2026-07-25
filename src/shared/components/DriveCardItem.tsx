import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Card } from '../../modules/cards/types/card.types';
import { suitColor } from './FaceCardComposer';
import { CardFaceIcon } from './CardIcon';
import { staggerItem, tapScale } from '../motion';

type Props = {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  view?: 'grid' | 'list';
};

export function DriveCardItem({ card, selected, onClick, view = 'grid' }: Props) {
  const reduce = useReducedMotion();

  if (view === 'list') {
    return (
      <motion.div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={`sc-list-row${selected ? ' selected' : ''}`}
        onClick={onClick}
        variants={reduce ? undefined : staggerItem}
        whileTap={reduce ? undefined : tapScale}
      >
        <span className="list-icon">
          <CardFaceIcon
            icon={card.icon}
            className="list-face-icon"
            color={suitColor(card.tag)}
          />
        </span>
        <span className="list-name">{card.front}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`sc-item card-item${selected ? ' selected' : ''}`}
      onClick={onClick}
      variants={reduce ? undefined : staggerItem}
      whileTap={reduce ? undefined : tapScale}
    >
      <div className="thumb">
        <div className="thumb-title">{card.front}</div>
        <CardFaceIcon
          icon={card.icon}
          className="thumb-face-icon"
          color={suitColor(card.tag)}
        />
      </div>
      <div className="item-meta">
        <div className="item-name">{card.front}</div>
      </div>
    </motion.div>
  );
}

type FaceProps = {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  index?: number;
};

export function FaceCard({ card, selected, onClick, style, index = 0 }: FaceProps) {
  const reduce = useReducedMotion();
  const accent = suitColor(card.tag);

  return (
    <motion.div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`sc-face-card is-simple${selected ? ' selected' : ''}`}
      onClick={onClick}
      style={style}
      initial={reduce ? false : 'hidden'}
      animate="show"
      variants={
        reduce
          ? undefined
          : {
              hidden: { opacity: 0, y: 28, rotate: -4, scale: 0.9 },
              show: {
                opacity: 1,
                y: 0,
                rotate: 0,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 380,
                  damping: 28,
                  delay: index * 0.04,
                },
              },
            }
      }
      whileTap={reduce ? undefined : tapScale}
      layout
    >
      <div className="card-title">{card.front}</div>
      {card.icon ? (
        <CardFaceIcon icon={card.icon} color={accent} />
      ) : (
        <div className="card-face-icon is-fallback" aria-hidden>
          <span className="card-face-fallback">◇</span>
        </div>
      )}
    </motion.div>
  );
}
