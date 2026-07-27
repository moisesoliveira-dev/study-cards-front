import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Card } from '../../modules/cards/types/card.types';
import { cardAccent } from './FaceCardComposer';
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
  const accent = cardAccent(card.color, card.tag);

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
            color={accent}
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
          color={accent}
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

/** Carta compacta na mão — o giro acontece no CardFocusStage (centro da tela). */
export function FaceCard({
  card,
  selected,
  onClick,
  style,
  index = 0,
}: FaceProps) {
  const reduce = useReducedMotion();
  const accent = cardAccent(card.color, card.tag);

  return (
    <motion.div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`sc-face-card is-simple${selected ? ' selected' : ''}`}
      onClick={onClick}
      style={
        {
          ...style,
          '--card-accent': accent,
        } as CSSProperties
      }
      initial={reduce ? false : 'hidden'}
      animate="show"
      variants={
        reduce
          ? undefined
          : {
              hidden: { opacity: 0, y: 20 },
              show: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.32,
                  ease: [0.22, 1, 0.36, 1],
                  delay: index * 0.035,
                },
              },
            }
      }
      whileTap={reduce ? undefined : tapScale}
    >
      <span className="card-accent-bar" aria-hidden />
      <div className="card-title">{card.front}</div>
      <div className="card-icon-stage">
        {card.icon ? (
          <CardFaceIcon icon={card.icon} color={accent} />
        ) : (
          <div className="card-face-icon is-fallback" aria-hidden>
            <span className="card-face-fallback">◇</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
