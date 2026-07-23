import { motion, useReducedMotion } from 'framer-motion';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Link, Redirect, useHistory } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { Field } from '../../../shared/components/Field';
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  tapScale,
} from '../../../shared/motion';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const history = useHistory();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!loading && isAuthenticated) {
    return <Redirect to="/home" />;
  }

  const submit = async () => {
    if (!email.trim() || !password) return;
    setSaving(true);
    try {
      await login(email.trim(), password);
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
              Entrar
            </motion.h1>
            <motion.p className="sc-auth-subtitle" variants={staggerItem}>
              Acesse seu ambiente de estudo pessoal.
            </motion.p>

            <motion.div className="sc-auth-fields" variants={staggerItem}>
              <Field
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="voce@email.com"
                autoComplete="email"
                autoFocus
              />
              <Field
                label="Senha"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
                onEnter={() => void submit()}
              />
            </motion.div>

            <motion.button
              type="button"
              className="sc-btn primary sc-auth-submit"
              disabled={saving || !email.trim() || !password}
              onClick={() => void submit()}
              variants={staggerItem}
              whileTap={reduce ? undefined : tapScale}
            >
              {saving ? <IonSpinner name="crescent" /> : 'Entrar'}
            </motion.button>

            <motion.p className="sc-auth-switch" variants={fadeUp}>
              Não tem conta? <Link to="/register">Criar conta</Link>
            </motion.p>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
}
