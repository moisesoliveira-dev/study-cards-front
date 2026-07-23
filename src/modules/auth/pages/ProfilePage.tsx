import { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Field } from '../../../shared/components/Field';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import {
  MotionShell,
  fadeUp,
  staggerContainer,
  staggerItem,
  tapScale,
} from '../../../shared/motion';

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const toast = useAppToast();
  const reduce = useReducedMotion();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
  }, [user]);

  const initials = (user?.name || user?.email || '?')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  const saveProfile = async () => {
    if (!email.trim()) {
      toast.error(new Error('Informe um e-mail válido.'));
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <MotionShell className="sc-shell sc-profile">
          <motion.section
            className="sc-profile-hero"
            variants={reduce ? undefined : fadeUp}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <div className="sc-profile-avatar" aria-hidden>
              {initials}
            </div>
            <div className="sc-profile-hero-copy">
              <p className="sc-profile-kicker">Conta</p>
              <h1 className="sc-profile-title">
                {user?.name?.trim() || 'Seu perfil'}
              </h1>
              <p className="sc-profile-email">{user?.email}</p>
            </div>
          </motion.section>

          <motion.section
            className="sc-profile-card"
            variants={reduce ? undefined : staggerContainer}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <motion.h2 className="sc-profile-section-title" variants={staggerItem}>
              Dados pessoais
            </motion.h2>
            <motion.p className="sc-profile-section-lead" variants={staggerItem}>
              Nome e e-mail usados na sua conta.
            </motion.p>
            <motion.div className="sc-auth-fields" variants={staggerItem}>
              <Field
                label="Nome"
                value={name}
                onChange={setName}
                placeholder="Como você quer ser chamado"
                autoComplete="name"
              />
              <Field
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="voce@email.com"
                autoComplete="email"
              />
            </motion.div>
            <motion.button
              type="button"
              className="sc-btn primary sc-profile-submit"
              disabled={savingProfile}
              onClick={() => void saveProfile()}
              variants={staggerItem}
              whileTap={reduce ? undefined : tapScale}
            >
              {savingProfile ? <IonSpinner name="crescent" /> : 'Salvar perfil'}
            </motion.button>
          </motion.section>

          <motion.section
            className="sc-profile-card"
            variants={reduce ? undefined : staggerContainer}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <motion.h2 className="sc-profile-section-title" variants={staggerItem}>
              Senha
            </motion.h2>
            <motion.p className="sc-profile-section-lead" variants={staggerItem}>
              Troque a senha com a atual e uma nova com pelo menos 6 caracteres.
            </motion.p>
            <motion.div className="sc-auth-fields" variants={staggerItem}>
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
            <motion.button
              type="button"
              className="sc-btn primary sc-profile-submit"
              disabled={savingPassword}
              onClick={() => void savePassword()}
              variants={staggerItem}
              whileTap={reduce ? undefined : tapScale}
            >
              {savingPassword ? (
                <IonSpinner name="crescent" />
              ) : (
                'Alterar senha'
              )}
            </motion.button>
          </motion.section>
        </MotionShell>
      </IonContent>
    </IonPage>
  );
}
