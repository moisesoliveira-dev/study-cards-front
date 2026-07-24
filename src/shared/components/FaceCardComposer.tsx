import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IonIcon, IonSpinner } from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { cardInitials } from '../../modules/cards/types/card.types';
import {
  DocumentEditor,
  documentToPlainText,
} from './DocumentEditor';
import { CardIconPicker } from './CardIcon';
import { docExpand, fadeIn, scaleIn, tapScale } from '../motion';

export function suitColor(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes('api')) return '#378ADD';
  if (t.includes('dado') || t.includes('infra')) return '#1D9E75';
  if (t.includes('padrão') || t.includes('padrao')) return '#BA7517';
  if (t.includes('síntese') || t.includes('sintese')) return '#7F77DD';
  return '#1D9E75';
}

type Props = {
  open: boolean;
  front: string;
  back: string;
  docJson: string;
  tag: string;
  hint: string;
  icon: string | null;
  saving?: boolean;
  title?: string;
  submitLabel?: string;
  sourceCards?: { id: string; front: string }[];
  onFront: (value: string) => void;
  onBack: (value: string) => void;
  onDocJson: (value: string) => void;
  onTag: (value: string) => void;
  onHint: (value: string) => void;
  onIcon: (value: string | null) => void;
  onClose: () => void;
  onSubmit: () => void;
  style?: CSSProperties;
};

