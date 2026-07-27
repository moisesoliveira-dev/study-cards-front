import { useState, type CSSProperties, type FormEvent } from 'react';
import type { CardLevel } from '../../modules/cards/types/card-level.types';
import { cardLevelsFacade } from '../../modules/cards/facades/card-levels.facade';
import { useAppToast } from '../hooks/useAppToast';

type Props = {
  levels: CardLevel[];
  value: string | null;
  onChange: (levelId: string | null) => void;
  /** Atualiza a lista no pai após criar um nível */
  onLevelsChange?: (levels: CardLevel[]) => void;
  loading?: boolean;
};

/** Seletor de nível do card — também permite cadastrar novos no banco. */
export function CardLevelPicker({
  levels,
  value,
  onChange,
  onLevelsChange,
  loading = false,
}: Props) {
  const toast = useAppToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const createLevel = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const created = await cardLevelsFacade.create({ name: trimmed });
      const next = [...levels, created].sort(
        (a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'),
      );
      onLevelsChange?.(next);
      onChange(created.id);
      setName('');
      setAdding(false);
      toast.success(`Nível “${created.name}” criado`);
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sc-card-level-picker" role="group" aria-label="Nível do card">
      <div className="sc-card-level-head">
        <span className="sc-card-level-label">Nível</span>
        {!adding ? (
          <button
            type="button"
            className="sc-card-level-add"
            onClick={() => setAdding(true)}
          >
            + Novo nível
          </button>
        ) : null}
      </div>

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
        {!loading && !levels.length && !adding ? (
          <span className="sc-card-level-empty">
            Nenhum nível ainda — crie o primeiro.
          </span>
        ) : null}
      </div>

      {adding ? (
        <form className="sc-card-level-form" onSubmit={(e) => void createLevel(e)}>
          <input
            className="sc-card-level-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do nível (ex.: Expert)"
            autoFocus
            disabled={saving}
          />
          <div className="sc-card-level-form-actions">
            <button
              type="button"
              className="sc-btn"
              disabled={saving}
              onClick={() => {
                setAdding(false);
                setName('');
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="sc-btn primary"
              disabled={saving || !name.trim()}
            >
              {saving ? 'Salvando…' : 'Criar'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
