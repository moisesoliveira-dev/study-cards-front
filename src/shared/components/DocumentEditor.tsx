import { useEffect, useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Code from '@tiptap/extension-code';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Markdown } from '@tiptap/markdown';
import { common, createLowlight } from 'lowlight';
import {
  Annotation,
  Indent,
  ParagraphLineHeight,
  ParagraphSpacing,
  SoftBreak,
} from './document-editor-extensions';
import { DocumentNotes } from './DocumentNotes';

const lowlight = createLowlight(common);

/** Código inline que permite anotações (e outras marcas). */
const CodeWithNotes = Code.extend({
  excludes: 'code',
});

/** Bloco de código que permite anotações e não se apaga no Backspace. */
const CodeBlockWithNotes = CodeBlockLowlight.extend({
  marks: 'annotation',

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),

      /**
       * No início de um bloco com conteúdo, o TipTap padrão chama clearNodes()
       * (quando o bloco é o 1º do doc) e apaga o código. Aqui só removemos
       * bloco vazio; com conteúdo, subimos para o parágrafo anterior ou
       * criamos um acima — sem destruir o código.
       */
      Backspace: ({ editor }) => {
        const { empty, $anchor } = editor.state.selection;
        if (!empty || $anchor.parent.type.name !== 'codeBlock') {
          return false;
        }

        const atStartOfBlock = $anchor.parentOffset === 0;
        const isEmpty = !$anchor.parent.textContent.length;

        if (isEmpty) {
          return editor.commands.clearNodes();
        }

        if (!atStartOfBlock) {
          return false;
        }

        const before = $anchor.before();
        if (before > 0) {
          return editor.commands.command(({ tr, dispatch, state }) => {
            const $pos = state.doc.resolve(before);
            if (dispatch) {
              tr.setSelection(Selection.near($pos, -1)).scrollIntoView();
            }
            return true;
          });
        }

        return editor
          .chain()
          .insertContentAt(before, { type: 'paragraph' })
          .setTextSelection(before + 1)
          .run();
      },
    };
  },
});

function looksLikeRichHtml(html: string): boolean {
  const t = html.trim().toLowerCase();
  if (!t.includes('<')) return false;
  if (t.includes('<!--startfragment-->') || t.includes('mso-')) return true;
  if (/<pre[\s>]/.test(t) || /<code[\s>]/.test(t)) return true;
  return /<(p|div|ul|ol|li|h[1-6]|table|blockquote|strong|em|b|i|a|br)\b/.test(
    t,
  );
}

function looksLikeCode(text: string): boolean {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length < 2) {
    return (
      /[{};]\s*$/.test(text.trim()) ||
      /^(import |export |const |let |var |function |class |def |package |#include )/m.test(
        text,
      )
    );
  }
  const indented = lines.filter((l) => /^\s{2,}|\t/.test(l)).length;
  const codey = lines.filter((l) =>
    /[{};]|=>|::|def |function |class |import |#include |SELECT |FROM /.test(l),
  ).length;
  return indented >= 1 || codey >= 2 || (lines.length >= 3 && codey >= 1);
}

function looksLikeMarkdown(text: string): boolean {
  return (
    /^#{1,6}\s/m.test(text) ||
    /^\s*[-*+]\s+\S/m.test(text) ||
    /^\s*\d+\.\s+\S/m.test(text) ||
    /```[\s\S]*```/.test(text) ||
    /\*\*[^*\n]+\*\*/.test(text) ||
    /\[[^\]]+\]\([^)]+\)/.test(text)
  );
}

