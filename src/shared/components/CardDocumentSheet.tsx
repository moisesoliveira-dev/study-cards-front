import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IonSpinner } from '@ionic/react';
import type { Card } from '../../modules/cards/types/card.types';
import { statusClass, statusLabel } from '../../modules/cards/types/card.types';
import { cardsFacade } from '../../modules/cards/facades/cards.facade';
import { DocumentEditor, documentToPlainText } from './DocumentEditor';
import { suitColor } from './FaceCardComposer';
import { useAppToast } from '../hooks/useAppToast';

type Props = {
  card: Card | null;
  onClose: () => void;
  onChanged: (card: Card) => void;
  onDelete?: (id: string) => void;
};

export function CardDocumentSheet({ card, onClose, onChanged, onDelete }: Props) {
  const toast = useAppToast();
  const [mode, setMode] = useState<'card' | 'document'>('document');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [docJson, setDocJson] = useState('');
  const [tag, setTag] = useState('Conceito');
  const [hint, setHint] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!card) return;
    setFront(card.front);
    setBack(card.back);
    setTag(card.tag);
    setHint(card.hint ?? '');
    if (card.document?.trim()) {
      setDocJson(card.document);
    } else {
      setDocJson(
        JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: card.back
                ? [{ type: 'text', text: card.back }]
                : [],
            },
          ],
        }),
      );
    }
    setMode('document');
  }, [card]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    globalThis.document.body.classList.add('sc-card-modal-open');
    window.addEventListener('keydown', onKey);
    return () => {
      globalThis.document.body.classList.remove('sc-card-modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [card, onClose]);

  if (!card) return null;

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
        front,
        back: nextBack,
        document: docJson,
        tag,
        hint: hint || null,
      });
      onChanged(updated);
      toast.success('Documento salvo');
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
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

  return createPortal(
    <div
      className={`sc-card-as-modal${mode === 'document' ? ' is-document' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Detalhe do card"
    >
      {mode === 'document' ? (
        <div className="sc-doc-shell">
          <header className="sc-doc-header">
            <button type="button" className="sc-btn" onClick={onClose}>
              Fechar
            </button>
            <div className="sc-doc-header-title">
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
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="sc-btn"
                onClick={() => setMode('card')}
              >
                Ver carta
              </button>
              <button
                type="button"
                className="sc-btn primary"
                disabled={saving || !front.trim()}
                onClick={() => void save()}
              >
                {saving ? <IonSpinner name="crescent" /> : 'Salvar'}
              </button>
            </div>
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
            <DocumentEditor value={docJson} onChange={setDocJson} />
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
            {onDelete ? (
              <button
                type="button"
                className="sc-btn"
                style={{ alignSelf: 'flex-start', marginTop: 8 }}
                onClick={() => onDelete(card.id)}
              >
                Excluir card
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="sc-face-card sc-face-compose is-preview">
          <button
            type="button"
            className="card-compose-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
          <div className="card-suit" style={{ color: suitColor(tag) }}>
            {tag}
          </div>
          <div className="card-title">{front}</div>
          <div className="card-body">{back}</div>
          <span className={`card-status ${statusClass(card.status)}`}>
            {statusLabel(card.status)}
          </span>
          <div className="card-compose-actions">
            <button
              type="button"
              className="sc-btn primary"
              onClick={() => setMode('document')}
            >
              Abrir documento ↗
            </button>
          </div>
        </div>
      )}
    </div>,
    globalThis.document.body,
  );
}
