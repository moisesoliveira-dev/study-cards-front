import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { CatalogColor } from '../../modules/colors/types/color.types';

type Props = {
  colors: CatalogColor[];
  loading?: boolean;
  value: string | null;
  onChange: (hex: string) => void;
  /** Mostra link para o cadastro quando não há cores. */
  showManageLink?: boolean;
  className?: string;
  style?: CSSProperties;
};

function normalizeHex(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase();
}

/** Seleção de cor a partir do catálogo — sem criar cores aqui. */
export function CatalogColorPicker({
  colors,
  loading = false,
  value,
  onChange,
  showManageLink = true,
  className = '',
  style,
}: Props) {
  const current = normalizeHex(value);

  if (loading) {
    return (
      <p className={`sc-catalog-color-hint ${className}`.trim()} style={style}>
        Carregando cores…
      </p>
    );
  }

  if (!colors.length) {
    return (
      <p className={`sc-catalog-color-hint ${className}`.trim()} style={style}>
        Nenhuma cor cadastrada.
        {showManageLink ? (
          <>
            {' '}
            <Link to="/cadastros/cores">Cadastrar em Cores</Link>
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div
      className={`sc-catalog-color-picker ${className}`.trim()}
      style={style}
      role="listbox"
      aria-label="Cores cadastradas"
    >
      {colors.map((c) => {
        const hex = normalizeHex(c.hex);
        const active = current === hex;
        return (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={active}
            className={`sc-catalog-color-swatch${active ? ' is-active' : ''}`}
            style={{ background: hex }}
            title={`${c.name} · ${hex}`}
            aria-label={`${c.name} ${hex}`}
            onClick={() => onChange(hex)}
          />
        );
      })}
    </div>
  );
}
