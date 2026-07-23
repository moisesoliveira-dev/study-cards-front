import {
  cardInitials,
  statusClass,
  statusDot,
  statusLabel,
  type Card,
} from '../../modules/cards/types/card.types';

type Props = {
  card: Card;
  selected?: boolean;
  onClick: () => void;
  view?: 'grid' | 'list';
};

export function DriveCardItem({ card, selected, onClick, view = 'grid' }: Props) {
  if (view === 'list') {
    return (
      <button
        type="button"
        className={`sc-list-row${selected ? ' selected' : ''}`}
        onClick={onClick}
      >
        <span className="list-icon">◇</span>
        <span className="list-name">{card.front}</span>
        <span className="list-tag">{card.tag}</span>
        <span className={`list-status ${statusClass(card.status)}`}>
          {statusLabel(card.status)}
        </span>
        <span className="list-links">{card.linkCount} links</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`sc-item card-item${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
      <div className="thumb">
        <div className="thumb-tag">{card.tag}</div>
        <div className="thumb-title">{card.front}</div>
      </div>
      <div className="item-meta">
        <div className="item-name">{card.front}</div>
        <div className="item-sub">
          <span className={`dot ${statusDot(card.status)}`} />
          {statusLabel(card.status)} · {card.linkCount} links
        </div>
      </div>
    </button>
  );
}

type FaceProps = {
  card: Card;
  selected?: boolean;
  onClick: () => void;
};

export function FaceCard({ card, selected, onClick }: FaceProps) {
  const initials = cardInitials(card.front);
  return (
    <button
      type="button"
      className={`sc-face-card${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
      <span className="card-corner tl">{initials}</span>
      <span className="card-corner br">{initials}</span>
      <div className="card-suit" style={{ color: suitColor(card.tag) }}>
        {card.tag}
      </div>
      <div className="card-title">{card.front}</div>
      <div className="card-body">{card.back}</div>
      <span className={`card-status ${statusClass(card.status)}`}>
        {statusLabel(card.status)}
      </span>
      <div className="card-links">→ {card.linkCount} links</div>
    </button>
  );
}

function suitColor(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes('api')) return '#378ADD';
  if (t.includes('dado') || t.includes('infra')) return '#1D9E75';
  if (t.includes('padrão') || t.includes('padrao')) return '#BA7517';
  if (t.includes('síntese') || t.includes('sintese')) return '#7F77DD';
  return '#1D9E75';
}
