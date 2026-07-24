import { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  colorPaletteOutline,
  keyOutline,
  logOutOutline,
  personOutline,
} from 'ionicons/icons';
import { motion, useReducedMotion } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Field } from '../../../shared/components/Field';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { useTheme, type ThemeMode } from '../../../shared/theme/ThemeContext';
import {
  MotionShell,
  fadeUp,
  staggerContainer,
  staggerItem,
  tapScale,
} from '../../../shared/motion';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

type SettingsSection = 'account' | 'security' | 'appearance' | 'session';

const SECTIONS: {
  id: SettingsSection;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    id: 'account',
    label: 'Conta',
    hint: 'Usuário, e-mail e nome',
    icon: personOutline,
  },
  {
    id: 'security',
    label: 'Segurança',
    hint: 'Senha de acesso',
    icon: keyOutline,
  },
  {
    id: 'appearance',
    label: 'Aparência',
    hint: 'Tema da interface',
    icon: colorPaletteOutline,
  },
  {
    id: 'session',
    label: 'Sessão',
    hint: 'Encerrar acesso',
    icon: logOutOutline,
  },
];

const THEME_OPTIONS: { id: ThemeMode; label: string; hint: string }[] = [
  { id: 'light', label: 'Claro', hint: 'Fundo claro' },
  { id: 'dark', label: 'Escuro', hint: 'Fundo escuro' },
  { id: 'system', label: 'Sistema', hint: 'Segue o dispositivo' },
];

