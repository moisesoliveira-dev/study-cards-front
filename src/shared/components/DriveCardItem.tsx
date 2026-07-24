import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  cardInitials,
  statusClass,
  statusDot,
  statusLabel,
  type Card,
} from '../../modules/cards/types/card.types';
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
          {card.icon ? (
            <CardFaceIcon icon={card.icon} className="list-face-icon" />
          ) : (
            '◇'
          )}
        </span>
        <span className="list-name">{card.front}</span>
        <span className="list-tag">{card.tag}</span>
        <span className={`list-status ${statusClass(card.status)}`}>
          {statusLabel(card.status)}
        </span>
        <span className="list-links">{card.linkCount} links</span>
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
        <div className="thumb-tag">{card.tag}</div>
        {card.icon ? (
          <CardFaceIcon
            icon={card.icon}
            className="thumb-face-icon"
            color={suitColor(card.tag)}
          />
        ) : (
          <div className="thumb-title">{card.front}</div>
        )}
      </div>
      <div className="item-meta">
        <div className="item-name">{card.front}</div>
        <div className="item-sub">
          <span className={`dot ${statusDot(card.status)}`} />
          {statusLabel(card.status)} · {card.linkCount} links
        </div>
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
  const initials = cardInitials(card.front);
  const reduce = useReducedMotion();
  const accent = suitColor(card.tag);
  const hasIcon = Boolean(card.icon);

  return (
    <motion.div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`sc-face-card${selected ? ' selected' : ''}${hasIcon ? ' has-icon' : ''}`}
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
      <span className="card-corner tl">{initials}</span>
      <span className="card-corner br">{initials}</span>
      <div className="card-suit" style={{ color: accent }}>
        {card.tag}
      </div>
      <CardFaceIcon icon={card.icon} color={accent} />
      <div className="card-title">{card.front}</div>
      {!hasIcon ? <div className="card-body">{card.back}</div> : null}
      <span className={`card-status ${statusClass(card.status)}`}>
        {statusLabel(card.status)}
      </span>
      <div className="card-links">→ {card.linkCount} links</div>
    </motion.div>
  );
}
