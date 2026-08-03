import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import { chevronDownOutline } from 'ionicons/icons';
import type { CardTag } from '../../modules/cards/types/card-tag.types';
import { useCatalogCardTags } from '../hooks/useCatalogCardTags';

type Props = {
  value: string;
  onChange: (tagName: string, colorHex: string | null) => void;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
  /** Se o valor atual não estiver no catálogo, mantém como opção extra. */
  allowCustom?: boolean;
  /** `suit` = rótulo da carta; `field` = formulário (ex.: PDF). */
  variant?: 'suit' | 'field';
};

type MenuPos = { top: number; left: number; minWidth: number };

export function CardTagPicker({
  value,
  onChange,
  style,
  className = '',
  disabled = false,
  allowCustom = true,
  variant = 'suit',
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const { tags, loading } = useCatalogCardTags();

  const normalized = value.trim().toLocaleLowerCase('pt-BR');
  const matched = tags.find(
    (t) => t.name.toLocaleLowerCase('pt-BR') === normalized,
  );
  const orphan =
    allowCustom && Boolean(value.trim()) && !matched && tags.length > 0;

  const options: Array<{
    key: string;
    name: string;
    hex: string | null;
    orphan?: boolean;
  }> = [
    ...(orphan
      ? [{ key: `orphan:${value.trim()}`, name: value.trim(), hex: null, orphan: true }]
      : []),
    ...tags.map((tag: CardTag) => ({
      key: tag.id,
      name: tag.name,
      hex: tag.color?.hex ?? null,
    })),
  ];

  const displayName = matched?.name ?? (orphan ? value.trim() : tags[0]?.name ?? 'Tag');
  const displayHex =
    matched?.color?.hex ??
    (style && typeof style.color === 'string' ? style.color : null) ??
    tags[0]?.color?.hex ??
    null;

  const placeMenu = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const minWidth = Math.max(rect.width, variant === 'field' ? 200 : 168);
    let left = rect.left + rect.width / 2 - minWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - minWidth - 8));
    const below = rect.bottom + 6;
    const estimatedH = Math.min(options.length * 40 + 48, 240);
    const top =
      below + estimatedH > window.innerHeight - 8
        ? Math.max(8, rect.top - estimatedH - 6)
        : below;
    setMenuPos({ top, left, minWidth });
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = () => placeMenu();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reposition on open/options
  }, [open, options.length, variant]);

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.name === displayName);
    setHighlight(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir / mudar valor
  }, [open, displayName, tags, orphan, value]);

  const pick = (name: string) => {
    const tag = tags.find((t) => t.name === name);
    onChange(name, tag?.color?.hex ?? null);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || loading || !options.length) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) pick(opt.name);
    }
  };

  const empty = !loading && tags.length === 0;
  const isDisabled = disabled || loading || empty;

  return (
    <div
      ref={rootRef}
      className={`sc-tag-picker is-${variant}${open ? ' is-open' : ''} ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="sc-tag-picker-trigger"
        style={
          variant === 'suit' && displayHex
            ? { ...style, color: displayHex }
            : style
        }
        aria-label="Tag"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return;
          setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
      >
        {displayHex ? (
          <span
            className="sc-tag-picker-dot"
            style={{ background: displayHex }}
            aria-hidden
          />
        ) : null}
        <span className="sc-tag-picker-label">
          {loading ? '…' : empty ? 'Sem tags' : displayName}
        </span>
        <IonIcon icon={chevronDownOutline} aria-hidden />
      </button>

      {empty ? (
        <p className="sc-tag-picker-empty-hint">
          <Link to="/cadastros/tags">Cadastre tags</Link>
        </p>
      ) : null}

      {open && menuPos && options.length > 0
        ? createPortal(
            <ul
              ref={menuRef}
              id={listId}
              className="sc-tag-picker-menu"
              role="listbox"
              aria-label="Tags cadastradas"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                minWidth: menuPos.minWidth,
              }}
            >
              {options.map((opt, index) => {
                const active = opt.name === displayName;
                const focused = index === highlight;
                return (
                  <li key={opt.key} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`sc-tag-picker-option${active ? ' is-active' : ''}${focused ? ' is-focused' : ''}`}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => pick(opt.name)}
                    >
                      <span
                        className="sc-tag-picker-dot"
                        style={{
                          background: opt.hex ?? 'var(--text-muted)',
                          opacity: opt.hex ? 1 : 0.35,
                        }}
                        aria-hidden
                      />
                      <span className="sc-tag-picker-option-copy">
                        <strong>{opt.name}</strong>
                        {opt.orphan ? <em>livre</em> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className="sc-tag-picker-footer" role="presentation">
                <Link to="/cadastros/tags" onClick={() => setOpen(false)}>
                  Gerenciar tags
                </Link>
              </li>
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
