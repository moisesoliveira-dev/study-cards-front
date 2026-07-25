import { useState } from 'react';
import {
  IonAlert,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  colorPaletteOutline,
  logOutOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, type ThemeMode } from '../../../shared/theme/ThemeContext';

type Section = 'appearance' | 'session';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Aparência', icon: colorPaletteOutline },
  { id: 'session', label: 'Sessão', icon: logOutOutline },
];

const THEME_OPTIONS: { id: ThemeMode; label: string; hint: string }[] = [
  { id: 'light', label: 'Claro', hint: 'Fundo claro' },
  { id: 'dark', label: 'Escuro', hint: 'Fundo escuro' },
  { id: 'system', label: 'Sistema', hint: 'Segue o dispositivo' },
];

export default function SettingsPage() {
  const { logout } = useAuth();
  const { mode, setMode } = useTheme();
  const history = useHistory();
  const [section, setSection] = useState<Section>('appearance');
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Configurações</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sc-shell sc-gh">
          <header className="sc-gh-page-head">
            <div>
              <h1 className="sc-gh-title">Configurações</h1>
              <p className="sc-gh-subtitle">
                Preferências do aplicativo e sessão neste dispositivo.
              </p>
            </div>
          </header>

          <div className="sc-gh-layout">
            <nav className="sc-gh-nav" aria-label="Configurações">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sc-gh-nav-item${section === item.id ? ' is-active' : ''}`}
                  onClick={() => setSection(item.id)}
                  aria-current={section === item.id ? 'page' : undefined}
                >
                  <IonIcon icon={item.icon} />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="sc-gh-main">
              {section === 'appearance' ? (
                <section className="sc-gh-box">
                  <div className="sc-gh-box-head">
                    <h2>Tema</h2>
                    <p>Escolha como o Study Cards aparece neste dispositivo</p>
                  </div>
                  <div
                    className="sc-gh-theme-list"
                    role="radiogroup"
                    aria-label="Tema"
                  >
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={mode === opt.id}
                        className={`sc-gh-theme-row${mode === opt.id ? ' is-active' : ''}`}
                        onClick={() => setMode(opt.id)}
                      >
                        <span
                          className={`sc-gh-theme-swatch is-${opt.id}`}
                          aria-hidden
                        />
                        <span className="sc-gh-theme-copy">
                          <strong>{opt.label}</strong>
                          <small>{opt.hint}</small>
                        </span>
                        <span className="sc-gh-radio" aria-hidden />
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {section === 'session' ? (
                <section className="sc-gh-box sc-gh-box--danger">
                  <div className="sc-gh-box-head">
                    <h2>Sair da conta</h2>
                    <p>
                      Encerra a sessão neste dispositivo. Seus cards e
                      fluxogramas continuam salvos.
                    </p>
                  </div>
                  <div className="sc-gh-box-foot">
                    <button
                      type="button"
                      className="sc-btn sc-gh-danger-btn"
                      onClick={() => setConfirmLogout(true)}
                    >
                      <IonIcon icon={logOutOutline} />
                      Sair
                    </button>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>

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
      </IonContent>
    </IonPage>
  );
}