function detectCodeLanguage(text: string): string {
  if (
    /^\s*import .+ from ['"]|:\s*[A-Z]\w*<|interface |type \w+ =/m.test(text)
  ) {
    return 'typescript';
  }
  if (/^\s*(def |async def |from \w+ import |print\()/m.test(text)) {
    return 'python';
  }
  if (/^\s*(SELECT |INSERT |UPDATE |DELETE |CREATE TABLE)/im.test(text)) {
    return 'sql';
  }
  if (/^\s*(fn |let mut |impl |pub )/m.test(text)) return 'rust';
  if (/^\s*(package |func |fmt\.)/m.test(text)) return 'go';
  if (/^\s*(public class |System\.out|void main)/m.test(text)) return 'java';
  if (/^\s*(\.|#)\w+[^{]*\{/m.test(text) && /:\s*[^;]+;/.test(text)) {
    return 'css';
  }
  if (/^\s*</.test(text.trim()) && /<\/\w+>/.test(text)) return 'html';
  if (/^\s*[{\[]/.test(text.trim()) && /"\w+"\s*:/.test(text)) return 'json';
  if (/^\s*(#!\/bin\/|echo |export \w+=)/m.test(text)) return 'bash';
  return 'typescript';
}

/**
 * Cola código/markdown/HTML com autoformatação (experiência de documento).
 */
const PasteSmartFormat = Extension.create({
  name: 'pasteSmartFormat',

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('pasteSmartFormat'),
        props: {
          handlePaste(_view, event) {
            if (!event.clipboardData || editor.isActive('codeBlock')) {
              return false;
            }

            const html = event.clipboardData.getData('text/html') ?? '';
            const text = event.clipboardData.getData('text/plain') ?? '';
            if (!text.trim() && !html.trim()) return false;

            const fromWord =
              /mso-|xmlns:o=|<!--\[if/i.test(html) ||
              (html.includes('StartFragment') &&
                /<(p|h[1-6]|table)\b/i.test(html));

            // Código (IDE / texto puro): vira bloco formatado com linguagem.
            if (
              text.trim() &&
              looksLikeCode(text) &&
              !fromWord &&
              !looksLikeMarkdown(text)
            ) {
              event.preventDefault();
              const language = detectCodeLanguage(text);
              editor
                .chain()
                .focus()
                .insertContent({
                  type: 'codeBlock',
                  attrs: { language },
                  content: [{ type: 'text', text }],
                })
                .run();
              return true;
            }

            // Markdown → tipografia tipográfica.
            if (text.trim() && looksLikeMarkdown(text) && !fromWord) {
              event.preventDefault();
              editor
                .chain()
                .focus()
                .insertContent(text, { contentType: 'markdown' })
                .run();
              return true;
            }

            // HTML rico (Word, browser): deixa o TipTap parsear.
            if (html.trim() && looksLikeRichHtml(html)) {
              return false;
            }

            return false;
          },
        },
      }),
    ];
  },
});

export const CODE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'plaintext', label: 'Texto' },
] as const;

const HIGHLIGHT_COLORS = [
  { color: '#fde047', label: 'Amarelo', shortcut: 'Mod-Shift-1' },
  { color: '#86efac', label: 'Verde', shortcut: 'Mod-Shift-2' },
  { color: '#f9a8d4', label: 'Rosa', shortcut: 'Mod-Shift-3' },
  { color: '#93c5fd', label: 'Azul', shortcut: 'Mod-Shift-4' },
] as const;

const TEXT_COLORS = [
  { color: '#111827', label: 'Preto' },
  { color: '#dc2626', label: 'Vermelho' },
  { color: '#2563eb', label: 'Azul' },
  { color: '#16a34a', label: 'Verde' },
  { color: '#ca8a04', label: 'Amarelo' },
  { color: '#9333ea', label: 'Roxo' },
  { color: '#ea580c', label: 'Laranja' },
  { color: '#6b7280', label: 'Cinza' },
] as const;

const FONT_SIZES = [
  { value: '', label: 'Padrão' },
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '28px', label: '28' },
  { value: '32px', label: '32' },
  { value: '36px', label: '36' },
] as const;

const LINE_HEIGHTS = [
  { value: '', label: 'Padrão' },
  { value: '1', label: 'Simples' },
  { value: '1.15', label: '1,15' },
  { value: '1.5', label: '1,5' },
  { value: '2', label: 'Duplo' },
  { value: '2.5', label: '2,5' },
  { value: '3', label: 'Triplo' },
] as const;

const PARAGRAPH_SPACINGS = [
  { value: '', label: 'Padrão' },
  { value: '0', label: 'Nenhum' },
  { value: '6px', label: '6 pt' },
  { value: '12px', label: '12 pt' },
  { value: '18px', label: '18 pt' },
  { value: '24px', label: '24 pt' },
] as const;

type RibbonTab = 'inicio' | 'inserir' | 'layout' | 'marcar';

const RIBBON_TABS: { id: RibbonTab; label: string }[] = [
  { id: 'inicio', label: 'Início' },
  { id: 'inserir', label: 'Inserir' },
  { id: 'layout', label: 'Layout' },
  { id: 'marcar', label: 'Marcar' },
];

type Props = {
  value: string;
  onChange: (json: string) => void;
  editable?: boolean;
  placeholder?: string;
  /** Card id — necessário para persistir notas na API. */
  cardId?: string | null;
};

function isMac() {
  return (
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
  );
}

function shortcutLabel(modShortcut: string): string {
  const mac = isMac();
  return modShortcut
    .replace(/Mod/g, mac ? '⌘' : 'Ctrl')
    .replace(/Shift/g, mac ? '⇧' : 'Shift')
    .replace(/Alt/g, mac ? '⌥' : 'Alt')
    .replace(/-/g, '+');
}

function isTipTapJson(value: string): boolean {
  const t = value.trim();
  if (!t.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(t) as { type?: string };
    return parsed?.type === 'doc';
  } catch {
    return false;
  }
}

type DocContent = {
  content: object | string;
  contentType: 'json' | 'markdown';
};

/** JSON TipTap ou Markdown — Markdown fica bonito na leitura. */
function parseDoc(value: string): DocContent | undefined {
  if (!value?.trim()) return undefined;
  if (isTipTapJson(value)) {
    return { content: JSON.parse(value) as object, contentType: 'json' };
  }
  return { content: value, contentType: 'markdown' };
}

export function documentToPlainText(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  if (isTipTapJson(value)) {
    try {
      const doc = JSON.parse(value) as {
        content?: Array<{
          type?: string;
          content?: Array<{ text?: string; content?: Array<{ text?: string }> }>;
        }>;
      };
      const parts: string[] = [];
      const walk = (nodes?: typeof doc.content) => {
        if (!nodes) return;
        for (const node of nodes) {
          if (node.content) {
            for (const child of node.content) {
              if (child.text) parts.push(child.text);
              if (child.content) walk(child.content as typeof doc.content);
            }
          }
        }
      };
      walk(doc.content);
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    } catch {
      return value.trim();
    }
  }
  return value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function promptLink(editor: Editor) {
  const previous = editor.getAttributes('link').href as string | undefined;
  const url = window.prompt('Endereço do link', previous ?? 'https://');
  if (url === null) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'https://') {
    return editor.chain().focus().extendMarkRange('link').unsetLink().run();
  }
  return editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: trimmed })
    .run();
}

