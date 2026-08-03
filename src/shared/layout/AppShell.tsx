import { useEffect, useState } from 'react';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { IonAlert, IonIcon } from '@ionic/react';
import {
  albumsOutline,
  chatbubbleEllipsesOutline,
  chevronDownOutline,
  closeOutline,
  colorPaletteOutline,
  ellipsisHorizontalOutline,
  fileTrayFullOutline,
  gitNetworkOutline,
  layersOutline,
  libraryOutline,
  logOutOutline,
  menuOutline,
  pricetagOutline,
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
      {
        to: '/cadastros/cores',
        label: 'Cores',
        icon: colorPaletteOutline,
        match: (path: string) => path.startsWith('/cadastros/cores'),
      },
      {
        to: '/cadastros/tags',
        label: 'Tags',
        icon: pricetagOutline,
        match: (path: string) => path.startsWith('/cadastros/tags'),
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

const TAB_ITEMS = NAV.filter((item) =>
  ['/home', '/flows', '/library', '/chat'].includes(item.to),
);

export function AppShell({ children }: Props) {
  const { user, logout } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(() =>
    location.pathname.startsWith('/cadastros'),
  );

  const moreActive =
    location.pathname.startsWith('/cadastros') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/profile');

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
  const openMore = () => setMenuOpen(true);

  return (
    <div
      className={`sc-app-layout${menuOpen ? ' is-menu-open' : ''}${moreActive ? ' is-more-active' : ''}`}
    >
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
              const groupOpen = cadastrosOpen;
              return (
                <div
                  key={item.label}
                  className={`sc-sidebar-group${groupOpen ? ' is-open' : ''}`}
                >
                  <div className="sc-sidebar-group-row">
                    <NavLink
                      to={item.to}
                      className="sc-sidebar-link sc-sidebar-group-link"
                      isActive={(_, loc) => item.match(loc.pathname)}
                      activeClassName="is-active"
                      onClick={() => {
                        setCadastrosOpen(true);
                        closeMenu();
                      }}
                    >
                      <IonIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </NavLink>
                    <button
                      type="button"
                      className="sc-sidebar-group-chevron"
                      aria-label={
                        groupOpen
                          ? 'Recolher Cadastros'
                          : 'Expandir Cadastros'
                      }
                      aria-expanded={groupOpen}
                      onClick={() => setCadastrosOpen((v) => !v)}
                    >
                      <IonIcon icon={chevronDownOutline} aria-hidden />
                    </button>
                  </div>
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
          <div className="sc-sidebar-theme">
            <ThemeToggle />
          </div>
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

      <nav className="sc-app-tabbar" aria-label="Navegação principal">
        {TAB_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="sc-app-tab"
            isActive={(_, loc) => item.match(loc.pathname)}
            activeClassName="is-active"
          >
            <IonIcon icon={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`sc-app-tab${moreActive || menuOpen ? ' is-active' : ''}`}
          onClick={openMore}
          aria-label="Mais opções"
          aria-expanded={menuOpen}
        >
          <IonIcon icon={ellipsisHorizontalOutline} />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );
}
