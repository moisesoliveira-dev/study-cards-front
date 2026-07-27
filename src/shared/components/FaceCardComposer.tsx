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
import type { CardLevel } from '../../modules/cards/types/card-level.types';
import { CardAccentPicker } from './CardAccentPicker';
import { CardLevelPicker } from './CardLevelPicker';
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

/** Cor de accent da carta: escolhida pelo usuário ou fallback da tag. */
export function cardAccent(color: string | null | undefined, tag: string) {
  return color?.trim() || suitColor(tag);
}

type Props = {
  open: boolean;
  front: string;
  back: string;
  docJson: string;
  tag: string;
  levelId: string | null;
  levels: CardLevel[];
  levelsLoading?: boolean;
  icon: string | null;
  color: string | null;
  saving?: boolean;
  title?: string;
  submitLabel?: string;
  sourceCards?: { id: string; front: string }[];
  onFront: (value: string) => void;
  onBack: (value: string) => void;
  onDocJson: (value: string) => void;
  onTag: (value: string) => void;
  onLevelId: (value: string | null) => void;
  onIcon: (value: string | null) => void;
  onColor: (value: string | null) => void;
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
  levelId,
  levels,
  levelsLoading = false,
  icon,
  color,
  saving = false,
  title = 'Nova carta',
  submitLabel = 'Colocar na mesa',
  sourceCards,
  onFront,
  onBack,
  onDocJson,
  onTag,
  onLevelId,
  onIcon,
  onColor,
  onClose,
  onSubmit,
  style,
}: Props) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<'card' | 'document'>('card');
  const initials = cardInitials(front.trim() || 'Novo');
  const suit = tag.trim() || 'Conceito';
  const accent = cardAccent(color, suit);
  const hasBody = Boolean(back.trim() || documentToPlainText(docJson));
  const canSubmit = Boolean(front.trim()) && !saving;

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
      onDocJson(back);
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
                className="sc-card-compose-stage"
                variants={reduce ? undefined : scaleIn}
                initial={reduce ? false : 'hidden'}
                animate="show"
                exit="exit"
              >
                <div
                  className={`sc-face-card sc-face-compose${icon ? ' has-icon' : ''}`}
                  style={
                    {
                      ...style,
                      '--card-accent': accent,
                    } as CSSProperties
                  }
                >
                  <button
                    type="button"
                    className="card-compose-close"
                    aria-label="Fechar"
                    onClick={onClose}
                  >
                    ×
                  </button>
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
                    <span className="sr-only">Conceito resumido</span>
                    <textarea
                      className="card-body-input"
                      value={back}
                      onChange={(e) => onBack(e.target.value)}
                      placeholder="Conceito resumido (verso ao girar)…"
                      rows={4}
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
                    <div className="sc-linked-cards">
                      <div className="sc-linked-cards-label">
                        Ligando {sourceCards.length} cards
                      </div>
                      <div className="sc-linked-list">
                        {sourceCards.map((src) => (
                          <span
                            key={src.id}
                            className="sc-linked-chip"
                            style={{ cursor: 'default' }}
                          >
                            <span className="sc-linked-chip-title">{src.front}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="sc-card-face-footer is-compose">
                    <div className="card-links">
                      → {sourceCards?.length ?? 0} links
                    </div>
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
                  <p className="card-compose-note">
                    {!front.trim()
                      ? 'Dê um título (frente) para criar a carta.'
                      : hasBody
                        ? 'Pronto para salvar.'
                        : 'Sem verso/documento, o título será usado como verso.'}
                  </p>
                </div>
                <CardLevelPicker
                  levels={levels}
                  value={levelId}
                  onChange={onLevelId}
                  loading={levelsLoading}
                />
                <CardAccentPicker value={color} onChange={onColor} />
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
                    <span>Conceito resumido (verso ao girar)</span>
                    <textarea
                      value={back}
                      onChange={(e) => onBack(e.target.value)}
                      placeholder="Resumo curto mostrado no verso da carta"
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
