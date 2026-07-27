import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';

type Draft = {
  mode: 'create' | 'edit';
  note: string;
  x: number;
  y: number;
  from: number;
  to: number;
};

type HoverTip = {
  note: string;
  x: number;
  y: number;
};

type BubblePos = { x: number; y: number };

type Props = {
  editor: Editor;
  editable: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function placeNearRect(rect: DOMRect, heightGuess = 180) {
  const width = 280;
  const pad = 10;
  const x = clamp(
    rect.left + rect.width / 2 - width / 2,
    pad,
    window.innerWidth - width - pad,
  );
  const below = rect.bottom + 10;
  const y =
    below + heightGuess > window.innerHeight
      ? Math.max(pad, rect.top - heightGuess)
      : below;
  return { x, y };
}

function selectionRect(editor: Editor): DOMRect | null {
  const { from, to, empty } = editor.state.selection;
  if (empty || from === to) return null;
  try {
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const top = Math.min(start.top, end.top);
    const bottom = Math.max(start.bottom, end.bottom);
    const left = Math.min(start.left, end.left);
    const right = Math.max(start.right, end.right);
    return new DOMRect(left, top, Math.max(right - left, 8), Math.max(bottom - top, 16));
  } catch {
    return null;
  }
}

/** Menu de seleção + compositor/hover de notas (estilo Edge). */
export function DocumentNotes({ editor, editable }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hover, setHover] = useState<HoverTip | null>(null);
  const [bubble, setBubble] = useState<BubblePos | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;

  useEffect(() => {
    if (!draft) return;
    const t = window.setTimeout(() => textareaRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [draft]);

  const syncBubble = useCallback(() => {
    if (!editable || draftRef.current) {
      setBubble(null);
      return;
    }
    if (!editor.isEditable) {
      setBubble(null);
      return;
    }
    const rect = selectionRect(editor);
    if (!rect) {
      setBubble(null);
      return;
    }
    const width = 140;
    setBubble({
      x: clamp(
        rect.left + rect.width / 2 - width / 2,
        8,
        window.innerWidth - width - 8,
      ),
      y: Math.max(8, rect.top - 44),
    });
  }, [editable, editor]);

  useEffect(() => {
    const onUpdate = () => {
      // deixa o mouseup terminar antes de medir a seleção
      window.requestAnimationFrame(syncBubble);
    };
    editor.on('selectionUpdate', onUpdate);
    editor.on('transaction', onUpdate);
    window.addEventListener('scroll', onUpdate, true);
    window.addEventListener('resize', onUpdate);
    syncBubble();
    return () => {
      editor.off('selectionUpdate', onUpdate);
      editor.off('transaction', onUpdate);
      window.removeEventListener('scroll', onUpdate, true);
      window.removeEventListener('resize', onUpdate);
    };
  }, [editor, syncBubble]);

  const openCreate = useCallback(() => {
    if (!editable || !editor.isEditable) return;
    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) return;
    const rect = selectionRect(editor);
    if (!rect) return;
    const { x, y } = placeNearRect(rect);
    const existing = editor.isActive('annotation')
      ? ((editor.getAttributes('annotation').note as string | undefined) ?? '')
      : '';
    setHover(null);
    setBubble(null);
    setDraft({
      mode: existing ? 'edit' : 'create',
      note: existing,
      x,
      y,
      from,
      to,
    });
  }, [editable, editor]);

  const openEditAt = useCallback(
    (el: HTMLElement) => {
      if (!editable || !editor.isEditable) return;
      const note = el.getAttribute('data-note') ?? '';
      const rect = el.getBoundingClientRect();
      const { x, y } = placeNearRect(rect);
      let from = editor.state.selection.from;
      let to = editor.state.selection.to;
      try {
        const pos = editor.view.posAtDOM(el, 0);
        if (pos >= 0) {
          editor
            .chain()
            .setTextSelection(pos)
            .extendMarkRange('annotation')
            .run();
          from = editor.state.selection.from;
          to = editor.state.selection.to;
        }
      } catch {
        // ignore
      }
      setHover(null);
      setBubble(null);
      setDraft({ mode: 'edit', note, x, y, from, to });
    },
    [editable, editor],
  );

  const saveDraft = () => {
    if (!draft) return;
    const note = draft.note.trim();
    const { from, to } = draft;
    if (from >= to) {
      setDraft(null);
      return;
    }
    if (!note) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .unsetAnnotation()
        .run();
      setDraft(null);
      return;
    }
    const chain = editor.chain().focus().setTextSelection({ from, to });
    if (draft.mode === 'edit') {
      chain.updateAnnotation({ note }).run();
    } else {
      chain.setAnnotation({ note }).run();
    }
    setDraft(null);
  };

  const deleteNote = () => {
    if (!draft) return;
    editor
      .chain()
      .focus()
      .setTextSelection({ from: draft.from, to: draft.to })
      .unsetAnnotation()
      .run();
    setDraft(null);
  };

  useEffect(() => {
    const root = editor.view.dom;

    const clearHoverTimer = () => {
      if (hoverTimer.current != null) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
    };

    const onMove = (e: MouseEvent) => {
      if (draftRef.current) return;
      const target = (e.target as HTMLElement | null)?.closest?.(
        '[data-annotation]',
      ) as HTMLElement | null;
      if (!target) {
        clearHoverTimer();
        setHover(null);
        return;
      }
      const note = target.getAttribute('data-note')?.trim();
      if (!note) return;
      clearHoverTimer();
      hoverTimer.current = window.setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const width = 260;
        const x = clamp(
          rect.left + rect.width / 2 - width / 2,
          8,
          window.innerWidth - width - 8,
        );
        setHover({ note, x, y: Math.max(8, rect.top - 8) });
      }, 160);
    };

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        '[data-annotation]',
      ) as HTMLElement | null;
      if (!target || !editable || !editor.isEditable) return;
      e.preventDefault();
      e.stopPropagation();
      openEditAt(target);
    };

    const onOpenNote = () => openCreate();

    root.addEventListener('mousemove', onMove);
    root.addEventListener('click', onClick);
    root.addEventListener('sc-open-note', onOpenNote as EventListener);
    return () => {
      clearHoverTimer();
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('click', onClick);
      root.removeEventListener('sc-open-note', onOpenNote as EventListener);
    };
  }, [editable, editor, openCreate, openEditAt]);

  useEffect(() => {
    if (!editable) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.altKey) return;
      if (e.key.toLowerCase() !== 'n') return;
      if (editor.state.selection.empty) return;
      e.preventDefault();
      openCreate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editable, editor, openCreate]);

  return createPortal(
    <>
      {editable && bubble && !draft ? (
        <div
          className="sc-doc-note-bubble"
          style={{ left: bubble.x, top: bubble.y }}
          role="toolbar"
          aria-label="Seleção"
          onMouseDown={(e) => {
            // impede a seleção do editor sumir ao clicar no botão
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            className="sc-doc-note-bubble-btn"
            onClick={openCreate}
          >
            {editor.isActive('annotation') ? 'Editar nota' : 'Adicionar nota'}
          </button>
        </div>
      ) : null}

      {draft ? (
        <div
          className="sc-doc-note-composer"
          style={{ left: draft.x, top: draft.y }}
          role="dialog"
          aria-label={draft.mode === 'edit' ? 'Editar nota' : 'Nova nota'}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="sc-doc-note-composer-head">
            <span>{draft.mode === 'edit' ? 'Nota' : 'Nova nota'}</span>
            <button
              type="button"
              className="sc-doc-note-composer-x"
              aria-label="Fechar"
              onClick={() => setDraft(null)}
            >
              ×
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={draft.note}
            rows={4}
            placeholder="Escreva a nota…"
            onChange={(e) =>
              setDraft((d) => (d ? { ...d, note: e.target.value } : d))
            }
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setDraft(null);
              }
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                saveDraft();
              }
            }}
          />
          <div className="sc-doc-note-composer-actions">
            {draft.mode === 'edit' ? (
              <button
                type="button"
                className="sc-btn sc-doc-note-danger"
                onClick={deleteNote}
              >
                Excluir
              </button>
            ) : (
              <span />
            )}
            <div className="sc-doc-note-composer-right">
              <button
                type="button"
                className="sc-btn"
                onClick={() => setDraft(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="sc-btn primary"
                onClick={saveDraft}
                disabled={!draft.note.trim()}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {hover && !draft ? (
        <div
          className="sc-doc-note-tip"
          style={{ left: hover.x, top: hover.y }}
          role="tooltip"
        >
          {hover.note}
        </div>
      ) : null}
    </>,
    globalThis.document.body,
  );
}