function toggleHighlightColor(editor: Editor, color: string) {
  if (editor.isActive('highlight', { color })) {
    return editor.chain().focus().unsetHighlight().run();
  }
  return editor.chain().focus().setHighlight({ color }).run();
}

function currentBlockAttr(editor: Editor, key: string): string {
  if (editor.isActive('heading')) {
    return String(editor.getAttributes('heading')[key] ?? '');
  }
  return String(editor.getAttributes('paragraph')[key] ?? '');
}

/**
 * Atalhos extras só disparam com o TipTap focado (ProseMirror keymap).
 * Não afetam o verso curto nem outros campos fora do documento.
 */
const DocumentShortcuts = Extension.create({
  name: 'documentShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
      'Mod-Shift-k': () => promptLink(this.editor),
      'Mod-Shift-h': () => this.editor.commands.setHorizontalRule(),
      'Mod-Shift-t': () => this.editor.commands.toggleTaskList(),
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
      'Mod-Shift-.': () => this.editor.commands.toggleSuperscript(),
      'Mod-Shift-,': () => this.editor.commands.toggleSubscript(),
      'Mod-Shift-l': () => this.editor.commands.toggleTextAlign('left'),
      'Mod-Shift-e': () => this.editor.commands.toggleTextAlign('center'),
      'Mod-Shift-r': () => this.editor.commands.toggleTextAlign('right'),
      'Mod-Shift-j': () => this.editor.commands.toggleTextAlign('justify'),
      'Mod-\\': () =>
        this.editor.chain().focus().unsetAllMarks().clearNodes().run(),
      'Mod-Shift-1': () =>
        toggleHighlightColor(this.editor, HIGHLIGHT_COLORS[0].color),
      'Mod-Shift-2': () =>
        toggleHighlightColor(this.editor, HIGHLIGHT_COLORS[1].color),
      'Mod-Shift-3': () =>
        toggleHighlightColor(this.editor, HIGHLIGHT_COLORS[2].color),
      'Mod-Shift-4': () =>
        toggleHighlightColor(this.editor, HIGHLIGHT_COLORS[3].color),
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),
    };
  },
});