export default function ProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const toast = useAppToast();
  const history = useHistory();
  const reduce = useReducedMotion();
  const [section, setSection] = useState<SettingsSection>('account');

  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setUsername(user?.username ?? '');
    setEmail(user?.email ?? '');
    setName(user?.name ?? '');
  }, [user]);

  const initials = (user?.username || user?.email || '?')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  const displayName = user?.name?.trim() || `@${user?.username || 'usuario'}`;

  const saveProfile = async () => {
    if (!USERNAME_RE.test(username.trim())) {
      toast.error(
        new Error('O usuário deve ter 3–24 caracteres (letras, números ou _).'),
      );
      return;
    }
    if (!email.trim()) {
      toast.error(new Error('Informe um e-mail válido.'));
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        username: username.trim(),
        email: email.trim(),
        name: name.trim(),
      });
      toast.success('Perfil atualizado');
    } catch (error) {
      toast.error(error);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error(new Error('Preencha a senha atual e a nova senha.'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(new Error('A nova senha deve ter pelo menos 6 caracteres.'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(new Error('A confirmação da senha não confere.'));
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha alterada');
    } catch (error) {
      toast.error(error);
    } finally {
      setSavingPassword(false);
    }
  };

  const signOut = () => {
    logout();
    history.replace('/login');
  };

  const activeMeta = SECTIONS.find((s) => s.id === section)!;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Configurações</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <MotionShell className="sc-shell sc-settings">
          <motion.header
            className="sc-settings-head"
            variants={reduce ? undefined : fadeUp}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <div>
              <p className="sc-settings-kicker">Conta</p>
              <h1 className="sc-settings-title">Configurações</h1>
              <p className="sc-settings-subtitle">
                Gerencie identidade, segurança e preferências do Study Cards.
              </p>
            </div>
            <div className="sc-settings-identity" aria-hidden>
              <div className="sc-settings-avatar">{initials}</div>
              <div className="sc-settings-identity-copy">
                <strong>{displayName}</strong>
                <span>@{user?.username || 'usuario'}</span>
              </div>
            </div>
          </motion.header>

          <div className="sc-settings-layout">
            <nav className="sc-settings-nav" aria-label="Seções">
              {SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sc-settings-nav-item${section === item.id ? ' is-active' : ''}`}
                  onClick={() => setSection(item.id)}
                  aria-current={section === item.id ? 'page' : undefined}
                >
                  <IonIcon icon={item.icon} />
                  <span className="sc-settings-nav-text">
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </button>
              ))}
            </nav>

            <motion.section
              key={section}
              className="sc-settings-panel"
              variants={reduce ? undefined : staggerContainer}
              initial={reduce ? false : 'hidden'}
              animate="show"
            >
              <motion.div className="sc-settings-panel-head" variants={staggerItem}>
                <IonIcon icon={activeMeta.icon} />
                <div>
                  <h2>{activeMeta.label}</h2>
                  <p>{activeMeta.hint}</p>
                </div>
              </motion.div>

              {section === 'account' ? (
                <>
                  <motion.div
                    className="sc-settings-profile-strip"
                    variants={staggerItem}
                  >
                    <div className="sc-settings-avatar is-lg" aria-hidden>
                      {initials}
                    </div>
                    <div>
                      <strong>{displayName}</strong>
                      <p>{user?.email}</p>
                    </div>
                  </motion.div>

                  <motion.div className="sc-settings-fields" variants={staggerItem}>
                    <Field
                      label="Usuário"
                      value={username}
                      onChange={setUsername}
                      placeholder="seu_usuario"
                      autoComplete="username"
                    />
                    <Field
                      label="E-mail"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="voce@email.com"
                      autoComplete="email"
                    />
                    <Field
                      label="Nome (opcional)"
                      value={name}
                      onChange={setName}
                      placeholder="Nome completo"
                      autoComplete="name"
                    />
                  </motion.div>

                  <motion.div className="sc-settings-actions" variants={staggerItem}>
                    <motion.button
                      type="button"
                      className="sc-btn primary"
                      disabled={savingProfile}
                      onClick={() => void saveProfile()}
                      whileTap={reduce ? undefined : tapScale}
                    >
                      {savingProfile ? (
                        <IonSpinner name="crescent" />
                      ) : (
                        'Salvar alterações'
                      )}
                    </motion.button>
                  </motion.div>
                </>
              ) : null}

              {section === 'security' ? (
                <>
                  <motion.p className="sc-settings-lead" variants={staggerItem}>
                    Use a senha atual e escolha uma nova com pelo menos 6
                    caracteres.
                  </motion.p>
                  <motion.div className="sc-settings-fields" variants={staggerItem}>
                    <Field
                      label="Senha atual"
                      type="password"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <Field
                      label="Nova senha"
                      type="password"
                      value={newPassword}
                      onChange={setNewPassword}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <Field
                      label="Confirmar nova senha"
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      onEnter={() => void savePassword()}
                    />
                  </motion.div>
                  <motion.div className="sc-settings-actions" variants={staggerItem}>
                    <motion.button
                      type="button"
                      className="sc-btn primary"
                      disabled={savingPassword}
                      onClick={() => void savePassword()}
                      whileTap={reduce ? undefined : tapScale}
                    >
                      {savingPassword ? (
                        <IonSpinner name="crescent" />
                      ) : (
                        'Atualizar senha'
                      )}
                    </motion.button>
                  </motion.div>
                </>
              ) : null}

              {section === 'appearance' ? (
                <>
                  <motion.p className="sc-settings-lead" variants={staggerItem}>
                    Escolha como o Study Cards aparece neste dispositivo.
                  </motion.p>
                  <motion.div
                    className="sc-settings-theme-grid"
                    variants={staggerItem}
                    role="radiogroup"
                    aria-label="Tema"
                  >
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={mode === opt.id}
                        className={`sc-settings-theme-card${mode === opt.id ? ' is-active' : ''}`}
                        onClick={() => setMode(opt.id)}
                      >
                        <span
                          className={`sc-settings-theme-preview is-${opt.id}`}
                          aria-hidden
                        />
                        <strong>{opt.label}</strong>
                        <small>{opt.hint}</small>
                      </button>
                    ))}
                  </motion.div>
                </>
              ) : null}

              {section === 'session' ? (
                <motion.div className="sc-settings-danger" variants={staggerItem}>
                  <div>
                    <h3>Sair da conta</h3>
                    <p>
                      Encerra a sessão neste dispositivo. Seus cards e
                      fluxogramas continuam salvos.
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    className="sc-btn sc-settings-logout"
                    onClick={signOut}
                    whileTap={reduce ? undefined : tapScale}
                  >
                    <IonIcon icon={logOutOutline} />
                    Sair
                  </motion.button>
                </motion.div>
              ) : null}
            </motion.section>
          </div>
        </MotionShell>
      </IonContent>
    </IonPage>
  );
}
