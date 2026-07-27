import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';

const PANEL_W = 360;
const FADE_MS = 220;

type Panel = {
  mode: 'create' | 'edit' | 'view';
  note: string;
  from: number;
  to: number;
  id?: string | null;
  top: number;
  left: number;
};

type Props = {
  editor: Editor;
  editable: boolean;
};

function placeBeside(
  editor: Editor,
  from: number,
): { top: number; left: number } {
  const gap = 14;
  let anchorTop = 80;
  let anchorBottom = 120;

  try {
    const coords = editor.view.coordsAtPos(from);
    anchorTop = coords.top;
    anchorBottom = coords.bottom;
  } catch {
    // ignore
  }

  const shell =
    editor.view.dom.closest('.sc-doc-shell')?.getBoundingClientRect() ??
    editor.view.dom.getBoundingClientRect();

  let left = shell.right + gap;
  if (left + PANEL_W > window.innerWidth - 10) {
    left = shell.left - PANEL_W - gap;
  }
  if (left < 10) {
    left = Math.max(
      10,
      Math.min(window.innerWidth - PANEL_W - 10, shell.right - PANEL_W),
    );
  }

  const top = Math.max(
    10,
    Math.min(window.innerHeight - 360, (anchorTop + anchorBottom) / 2 - 40),
  );

  return { top, left };
}

function sameNote(
  a: Panel | null,
  b: Omit<Panel, 'top' | 'left'>,
): boolean {
  if (!a) return false;
  if (a.id && b.id) return a.id === b.id;
  return a.from === b.from && a.to === b.to && a.note === b.note;
}

