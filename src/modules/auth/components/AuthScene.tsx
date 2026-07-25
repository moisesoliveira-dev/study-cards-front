import { motion } from 'framer-motion';
import { BRAND_LOGO_SRC } from '../brand';

type Props = {
  headline: string;
  line: string;
  reduce: boolean;
};

const CARDS = [
  {
    id: 'a',
    face: 'frente',
    title: 'Mitose',
    body: 'Divisão celular que gera duas células idênticas.',
    accent: 'ink',
  },
  {
    id: 'b',
    face: 'verso',
    title: 'Anki do seu jeito',
    body: 'Revise no ritmo certo — sem bagunça.',
    accent: 'sage',
  },
  {
    id: 'c',
    face: 'frente',
    title: 'PDF → cards',
    body: 'Marque o trecho e vire flashcard na hora.',
    accent: 'sand',
  },
] as const;

export function AuthScene({ headline, line, reduce }: Props) {
  return (
    <div className="sc-auth-scene">
      <div className="sc-auth-scene-grid" aria-hidden="true" />
      <div className="sc-auth-scene-glow" aria-hidden="true" />

      <div className="sc-auth-scene-brand">
        <div className="sc-auth-logo sc-auth-logo--hero" aria-hidden="true">
          <img
            className="sc-auth-logo-img"
            src={BRAND_LOGO_SRC}
            alt=""
          />
        </div>
        <div className="sc-auth-scene-name-row">
          <h1 className="sc-auth-scene-name">Study Cards</h1>
          <span className="sc-auth-beta">Beta</span>
        </div>
        <p className="sc-auth-scene-headline">{headline}</p>
        <p className="sc-auth-scene-line">{line}</p>
      </div>

      <div className="sc-auth-deck" aria-hidden="true">
        {CARDS.map((card, i) => (
          <motion.div
            key={card.id}
            className={`sc-auth-flash sc-auth-flash--${card.accent}`}
            style={{ zIndex: CARDS.length - i }}
            initial={reduce ? false : { opacity: 0, y: 36, rotate: -8 + i * 4 }}
            animate={
              reduce
                ? { opacity: 1, y: 0, rotate: -6 + i * 6 }
                : {
                    opacity: 1,
                    y: [0, i % 2 === 0 ? -8 : 6, 0],
                    rotate: [-6 + i * 6, -4 + i * 5, -6 + i * 6],
                  }
            }
            transition={
              reduce
                ? { duration: 0.01 }
                : {
                    opacity: { duration: 0.55, delay: 0.12 + i * 0.1 },
                    y: {
                      duration: 5.5 + i,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.35,
                    },
                    rotate: {
                      duration: 7 + i,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.2,
                    },
                  }
            }
          >
            <span className="sc-auth-flash-face">{card.face}</span>
            <strong className="sc-auth-flash-title">{card.title}</strong>
            <p className="sc-auth-flash-body">{card.body}</p>
          </motion.div>
        ))}
      </div>

      <ul className="sc-auth-scene-points">
        <li>Flashcards com frente e verso</li>
        <li>Tópicos e fluxos de estudo</li>
        <li>Biblioteca de PDFs</li>
      </ul>
    </div>
  );
}
