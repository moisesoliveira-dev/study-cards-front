import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CardLevel } from '../../modules/cards/types/card-level.types';

type Props = {
  levels: CardLevel[];
  value: string | null;
  onChange: (levelId: string | null) => void;
  loading?: boolean;
};

/** Seletor de nível do card. Cadastro em Cadastros → Níveis. */
export function CardLevelPicker({
  levels,
  value,
  onChange,
  loading = false,
}: Props) {
  const [filter, setFilter] = useState('');

  const query = filter.trim().toLocaleLowerCase('pt-BR');

  const filtered = useMemo(() => {
    if (!query) return levels;
    return levels.filter((level) => {
      const name = level.name.toLocaleLowerCase('pt-BR');
      const desc = (level.description ?? '').toLocaleLowerCase('pt-BR');
      return name.includes(query) || desc.includes(query);
    });
  }, [levels, query]);

  const selected = value
    ? levels.find((level) => level.id === value) ?? null
    : null;
  const selectedHidden =
    Boolean(selected && query && !filtered.some((l) => l.id === selected.id));

  return (
    <div className="sc-card-level-picker" role="group" aria-label="Nível do card">
      <div className="sc-card-level-head">
        <span className="sc-card-level-label">Nível</span>
        <Link to="/cadastros/niveis" className="sc-card-level-manage">
          Gerenciar
        </Link>
      </div>

      {levels.length > 0 ? (
        <input
          className="sc-card-level-filter"
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar níveis…"
          aria-label="Filtrar níveis"
          disabled={loading && !levels.length}
        />
      ) : null}

      {selectedHidden && selected ? (
        <div className="sc-card-level-selected-hint">
          Selecionado:{' '}
          <button
            type="button"
            className="sc-card-level-chip is-active"
            aria-pressed
            title={selected.description ?? selected.name}
            onClick={() => onChange(selected.id)}
          >
            {selected.name}
          </button>
        </div>
      ) : null}

      <div className="sc-card-level-options">
        {loading && !levels.length ? (
          <span className="sc-card-level-empty">Carregando níveis…</span>
        ) : null}
        {filtered.map((level) => {
          const active = value === level.id;
          return (
            <button
              key={level.id}
              type="button"
              className={`sc-card-level-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              title={level.description ?? level.name}
              onClick={() => onChange(level.id)}
            >
              {level.name}
            </button>
          );
        })}
        {!loading && levels.length > 0 && filtered.length === 0 ? (
          <span className="sc-card-level-empty">
            Nenhum nível com “{filter.trim()}”.
          </span>
        ) : null}
        {!loading && !levels.length ? (
          <span className="sc-card-level-empty">
            Nenhum nível — cadastre em{' '}
            <Link to="/cadastros/niveis">Cadastros → Níveis</Link>.
          </span>
        ) : null}
      </div>
    </div>
  );
}
