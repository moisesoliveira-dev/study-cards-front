import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  arrowBackOutline,
  documentTextOutline,
  helpCircleOutline,
  layersOutline,
  readerOutline,
} from 'ionicons/icons';
import type { PdfDocument } from '../types/pdf-library.types';
import { pdfLibraryFacade } from '../facades/pdf-library.facade';
import { subjectsFacade } from '../../subjects/facades/subjects.facade';
import { cardsFacade } from '../../cards/facades/cards.facade';
import type { Subject } from '../../subjects/types/subject.types';
import { FaceCardComposer } from '../../../shared/components/FaceCardComposer';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { docExpand, fadeIn } from '../../../shared/motion';
import { PdfSelectableViewer } from './PdfSelectableViewer';

type CardField = 'front' | 'back' | 'document' | 'hint';

type SelectionState = {
  text: string;
  top: number;
  left: number;
};

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
  const content = (paragraphs.length ? paragraphs : [text.trim()]).map(
    (block) => ({
      type: 'paragraph' as const,
      content: block
        ? [{ type: 'text' as const, text: block }]
        : [],
    }),
  );
  return JSON.stringify({ type: 'doc', content });
}

const FIELD_OPTIONS: {
  id: CardField;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    id: 'front',
    label: 'Frente',
    hint: 'Título / pergunta da carta',
    icon: readerOutline,
  },
  {
    id: 'back',
    label: 'Verso',
    hint: 'Resposta curta',
    icon: layersOutline,
  },
  {
    id: 'document',
    label: 'Documento',
    hint: 'Texto longo da carta',
    icon: documentTextOutline,
  },
  {
    id: 'hint',
    label: 'Dica',
    hint: 'Ajuda opcional',
    icon: helpCircleOutline,
  },
];

export function PdfReaderSheet({ pdf, groupName, onClose }: Props) {
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [docJson, setDocJson] = useState('');
  const [tag, setTag] = useState('Conceito');
  const [hint, setHint] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [filledFrom, setFilledFrom] = useState<CardField | null>(null);

  useEffect(() => {
    if (!pdf) {
      setUrl(null);
      setSelection(null);
      setComposerOpen(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const pdfId = pdf.id;
    setLoading(true);
    setUrl(null);
    setSelection(null);

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
      .catch(() => {
        /* ignore until create */
      });
  }, [pdf]);

  useEffect(() => {
    if (!pdf || composerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selection) {
          setSelection(null);
          window.getSelection()?.removeAllRanges();
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.document.body.style.overflow = prevOverflow;
    };
  }, [pdf, onClose, selection, composerOpen]);

  const onTextSelected = useCallback((text: string, rect: DOMRect) => {
    const pad = 12;
    const menuWidth = 300;
    const menuHeight = 340;
    const left = Math.min(
      Math.max(pad, rect.left + rect.width / 2 - menuWidth / 2),
      window.innerWidth - menuWidth - pad,
    );
    const preferBelow = rect.bottom + menuHeight + pad < window.innerHeight;
    const top = preferBelow
      ? Math.min(rect.bottom + 10, window.innerHeight - menuHeight - pad)
      : Math.max(pad, rect.top - menuHeight - 10);
    setSelection({ text, top, left });
  }, []);

  const clearSelectionUi = useCallback(() => {
    setSelection(null);
  }, []);

  const applyField = (field: CardField) => {
    if (!selection?.text) return;
    const text = selection.text;
    setFront('');
    setBack('');
    setDocJson('');
    setHint('');
    setTag('Conceito');
    setIcon(null);
    setFilledFrom(field);

    if (field === 'front') setFront(text.slice(0, 220));
    if (field === 'back') setBack(text);
    if (field === 'hint') setHint(text.slice(0, 280));
    if (field === 'document') {
      setDocJson(textToDocJson(text));
      setBack(text.slice(0, 280));
    }

    setSelection(null);
    window.getSelection()?.removeAllRanges();
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setFilledFrom(null);
  };

  const createCard = async () => {
    if (!subjectId) {
      toast.error(
        new Error('Crie um grupo em Cartas antes de salvar a carta.'),
      );
      return;
    }
    if (!front.trim()) {
      toast.error(new Error('A frente da carta é obrigatória.'));
      return;
    }
    setSaving(true);
    try {
      await cardsFacade.create({
        subjectId,
        front: front.trim(),
        back: back.trim() || front.trim(),
        document: docJson.trim() || undefined,
        hint: hint.trim() || undefined,
        icon,
        tag: tag.trim() || 'Conceito',
      });
      toast.success('Carta criada a partir do PDF');
      closeComposer();
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const filledLabel = useMemo(
    () => FIELD_OPTIONS.find((f) => f.id === filledFrom)?.label,
    [filledFrom],
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
                  {groupName?.trim() || 'Sem coleção'} · marque texto para criar
                  cartas
                </p>
              </div>
              <span className="sc-pdf-reader-badge" aria-hidden>
                <IonIcon icon={documentTextOutline} />
                Leitura
              </span>
            </header>

            <div className="sc-pdf-reader-body">
              {loading || !url ? (
                <div className="sc-pdf-reader-loading">
                  <IonSpinner name="crescent" />
                  <span>Abrindo documento…</span>
                </div>
              ) : (
                <PdfSelectableViewer
                  url={url}
                  title={pdf.title}
                  onTextSelected={onTextSelected}
                  onSelectionCleared={clearSelectionUi}
                />
              )}
            </div>
          </motion.div>

          {selection ? (
            <div
              className="sc-pdf-selection-menu"
              style={{ top: selection.top, left: selection.left }}
              role="dialog"
              aria-label="Criar carta a partir da seleção"
            >
              <div className="sc-pdf-selection-preview">
                “
                {selection.text.length > 120
                  ? `${selection.text.slice(0, 120)}…`
                  : selection.text}
                ”
              </div>
              <label className="sc-pdf-selection-subject">
                Grupo de cartas
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
              <p className="sc-pdf-selection-label">
                Preencher qual parte da carta?
              </p>
              <div className="sc-pdf-selection-actions">
                {FIELD_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!subjectId}
                    onClick={() => applyField(option.id)}
                    title={
                      subjectId
                        ? option.hint
                        : 'Crie um grupo em Cartas primeiro'
                    }
                  >
                    <IonIcon icon={option.icon} />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.hint}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <FaceCardComposer
            open={composerOpen}
            front={front}
            back={back}
            docJson={docJson}
            tag={tag}
            hint={hint}
            icon={icon}
            saving={saving}
            title={
              filledLabel
                ? `Nova carta · ${filledLabel} do PDF`
                : 'Nova carta do PDF'
            }
            submitLabel="Criar carta"
            onFront={setFront}
            onBack={setBack}
            onDocJson={setDocJson}
            onTag={setTag}
            onHint={setHint}
            onIcon={setIcon}
            onClose={closeComposer}
            onSubmit={() => void createCard()}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>,
    window.document.body,
  );
}
