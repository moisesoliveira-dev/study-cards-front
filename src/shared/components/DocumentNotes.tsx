import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';

type Draft = {
  mode: 'create' | 'edit';
  note: string;
  from: number;
  to: number;
  id?: string | null;
};

type SideNote = {
  id: string;
  note: string;
  from: number;
  to: number;
  top: number;
};

type Props = {
  editor: Editor;
  editable: boolean;
};

function collectAnnotations(editor: Editor): Omit<SideNote, 'top'>[] {
  const byId = new Map<string, Omit<SideNote, 'top'>>();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== 'annotation') continue;
      const note = String(mark.attrs.note ?? '').trim();
      if (!note) continue;
      const id =
        (mark.attrs.id as string | null | undefined) ||
        `anon_${pos}_${node.nodeSize}`;
      const existing = byId.get(id);
      const to = pos + node.nodeSize;
      if (existing) {
        existing.from = Math.min(existing.from, pos);
        existing.to = Math.max(existing.to, to);
      } else {
        byId.set(id, { id, note, from: pos, to });
      }
    }
  });
  return [...byId.values()];
}

/** Painel lateral de notas alinhadas ao trecho (estilo documento). */
export function DocumentNotes({ editor, editable }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notes, setNotes] = useState<SideNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!draft) return;
    const t = window.setTimeout(() => textareaRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [draft]);

  const refreshNotes = useCallback(() => {
    const collected = collectAnnotations(editor);
    const next: SideNote[] = collected.map((item) => {
      let top = 8;
      try {
        const coords = editor.view.coordsAtPos(item.from);
        const root = editor.view.dom.getBoundingClientRect();
        top = Math.max(0, coords.top - root.top + editor.view.dom.scrollTop);
      } catch {
        // ignore
      }
      return { ...item, top };
    });

    const sorted = [...next].sort((a, b) => a.top - b.top);
    let lastBottom = -12;
    for (const n of sorted) {
      if (n.top < lastBottom + 12) n.top = lastBottom + 12;
      lastBottom = n.top + 64;
    }
    setNotes(sorted);

    const { empty, from, to } = editor.state.selection;
    setHasSelection(!empty && from !== to);
  }, [editor]);

  useLayoutEffect(() => {
    refreshNotes();
    const onUpdate = () => {
      window.requestAnimationFrame(refreshNotes);
    };
    editor.on('update', onUpdate);
    editor.on('selectionUpdate', onUpdate);
    editor.on('transaction', onUpdate);
    window.addEventListener('resize', onUpdate);
    const surface = editor.view.dom.closest('.sc-doc-surface');
    surface?.addEventListener('scroll', onUpdate, true);
    return () => {
      editor.off('update', onUpdate);
      editor.off('selectionUpdate', onUpdate);
      editor.off('transaction', onUpdate);
      window.removeEventListener('resize', onUpdate);
      surface?.removeEventListener('scroll', onUpdate, true);
    };
  }, [editor, refreshNotes]);

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
    setDraft({
      mode: existing ? 'edit' : 'create',
      note: existing,
      from,
      to,
      id,
    });
  }, [editable, editor]);

  const openEdit = useCallback(
    (item: SideNote) => {
      if (!editable || !editor.isEditable) return;
      editor
        .chain()
        .focus()
        .setTextSelection({ from: item.from, to: item.to })
        .run();
      setActiveId(item.id);
      setDraft({
        mode: 'edit',
        note: item.note,
        from: item.from,
        to: item.to,
        id: item.id,
      });
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
      chain.updateAnnotation({ note, id: draft.id ?? undefined }).run();
    } else {
      chain.setAnnotation({ note }).run();
    }
    setDraft(null);
    window.requestAnimationFrame(refreshNotes);
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
    window.requestAnimationFrame(refreshNotes);
  };

  useEffect(() => {
    const root = editor.view.dom;

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        '[data-annotation]',
      ) as HTMLElement | null;
      if (!target || !editable || !editor.isEditable) return;
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
        setDraft({
          mode: 'edit',
          note: String(attrs.note ?? ''),
          from: editor.state.selection.from,
          to: editor.state.selection.to,
          id: (attrs.id as string | null) ?? null,
        });
        setActiveId((attrs.id as string | null) ?? null);
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
  }, [editable, editor, openCreate]);

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

  return (
    <aside className="sc-doc-notes-rail" aria-label="Notas">
      <div className="sc-doc-notes-rail-head">Notas</div>

      {editable && hasSelection && !draft ? (
        <button
          type="button"
          className="sc-doc-notes-add"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={openCreate}
        >
          + Nota na seleção
        </button>
      ) : null}

      {draft ? (
        <div
          className="sc-doc-note-card is-editing"
          role="dialog"
          aria-label="Editar nota"
        >
          <div className="sc-doc-note-card-head">
            <span>{draft.mode === 'edit' ? 'Editar nota' : 'Nova nota'}</span>
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

      <div className="sc-doc-notes-track">
        {notes.length === 0 && !draft ? (
          <p className="sc-doc-notes-empty">
            Selecione um trecho e adicione uma nota.
          </p>
        ) : null}
        {notes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sc-doc-note-card is-soft${activeId === item.id ? ' is-active' : ''}`}
            style={{ top: item.top }}
            onClick={() => openEdit(item)}
            title={item.note}
          >
            <span className="sc-doc-note-card-text">{item.note}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
