import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  albumsOutline,
  chevronForwardOutline,
  folderOutline,
  searchOutline,
} from 'ionicons/icons';
import { subjectsFacade } from '../../subjects/facades/subjects.facade';
import type { Subject } from '../../subjects/types/subject.types';
import { topicsFacade } from '../facades/topics.facade';
import type { TopicTreeNode } from '../types/topic.types';
import { cardsFacade } from '../../cards/facades/cards.facade';
import type { Card } from '../../cards/types/card.types';
import { subjectHref, topicHref } from '../../../shared/drive/drive-nav';
import {
  collectTopicIds,
  filterTopicTree,
  topicAncestorIds,
} from '../utils/topic-tree';

type Props = {
  /** `sidebar` = compacto no menu; `page` = página cheia. */
  variant?: 'sidebar' | 'page';
  showCards?: boolean;
  onNavigate?: () => void;
};

type ForestEntry = {
  subject: Subject;
  tree: TopicTreeNode[];
  loading: boolean;
  error: boolean;
};

function cardLabel(card: Card) {
  const t = card.front.trim();
  return t || card.tag || 'Carta sem título';
}

export function EcosystemTree({
  variant = 'page',
  showCards = false,
  onNavigate,
}: Props) {
  const history = useHistory();
  const location = useLocation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [forest, setForest] = useState<Record<string, ForestEntry>>({});
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [cardsByKey, setCardsByKey] = useState<Record<string, Card[]>>({});
  const [cardsLoading, setCardsLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [query, setQuery] = useState('');

  const activeSubjectId = useMemo(() => {
    const m = location.pathname.match(/^\/subjects\/([^/]+)/);
    if (m) return m[1];
    const params = new URLSearchParams(location.search);
    return params.get('subjectId');
  }, [location.pathname, location.search]);

  const activeTopicId = useMemo(() => {
    const m = location.pathname.match(/^\/topics\/([^/]+)/);
    return m?.[1] ?? null;
  }, [location.pathname]);

  const loadForest = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const list = await subjectsFacade.list();
      setSubjects(list);
      const entries = await Promise.all(
        list.map(async (subject) => {
          try {
            const tree = await topicsFacade.tree(subject.id);
            return {
              subject,
              tree,
              loading: false,
              error: false,
            } satisfies ForestEntry;
          } catch {
            return {
              subject,
              tree: [] as TopicTreeNode[],
              loading: false,
              error: true,
            } satisfies ForestEntry;
          }
        }),
      );
      const map: Record<string, ForestEntry> = {};
      for (const e of entries) map[e.subject.id] = e;
      setForest(map);
    } catch {
      setSubjects([]);
      setForest({});
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    void loadForest();
  }, [loadForest]);

  /** Expande ancestrais do local atual (sem resetar o restante). */
  useEffect(() => {
    if (!subjects.length || !Object.keys(forest).length) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (activeSubjectId) {
        next.add(`s:${activeSubjectId}`);
        const entry = forest[activeSubjectId];
        if (entry && activeTopicId) {
          for (const id of topicAncestorIds(entry.tree, activeTopicId)) {
            next.add(`t:${id}`);
          }
          next.add(`t:${activeTopicId}`);
        }
      } else if (prev.size === 0 && subjects[0]) {
        next.add(`s:${subjects[0].id}`);
      }
      return next;
    });
  }, [activeSubjectId, activeTopicId, subjects, forest]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    const next = new Set<string>();
    for (const s of subjects) {
      next.add(`s:${s.id}`);
      const entry = forest[s.id];
      if (entry) {
        for (const id of collectTopicIds(entry.tree)) next.add(`t:${id}`);
      }
    }
    setExpanded(next);
  };

  const collapseAll = () => setExpanded(new Set());

  const goSubject = (subjectId: string) => {
    onNavigate?.();
    history.push(subjectHref(subjectId));
  };

  const goTopic = (subjectId: string, topicId: string) => {
    onNavigate?.();
    history.push(topicHref(subjectId, topicId));
  };

  const ensureCards = async (
    key: string,
    subjectId: string,
    topicId: string | null,
  ) => {
    if (!showCards || cardsByKey[key] || cardsLoading[key]) return;
    setCardsLoading((m) => ({ ...m, [key]: true }));
    try {
      const list = topicId
        ? await cardsFacade.listByTopic(topicId)
        : await cardsFacade.listRootBySubject(subjectId);
      setCardsByKey((m) => ({ ...m, [key]: list }));
    } catch {
      setCardsByKey((m) => ({ ...m, [key]: [] }));
    } finally {
      setCardsLoading((m) => ({ ...m, [key]: false }));
    }
  };

  useEffect(() => {
    if (!showCards) return;
    for (const s of subjects) {
      const sKey = `s:${s.id}`;
      if (expanded.has(sKey)) void ensureCards(sKey, s.id, null);
      const entry = forest[s.id];
      if (!entry) continue;
      const walk = (nodes: TopicTreeNode[]) => {
        for (const n of nodes) {
          const tKey = `t:${n.id}`;
          if (expanded.has(tKey)) void ensureCards(tKey, s.id, n.id);
          if (n.children.length) walk(n.children);
        }
      };
      walk(entry.tree);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expand-driven fetch
  }, [showCards, expanded, subjects, forest]);

  const filteredForest = useMemo(() => {
    const q = query.trim();
    return subjects.map((subject) => {
      const entry = forest[subject.id];
      const tree = entry ? filterTopicTree(entry.tree, q) : [];
      const subjectHit =
        !q ||
        subject.name.toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR')) ||
        (subject.description ?? '')
          .toLocaleLowerCase('pt-BR')
          .includes(q.toLocaleLowerCase('pt-BR'));
      return {
        subject,
        entry,
        tree,
        visible: subjectHit || tree.length > 0 || !entry,
      };
    });
  }, [subjects, forest, query]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const subject of subjects) {
        const entry = forest[subject.id];
        if (!entry) continue;
        const tree = filterTopicTree(entry.tree, q);
        const subjectHit =
          subject.name.toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR')) ||
          (subject.description ?? '')
            .toLocaleLowerCase('pt-BR')
            .includes(q.toLocaleLowerCase('pt-BR'));
        if (!subjectHit && !tree.length) continue;
        next.add(`s:${subject.id}`);
        for (const id of collectTopicIds(tree)) next.add(`t:${id}`);
      }
      return next;
    });
  }, [query, subjects, forest]);

  const onRowKey = (
    e: KeyboardEvent,
    activate: () => void,
    toggleKey?: string,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && toggleKey) {
      e.preventDefault();
      const wantOpen = e.key === 'ArrowRight';
      setExpanded((prev) => {
        const next = new Set(prev);
        if (wantOpen) next.add(toggleKey);
        else next.delete(toggleKey);
        return next;
      });
    }
  };

  const renderCards = (key: string, subjectId: string, topicId: string | null) => {
    if (!showCards || !expanded.has(key)) return null;
    if (cardsLoading[key]) {
      return (
        <div className="sc-eco-tree-cards is-loading">
          <IonSpinner name="crescent" />
        </div>
      );
    }
    const cards = cardsByKey[key] ?? [];
    if (!cards.length) return null;
    return (
      <ul className="sc-eco-tree-cards" role="group">
        {cards.map((card) => (
          <li key={card.id}>
            <button
              type="button"
              className="sc-eco-tree-row is-card"
              title={cardLabel(card)}
              onClick={() => {
                if (topicId) goTopic(subjectId, topicId);
                else goSubject(subjectId);
              }}
            >
              <span className="sc-eco-tree-twist is-spacer" aria-hidden />
              <IonIcon icon={albumsOutline} aria-hidden />
              <span className="sc-eco-tree-label">{cardLabel(card)}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  const renderTopics = (
    subjectId: string,
    nodes: TopicTreeNode[],
    depth: number,
  ) => (
    <ul className="sc-eco-tree-list" role="group">
      {nodes.map((node) => {
        const key = `t:${node.id}`;
        const open = expanded.has(key);
        const hasKids = node.children.length > 0 || showCards;
        const active = activeTopicId === node.id;
        return (
          <li key={node.id} style={{ '--eco-depth': depth } as CSSProperties}>
            <div className={`sc-eco-tree-row-wrap${active ? ' is-active' : ''}`}>
              <button
                type="button"
                className="sc-eco-tree-twist"
                aria-label={open ? 'Recolher pasta' : 'Expandir pasta'}
                aria-expanded={open}
                disabled={!hasKids}
                onClick={() => hasKids && toggle(key)}
              >
                {hasKids ? (
                  <IonIcon
                    icon={chevronForwardOutline}
                    className={open ? 'is-open' : undefined}
                  />
                ) : null}
              </button>
              <button
                type="button"
                className={`sc-eco-tree-row is-folder${active ? ' is-active' : ''}`}
                title={node.description ?? node.name}
                onClick={() => goTopic(subjectId, node.id)}
                onKeyDown={(e) =>
                  onRowKey(e, () => goTopic(subjectId, node.id), key)
                }
              >
                <span
                  className="sc-eco-tree-dot"
                  style={{ background: node.color }}
                  aria-hidden
                />
                <IonIcon icon={folderOutline} aria-hidden />
                <span className="sc-eco-tree-label">{node.name}</span>
              </button>
            </div>
            {open ? (
              <>
                {node.children.length
                  ? renderTopics(subjectId, node.children, depth + 1)
                  : null}
                {renderCards(key, subjectId, node.id)}
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  if (loadingSubjects) {
    return (
      <div className={`sc-eco-tree is-${variant} is-loading`}>
        <IonSpinner name="crescent" />
      </div>
    );
  }

  if (!subjects.length) {
    return (
      <div className={`sc-eco-tree is-${variant}`}>
        <p className="sc-eco-tree-empty">Nenhum grupo ainda. Crie um em Cartas.</p>
      </div>
    );
  }

  return (
    <div className={`sc-eco-tree is-${variant}`}>
      {variant === 'page' ? (
        <div className="sc-eco-tree-toolbar">
          <label className="sc-eco-tree-search">
            <IonIcon icon={searchOutline} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar pastas…"
              aria-label="Filtrar pastas"
            />
          </label>
          <div className="sc-eco-tree-actions">
            <button type="button" className="sc-btn" onClick={expandAll}>
              Expandir tudo
            </button>
            <button type="button" className="sc-btn" onClick={collapseAll}>
              Recolher
            </button>
          </div>
        </div>
      ) : (
        <label className="sc-eco-tree-search is-compact">
          <IonIcon icon={searchOutline} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar…"
            aria-label="Filtrar árvore"
          />
        </label>
      )}

      <ul className="sc-eco-tree-root" role="tree">
        {filteredForest.map(({ subject, entry, tree, visible }) => {
          if (!visible) return null;
          const key = `s:${subject.id}`;
          const open = expanded.has(key);
          const active =
            activeSubjectId === subject.id && !activeTopicId;
          return (
            <li key={subject.id} role="treeitem" aria-expanded={open}>
              <div className={`sc-eco-tree-row-wrap${active ? ' is-active' : ''}`}>
                <button
                  type="button"
                  className="sc-eco-tree-twist"
                  aria-label={open ? 'Recolher grupo' : 'Expandir grupo'}
                  aria-expanded={open}
                  onClick={() => toggle(key)}
                >
                  <IonIcon
                    icon={chevronForwardOutline}
                    className={open ? 'is-open' : undefined}
                  />
                </button>
                <button
                  type="button"
                  className={`sc-eco-tree-row is-subject${active ? ' is-active' : ''}`}
                  title={subject.description ?? subject.name}
                  onClick={() => goSubject(subject.id)}
                  onKeyDown={(e) =>
                    onRowKey(e, () => goSubject(subject.id), key)
                  }
                >
                  <span
                    className="sc-eco-tree-dot"
                    style={{ background: subject.color }}
                    aria-hidden
                  />
                  <span className="sc-eco-tree-label">{subject.name}</span>
                </button>
              </div>
              {open ? (
                entry?.loading ? (
                  <div className="sc-eco-tree-nested-loading">
                    <IonSpinner name="crescent" />
                  </div>
                ) : entry?.error ? (
                  <p className="sc-eco-tree-empty is-pad">
                    Não foi possível carregar pastas.
                  </p>
                ) : (
                  <>
                    {tree.length ? renderTopics(subject.id, tree, 1) : (
                      <p className="sc-eco-tree-empty is-pad">
                        Sem pastas neste grupo.
                      </p>
                    )}
                    {renderCards(key, subject.id, null)}
                  </>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