function AlignIcon({
  align,
}: {
  align: 'left' | 'center' | 'right' | 'justify';
}) {
  if (align === 'justify') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="2" y1="3.5" x2="14" y2="3.5" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12.5" x2="14" y2="12.5" />
        </g>
      </svg>
    );
  }
  const short =
    align === 'left'
      ? { x1: 2, x2: 10 }
      : align === 'center'
        ? { x1: 4, x2: 12 }
        : { x1: 6, x2: 14 };
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="2" y1="3.5" x2="14" y2="3.5" />
        <line x1={short.x1} y1="8" x2={short.x2} y2="8" />
        <line x1="2" y1="12.5" x2="14" y2="12.5" />
      </g>
    </svg>
  );
}

function IconBulletList() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="3" cy="4" r="1.3" fill="currentColor" />
      <circle cx="3" cy="8" r="1.3" fill="currentColor" />
      <circle cx="3" cy="12" r="1.3" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="6.5" y1="4" x2="14" y2="4" />
        <line x1="6.5" y1="8" x2="14" y2="8" />
        <line x1="6.5" y1="12" x2="14" y2="12" />
      </g>
    </svg>
  );
}

function IconOrderedList() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <text x="1" y="5.2" fontSize="5.5" fill="currentColor" fontFamily="system-ui">
        1
      </text>
      <text x="1" y="9.2" fontSize="5.5" fill="currentColor" fontFamily="system-ui">
        2
      </text>
      <text x="1" y="13.2" fontSize="5.5" fill="currentColor" fontFamily="system-ui">
        3
      </text>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="6.5" y1="4" x2="14" y2="4" />
        <line x1="6.5" y1="8" x2="14" y2="8" />
        <line x1="6.5" y1="12" x2="14" y2="12" />
      </g>
    </svg>
  );
}

function IconTaskList() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="1.5"
        y="2.5"
        width="5"
        height="5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2.8 5l1.3 1.3 2.2-2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="9" y1="5" x2="14" y2="5" />
        <line x1="9" y1="11.5" x2="14" y2="11.5" />
      </g>
      <rect
        x="1.5"
        y="9"
        width="5"
        height="5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6.2 9.8a3.2 3.2 0 0 1 0-4.5l1.4-1.4a3.2 3.2 0 0 1 4.5 4.5l-.7.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.8 6.2a3.2 3.2 0 0 1 0 4.5l-1.4 1.4a3.2 3.2 0 1 1-4.5-4.5l.7-.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCode() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M5.5 3.5 2 8l3.5 4.5M10.5 3.5 14 8l-3.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 11.5c1.8 0 3-1.2 3-3V4H2.5v4.2H5c0 1.4-.8 2.3-2 3.3zm7 0c1.8 0 3-1.2 3-3V4H9.5v4.2H12c0 1.4-.8 2.3-2 3.3z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconClear() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 4.5h10M5.5 4.5V3.2A1.2 1.2 0 0 1 6.7 2h2.6A1.2 1.2 0 0 1 10.5 3.2v1.3M6.2 7v5M9.8 7v5M4.2 4.5l.7 8.2A1.2 1.2 0 0 0 6.1 14h3.8a1.2 1.2 0 0 0 1.2-1.3l.7-8.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconIndent({ dir }: { dir: 'in' | 'out' }) {
  const mirror = dir === 'out' ? 'scale(-1,1) translate(-16,0)' : undefined;
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <g transform={mirror} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="3.5" x2="14" y2="3.5" />
        <line x1="7" y1="8" x2="14" y2="8" />
        <line x1="2" y1="12.5" x2="14" y2="12.5" />
        <path d="M2 6.2 4.8 8 2 9.8" fill="none" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function IconEraser() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.2 9.8 8.6 4.4a1.4 1.4 0 0 1 2 0l1.2 1.2a1.4 1.4 0 0 1 0 2L6.4 13H3.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <line
        x1="2"
        y1="14"
        x2="14"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconNote() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.5 2.5h7.2L13 4.8V13.5H3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 2.5V5H13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <line x1="5.5" y1="7.5" x2="10.5" y2="7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5.5" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ToolButton({
  title,
  shortcut,
  active,
  disabled,
  onClick,
  children,
  caption,
  className = '',
}: {
  title: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Rótulo curto embaixo do ícone (estilo Word). */
  caption?: string;
  className?: string;
}) {
  const tip = shortcut ? `${title} (${shortcutLabel(shortcut)})` : title;
  return (
    <button
      type="button"
      title={tip}
      aria-label={tip}
      aria-pressed={active}
      disabled={disabled}
      className={`sc-doc-tool${caption ? ' has-caption' : ''} ${className}${
        active ? ' active' : ''
      }`.trim()}
      onMouseDown={(e) => {
        // Mantém a seleção do editor ao clicar na barra (padrão Word/TipTap).
        e.preventDefault();
      }}
      onClick={onClick}
    >
      <span className="sc-doc-tool-icon">{children}</span>
      {caption ? <span className="sc-doc-tool-caption">{caption}</span> : null}
    </button>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="sc-doc-group">
      <div className="sc-doc-group-tools">{children}</div>
      <span className="sc-doc-group-label">{label}</span>
    </div>
  );
}

