import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Card } from '../../modules/cards/types/card.types';
import { cardAccent } from './FaceCardComposer';
import { CardFaceIcon } from './CardIcon';
import { fadeIn, tapScale } from '../motion';

type Props = {
  card: Card | null;
  onClose: () => void;
  onOpenDetail: (card: Card) => void;
};

export function CardFocusStage({ card, onClose, onOpenDetail }: Props) {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!card) {
      setFlipped(false);
      return;
    }
    setFlipped(false);
    if (reduce) {
      setFlipped(true);
      return;
    }
    const t = window.setTimeout(() => setFlipped(true), 420);
    return () => window.clearTimeout(t);
  }, [card, reduce]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((v) => !v);
      }
    };
    document.body.classList.add('sc-card-focus-open');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('sc-card-focus-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [card, onClose]);

  return createPortal(
    <AnimatePresence>
      {card ? (
        <motion.div
          className="sc-card-focus"
          role="dialog"
          aria-modal="true"
          aria-label={card.front}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          variants={reduce ? undefined : fadeIn}
          initial={reduce ? false : 'hidden'}
          animate="show"
          exit="exit"
        >
          <div className="sc-card-focus-stage">
            <motion.button
              type="button"
              className={`sc-face-card is-simple is-focus${
                flipped ? ' is-flipped' : ''
              }`}
              style={
                {
                  '--card-accent': cardAccent(card.color, card.tag),
                } as CSSProperties
              }
              onClick={() => setFlipped((v) => !v)}
              aria-pressed={flipped}
              aria-label={
                flipped
                  ? 'Virar para a frente'
                  : 'Virar para o conceito resumido'
              }
              initial={
                reduce
                  ? false
                  : { opacity: 0, scale: 0.72, y: 48, rotate: -6 }
              }
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={
                reduce
                  ? undefined
                  : { opacity: 0, scale: 0.85, y: 24, transition: { duration: 0.18 } }
              }
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              whileTap={reduce ? undefined : tapScale}
            >
              <div className="sc-face-flip">
                <div className="sc-face-side is-front">
                  <span className="card-accent-bar" aria-hidden />
                  <div className="card-title">{card.front}</div>
                  <div className="card-icon-stage">
                    {card.icon ? (
                      <CardFaceIcon
                        icon={card.icon}
                        color={cardAccent(card.color, card.tag)}
                      />
                    ) : (
                      <div className="card-face-icon is-fallback" aria-hidden>
                        <span className="card-face-fallback">◇</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="sc-face-side is-back" aria-hidden={!flipped}>
                  <span className="card-accent-bar" aria-hidden />
                  <div className="card-back-kicker">
                    {card.tag || 'Conceito'}
                  </div>
                  <div className="card-back-body">
                    {card.back?.trim() || card.front}
                  </div>
                </div>
              </div>
            </motion.button>

            <div className="sc-card-focus-actions">
              <p className="sc-card-focus-hint">
                {flipped
                  ? 'Toque na carta para virar de novo'
                  : 'A carta gira sozinha… toque para virar'}
              </p>
              <div className="sc-card-focus-btns">
                <button type="button" className="sc-btn" onClick={onClose}>
                  Fechar
                </button>
                <button
                  type="button"
                  className="sc-btn primary"
                  onClick={() => onOpenDetail(card)}
                >
                  Abrir ficha
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
