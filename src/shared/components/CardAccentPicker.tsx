import { CARD_ACCENT_COLORS } from '../../modules/cards/types/card.types';

type Props = {
  value: string | null;
  onChange: (color: string) => void;
  label?: string;
};

/** Seletor de cor de accent — fora da face da carta. */
export function CardAccentPicker({
  value,
  onChange,
  label = 'Cor do destaque',
}: Props) {
  const current = (value ?? CARD_ACCENT_COLORS[0]).toUpperCase();

  return (
    <div className="sc-card-accent-picker" role="group" aria-label={label}>
      <span className="sc-card-accent-label">{label}</span>
      <div className="sc-card-accent-swatches">
        {CARD_ACCENT_COLORS.map((c) => {
          const active = current === c;
          return (
            <button
              key={c}
              type="button"
              className={`sc-card-accent-swatch${active ? ' is-active' : ''}`}
              style={{ background: c }}
              aria-label={`Cor ${c}`}
              aria-pressed={active}
              onClick={() => onChange(c)}
            />
          );
        })}
      </div>
    </div>
  );
}
