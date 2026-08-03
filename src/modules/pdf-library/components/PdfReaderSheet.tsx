import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  addOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  closeOutline,
  documentTextOutline,
  layersOutline,
  readerOutline,
  trashOutline,
} from 'ionicons/icons';
import type { PdfDocument } from '../types/pdf-library.types';
import { pdfLibraryFacade } from '../facades/pdf-library.facade';
import { subjectsFacade } from '../../subjects/facades/subjects.facade';
import { topicsFacade } from '../../topics/facades/topics.facade';
import { cardsFacade } from '../../cards/facades/cards.facade';
import { cardLevelsFacade } from '../../cards/facades/card-levels.facade';
import type { CardLevel } from '../../cards/types/card-level.types';
import type { Subject } from '../../subjects/types/subject.types';
import type { TopicTreeNode } from '../../topics/types/topic.types';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { CardTagPicker } from '../../../shared/components/CardTagPicker';
import { docExpand, fadeIn } from '../../../shared/motion';
import {
  PdfSelectableViewer,
  type PdfViewerHandle,
} from './PdfSelectableViewer';

type CardField = 'front' | 'back' | 'document';

type Props = {
  pdf: PdfDocument | null;
  groupName?: string | null;
  onClose: () => void;
};

function textToDocJson(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const content = (paragraphs.length ? paragraphs : [text.trim() || '']).map(
    (block) => ({
      type: 'paragraph' as const,
      content: block ? [{ type: 'text' as const, text: block }] : [],
    }),
  );
  return JSON.stringify({ type: 'doc', content });
}

const FIELD_OPTIONS: {
  id: CardField;
  label: string;
  short: string;
  icon: string;
}[] = [
  { id: 'front', label: 'Frente', short: 'Título', icon: readerOutline },
  { id: 'back', label: 'Verso', short: 'Resposta', icon: layersOutline },
  { id: 'document', label: 'Documento', short: 'Texto longo', icon: documentTextOutline },
];

const GROUP_COLORS = ['#BA7517', '#378ADD', '#1D9E75', '#7F77DD', '#D4537E', '#888780'];

type FlatTopic = { id: string; name: string; depth: number };

/** Flatten the topic tree keeping depth so every subgroup level is selectable. */
function flattenTopics(
  nodes: TopicTreeNode[],
  depth = 0,
  acc: FlatTopic[] = [],
): FlatTopic[] {
  for (const node of nodes) {
    acc.push({ id: node.id, name: node.name, depth });
    if (node.children?.length) flattenTopics(node.children, depth + 1, acc);
  }
  return acc;
}