/** Nota flutuante fora do modal — só aparece ao criar ou ao clicar no trecho. */
export function DocumentNotes({ editor, editable }: Props) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [visible, setVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelSnap = useRef<Panel | null>(null);
  const visibleSnap = useRef(false);
  const fadeTimer = useRef<number | null>(null);
  const gen = useRef(0);

  useEffect(() => {
    panelSnap.current = panel;
  }, [panel]);

  useEffect(() => {
    visibleSnap.current = visible;
  }, [visible]);

  useEffect(
    () => () => {
      if (fadeTimer.current != null) window.clearTimeout(fadeTimer.current);
    },
    [],
  );

  const clearFade = () => {
    if (fadeTimer.current != null) {
      window.clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
  };

  const closePanel = useCallback(() => {
    clearFade();
    const token = ++gen.current;
    setVisible(false);
    fadeTimer.current = window.setTimeout(() => {
      if (gen.current !== token) return;
      setPanel(null);
      fadeTimer.current = null;
    }, FADE_MS);
  }, []);

  const openAt = useCallback((next: Omit<Panel, 'top' | 'left'>) => {
    clearFade();
    const pos = placeBeside(editor, next.from);
    const current = panelSnap.current;
    const isShowing = visibleSnap.current;
    const token = ++gen.current;

    if (current && isShowing && sameNote(current, next)) {
      setPanel({ ...next, ...pos });
      setVisible(true);
      return;
    }

    if (current && isShowing) {
      setVisible(false);
      fadeTimer.current = window.setTimeout(() => {
        if (gen.current !== token) return;
        setPanel({ ...next, ...placeBeside(editor, next.from) });
        window.requestAnimationFrame(() => {
          if (gen.current !== token) return;
          setVisible(true);
        });
        fadeTimer.current = null;
      }, FADE_MS);
      return;
    }

    setPanel({ ...next, ...pos });
    setVisible(false);
    window.requestAnimationFrame(() => {
      if (gen.current !== token) return;
      setVisible(true);
    });
  }, [editor]);

  useEffect(() => {
    if (!panel || panel.mode === 'view' || !visible) return;
    const t = window.setTimeout(() => textareaRef.current?.focus(), FADE_MS + 40);
    return () => window.clearTimeout(t);
  }, [panel?.mode, panel?.from, panel?.id, visible]);

  useLayoutEffect(() => {
    if (!panel) return;
    const reposition = () => {
      const pos = placeBeside(editor, panel.from);
      setPanel((p) => (p ? { ...p, ...pos } : p));
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [editor, panel?.from, panel?.id]);

  const openCreate = useCallback(() => {
    if (!editable || !editor.isEditable) return;
    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) return;
    const existing = editor.isActive('annotation')
      ? ((editor.getAttributes('annotation').note as string | undefined) ?? '')
      : '';
    const id = editor.isActive('annotation')
      ? ((editor.getAttributes('annotation').id as string | null) ?? null)
      : null;
    openAt({
      mode: existing ? 'edit' : 'create',
      note: existing,
      from,
      to,
      id,
    });
  }, [editable, editor, openAt]);

  const saveDraft = () => {
    if (!panel || panel.mode === 'view') return;
    const note = panel.note.trim();
    const { from, to } = panel;
    if (from >= to) {
      closePanel();
      return;
    }
    if (!note) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .unsetAnnotation()
        .run();
      closePanel();
      return;
    }
    const chain = editor.chain().focus().setTextSelection({ from, to });
    if (panel.mode === 'edit') {
      chain.updateAnnotation({ note, id: panel.id ?? undefined }).run();
    } else {
      chain.setAnnotation({ note }).run();
    }
    closePanel();
  };

  const deleteNote = () => {
    if (!panel) return;
    editor
      .chain()
      .focus()
      .setTextSelection({ from: panel.from, to: panel.to })
      .unsetAnnotation()
      .run();
    closePanel();
  };

  useEffect(() => {
    const root = editor.view.dom;

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        '[data-annotation]',
      ) as HTMLElement | null;
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        const pos = editor.view.posAtDOM(target, 0);
        editor
          .chain()
          .setTextSelection(pos)
          .extendMarkRange('annotation')
          .run();
        const attrs = editor.getAttributes('annotation');
        const note = String(attrs.note ?? '');
        const id = (attrs.id as string | null) ?? null;
        const { from, to } = editor.state.selection;
        openAt({
          mode: editable && editor.isEditable ? 'edit' : 'view',
          note,
          from,
          to,
          id,
        });
      } catch {
        // ignore
      }
    };

    const onOpenNote = () => openCreate();

    root.addEventListener('click', onClick);
    root.addEventListener('sc-open-note', onOpenNote as EventListener);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('sc-open-note', onOpenNote as EventListener);
    };
  }, [editable, editor, openAt, openCreate]);

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

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      if (editor.view.dom.contains(t)) {
        const el = (t as HTMLElement).closest?.('[data-annotation]');
        if (el) return;
      }
      closePanel();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [panel, closePanel, editor]);

  if (!panel || typeof document === 'undefined') return null;

  const editing = panel.mode === 'create' || panel.mode === 'edit';

  return createPortal(
    <div
      ref={panelRef}
      className={`sc-doc-note-float${visible ? ' is-visible' : ''}${
        editing ? ' is-editing' : ''
      }`}
      style={{ top: panel.top, left: panel.left }}
      role="dialog"
      aria-label={editing ? 'Nota' : 'Ver nota'}
    >
      <div className="sc-doc-note-float-head">
        <span>
          {panel.mode === 'create'
            ? 'Nova nota'
            : panel.mode === 'edit'
              ? 'Editar nota'
              : 'Nota'}
        </span>
        <button
          type="button"
          className="sc-doc-note-composer-x"
          aria-label="Fechar"
          onClick={closePanel}
        >
          ×
        </button>
      </div>

      <div className="sc-doc-note-float-scroll">
        {editing ? (
          <textarea
            ref={textareaRef}
            value={panel.note}
            rows={10}
            placeholder="Escreva a nota…"
            onChange={(e) =>
              setPanel((p) => (p ? { ...p, note: e.target.value } : p))
            }
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                closePanel();
              }
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                saveDraft();
              }
            }}
          />
        ) : (
          <p className="sc-doc-note-float-body">{panel.note}</p>
        )}
      </div>

      {editing ? (
        <div className="sc-doc-note-composer-actions">
          {panel.mode === 'edit' ? (
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
            <button type="button" className="sc-btn" onClick={closePanel}>
              Cancelar
            </button>
            <button
              type="button"
              className="sc-btn primary"
              onClick={saveDraft}
              disabled={!panel.note.trim()}
            >
              Salvar
            </button>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
