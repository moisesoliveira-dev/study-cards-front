import { IonIcon } from '@ionic/react';
import { folderOutline, folderOpenOutline } from 'ionicons/icons';

type Props = {
  name: string;
  subtitle?: string;
  color?: string;
  dashed?: boolean;
  onClick: () => void;
};

export function DriveFolderItem({
  name,
  subtitle,
  color = '#BA7517',
  dashed,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      className={`sc-item folder${dashed ? ' dashed' : ''}`}
      onClick={onClick}
    >
      <div className="thumb">
        <IonIcon
          icon={dashed ? folderOpenOutline : folderOutline}
          style={{ color: dashed ? 'var(--text-muted)' : color, fontSize: 32 }}
        />
      </div>
      <div className="item-meta">
        <div
          className="item-name"
          style={dashed ? { color: 'var(--text-muted)' } : undefined}
        >
          {name}
        </div>
        {subtitle ? <div className="item-sub">{subtitle}</div> : null}
      </div>
    </button>
  );
}
