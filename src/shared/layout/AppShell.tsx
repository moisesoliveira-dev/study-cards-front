import { NavLink, useHistory } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import {
  albumsOutline,
  gitNetworkOutline,
  logOutOutline,
} from 'ionicons/icons';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { ThemeToggle } from '../theme/ThemeToggle';

type Props = {
  children: React.ReactNode;
};

const NAV = [
  {
    to: '/home',
    label: 'Cartas',
    icon: albumsOutline,
    match: (path: string) =>
      path === '/home' ||
      path.startsWith('/subjects') ||
      path.startsWith('/topics') ||
      path.startsWith('/study'),
  },
  {
    to: '/flows',
    label: 'Fluxogramas',
    icon: gitNetworkOutline,
    match: (path: string) => path.startsWith('/flows'),
  },
];

export function AppShell({ children }: Props) {
  const { user, logout } = useAuth();
  const history = useHistory();

  return (
    <div className="sc-app-layout">
      <aside className="sc-sidebar" aria-label="Ambientes">
        <div className="sc-sidebar-brand">Study Cards</div>
        <nav className="sc-sidebar-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="sc-sidebar-link"
              isActive={(_, loc) => item.match(loc.pathname)}
              activeClassName="is-active"
            >
              <IonIcon icon={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sc-sidebar-foot">
          <ThemeToggle />
          <div className="sc-sidebar-user" title={user?.email}>
            {user?.name || user?.email}
          </div>
          <button
            type="button"
            className="sc-sidebar-logout"
            onClick={() => {
              logout();
              history.replace('/login');
            }}
          >
            <IonIcon icon={logOutOutline} />
            Sair
          </button>
        </div>
      </aside>
      <div className="sc-app-main">{children}</div>
    </div>
  );
}
