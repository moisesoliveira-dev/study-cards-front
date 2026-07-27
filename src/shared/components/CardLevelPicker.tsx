import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import { closeOutline, searchOutline } from 'ionicons/icons';
import type { CardLevel } from '../../modules/cards/types/card-level.types';

type Props = {
  levels: CardLevel[];
  value: string | null;
  onChange: (levelId: string | null) => void;
  loading?: boolean;
};

/** Busca e seleciona o nível do card. Cadastro em Cadastros → Níveis. */
export function CardLevelPicker({
  levels,
  value,
  onChange,
  loading = false,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const selected = value
    ? levels.find((level) => level.id === value) ?? null
    : null;

  const normalized = query.trim().toLocaleLowerCase('pt-BR');

  const results = useMemo(() => {
    if (!normalized) return levels.slice(0, 8);
    return levels
      .filter((level) => {
        const name = level.name.toLocaleLowerCase('pt-BR');
        const desc = (level.description ?? '').toLocaleLowerCase('pt-BR');
        return name.includes(normalized) || desc.includes(normalized);
      })
      .slice(0, 12);
  }, [levels, normalized]);

  useEffect(() => {
    setHighlight(0);
  }, [normalized, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (level: CardLevel) => {
    onChange(level.id);
    setQuery('');
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
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
      setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault();
      pick(results[highlight]);
    }
  };

  return (
    <div
      ref={rootRef}
      className="sc-card-level-picker"
      role="group"
      aria-label="Nível do card"
    >
      <div className="sc-card-level-head">
        <span className="sc-card-level-label">Nível</span>
        <Link to="/cadastros/niveis" className="sc-card-level-manage">
          Gerenciar
        </Link>
      </div>

      {selected ? (
        <div className="sc-card-level-chosen">
          <span className="sc-card-level-chosen-name" title={selected.description ?? undefined}>
            {selected.name}
          </span>
          <button
            type="button"
            className="sc-card-level-clear"
            aria-label="Limpar nível"
            onClick={clear}
          >
            <IonIcon icon={closeOutline} />
          </button>
        </div>
      ) : null}

      {loading && !levels.length ? (
        <span className="sc-card-level-empty">Carregando níveis…</span>
      ) : !levels.length ? (
        <span className="sc-card-level-empty">
          Nenhum nível — cadastre em{' '}
          <Link to="/cadastros/niveis">Cadastros → Níveis</Link>.
        </span>
      ) : (
        <div className="sc-card-level-search">
          <IonIcon icon={searchOutline} aria-hidden />
          <input
            type="search"
            value={query}
            placeholder={
              selected ? 'Trocar nível…' : 'Pesquisar nível…'
            }
            aria-label="Pesquisar nível"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
            role="combobox"
            autoComplete="off"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
          {open ? (
            <ul
              id={listId}
              className="sc-card-level-results"
              role="listbox"
            >
              {results.length === 0 ? (
                <li className="sc-card-level-empty is-pad">
                  Nenhum nível encontrado.
                </li>
              ) : (
                results.map((level, index) => {
                  const active = value === level.id;
                  const focused = index === highlight;
                  return (
                    <li key={level.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`sc-card-level-result${active ? ' is-active' : ''}${focused ? ' is-focused' : ''}`}
                        title={level.description ?? level.name}
                        onMouseEnter={() => setHighlight(index)}
                        onClick={() => pick(level)}
                      >
                        <strong>{level.name}</strong>
                        {level.description ? (
                          <span>{level.description}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
