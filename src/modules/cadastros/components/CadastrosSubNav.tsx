import { IonIcon } from '@ionic/react';
import {
  colorPaletteOutline,
  layersOutline,
  pricetagOutline,
} from 'ionicons/icons';
import { NavLink } from 'react-router-dom';

const ITEMS = [
  {
    to: '/cadastros/niveis',
    label: 'Níveis',
    icon: layersOutline,
  },
  {
    to: '/cadastros/cores',
    label: 'Cores',
    icon: colorPaletteOutline,
  },
  {
    to: '/cadastros/tags',
    label: 'Tags',
    icon: pricetagOutline,
  },
] as const;

export function CadastrosSubNav() {
  return (
    <nav className="sc-gh-nav" aria-label="Cadastros">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="sc-gh-nav-item"
          activeClassName="is-active"
        >
          <IonIcon icon={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
