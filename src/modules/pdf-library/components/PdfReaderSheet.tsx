import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  helpCircleOutline,
  layersOutline,
  readerOutline,
  trashOutline,
} from 'ionicons/icons';
import type { PdfDocument } from '../types/pdf-library.types';
import { pdfLibraryFacade } from '../facades/pdf-library.facade';
import { subjectsFacade } from '../../subjects/facades/subjects.facade';
import { cardsFacade } from '../../cards/facades/cards.facade';
import type { Subject } from '../../subjects/types/subject.types';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { docExpand, fadeIn } from '../../../shared/motion';
import {
  PdfSelectableViewer,
  type PdfViewerHandle,
} from './PdfSelectableViewer';

type CardField = 'front' | 'back' | 'document' | 'hint';

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
  { id: 'hint', label: 'Dica', short: 'Opcional', icon: helpCircleOutline },
];

export function PdfReaderSheet({ pdf, groupName, onClose }: Props) {
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [documentPlain, setDocumentPlain] = useState('');
  const [tag, setTag] = useState('Conceito');
  const [hint, setHint] = useState('');
  const [lastAssigned, setLastAssigned] = useState<CardField | null>(null);
  const pdfViewerRef = useRef<PdfViewerHandle | null>(null);

  const resetDraft = useCallback(() => {
    setFront('');
    setBack('');
    setDocumentPlain('');
    setHint('');
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
    } else if (field === 'hint') {
      setHint(text.slice(0, 280));
    } else if (field === 'document') {
      setDocumentPlain((prev) =>
        prev.trim() ? `${prev.trim()}\n\n${text}` : text,
      );
      if (!back.trim()) setBack(text.slice(0, 280));
    }

    setLastAssigned(field);
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
        topicId: null,
        front: nextFront,
        back: nextBack,
        document: nextDoc,
        hint: hint.trim() || undefined,
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
      [front, back, documentPlain, hint].filter((v) => v.trim()).length,
    [front, back, documentPlain, hint],
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

                <label className="sc-pdf-field">
                  <span>Grupo</span>
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
                    <input
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      placeholder="Conceito"
                    />
                  </label>
                  <label className="sc-pdf-field">
                    <span>Dica</span>
                    <input
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="Opcional"
                    />
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