export function FaceCardComposer({
  open,
  front,
  back,
  docJson,
  tag,
  hint,
  icon,
  saving = false,
  title = 'Nova carta',
  submitLabel = 'Colocar na mesa',
  sourceCards,
  onFront,
  onBack,
  onDocJson,
  onTag,
  onHint,
  onIcon,
  onClose,
  onSubmit,
  style,
}: Props) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<'card' | 'document'>('card');
  const initials = cardInitials(front.trim() || 'Novo');
  const suit = tag.trim() || 'Conceito';
  const accent = suitColor(suit);
  const canSubmit =
    Boolean(front.trim() && (back.trim() || documentToPlainText(docJson))) &&
    !saving;

  useEffect(() => {
    if (!open) {
      setMode('card');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'document') setMode('card');
        else onClose();
      }
    };
    globalThis.document.body.classList.add('sc-card-modal-open');
    window.addEventListener('keydown', onKey);
    return () => {
      globalThis.document.body.classList.remove('sc-card-modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, mode]);

  const openDocument = () => {
    if (!docJson.trim() && back.trim()) {
      onDocJson(
        JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: back }],
            },
          ],
        }),
      );
    }
    setMode('document');
  };

  const syncBackFromDocument = () => {
    const plain = documentToPlainText(docJson);
    if (plain && !back.trim()) onBack(plain.slice(0, 280));
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`sc-card-as-modal${mode === 'document' ? ' is-document' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'document' ? 'Documento do card' : title}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && mode === 'card') onClose();
          }}
          variants={reduce ? undefined : fadeIn}
          initial={reduce ? false : 'hidden'}
          animate="show"
          exit="exit"
        >
          <AnimatePresence mode="wait">
            {mode === 'card' ? (
              <motion.div
                key="compose-card"
                className={`sc-face-card sc-face-compose${icon ? ' has-icon' : ''}`}
                style={style}
                variants={reduce ? undefined : scaleIn}
                initial={reduce ? false : 'hidden'}
                animate="show"
                exit="exit"
              >
                <button
                  type="button"
                  className="card-compose-close"
                  aria-label="Fechar"
                  onClick={onClose}
                >
                  ×
                </button>

                <span className="card-corner tl">{initials}</span>
                <span className="card-corner br">{initials}</span>

                <label className="card-compose-field suit">
                  <span className="sr-only">Tag</span>
                  <input
                    className="card-suit-input"
                    value={tag}
                    onChange={(e) => onTag(e.target.value)}
                    placeholder="Tag"
                    style={{ color: accent }}
                    autoComplete="off"
                  />
                </label>

                <div className="card-compose-icon-block">
                  <CardIconPicker
                    value={icon}
                    onChange={onIcon}
                    accent={accent}
                  />
                </div>

                <label className="card-compose-field title">
                  <span className="sr-only">Conceito</span>
                  <textarea
                    className="card-title-input"
                    value={front}
                    onChange={(e) => onFront(e.target.value)}
                    placeholder="Conceito (título)"
                    rows={2}
                    autoFocus
                  />
                </label>

                <label className="card-compose-field body">
                  <span className="sr-only">Explicação</span>
                  <textarea
                    className="card-body-input"
                    value={back}
                    onChange={(e) => onBack(e.target.value)}
                    placeholder="Explicação curta no verso…"
                    rows={4}
                  />
                </label>

                <label className="card-compose-field hint">
                  <span className="sr-only">Dica</span>
                  <input
                    className="card-hint-input"
                    value={hint}
                    onChange={(e) => onHint(e.target.value)}
                    placeholder="Dica (opcional)"
                    autoComplete="off"
                  />
                </label>

                <button
                  type="button"
                  className="card-expand-doc"
                  onClick={openDocument}
                >
                  Documento ↗
                </button>

                {sourceCards?.length ? (
                  <div className="sc-linked-cards" style={{ marginTop: 4 }}>
                    <div className="sc-linked-cards-label">
                      Ligando {sourceCards.length} cards
                    </div>
                    <div className="sc-linked-list">
                      {sourceCards.map((src) => (
                        <span key={src.id} className="sc-linked-chip" style={{ cursor: 'default' }}>
                          <span className="sc-linked-chip-title">{src.front}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <span className="card-status s-new">Novo</span>
                <div className="card-links">
                  → {sourceCards?.length ?? 0} links
                </div>

                <div className="card-compose-actions">
                  <button type="button" className="sc-btn" onClick={onClose}>
                    Cancelar
                  </button>
                  <motion.button
                    type="button"
                    className="sc-btn primary"
                    disabled={!canSubmit}
                    onClick={onSubmit}
                    whileTap={reduce ? undefined : tapScale}
                  >
                    {saving ? <IonSpinner name="crescent" /> : submitLabel}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="compose-doc"
                className="sc-doc-shell"
                variants={reduce ? undefined : docExpand}
                initial={reduce ? false : 'hidden'}
                animate="show"
                exit="exit"
              >
                <header className="sc-doc-header">
                  <button
                    type="button"
                    className="sc-btn sc-btn-icon sc-doc-back"
                    aria-label="Voltar à carta"
                    onClick={() => {
                      syncBackFromDocument();
                      setMode('card');
                    }}
                  >
                    <IonIcon icon={arrowBackOutline} />
                  </button>
                  <div className="sc-doc-header-title">
                    <input
                      className="sc-doc-title-input"
                      value={front}
                      onChange={(e) => onFront(e.target.value)}
                      placeholder="Título do conceito"
                    />
                    <input
                      className="sc-doc-tag-input"
                      value={tag}
                      onChange={(e) => onTag(e.target.value)}
                      placeholder="Tag"
                      style={{ color: accent }}
                    />
                  </div>
                  <motion.button
                    type="button"
                    className="sc-btn primary"
                    disabled={!canSubmit}
                    onClick={() => {
                      syncBackFromDocument();
                      onSubmit();
                    }}
                    whileTap={reduce ? undefined : tapScale}
                  >
                    {saving ? <IonSpinner name="crescent" /> : 'Salvar'}
                  </motion.button>
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
                  <p className="sc-doc-lead">
                    Documento detalhado — use títulos, listas e blocos de código
                    com a linguagem escolhida.
                  </p>
                  <DocumentEditor value={docJson} onChange={onDocJson} />
                  <label className="sc-doc-hint-row">
                    <span>Dica rápida (aparece na carta)</span>
                    <input
                      value={hint}
                      onChange={(e) => onHint(e.target.value)}
                      placeholder="Opcional"
                    />
                  </label>
                  <label className="sc-doc-hint-row">
                    <span>Verso curto (estudo / face da carta)</span>
                    <textarea
                      value={back}
                      onChange={(e) => onBack(e.target.value)}
                      placeholder="Resumo curto usado na revisão"
                      rows={2}
                    />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    globalThis.document.body,
  );
}
