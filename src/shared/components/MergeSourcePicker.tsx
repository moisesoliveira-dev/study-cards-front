import { useEffect, useMemo, useState } from 'react';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { subjectsFacade } from '../../modules/subjects/facades/subjects.facade';
import { cardsFacade } from '../../modules/cards/facades/cards.facade';
import { cardLevelsFacade } from '../../modules/cards/facades/card-levels.facade';
import type { Subject } from '../../modules/subjects/types/subject.types';
import type { Card } from '../../modules/cards/types/card.types';
import type { CardLevel } from '../../modules/cards/types/card-level.types';
import { useAppToast } from '../hooks/useAppToast';

type Props = {
  open: boolean;
  /** Grupo atual — a síntese nasce aqui; o picker lista os outros também. */
  currentSubjectId: string;
  alreadyPickedIds: string[];
  onClose: () => void;
  onConfirm: (cards: Card[]) => void;
};

/** Busca e marca cards de qualquer grupo/nível para a síntese. */
export function MergeSourcePicker({
  open,
  currentSubjectId,
  alreadyPickedIds,
  onClose,
  onConfirm,
}: Props) {
  const toast = useAppToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<CardLevel[]>([]);
  const [subjectId, setSubjectId] = useState(currentSubjectId);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [picked, setPicked] = useState<Record<string, Card>>({});

  useEffect(() => {
    if (!open) return;
    setSubjectId(currentSubjectId);
    setLevelFilter('all');
    setQuery('');
    setPicked({});
    setLoadingSubjects(true);
    void Promise.all([subjectsFacade.list(), cardLevelsFacade.list()])
      .then(([subs, lvls]) => {
        setSubjects(subs);
        setLevels(lvls);
      })
      .catch((error) => {
        toast.error(error);
        setSubjects([]);
        setLevels([]);
      })
      .finally(() => setLoadingSubjects(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentSubjectId]);

  useEffect(() => {
    if (!open || !subjectId) return;
    let cancelled = false;
    setLoadingCards(true);
    void cardsFacade
      .listAllBySubject(subjectId)
      .then((list) => {
        if (!cancelled) setCards(list);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error);
          setCards([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCards(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subjectId]);

  const blocked = useMemo(
    () => new Set(alreadyPickedIds),
    [alreadyPickedIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (blocked.has(c.id)) return false;
      if (levelFilter !== 'all' && c.levelId !== levelFilter) return false;
      if (!q) return true;
      return (
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q)
      );
    });
  }, [blocked, cards, levelFilter, query]);

  const pickedList = Object.values(picked);
  const subjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name ?? 'Grupo';
  const levelName = (id: string | null) =>
    (id && levels.find((l) => l.id === id)?.name) || '—';

  const toggle = (card: Card) => {
    setPicked((prev) => {
      if (prev[card.id]) {
        const next = { ...prev };
        delete next[card.id];
        return next;
      }
      return { ...prev, [card.id]: card };
    });
  };

  return (
    <IonModal isOpen={open} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Cards de outros grupos</IonTitle>
          <IonButtons slot="end">
            <button
              type="button"
              className="sc-modal-x"
              aria-label="Fechar"
              onClick={onClose}
            >
              ×
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding sc-form">
        <p className="sc-merge-picker-lead">
          Escolha cards de qualquer grupo e nível. A síntese será criada neste
          local.
        </p>

        {loadingSubjects ? (
          <div className="sc-empty">
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <div className="sc-merge-picker-filters">
            <label className="sc-merge-picker-field">
              <span>Grupo</span>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.id === currentSubjectId ? ' (atual)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="sc-merge-picker-field">
              <span>Nível da carta</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="sc-merge-picker-field">
              <span>Buscar</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Título, verso ou tag…"
              />
            </label>
          </div>
        )}

        {pickedList.length > 0 ? (
          <div className="sc-merge-picker-chosen">
            <strong>{pickedList.length} marcado(s)</strong>
            <div className="sc-merge-picker-chips">
              {pickedList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="sc-merge-picker-chip"
                  title="Remover"
                  onClick={() => toggle(c)}
                >
                  {c.front}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="sc-merge-picker-list" role="listbox" aria-label="Cards">
          {loadingCards ? (
            <div className="sc-empty">
              <IonSpinner name="crescent" />
            </div>
          ) : !filtered.length ? (
            <div className="sc-empty">Nenhum card neste filtro.</div>
          ) : (
            filtered.map((card) => {
              const active = Boolean(picked[card.id]);
              return (
                <button
                  key={card.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`sc-merge-picker-row${active ? ' is-active' : ''}`}
                  onClick={() => toggle(card)}
                >
                  <span className="sc-merge-picker-check" aria-hidden>
                    {active ? '✓' : ''}
                  </span>
                  <span className="sc-merge-picker-row-copy">
                    <strong>{card.front}</strong>
                    <span>
                      {subjectName(card.subjectId)} · {levelName(card.levelId)} ·{' '}
                      {card.tag}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="sc-merge-picker-actions">
          <button type="button" className="sc-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="sc-btn primary"
            disabled={!pickedList.length}
            onClick={() => onConfirm(pickedList)}
          >
            Adicionar {pickedList.length || ''}
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
}
