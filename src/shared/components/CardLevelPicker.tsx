import type { CSSProperties } from 'react';
import type { CardLevel } from '../../modules/cards/types/card-level.types';

type Props = {
  levels: CardLevel[];
  value: string | null;
  onChange: (levelId: string | null) => void;
  loading?: boolean;
};

/** Seletor de nível do card (básico → extra), fora da face. */
export function CardLevelPicker({
  levels,
  value,
  onChange,
  loading = false,
}: Props) {
  return (
    <div className="sc-card-level-picker" role="group" aria-label="Nível do card">
      <span className="sc-card-level-label">Nível</span>
      <div className="sc-card-level-options">
        {loading && !levels.length ? (
          <span className="sc-card-level-empty">Carregando níveis…</span>
        ) : null}
        {levels.map((level) => {
          const active = value === level.id;
          return (
            <button
              key={level.id}
              type="button"
              className={`sc-card-level-chip${active ? ' is-active' : ''}`}
              style={
                level.color
                  ? ({ '--level-color': level.color } as CSSProperties)
                  : undefined
              }
              aria-pressed={active}
              title={level.description ?? level.name}
              onClick={() => onChange(level.id)}
            >
              {level.name}
            </button>
          );
        })}
        {!loading && !levels.length ? (
          <span className="sc-card-level-empty">Nenhum nível cadastrado</span>
        ) : null}
      </div>
    </div>
  );
}
