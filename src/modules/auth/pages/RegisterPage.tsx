import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Link, Redirect, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { Field } from '../../../shared/components/Field';
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  tapScale,
} from '../../../shared/motion';
import { ThemeToggle } from '../../../shared/theme/ThemeToggle';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export default function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const history = useHistory();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!loading && isAuthenticated) {
    return <Redirect to="/home" />;
  }

  const canSubmit =
    USERNAME_RE.test(username.trim()) &&
    email.trim().includes('@') &&
    password.length >= 6;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      history.replace('/home');
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="sc-auth-shell">
          <div className="sc-auth-theme">
            <ThemeToggle compact />
          </div>
          <motion.div
            className="sc-auth-card"
            variants={reduce ? undefined : staggerContainer}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <motion.div className="sc-auth-brand" variants={staggerItem}>
              Study Cards
            </motion.div>
            <motion.h1 className="sc-auth-title" variants={staggerItem}>
              Criar conta
            </motion.h1>
            <motion.p className="sc-auth-subtitle" variants={staggerItem}>
              Seu material de estudo fica só no seu ambiente.
            </motion.p>

            <motion.div className="sc-auth-fields" variants={staggerItem}>
              <Field
                label="Usuário"
                value={username}
                onChange={setUsername}
                placeholder="seu_usuario"
                autoComplete="username"
                autoFocus
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
                label="Senha"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                onEnter={() => void submit()}
              />
            </motion.div>

            <motion.button
              type="button"
              className="sc-btn primary sc-auth-submit"
              disabled={saving || !canSubmit}
              onClick={() => void submit()}
              variants={staggerItem}
              whileTap={reduce ? undefined : tapScale}
            >
              {saving ? <IonSpinner name="crescent" /> : 'Criar conta'}
            </motion.button>

            <motion.p className="sc-auth-switch" variants={fadeUp}>
              Já tem conta? <Link to="/login">Entrar</Link>
            </motion.p>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
}
