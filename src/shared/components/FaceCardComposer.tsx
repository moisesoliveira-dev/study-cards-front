import type { CSSProperties } from 'react';
import { cardInitials } from '../../modules/cards/types/card.types';

export function suitColor(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes('api')) return '#378ADD';
  if (t.includes('dado') || t.includes('infra')) return '#1D9E75';
  if (t.includes('padrão') || t.includes('padrao')) return '#BA7517';
  if (t.includes('síntese') || t.includes('sintese')) return '#7F77DD';
  return '#1D9E75';
}

type Props = {
  front: string;
  back: string;
  tag: string;
  hint: string;
  onFront: (value: string) => void;
  onBack: (value: string) => void;
  onTag: (value: string) => void;
  onHint: (value: string) => void;
  style?: CSSProperties;
};

export function FaceCardComposer({
  front,
  back,
  tag,
  hint,
  onFront,
  onBack,
  onTag,
  onHint,
  style,
}: Props) {
  const initials = cardInitials(front.trim() || 'Novo');
  const suit = tag.trim() || 'Conceito';

  return (
    <div className="sc-face-compose-wrap" style={style}>
      <div className="sc-face-card sc-face-compose" aria-label="Editor de carta">
        <span className="card-corner tl">{initials}</span>
        <span className="card-corner br">{initials}</span>

        <label className="card-compose-field suit">
          <span className="sr-only">Tag</span>
          <input
            className="card-suit-input"
            value={tag}
            onChange={(e) => onTag(e.target.value)}
            placeholder="Tag"
            style={{ color: suitColor(suit) }}
            autoComplete="off"
          />
        </label>

        <label className="card-compose-field title">
          <span className="sr-only">Conceito</span>
          <textarea
            className="card-title-input"
            value={front}
            onChange={(e) => onFront(e.target.value)}
            placeholder="Conceito (título)"
            rows={2}
            autoFocus
          />
        </label>

        <label className="card-compose-field body">
          <span className="sr-only">Explicação</span>
          <textarea
            className="card-body-input"
            value={back}
            onChange={(e) => onBack(e.target.value)}
            placeholder="Explicação no verso…"
            rows={5}
          />
        </label>

        <label className="card-compose-field hint">
          <span className="sr-only">Dica</span>
          <input
            className="card-hint-input"
            value={hint}
            onChange={(e) => onHint(e.target.value)}
            placeholder="Dica (opcional)"
            autoComplete="off"
          />
        </label>

        <span className="card-status s-new">Novo</span>
        <div className="card-links">→ 0 links</div>
      </div>
    </div>
  );
}
