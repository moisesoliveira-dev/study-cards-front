import { Extension } from '@tiptap/core';

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
