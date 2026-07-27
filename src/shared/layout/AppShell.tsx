import { useEffect, useState } from 'react';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { IonAlert, IonIcon } from '@ionic/react';
import {
  albumsOutline,
  chatbubbleEllipsesOutline,
  chevronDownOutline,
  closeOutline,
  fileTrayFullOutline,
  gitNetworkOutline,
  layersOutline,
  libraryOutline,
  logOutOutline,
  menuOutline,
  settingsOutline,
} from 'ionicons/icons';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { UserAvatar } from '../../modules/auth/components/UserAvatar';
import { ThemeToggle } from '../theme/ThemeToggle';

type Props = {
  children: React.ReactNode;
};

type NavChild = {
  to: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
  children?: NavChild[];
};

const NAV: NavItem[] = [
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
  {
    to: '/library',
    label: 'Biblioteca',
    icon: libraryOutline,
    match: (path: string) => path.startsWith('/library'),
  },
  {
    to: '/chat',
    label: 'Assistente',
    icon: chatbubbleEllipsesOutline,
    match: (path: string) => path.startsWith('/chat'),
  },
  {
    to: '/cadastros/niveis',
    label: 'Cadastros',
    icon: fileTrayFullOutline,
    match: (path: string) => path.startsWith('/cadastros'),
    children: [
      {
        to: '/cadastros/niveis',
        label: 'Níveis',
        icon: layersOutline,
        match: (path: string) => path.startsWith('/cadastros/niveis'),
      },
    ],
  },
  {
    to: '/settings',
    label: 'Configurações',
    icon: settingsOutline,
    match: (path: string) => path.startsWith('/settings'),
  },
];

export function AppShell({ children }: Props) {
  const { user, logout } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(() =>
    location.pathname.startsWith('/cadastros'),
  );

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/cadastros')) {
      setCadastrosOpen(true);
    }
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
          {NAV.map((item) => {
            if (item.children?.length) {
              const groupOpen =
                item.to.startsWith('/cadastros') ? cadastrosOpen : true;
              const groupActive = item.match(location.pathname);
              return (
                <div
                  key={item.to}
                  className={`sc-sidebar-group${groupOpen ? ' is-open' : ''}${groupActive ? ' is-active' : ''}`}
                >
                  <button
                    type="button"
                    className={`sc-sidebar-link sc-sidebar-group-toggle${groupActive ? ' is-active' : ''}`}
                    aria-expanded={groupOpen}
                    onClick={() => {
                      const next = !groupOpen;
                      setCadastrosOpen(next);
                      if (next && !groupActive) {
                        history.push(item.to);
                        closeMenu();
                      }
                    }}
                  >
                    <IonIcon icon={item.icon} />
                    <span>{item.label}</span>
                    <IonIcon
                      icon={chevronDownOutline}
                      className="sc-sidebar-chevron"
                      aria-hidden
                    />
                  </button>
                  {groupOpen ? (
                    <div className="sc-sidebar-subnav" role="group">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className="sc-sidebar-sublink"
                          isActive={(_, loc) => child.match(loc.pathname)}
                          activeClassName="is-active"
                          onClick={closeMenu}
                        >
                          <IonIcon icon={child.icon} />
                          <span>{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
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
            );
          })}
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
            <UserAvatar user={user} size="sm" />
            <span className="sc-sidebar-user">
              @{user?.username || 'usuario'}
            </span>
          </NavLink>
          <button
            type="button"
            className="sc-sidebar-logout"
            aria-label="Sair"
            title="Sair"
            onClick={() => {
              closeMenu();
              setConfirmLogout(true);
            }}
          >
            <IonIcon icon={logOutOutline} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <IonAlert
        isOpen={confirmLogout}
        header="Sair da conta?"
        message="Você precisará entrar novamente para acessar seus cards."
        onDidDismiss={() => setConfirmLogout(false)}
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Sair',
            role: 'destructive',
            handler: () => {
              logout();
              history.replace('/login');
            },
          },
        ]}
      />

      <div className="sc-app-main">
        <div className="sc-app-theme-float">
          <ThemeToggle compact />
        </div>
        {children}
      </div>
    </div>
  );
}
