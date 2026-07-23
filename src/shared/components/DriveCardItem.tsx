import type { CSSProperties } from 'react';
import {
  cardInitials,
  statusClass,
  statusDot,
  statusLabel,
  type Card,
} from '../../modules/cards/types/card.types';
import { suitColor } from './FaceCardComposer';

type Props = {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  view?: 'grid' | 'list';
};

export function DriveCardItem({ card, selected, onClick, view = 'grid' }: Props) {
  if (view === 'list') {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
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
      </div>
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
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
    </div>
  );
}

type FaceProps = {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
};

export function FaceCard({ card, selected, onClick, style }: FaceProps) {
  const initials = cardInitials(card.front);
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`sc-face-card${selected ? ' selected' : ''}`}
      onClick={onClick}
      style={style}
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
    </div>
  );
}

