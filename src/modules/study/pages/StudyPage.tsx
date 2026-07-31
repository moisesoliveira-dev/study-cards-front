import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation, useParams } from 'react-router-dom';
import { cardsFacade } from '../../cards/facades/cards.facade';
import { cardLevelsFacade } from '../../cards/facades/card-levels.facade';
import type { Card } from '../../cards/types/card.types';
import type { CardLevel } from '../../cards/types/card-level.types';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import {
  MotionShell,
  studySlide,
  tapScale,
} from '../../../shared/motion';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

/** Estudo em ficha aberta — sem flip/reveal. */
export default function StudyPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const query = useQuery();
  const subjectId = query.get('subjectId');
  const scope = query.get('scope');
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [cards, setCards] = useState<Card[]>([]);
  const [levels, setLevels] = useState<CardLevel[]>([]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const deck =
        scope === 'subject' && subjectId
          ? await cardsFacade.studyBySubject(subjectId)
          : await cardsFacade.studyDeck(topicId);
      setCards(deck);
      setIndex(0);
    } catch (error) {
      toast.error(error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, subjectId, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void cardLevelsFacade.list().then(setLevels).catch(() => setLevels([]));
  }, []);

  const current = cards[index];
  const currentLevel = current?.levelId
    ? levels.find((l) => l.id === current.levelId)
    : undefined;
  const levelLabel = currentLevel?.name
    ?? (current?.levelId ? 'Nível' : null);
  const done = !loading && (!cards.length || index >= cards.length);
  const progress = useMemo(() => {
    if (!cards.length) return 0;
    return Math.min(index / cards.length, 1) * 100;
  }, [cards.length, index]);

  const next = () => {
    if (!current) return;
    setDir(1);
    setIndex((i) => i + 1);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={
                subjectId ? `/subjects/${subjectId}` : '/home'
              }
            />
          </IonButtons>
          <IonTitle>Estudar</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <MotionShell className="sc-shell">
          {loading ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: 48 }}>
              <IonSpinner name="crescent" />
            </div>
          ) : done ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: '48px 16px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                {cards.length
                  ? 'Sessão concluída.'
                  : 'Nenhum card neste escopo.'}
              </p>
              <motion.button
                type="button"
                className="sc-btn primary"
                onClick={() => void load()}
                whileTap={reduce ? undefined : tapScale}
              >
                Recarregar
              </motion.button>
            </motion.div>
          ) : current ? (
            <>
              <div className="sc-table-top">
                <div className="deck-info">
                  <span className="deck-label">Ficha</span>
                  <span className="deck-count">
                    {index + 1} / {cards.length}
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: 'var(--border)',
                  overflow: 'hidden',
                  marginBottom: 16,
                }}
              >
                <motion.div
                  style={{
                    height: '100%',
                    background: 'var(--ok)',
                    borderRadius: 99,
                  }}
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 28 }}
                />
              </div>
              <div className="sc-study-stage" style={{ position: 'relative' }}>
                <AnimatePresence mode="wait" custom={dir}>
                  <motion.div
                    key={current.id}
                    className="sc-detail sc-study-card"
                    custom={dir}
                    variants={reduce ? undefined : studySlide}
                    initial={reduce ? false : 'enter'}
                    animate="center"
                    exit="exit"
                  >
                    <div className="sc-detail-block">
                      <h4>{current.tag}</h4>
                      <p style={{ fontSize: 18, fontWeight: 500 }}>
                        {current.front}
                      </p>
                    </div>
                    <div className="sc-detail-block">
                      <h4>Explicação</h4>
                      <p>{current.back}</p>
                    </div>
                    {levelLabel ? (
                      <div className="sc-detail-block">
                        <h4>Nível</h4>
                        <p>{levelLabel}</p>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="sc-study-actions">
                <motion.button
                  type="button"
                  className="sc-btn primary"
                  onClick={next}
                  whileTap={reduce ? undefined : tapScale}
                >
                  Próximo
                </motion.button>
              </div>
            </>
          ) : null}
        </MotionShell>
      </IonContent>
    </IonPage>
  );
}
