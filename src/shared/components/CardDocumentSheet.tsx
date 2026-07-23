import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IonIcon, IonSpinner } from '@ionic/react';
import { createOutline, saveOutline, trashOutline } from 'ionicons/icons';
import type { Card } from '../../modules/cards/types/card.types';
import { statusClass, statusLabel } from '../../modules/cards/types/card.types';
import { cardsFacade } from '../../modules/cards/facades/cards.facade';
import { DocumentEditor, documentToPlainText } from './DocumentEditor';
import { suitColor } from './FaceCardComposer';
import { useAppToast } from '../hooks/useAppToast';
import { docExpand, fadeIn, scaleIn } from '../motion';

type Props = {
  card: Card | null;
  onClose: () => void;
  onChanged: (card: Card) => void;
  onDelete?: (id: string) => void;
};

function seedDocument(card: Card) {
  if (card.document?.trim()) return card.document;
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: card.back ? [{ type: 'text', text: card.back }] : [],
      },
    ],
  });
}

export function CardDocumentSheet({ card, onClose, onChanged, onDelete }: Props) {
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<'card' | 'document'>('card');
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [docJson, setDocJson] = useState('');
  const [tag, setTag] = useState('Conceito');
  const [hint, setHint] = useState('');
  const [saving, setSaving] = useState(false);

  const hydrate = (next: Card) => {
    setFront(next.front);
    setBack(next.back);
    setTag(next.tag);
    setHint(next.hint ?? '');
    setDocJson(seedDocument(next));
  };

  useEffect(() => {
    if (!card) return;
    hydrate(card);
    setMode('card');
    setEditing(false);
  }, [card]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editing) {
        hydrate(card);
        setEditing(false);
        return;
      }
      if (mode === 'document') {
        setMode('card');
        return;
      }
      onClose();
    };
    globalThis.document.body.classList.add('sc-card-modal-open');
    window.addEventListener('keydown', onKey);
    return () => {
      globalThis.document.body.classList.remove('sc-card-modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [card, onClose, editing, mode]);

  if (!card) return null;

  const hasDocument = Boolean(
    card.document?.trim() && documentToPlainText(card.document),
  );

  const save = async () => {
    if (!front.trim()) return;
    setSaving(true);
    try {
      const plain = documentToPlainText(docJson);
      const nextBack = back.trim() || plain.slice(0, 280);
      if (!nextBack) {
        toast.error('Preencha o verso curto ou o documento');
        return;
      }
      const updated = await cardsFacade.update(card.id, {
        front: front.trim(),
        back: nextBack,
        document: docJson.trim() || null,
        tag: tag.trim() || 'Conceito',
        hint: hint.trim() || null,
      });
      onChanged(updated);
      hydrate(updated);
      setEditing(false);
      toast.success('Salvo');
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    hydrate(card);
    setEditing(false);
  };

  const updateStatus = async (status: Card['status']) => {
    try {
      const updated = await cardsFacade.update(card.id, { status });
      onChanged(updated);
      toast.success('Status atualizado');
    } catch (error) {
      toast.error(error);
    }
  };

  const editButton = (
    <button
      type="button"
      className="sc-edit-icon"
      onClick={() => setEditing(true)}
      aria-label="Editar"
      title="Editar"
    >
      <IonIcon icon={createOutline} />
    </button>
  );

  const saveButton = (
    <button
      type="button"
      className="sc-edit-icon sc-save-icon"
      onClick={() => void save()}
      disabled={saving || !front.trim()}
      aria-label="Salvar"
      title="Salvar"
    >
      {saving ? <IonSpinner name="crescent" /> : <IonIcon icon={saveOutline} />}
    </button>
  );

  const deleteButton =
    onDelete ? (
      <button
        type="button"
        className="sc-edit-icon sc-delete-icon"
        onClick={() => onDelete(card.id)}
        aria-label="Excluir"
        title="Excluir"
      >
        <IonIcon icon={trashOutline} />
      </button>
    ) : null;

  return createPortal(
    <motion.div
      className={`sc-card-as-modal${mode === 'document' ? ' is-document' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Detalhe do card"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && mode === 'card' && !editing) {
          onClose();
        }
      }}
      variants={reduce ? undefined : fadeIn}
      initial={reduce ? false : 'hidden'}
      animate="show"
      exit="exit"
    >
      <AnimatePresence mode="wait">
      {mode === 'document' ? (
        <motion.div
          key="doc"
          className="sc-doc-shell"
          variants={reduce ? undefined : docExpand}
          initial={reduce ? false : 'hidden'}
          animate="show"
          exit="exit"
        >
          <header className="sc-doc-header">
            <button
              type="button"
              className="sc-btn"
              onClick={() => {
                if (editing) cancelEdit();
                setMode('card');
              }}
            >
              ← Carta
            </button>
            <div className="sc-doc-header-title">
              {editing ? (
                <>
                  <input
                    className="sc-doc-title-input"
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                  />
                  <input
                    className="sc-doc-tag-input"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    style={{ color: suitColor(tag) }}
                  />
                </>
              ) : (
                <>
                  <h1 className="sc-doc-title-view">{front}</h1>
                  <p
                    className="sc-doc-tag-view"
                    style={{ color: suitColor(tag) }}
                  >
                    {tag}
                  </p>
                </>
              )}
            </div>
            {editing ? (
              <>
                <button
                  type="button"
                  className="sc-btn"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancelar
                </button>
                {saveButton}
                {deleteButton}
              </>
            ) : (
              <>
                {editButton}
                {deleteButton}
              </>
            )}
            <button
              type="button"
              className="sc-doc-close"
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </header>
          <div className="sc-doc-body">
            <div className="sc-doc-meta">
              <span className={`card-status ${statusClass(card.status)}`}>
                {statusLabel(card.status)}
              </span>
              <button
                type="button"
                className="sc-btn"
                onClick={() => void updateStatus('KNOWN')}
              >
                Sabido
              </button>
              <button
                type="button"
                className="sc-btn"
                onClick={() => void updateStatus('REVIEW')}
              >
                Revisar
              </button>
            </div>
            {!editing && !hasDocument && !documentToPlainText(docJson) ? (
              <p className="sc-doc-empty">
                Ainda sem documento detalhado. Toque no lápis para escrever.
              </p>
            ) : (
              <DocumentEditor
                key={`${card.id}-${editing ? 'edit' : 'view'}`}
                value={docJson}
                onChange={setDocJson}
                editable={editing}
                placeholder="Escreva notas, exemplos, ideias…"
              />
            )}
            {editing ? (
              <>
                <label className="sc-doc-hint-row">
                  <span>Dica rápida</span>
                  <input
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="Opcional"
                  />
                </label>
                <label className="sc-doc-hint-row">
                  <span>Verso curto (estudo)</span>
                  <textarea
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    rows={2}
                  />
                </label>
              </>
            ) : hint ? (
              <p className="sc-doc-hint-view">
                <span>Dica</span> {hint}
              </p>
            ) : null}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="card"
          className={`sc-face-card sc-face-compose is-preview${editing ? ' is-editing' : ''}`}
          variants={reduce ? undefined : scaleIn}
          initial={reduce ? false : 'hidden'}
          animate="show"
          exit="exit"
        >
          <button
            type="button"
            className="card-compose-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
          {!editing ? (
            <span className="sc-card-edit-actions">
              {editButton}
              {deleteButton}
            </span>
          ) : (
            <span className="sc-card-edit-actions">
              {saveButton}
              {deleteButton}
            </span>
          )}

          {editing ? (
            <>
              <label className="card-compose-field suit">
                <span className="sr-only">Tag</span>
                <input
                  className="card-suit-input"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  style={{ color: suitColor(tag) }}
                  autoComplete="off"
                />
              </label>
              <label className="card-compose-field title">
                <span className="sr-only">Conceito</span>
                <textarea
                  className="card-title-input"
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  rows={2}
                  autoFocus
                />
              </label>
              <label className="card-compose-field body">
                <span className="sr-only">Explicação</span>
                <textarea
                  className="card-body-input"
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  rows={4}
                />
              </label>
              <label className="card-compose-field hint">
                <span className="sr-only">Dica</span>
                <input
                  className="card-hint-input"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="Dica (opcional)"
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                className="card-expand-doc"
                onClick={() => setMode('document')}
              >
                Documento ↗
              </button>
              <div className="card-compose-actions">
                <button type="button" className="sc-btn" onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="card-suit" style={{ color: suitColor(tag) }}>
                {tag}
              </div>
              <div className="card-title">{front}</div>
              <div className="card-body">{back}</div>
              {hint ? <div className="card-hint-view">{hint}</div> : null}
              <span className={`card-status ${statusClass(card.status)}`}>
                {statusLabel(card.status)}
              </span>
              <button
                type="button"
                className="card-expand-doc"
                onClick={() => setMode('document')}
              >
                Documento ↗
              </button>
            </>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>,
    globalThis.document.body,
  );
}
