import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import { HardBreak } from '@tiptap/extension-hard-break';
import type { Mark as ProseMirrorMark } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphLineHeight: {
      setParagraphLineHeight: (value: string) => ReturnType;
      unsetParagraphLineHeight: () => ReturnType;
    };
    paragraphSpacing: {
      setParagraphSpacing: (value: string) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
    indent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
      setIndent: (value: number) => ReturnType;
    };
    annotation: {
      setAnnotation: (attrs: { note: string; id?: string }) => ReturnType;
      unsetAnnotation: () => ReturnType;
      updateAnnotation: (attrs: { note: string; id?: string }) => ReturnType;
    };
  }
}

/** Espaçamento entre linhas no parágrafo/título (estilo Word). */
export const ParagraphLineHeight = Extension.create({
  name: 'paragraphLineHeight',

  addOptions() {
    return { types: ['paragraph', 'heading'] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          paragraphLineHeight: {
            default: null,
            parseHTML: (element) =>
              element.style.lineHeight &&
              !element.closest('span')
                ? element.style.lineHeight
                : element.getAttribute('data-line-height'),
            renderHTML: (attributes) => {
              if (!attributes.paragraphLineHeight) return {};
              return {
                'data-line-height': attributes.paragraphLineHeight,
                style: `line-height: ${attributes.paragraphLineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphLineHeight:
        (paragraphLineHeight) =>
        ({ commands }) =>
          this.options.types.every((type: string) =>
            commands.updateAttributes(type, { paragraphLineHeight }),
          ),
      unsetParagraphLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.every((type: string) =>
            commands.resetAttributes(type, 'paragraphLineHeight'),
          ),
    };
  },
});

/** Espaçamento após o parágrafo (estilo Word). */
export const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',

  addOptions() {
    return { types: ['paragraph', 'heading'] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          paragraphSpacing: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-paragraph-spacing') ||
              element.style.marginBottom ||
              null,
            renderHTML: (attributes) => {
              if (!attributes.paragraphSpacing) return {};
              return {
                'data-paragraph-spacing': attributes.paragraphSpacing,
                style: `margin-bottom: ${attributes.paragraphSpacing}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (paragraphSpacing) =>
        ({ commands }) =>
          this.options.types.every((type: string) =>
            commands.updateAttributes(type, { paragraphSpacing }),
          ),
      unsetParagraphSpacing:
        () =>
        ({ commands }) =>
          this.options.types.every((type: string) =>
            commands.resetAttributes(type, 'paragraphSpacing'),
          ),
    };
  },
});

const MAX_INDENT = 8;

/** Recuo de parágrafo (aumentar/diminuir). */
export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      stepPx: 24,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const raw = element.getAttribute('data-indent');
              if (raw) return Number(raw) || 0;
              const ml = element.style.marginLeft;
              if (!ml) return 0;
              const n = parseFloat(ml);
              if (!Number.isFinite(n)) return 0;
              return Math.round(n / this.options.stepPx);
            },
            renderHTML: (attributes) => {
              const level = Number(attributes.indent) || 0;
              if (level <= 0) return {};
              return {
                'data-indent': String(level),
                style: `margin-left: ${level * this.options.stepPx}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setIndent:
        (value) =>
        ({ commands }) => {
          const next = Math.max(0, Math.min(MAX_INDENT, value));
          return this.options.types.every((type: string) =>
            commands.updateAttributes(type, { indent: next }),
          );
        },
      increaseIndent:
        () =>
        ({ editor, commands }) => {
          if (editor.can().sinkListItem('listItem')) {
            return commands.sinkListItem('listItem');
          }
          if (editor.can().sinkListItem('taskItem')) {
            return commands.sinkListItem('taskItem');
          }
          return this.options.types.every((type: string) => {
            if (!editor.isActive(type)) return true;
            const current =
              (editor.getAttributes(type).indent as number | undefined) ?? 0;
            return commands.updateAttributes(type, {
              indent: Math.min(MAX_INDENT, current + 1),
            });
          });
        },
      decreaseIndent:
        () =>
        ({ editor, commands }) => {
          if (editor.can().liftListItem('listItem')) {
            return commands.liftListItem('listItem');
          }
          if (editor.can().liftListItem('taskItem')) {
            return commands.liftListItem('taskItem');
          }
          return this.options.types.every((type: string) => {
            if (!editor.isActive(type)) return true;
            const current =
              (editor.getAttributes(type).indent as number | undefined) ?? 0;
            return commands.updateAttributes(type, {
              indent: Math.max(0, current - 1),
            });
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.increaseIndent(),
      'Shift-Tab': () => this.editor.commands.decreaseIndent(),
    };
  },
});

function newAnnotationId() {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Anotação estilo Edge: marca o texto selecionado com uma nota.
 * Funciona junto com código (inline e bloco) e demais marcas.
 */
export const Annotation = Mark.create({
  name: 'annotation',
  inclusive: false,
  keepOnSplit: false,
  excludes: '',
  spanning: true,

  addAttributes() {
    return {
      note: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-note') ?? '',
        renderHTML: (attributes) => {
          if (!attributes.note) return {};
          return { 'data-note': String(attributes.note) };
        },
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-annotation-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { 'data-annotation-id': String(attributes.id) };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-annotation]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-annotation': 'true',
          class: 'sc-doc-annotation',
        },
        HTMLAttributes,
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setAnnotation:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, {
            note: attrs.note,
            id: attrs.id || newAnnotationId(),
          }),
      unsetAnnotation:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
      updateAnnotation:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, {
            note: attrs.note,
            ...(attrs.id ? { id: attrs.id } : {}),
          }),
    };
  },
});

/**
 * Resolve marcas a preservar no Shift+Enter.
 * O HardBreak padrão do TipTap falha no início do bloco
 * (`parentOffset === 0`) e no fim de um trecho formatado.
 */
function marksForSoftBreak(state: EditorState): readonly ProseMirrorMark[] {
  const { selection, storedMarks } = state;
  if (storedMarks?.length) return storedMarks;

  const { $from } = selection;
  const atCursor = $from.marks();
  if (atCursor.length) return atCursor;

  const before = $from.nodeBefore?.marks;
  if (before?.length) return before;

  const after = $from.nodeAfter?.marks;
  if (after?.length) return after;

  return [];
}

/**
 * Quebra de linha (Shift+Enter / Ctrl+Enter) que mantém formatação
 * no início e no fim do texto marcado — como em editores de documento.
 */
export const SoftBreak = HardBreak.extend({
  name: 'hardBreak',
  priority: 1010,

  addCommands() {
    return {
      setHardBreak:
        () =>
        ({ chain, state, editor, commands }) => {
          // Em bloco de código: newline real, sem sair do bloco.
          if (editor.isActive('codeBlock')) {
            return commands.insertContent('\n');
          }

          const { selection } = state;
          if (selection.$from.parent.type.spec.isolating) {
            return false;
          }

          const marks = marksForSoftBreak(state);
          const { keepMarks } = this.options;
          const { splittableMarks } = editor.extensionManager;

          return chain()
            .insertContent({ type: this.name })
            .command(({ tr, dispatch }) => {
              if (dispatch && keepMarks && marks.length) {
                const filtered = marks.filter((mark) =>
                  splittableMarks.includes(mark.type.name),
                );
                if (filtered.length) tr.ensureMarks(filtered);
              }
              return true;
            })
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setHardBreak(),
      'Shift-Enter': () => this.editor.commands.setHardBreak(),
    };
  },
});
