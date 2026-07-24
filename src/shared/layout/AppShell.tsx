import { useEffect, useState } from 'react';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import {
  albumsOutline,
  closeOutline,
  gitNetworkOutline,
  logOutOutline,
  menuOutline,
  personOutline,
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={`sc-app-layout${menuOpen ? ' is-menu-open' : ''}`}>
      <header className="sc-app-mobile-bar">
        <button
          type="button"
          className="sc-app-menu-btn"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="sc-app-sidebar"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <IonIcon icon={menuOpen ? closeOutline : menuOutline} />
        </button>
        <div className="sc-app-mobile-brand">Study Cards</div>
        <div className="sc-app-mobile-actions">
          <ThemeToggle compact />
        </div>
      </header>

      <button
        type="button"
        className="sc-sidebar-backdrop"
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <aside
        id="sc-app-sidebar"
        className="sc-sidebar"
        aria-label="Ambientes"
        aria-hidden={false}
      >
        <div className="sc-sidebar-head">
          <div className="sc-sidebar-brand">Study Cards</div>
          <button
            type="button"
            className="sc-sidebar-close"
            aria-label="Fechar menu"
            onClick={closeMenu}
          >
            <IonIcon icon={closeOutline} />
          </button>
        </div>
        <nav className="sc-sidebar-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="sc-sidebar-link"
              isActive={(_, loc) => item.match(loc.pathname)}
              activeClassName="is-active"
              onClick={closeMenu}
            >
              <IonIcon icon={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sc-sidebar-foot">
          <NavLink
            to="/profile"
            className="sc-sidebar-user-link"
            isActive={(_, loc) => loc.pathname.startsWith('/profile')}
            activeClassName="is-active"
            onClick={closeMenu}
            title={user?.email || 'Perfil'}
          >
            <IonIcon icon={personOutline} />
            <span className="sc-sidebar-user">
              {user?.name || user?.email}
            </span>
          </NavLink>
          <button
            type="button"
            className="sc-sidebar-logout"
            aria-label="Sair"
            title="Sair"
            onClick={() => {
              closeMenu();
              logout();
              history.replace('/login');
            }}
          >
            <IonIcon icon={logOutOutline} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div className="sc-app-main">
        <div className="sc-app-theme-float">
          <ThemeToggle compact />
        </div>
        {children}
      </div>
    </div>
  );
}