export function PdfReaderSheet({ pdf, groupName, onClose }: Props) {
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState<TopicTreeNode[]>([]);
  const [topicId, setTopicId] = useState('');
  const [creating, setCreating] = useState<'group' | 'subgroup' | null>(null);
  const [newName, setNewName] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [documentPlain, setDocumentPlain] = useState('');
  const [tag, setTag] = useState('Conceito');
  const [levelId, setLevelId] = useState<string | null>(null);
  const [levels, setLevels] = useState<CardLevel[]>([]);
  const [lastAssigned, setLastAssigned] = useState<CardField | null>(null);
  const pdfViewerRef = useRef<PdfViewerHandle | null>(null);

  useEffect(() => {
    void cardLevelsFacade
      .list()
      .then((list) => {
        setLevels(list);
        setLevelId((prev) => prev ?? list.find((l) => l.slug === 'basic')?.id ?? list[0]?.id ?? null);
      })
      .catch(() => setLevels([]));
  }, []);

  const resetDraft = useCallback(() => {
    setFront('');
    setBack('');
    setDocumentPlain('');
    setLevelId(levels.find((l) => l.slug === 'basic')?.id ?? levels[0]?.id ?? null);
    setTag('Conceito');
    setPendingText('');
    setLastAssigned(null);
    pdfViewerRef.current?.clearSelection();
  }, []);

  useEffect(() => {
    if (!pdf) {
      setUrl(null);
      resetDraft();
      setCreatedCount(0);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const pdfId = pdf.id;
    setLoading(true);
    setUrl(null);
    resetDraft();
    setCreatedCount(0);

    void pdfLibraryFacade
      .fetchBlob(pdfId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error);
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf?.id]);

  useEffect(() => {
    if (!pdf) return;
    void subjectsFacade
      .list()
      .then((list) => {
        setSubjects(list);
        setSubjectId((prev) =>
          prev && list.some((s) => s.id === prev) ? prev : list[0]?.id || '',
        );
      })
      .catch((error) => {
        toast.error(error);
      });
  }, [pdf, toast]);

  useEffect(() => {
    if (!pdf || !subjectId) {
      setTopics([]);
      setTopicId('');
      return;
    }
    let cancelled = false;
    void topicsFacade
      .tree(subjectId)
      .then((tree) => {
        if (cancelled) return;
        setTopics(tree);
        setTopicId((prev) =>
          prev && flattenTopics(tree).some((t) => t.id === prev) ? prev : '',
        );
      })
      .catch(() => {
        if (!cancelled) setTopics([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, subjectId]);

  const flatTopics = useMemo(() => flattenTopics(topics), [topics]);

  useEffect(() => {
    if (!pdf) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.document.body.style.overflow = prevOverflow;
    };
  }, [pdf, onClose]);

  const onTextSelected = useCallback((text: string) => {
    setPendingText(text);
  }, []);

  const assignField = (field: CardField) => {
    const text = pendingText.trim();
    if (!text) {
      toast.error(new Error('Selecione um trecho no PDF primeiro.'));
      return;
    }

    if (field === 'front') {
      setFront(text.slice(0, 220));
    } else if (field === 'back') {
      setBack((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
    } else if (field === 'document') {
      setDocumentPlain((prev) =>
        prev.trim() ? `${prev.trim()}\n\n${text}` : text,
      );
      if (!back.trim()) setBack(text.slice(0, 280));
    }

    setLastAssigned(field);
  };

  const startCreate = (kind: 'group' | 'subgroup') => {
    if (kind === 'subgroup' && !subjectId) {
      toast.error(new Error('Escolha um grupo antes de criar um subgrupo.'));
      return;
    }
    setCreating(kind);
    setNewName('');
  };

  const cancelCreate = () => {
    setCreating(null);
    setNewName('');
  };

  const confirmCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSavingTarget(true);
    try {
      if (creating === 'group') {
        const color = GROUP_COLORS[subjects.length % GROUP_COLORS.length];
        const subject = await subjectsFacade.create({ name, color });
        setSubjects((prev) => [...prev, subject]);
        setSubjectId(subject.id);
        setTopicId('');
        toast.success('Grupo criado');
      } else if (creating === 'subgroup') {
        // Nest under the currently selected subgroup (or group root)
        const topic = await topicsFacade.create({
          subjectId,
          parentId: topicId || null,
          name,
        });
        const tree = await topicsFacade.tree(subjectId);
        setTopics(tree);
        setTopicId(topic.id);
        toast.success('Subgrupo criado');
      }
      setCreating(null);
      setNewName('');
    } catch (error) {
      toast.error(error);
    } finally {
      setSavingTarget(false);
    }
  };

  const createCard = async () => {
    if (!subjectId) {
      toast.error(new Error('Escolha um grupo de cartas na lateral.'));
      return;
    }
    const nextFront = front.trim();
    if (!nextFront) {
      toast.error(new Error('Defina a frente (título) da carta.'));
      return;
    }

    const nextBack = back.trim() || documentPlain.trim().slice(0, 280) || nextFront;
    const nextDoc = documentPlain.trim()
      ? textToDocJson(documentPlain.trim())
      : undefined;

    setSaving(true);
    try {
      await cardsFacade.create({
        subjectId,
        topicId: topicId || null,
        front: nextFront,
        back: nextBack,
        document: nextDoc,
        levelId,
        icon: null,
        tag: tag.trim() || 'Conceito',
      });
      setCreatedCount((n) => n + 1);
      toast.success('Carta criada');
      resetDraft();
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const canCreate = Boolean(front.trim() && subjectId && !saving);
  const draftFilled = useMemo(
    () =>
      [front, back, documentPlain].filter((v) => v.trim()).length,
    [front, back, documentPlain],
  );

  return createPortal(
    <AnimatePresence>
      {pdf ? (
        <motion.div
          key={pdf.id}
          className="sc-card-as-modal is-document sc-pdf-reader-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Leitura · ${pdf.title}`}
          variants={reduce ? undefined : fadeIn}
          initial={reduce ? false : 'hidden'}
          animate="show"
          exit="exit"
        >
          <motion.div
            className="sc-doc-shell sc-pdf-reader-shell"
            variants={reduce ? undefined : docExpand}
            initial={reduce ? false : 'hidden'}
            animate="show"
            exit="exit"
          >
            <header className="sc-doc-header sc-pdf-reader-header">
              <button
                type="button"
                className="sc-btn sc-btn-icon sc-doc-back"
                aria-label="Voltar à biblioteca"
                title="Voltar"
                onClick={onClose}
              >
                <IonIcon icon={arrowBackOutline} />
              </button>
              <div className="sc-doc-header-title">
                <h1 className="sc-doc-title-view">{pdf.title}</h1>
                <p className="sc-doc-tag-view">
                  {groupName?.trim() || 'Sem coleção'}
                  {createdCount > 0
                    ? ` · ${createdCount} carta${createdCount > 1 ? 's' : ''} criada${createdCount > 1 ? 's' : ''}`
                    : ' · selecione o texto com o mouse'}
                </p>
              </div>
            </header>

            <div className="sc-pdf-reader-workspace">
              <section className="sc-pdf-reader-stage" aria-label="Documento PDF">
                {loading || !url ? (
                  <div className="sc-pdf-boot">
                    <div className="sc-pdf-boot-skeleton" />
                    <p>Carregando documento…</p>
                  </div>
                ) : (
                  <PdfSelectableViewer
                    url={url}
                    title={pdf.title}
                    onTextSelected={onTextSelected}
                    viewerRef={pdfViewerRef}
                  />
                )}
              </section>

              <aside className="sc-pdf-card-panel" aria-label="Montar carta">
                <div className="sc-pdf-card-panel-head">
                  <div>
                    <span className="sc-pdf-card-kicker">Nova carta</span>
                    <h2>Do trecho selecionado</h2>
                  </div>
                  {createdCount > 0 ? (
                    <span className="sc-pdf-created-pill">
                      <IonIcon icon={checkmarkCircleOutline} />
                      {createdCount}
                    </span>
                  ) : null}
                </div>

                <div className="sc-pdf-target">
                  {creating ? (
                    <div className="sc-pdf-target-create">
                      <span className="sc-pdf-target-create-label">
                        {creating === 'group'
                          ? 'Novo grupo'
                          : topicId
                            ? 'Novo subgrupo (dentro do selecionado)'
                            : 'Novo subgrupo (na raiz do grupo)'}
                      </span>
                      <div className="sc-pdf-target-create-row">
                        <input
                          autoFocus
                          value={newName}
                          placeholder={
                            creating === 'group' ? 'Ex.: Direito' : 'Ex.: Capítulo 1'
                          }
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void confirmCreate();
                            if (e.key === 'Escape') cancelCreate();
                          }}
                        />
                        <button
                          type="button"
                          className="sc-btn primary"
                          disabled={!newName.trim() || savingTarget}
                          onClick={() => void confirmCreate()}
                        >
                          {savingTarget ? (
                            <IonSpinner name="crescent" />
                          ) : (
                            <IonIcon icon={checkmarkCircleOutline} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="sc-btn sc-btn-icon"
                          onClick={cancelCreate}
                          aria-label="Cancelar"
                        >
                          <IonIcon icon={closeOutline} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="sc-pdf-field">
                        <span className="sc-pdf-field-head">
                          Grupo
                          <button
                            type="button"
                            className="sc-pdf-mini-add"
                            onClick={() => startCreate('group')}
                            title="Criar novo grupo"
                          >
                            <IonIcon icon={addOutline} />
                            Novo
                          </button>
                        </span>
                        <select
                          value={subjectId}
                          onChange={(e) => setSubjectId(e.target.value)}
                        >
                          {!subjects.length ? (
                            <option value="">Nenhum grupo em Cartas</option>
                          ) : null}
                          {subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="sc-pdf-field">
                        <span className="sc-pdf-field-head">
                          Subgrupo
                          <button
                            type="button"
                            className="sc-pdf-mini-add"
                            disabled={!subjectId}
                            onClick={() => startCreate('subgroup')}
                            title="Criar subgrupo dentro do destino atual"
                          >
                            <IonIcon icon={addOutline} />
                            Novo
                          </button>
                        </span>
                        <select
                          value={topicId}
                          disabled={!subjectId}
                          onChange={(e) => setTopicId(e.target.value)}
                        >
                          <option value="">Raiz do grupo</option>
                          {flatTopics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {`${'\u00A0\u00A0'.repeat(topic.depth)}${topic.depth ? '└ ' : ''}${topic.name}`}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </div>

                <div className={`sc-pdf-clip${pendingText ? ' has-text' : ''}`}>
                  <div className="sc-pdf-clip-head">
                    <span>Seleção</span>
                    {pendingText ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingText('');
                          pdfViewerRef.current?.clearSelection();
                        }}
                      >
                        Limpar
                      </button>
                    ) : null}
                  </div>
                  <p>
                    {pendingText
                      ? pendingText.length > 280
                        ? `${pendingText.slice(0, 280)}…`
                        : pendingText
                      : 'Selecione o texto no PDF com o mouse. Depois escolha onde colocar.'}
                  </p>
                  <div className="sc-pdf-assign-grid">
                    {FIELD_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={lastAssigned === option.id ? 'is-last' : undefined}
                        disabled={!pendingText.trim()}
                        onClick={() => assignField(option.id)}
                        title={`Colocar seleção em ${option.label}`}
                      >
                        <IonIcon icon={option.icon} />
                        <strong>{option.label}</strong>
                        <small>{option.short}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="sc-pdf-field">
                  <span>Frente</span>
                  <textarea
                    rows={2}
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    placeholder="Título / pergunta"
                  />
                </label>

                <label className="sc-pdf-field">
                  <span>Verso</span>
                  <textarea
                    rows={3}
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    placeholder="Resposta curta"
                  />
                </label>

                <label className="sc-pdf-field">
                  <span>Documento</span>
                  <textarea
                    rows={5}
                    value={documentPlain}
                    onChange={(e) => setDocumentPlain(e.target.value)}
                    placeholder="Texto longo (opcional)"
                  />
                </label>

                <div className="sc-pdf-field-row">
                  <label className="sc-pdf-field">
                    <span>Tag</span>
                    <CardTagPicker
                      className="sc-field-input"
                      value={tag}
                      onChange={(name) => setTag(name)}
                    />
                  </label>
                  <label className="sc-pdf-field">
                    <span>Nível</span>
                    <select
                      value={levelId ?? ''}
                      onChange={(e) => setLevelId(e.target.value || null)}
                    >
                      <option value="">Sem nível</option>
                      {levels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="sc-pdf-card-actions">
                  <button
                    type="button"
                    className="sc-btn"
                    disabled={!draftFilled && !pendingText}
                    onClick={resetDraft}
                    title="Limpar rascunho"
                  >
                    <IonIcon icon={trashOutline} />
                    Limpar
                  </button>
                  <button
                    type="button"
                    className="sc-btn primary"
                    disabled={!canCreate}
                    onClick={() => void createCard()}
                  >
                    {saving ? <IonSpinner name="crescent" /> : 'Criar carta'}
                  </button>
                </div>

                {!subjectId ? (
                  <p className="sc-pdf-card-hint is-warn">
                    Crie um grupo em Cartas para salvar aqui.
                  </p>
                ) : !front.trim() ? (
                  <p className="sc-pdf-card-hint">
                    Selecione o título no PDF e toque em Frente.
                  </p>
                ) : (
                  <p className="sc-pdf-card-hint">
                    {!back.trim() && !documentPlain.trim()
                      ? 'Sem verso, o título será usado como resposta.'
                      : 'Pronto para criar. Continue montando a próxima.'}
                  </p>
                )}
              </aside>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    window.document.body,
  );
}
