import type { CSSProperties } from 'react';
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
};

export function CardTagPicker({
  value,
  onChange,
  style,
  className = 'card-suit-input',
  disabled = false,
  allowCustom = true,
}: Props) {
  const { tags, loading } = useCatalogCardTags();
  const normalized = value.trim().toLocaleLowerCase('pt-BR');
  const matched = tags.find(
    (t) => t.name.toLocaleLowerCase('pt-BR') === normalized,
  );
  const orphan =
    allowCustom && Boolean(value.trim()) && !matched && tags.length > 0;

  const pick = (name: string) => {
    const tag = tags.find((t) => t.name === name);
    onChange(name, tag?.color?.hex ?? null);
  };

  const selectValue = matched?.name ?? (orphan ? value.trim() : tags[0]?.name ?? '');

  return (
    <select
      className={className}
      value={selectValue}
      onChange={(e) => pick(e.target.value)}
      disabled={disabled || loading || tags.length === 0}
      style={style}
      aria-label="Tag"
    >
      {orphan ? (
        <option value={value.trim()}>{value.trim()} (livre)</option>
      ) : null}
      {tags.map((tag: CardTag) => (
        <option key={tag.id} value={tag.name}>
          {tag.name}
        </option>
      ))}
      {!loading && tags.length === 0 ? (
        <option value="">Cadastre tags em Cadastros</option>
      ) : null}
    </select>
  );
}
