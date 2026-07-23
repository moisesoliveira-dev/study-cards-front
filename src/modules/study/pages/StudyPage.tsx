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
import { useLocation, useParams } from 'react-router-dom';
import { cardsFacade } from '../../cards/facades/cards.facade';
import type { Card } from '../../cards/types/card.types';
import { statusClass, statusLabel } from '../../cards/types/card.types';
import { useAppToast } from '../../../shared/hooks/useAppToast';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

/** Revisão em ficha aberta — sem flip/reveal. */
export default function StudyPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const query = useQuery();
  const subjectId = query.get('subjectId');
  const filter = query.get('filter');
  const toast = useAppToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let deck = await cardsFacade.studyDeck(topicId);
      if (filter === 'REVIEW') {
        deck = deck.filter((c) => c.status === 'REVIEW');
      }
      setCards(deck);
      setIndex(0);
    } catch (error) {
      toast.error(error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = cards[index];
  const done = !loading && (!cards.length || index >= cards.length);
  const progress = useMemo(() => {
    if (!cards.length) return 0;
    return Math.min(index / cards.length, 1) * 100;
  }, [cards.length, index]);

  const mark = async (status: Card['status']) => {
    if (!current) return;
    try {
      await cardsFacade.update(current.id, { status });
      setIndex((i) => i + 1);
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={
                subjectId ? `/subjects/${subjectId}` : `/topics/${topicId}`
              }
            />
          </IonButtons>
          <IonTitle>Revisão</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sc-shell">
          {loading ? (
            <div className="sc-empty">
              <IonSpinner name="crescent" />
            </div>
          ) : done ? (
            <div className="sc-empty">
              <p style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                {cards.length
                  ? 'Revisão concluída.'
                  : 'Nenhum card para revisar neste filtro.'}
              </p>
              <button type="button" className="sc-btn primary" onClick={() => void load()}>
                Recarregar
              </button>
            </div>
          ) : current ? (
            <>
              <div className="sc-table-top">
                <div className="deck-info">
                  <span className="deck-label">Ficha</span>
                  <span className="deck-count">
                    {index + 1} / {cards.length}
                  </span>
                </div>
                <span className={`card-status ${statusClass(current.status)}`}>
                  {statusLabel(current.status)}
                </span>
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
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'var(--ok)',
                  }}
                />
              </div>
              <div className="sc-detail">
                <div className="sc-detail-block">
                  <h4>{current.tag}</h4>
                  <p style={{ fontSize: 18, fontWeight: 500 }}>{current.front}</p>
                </div>
                <div className="sc-detail-block">
                  <h4>Explicação</h4>
                  <p>{current.back}</p>
                </div>
                {current.hint ? (
                  <div className="sc-detail-block">
                    <h4>Dica</h4>
                    <p>{current.hint}</p>
                  </div>
                ) : null}
              </div>
              <div className="sc-study-actions" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                <button type="button" className="sc-btn" onClick={() => void mark('REVIEW')}>
                  Ainda revisar
                </button>
                <button type="button" className="sc-btn primary" onClick={() => void mark('KNOWN')}>
                  Sabia
                </button>
              </div>
            </>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
}
