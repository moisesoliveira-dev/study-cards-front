import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Field } from './Field';

type BaseProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
};

type SimpleProps = BaseProps & {
  mode?: 'simple';
  confirmText?: never;
};

type TypeConfirmProps = BaseProps & {
  mode: 'type';
  /** Exact string the user must type to enable confirm. */
  confirmText: string;
  confirmHint?: string;
};

type Props = SimpleProps | TypeConfirmProps;

export function ConfirmDialog(props: Props) {
  const {
    open,
    title,
    message,
    confirmLabel = 'Excluir',
    cancelLabel = 'Cancelar',
    onCancel,
    onConfirm,
    confirming,
  } = props;
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const needsType = props.mode === 'type';
  const expected = needsType ? props.confirmText : '';
  const canConfirm =
    !confirming &&
    (!needsType || typed.trim() === expected);

  return createPortal(
    <div
      className="sc-confirm-overlay is-portal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sc-confirm-title"
      aria-describedby="sc-confirm-desc"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="sc-confirm-dialog">
        <h3 id="sc-confirm-title">{title}</h3>
        <p id="sc-confirm-desc">{message}</p>

        {needsType ? (
          <div className="sc-confirm-type">
            <p className="sc-confirm-type-hint">
              {props.confirmHint ?? (
                <>
                  Digite <strong>{expected}</strong> para confirmar.
                </>
              )}
            </p>
            <Field
              label="Nome do grupo"
              value={typed}
              onChange={setTyped}
              placeholder={expected}
              autoFocus
              onEnter={() => {
                if (canConfirm) onConfirm();
              }}
            />
          </div>
        ) : null}

        <div className="sc-confirm-actions">
          <button
            type="button"
            className="sc-btn"
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="sc-btn sc-confirm-danger"
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            {confirming ? 'Excluindo…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