export function DocumentEditor({
  value,
  onChange,
  editable = true,
  placeholder = 'Markdown: # título, **negrito**, listas, `código`…',
  cardId = null,
}: Props) {
  const [tab, setTab] = useState<RibbonTab>('inicio');

  const initialDoc = parseDoc(value);

  const editor = useEditor({
    editable,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        hardBreak: false,
        link: {
          openOnClick: false,
          autolink: true,
        },
      }),
      Placeholder.configure({ placeholder }),
      SoftBreak.configure({ keepMarks: true }),
      CodeWithNotes,
      CodeBlockWithNotes.configure({
        lowlight,
        defaultLanguage: 'typescript',
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      TextStyle,
      Color,
      FontSize,
      ParagraphLineHeight,
      ParagraphSpacing,
      Indent,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Annotation,
      Markdown,
      PasteSmartFormat,
      DocumentShortcuts,
    ],
    content: initialDoc?.content ?? '',
    contentType: initialDoc?.contentType ?? 'json',
    onUpdate: ({ editor: ed, transaction }) => {
      if (transaction.getMeta('skipOnChange')) return;
      onChange(JSON.stringify(ed.getJSON()));
    },
    editorProps: {
      /**
       * Scroll só na superfície do documento — evita cascata em pais
       * (modal / body) quando a seleção muda.
       */
      handleScrollToSelection(view) {
        const surface = view.dom.closest(
          '.sc-doc-surface',
        ) as HTMLElement | null;
        if (!surface) return false;

        const { from, to } = view.state.selection;
        let start: { top: number; bottom: number };
        let end: { top: number; bottom: number };
        try {
          start = view.coordsAtPos(from);
          end = view.coordsAtPos(Math.max(from, to));
        } catch {
          return true;
        }

        const box = surface.getBoundingClientRect();
        const pad = 16;
        let delta = 0;
        if (start.top < box.top + pad) {
          delta = start.top - (box.top + pad);
        } else if (end.bottom > box.bottom - pad) {
          delta = end.bottom - (box.bottom - pad);
        }
        if (delta !== 0) surface.scrollTop += delta;
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    if (!value) {
      if (
        current !==
        JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })
      ) {
        editor.commands.setContent(
          { type: 'doc', content: [{ type: 'paragraph' }] },
          { emitUpdate: false },
        );
      }
      return;
    }
    if (isTipTapJson(value) && value === current) return;
    const parsed = parseDoc(value);
    if (!parsed) return;
    if (parsed.contentType === 'json' && JSON.stringify(parsed.content) === current) {
      return;
    }
    editor.commands.setContent(parsed.content, {
      emitUpdate: false,
      contentType: parsed.contentType,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const activeLanguage =
    (editor.getAttributes('codeBlock').language as string | undefined) ??
    'typescript';

  const setCodeLanguage = (language: string) => {
    editor.chain().focus().updateAttributes('codeBlock', { language }).run();
  };

  const currentFontSize =
    (editor.getAttributes('textStyle').fontSize as string | undefined) ?? '';
  const currentLineHeight = currentBlockAttr(editor, 'paragraphLineHeight');
  const currentParagraphSpacing = currentBlockAttr(editor, 'paragraphSpacing');
  const currentColor =
    (editor.getAttributes('textStyle').color as string | undefined) ?? '';

  return (
    <div className={`sc-doc-editor${editable ? '' : ' is-readonly'}`}>
      {editable ? (
        <div className="sc-doc-ribbon">
          <div className="sc-doc-ribbon-top">
            <div className="sc-doc-qat" aria-label="Acesso rápido">
              <ToolButton
                title="Desfazer"
                shortcut="Mod-z"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
              >
                ↺
              </ToolButton>
              <ToolButton
                title="Refazer"
                shortcut="Mod-y"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
              >
                ↻
              </ToolButton>
            </div>
            <div
              className="sc-doc-ribbon-tabs"
              role="tablist"
              aria-label="Ferramentas"
            >
              {RIBBON_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`sc-doc-ribbon-tab${tab === item.id ? ' active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="sc-doc-ribbon-panel"
            role="tabpanel"
            aria-label={RIBBON_TABS.find((t) => t.id === tab)?.label}
          >
            {tab === 'inicio' ? (
              <>
                <Group label="Fonte">
                  <select
                    className="sc-doc-lang"
                    value={currentFontSize}
                    aria-label="Tamanho da fonte"
                    title="Tamanho da fonte"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) editor.chain().focus().unsetFontSize().run();
                      else editor.chain().focus().setFontSize(v).run();
                    }}
                  >
                    {FONT_SIZES.map((size) => (
                      <option key={size.value || 'default'} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                  <ToolButton
                    title="Negrito"
                    shortcut="Mod-b"
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <strong>B</strong>
                  </ToolButton>
                  <ToolButton
                    title="Itálico"
                    shortcut="Mod-i"
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <em>I</em>
                  </ToolButton>
                  <ToolButton
                    title="Sublinhado"
                    shortcut="Mod-u"
                    active={editor.isActive('underline')}
                    onClick={() =>
                      editor.chain().focus().toggleUnderline().run()
                    }
                  >
                    <span style={{ textDecoration: 'underline' }}>U</span>
                  </ToolButton>
                  <ToolButton
                    title="Tachado"
                    shortcut="Mod-Shift-x"
                    active={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                  >
                    <span style={{ textDecoration: 'line-through' }}>S</span>
                  </ToolButton>
                  <ToolButton
                    title="Código em linha"
                    shortcut="Mod-e"
                    active={editor.isActive('code')}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                  >
                    <IconCode />
                  </ToolButton>
                  <ToolButton
                    title="Limpar formatação"
                    shortcut="Mod-\\"
                    caption="Limpar"
                    onClick={() =>
                      editor.chain().focus().unsetAllMarks().clearNodes().run()
                    }
                  >
                    <IconClear />
                  </ToolButton>
                </Group>

                <Group label="Cor do texto">
                  {TEXT_COLORS.map(({ color, label }) => (
                    <ToolButton
                      key={color}
                      title={`Cor ${label.toLowerCase()}`}
                      className="sc-doc-swatch"
                      active={currentColor.toLowerCase() === color.toLowerCase()}
                      onClick={() =>
                        editor.chain().focus().setColor(color).run()
                      }
                    >
                      <span
                        className="sc-doc-swatch-dot"
                        style={{ background: color }}
                      />
                    </ToolButton>
                  ))}
                  <ToolButton
                    title="Remover cor"
                    onClick={() => editor.chain().focus().unsetColor().run()}
                  >
                    Auto
                  </ToolButton>
                </Group>

                <Group label="Parágrafo">
                  <ToolButton
                    title="Título 1"
                    shortcut="Mod-Alt-1"
                    active={editor.isActive('heading', { level: 1 })}
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                  >
                    H1
                  </ToolButton>
                  <ToolButton
                    title="Título 2"
                    shortcut="Mod-Alt-2"
                    active={editor.isActive('heading', { level: 2 })}
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                  >
                    H2
                  </ToolButton>
                  <ToolButton
                    title="Título 3"
                    shortcut="Mod-Alt-3"
                    active={editor.isActive('heading', { level: 3 })}
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                  >
                    H3
                  </ToolButton>
                  <ToolButton
                    title="Texto normal"
                    shortcut="Mod-Alt-0"
                    active={editor.isActive('paragraph')}
                    onClick={() => editor.chain().focus().setParagraph().run()}
                  >
                    ¶
                  </ToolButton>
                  <ToolButton
                    title="Lista com marcadores"
                    shortcut="Mod-Shift-8"
                    active={editor.isActive('bulletList')}
                    onClick={() =>
                      editor.chain().focus().toggleBulletList().run()
                    }
                  >
                    <IconBulletList />
                  </ToolButton>
                  <ToolButton
                    title="Lista numerada"
                    shortcut="Mod-Shift-7"
                    active={editor.isActive('orderedList')}
                    onClick={() =>
                      editor.chain().focus().toggleOrderedList().run()
                    }
                  >
                    <IconOrderedList />
                  </ToolButton>
                </Group>

                <Group label="Alinhamento">
                  <ToolButton
                    title="Alinhar à esquerda"
                    shortcut="Mod-Shift-l"
                    active={editor.isActive({ textAlign: 'left' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('left').run()
                    }
                  >
                    <AlignIcon align="left" />
                  </ToolButton>
                  <ToolButton
                    title="Centralizar"
                    shortcut="Mod-Shift-e"
                    active={editor.isActive({ textAlign: 'center' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('center').run()
                    }
                  >
                    <AlignIcon align="center" />
                  </ToolButton>
                  <ToolButton
                    title="Alinhar à direita"
                    shortcut="Mod-Shift-r"
                    active={editor.isActive({ textAlign: 'right' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('right').run()
                    }
                  >
                    <AlignIcon align="right" />
                  </ToolButton>
                  <ToolButton
                    title="Justificar"
                    shortcut="Mod-Shift-j"
                    active={editor.isActive({ textAlign: 'justify' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('justify').run()
                    }
                  >
                    <AlignIcon align="justify" />
                  </ToolButton>
                </Group>
              </>
            ) : null}

            {tab === 'inserir' ? (
              <>
                <Group label="Links">
                  <ToolButton
                    title="Inserir/editar link"
                    shortcut="Mod-Shift-k"
                    active={editor.isActive('link')}
                    caption="Link"
                    onClick={() => promptLink(editor)}
                  >
                    <IconLink />
                  </ToolButton>
                </Group>

                <Group label="Blocos">
                  <ToolButton
                    title="Citação"
                    shortcut="Mod-Shift-b"
                    active={editor.isActive('blockquote')}
                    onClick={() =>
                      editor.chain().focus().toggleBlockquote().run()
                    }
                  >
                    <IconQuote />
                  </ToolButton>
                  <ToolButton
                    title="Bloco de código"
                    shortcut="Mod-Alt-c"
                    active={editor.isActive('codeBlock')}
                    caption="Código"
                    onClick={() =>
                      editor.chain().focus().toggleCodeBlock().run()
                    }
                  >
                    <IconCode />
                  </ToolButton>
                  <select
                    className="sc-doc-lang"
                    value={activeLanguage}
                    aria-label="Linguagem do código"
                    title="Linguagem do bloco de código"
                    onChange={(e) => {
                      if (!editor.isActive('codeBlock')) {
                        editor.chain().focus().toggleCodeBlock().run();
                      }
                      setCodeLanguage(e.target.value);
                    }}
                  >
                    {CODE_LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                  <ToolButton
                    title="Linha divisória"
                    shortcut="Mod-Shift-h"
                    onClick={() =>
                      editor.chain().focus().setHorizontalRule().run()
                    }
                  >
                    —
                  </ToolButton>
                  <ToolButton
                    title="Quebra de linha"
                    shortcut="Shift-Enter"
                    onClick={() => editor.chain().focus().setHardBreak().run()}
                  >
                    ↵
                  </ToolButton>
                </Group>

                <Group label="Listas">
                  <ToolButton
                    title="Lista de tarefas"
                    shortcut="Mod-Shift-t"
                    active={editor.isActive('taskList')}
                    caption="Tarefas"
                    onClick={() =>
                      editor.chain().focus().toggleTaskList().run()
                    }
                  >
                    <IconTaskList />
                  </ToolButton>
                </Group>
              </>
            ) : null}

            {tab === 'layout' ? (
              <>
                <Group label="Espaçamento entre linhas">
                  <select
                    className="sc-doc-lang"
                    value={currentLineHeight}
                    aria-label="Espaçamento entre linhas"
                    title="Espaçamento entre linhas"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        editor.chain().focus().unsetParagraphLineHeight().run();
                      } else {
                        editor.chain().focus().setParagraphLineHeight(v).run();
                      }
                    }}
                  >
                    {LINE_HEIGHTS.map((opt) => (
                      <option key={opt.value || 'default'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Group>

                <Group label="Espaçamento após parágrafo">
                  <select
                    className="sc-doc-lang"
                    value={currentParagraphSpacing}
                    aria-label="Espaçamento após o parágrafo"
                    title="Espaçamento após o parágrafo"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        editor.chain().focus().unsetParagraphSpacing().run();
                      } else {
                        editor.chain().focus().setParagraphSpacing(v).run();
                      }
                    }}
                  >
                    {PARAGRAPH_SPACINGS.map((opt) => (
                      <option key={opt.value || 'default'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Group>

                <Group label="Recuo">
                  <ToolButton
                    title="Diminuir recuo"
                    shortcut="Shift-Tab"
                    onClick={() =>
                      editor.chain().focus().decreaseIndent().run()
                    }
                  >
                    <IconIndent dir="out" />
                  </ToolButton>
                  <ToolButton
                    title="Aumentar recuo"
                    shortcut="Tab"
                    onClick={() =>
                      editor.chain().focus().increaseIndent().run()
                    }
                  >
                    <IconIndent dir="in" />
                  </ToolButton>
                </Group>

                <Group label="Alinhamento">
                  <ToolButton
                    title="Alinhar à esquerda"
                    active={editor.isActive({ textAlign: 'left' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('left').run()
                    }
                  >
                    <AlignIcon align="left" />
                  </ToolButton>
                  <ToolButton
                    title="Centralizar"
                    active={editor.isActive({ textAlign: 'center' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('center').run()
                    }
                  >
                    <AlignIcon align="center" />
                  </ToolButton>
                  <ToolButton
                    title="Alinhar à direita"
                    active={editor.isActive({ textAlign: 'right' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('right').run()
                    }
                  >
                    <AlignIcon align="right" />
                  </ToolButton>
                  <ToolButton
                    title="Justificar"
                    active={editor.isActive({ textAlign: 'justify' })}
                    onClick={() =>
                      editor.chain().focus().toggleTextAlign('justify').run()
                    }
                  >
                    <AlignIcon align="justify" />
                  </ToolButton>
                </Group>
              </>
            ) : null}

            {tab === 'marcar' ? (
              <>
                <Group label="Notas">
                  <ToolButton
                    title="Adicionar nota à seleção"
                    shortcut="Mod-Alt-n"
                    caption="Nota"
                    active={editor.isActive('annotation')}
                    onClick={() => {
                      if (editor.state.selection.empty) return;
                      editor.view.dom.dispatchEvent(
                        new CustomEvent('sc-open-note'),
                      );
                    }}
                  >
                    <IconNote />
                  </ToolButton>
                  <ToolButton
                    title="Remover nota"
                    disabled={!editor.isActive('annotation')}
                    onClick={() =>
                      editor.chain().focus().unsetAnnotation().run()
                    }
                  >
                    <IconEraser />
                  </ToolButton>
                </Group>

                <Group label="Marca-texto">
                  {HIGHLIGHT_COLORS.map(({ color, label, shortcut }) => (
                    <ToolButton
                      key={color}
                      title={`Marca-texto ${label.toLowerCase()}`}
                      shortcut={shortcut}
                      className="sc-doc-swatch"
                      active={editor.isActive('highlight', { color })}
                      onClick={() => toggleHighlightColor(editor, color)}
                    >
                      <span
                        className="sc-doc-swatch-dot"
                        style={{ background: color }}
                      />
                    </ToolButton>
                  ))}
                  <ToolButton
                    title="Remover marca-texto"
                    active={editor.isActive('highlight')}
                    onClick={() =>
                      editor.chain().focus().unsetHighlight().run()
                    }
                  >
                    <IconEraser />
                  </ToolButton>
                </Group>

                <Group label="Script">
                  <ToolButton
                    title="Sobrescrito"
                    shortcut="Mod-Shift-."
                    active={editor.isActive('superscript')}
                    onClick={() =>
                      editor.chain().focus().toggleSuperscript().run()
                    }
                  >
                    x²
                  </ToolButton>
                  <ToolButton
                    title="Subscrito"
                    shortcut="Mod-Shift-,"
                    active={editor.isActive('subscript')}
                    onClick={() =>
                      editor.chain().focus().toggleSubscript().run()
                    }
                  >
                    x₂
                  </ToolButton>
                </Group>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="sc-doc-surface-wrap">
        <EditorContent editor={editor} className="sc-doc-surface" />
        <DocumentNotes editor={editor} editable={editable} cardId={cardId} />
      </div>
    </div>
  );
}
