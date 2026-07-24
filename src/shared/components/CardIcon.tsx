import { IonIcon } from '@ionic/react';
import type { CSSProperties } from 'react';
import {
  bookOutline,
  bulbOutline,
  cloudOutline,
  codeSlashOutline,
  cubeOutline,
  extensionPuzzleOutline,
  flashOutline,
  flagOutline,
  gitNetworkOutline,
  globeOutline,
  hardwareChipOutline,
  keyOutline,
  layersOutline,
  linkOutline,
  mapOutline,
  rocketOutline,
  serverOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  terminalOutline,
} from 'ionicons/icons';

export const CARD_ICON_OPTIONS = [
  { id: 'bulb', label: 'Ideia', icon: bulbOutline },
  { id: 'code', label: 'Código', icon: codeSlashOutline },
  { id: 'server', label: 'Servidor', icon: serverOutline },
  { id: 'cloud', label: 'Nuvem', icon: cloudOutline },
  { id: 'database', label: 'Dados', icon: cubeOutline },
  { id: 'network', label: 'Rede', icon: gitNetworkOutline },
  { id: 'shield', label: 'Segurança', icon: shieldCheckmarkOutline },
  { id: 'flash', label: 'Rápido', icon: flashOutline },
  { id: 'book', label: 'Livro', icon: bookOutline },
  { id: 'brain', label: 'Conceito', icon: sparklesOutline },
  { id: 'layers', label: 'Camadas', icon: layersOutline },
  { id: 'globe', label: 'Web', icon: globeOutline },
  { id: 'key', label: 'Chave', icon: keyOutline },
  { id: 'rocket', label: 'Lançar', icon: rocketOutline },
  { id: 'terminal', label: 'Terminal', icon: terminalOutline },
  { id: 'hardware', label: 'Hardware', icon: hardwareChipOutline },
  { id: 'link', label: 'Link', icon: linkOutline },
  { id: 'puzzle', label: 'Peça', icon: extensionPuzzleOutline },
  { id: 'map', label: 'Mapa', icon: mapOutline },
  { id: 'flag', label: 'Marco', icon: flagOutline },
] as const;

export type CardIconId = (typeof CARD_ICON_OPTIONS)[number]['id'];

const ICON_MAP = Object.fromEntries(
  CARD_ICON_OPTIONS.map((opt) => [opt.id, opt.icon]),
) as Record<string, string>;

export function resolveCardIcon(icon: string | null | undefined) {
  if (!icon) return null;
  return ICON_MAP[icon] ?? null;
}

type FaceIconProps = {
  icon: string | null | undefined;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

export function CardFaceIcon({
  icon,
  color,
  className = 'card-face-icon',
  style,
}: FaceIconProps) {
  const src = resolveCardIcon(icon);
  if (!src) return null;
  return (
    <div className={className} style={style} aria-hidden>
      <IonIcon icon={src} style={color ? { color } : undefined} />
    </div>
  );
}

type PickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  accent?: string;
};

export function CardIconPicker({ value, onChange, accent }: PickerProps) {
  return (
    <div className="card-icon-picker" role="listbox" aria-label="Ícone da carta">
      <button
        type="button"
        role="option"
        aria-selected={!value}
        className={`card-icon-pick${!value ? ' is-active' : ''}`}
        onClick={() => onChange(null)}
        title="Sem ícone"
      >
        —
      </button>
      {CARD_ICON_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="option"
          aria-selected={value === opt.id}
          className={`card-icon-pick${value === opt.id ? ' is-active' : ''}`}
          onClick={() => onChange(opt.id)}
          title={opt.label}
          style={
            value === opt.id && accent
              ? { color: accent, borderColor: accent }
              : undefined
          }
        >
          <IonIcon icon={opt.icon} />
        </button>
      ))}
    </div>
  );
}
