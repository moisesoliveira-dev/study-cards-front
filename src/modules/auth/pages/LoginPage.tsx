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
import { ThemeToggle } from '../../../shared/theme/ThemeToggle';
import { AuthBrand } from '../components/AuthBrand';

export default function LoginPage() {
  const { login, isAuthenticated, loading, rememberedLogin } = useAuth();
  const history = useHistory();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [loginId, setLoginId] = useState(rememberedLogin);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedLogin));
  const [saving, setSaving] = useState(false);

  if (!loading && isAuthenticated) {
    return <Redirect to="/home" />;
  }

  const submit = async () => {
    if (!loginId.trim() || !password) return;
    setSaving(true);
    try {
      await login(loginId.trim(), password, rememberMe);
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
          <div className="sc-auth-atmosphere" aria-hidden="true" />
          <div className="sc-auth-theme">
            <ThemeToggle compact />
          </div>
          <motion.div
            className="sc-auth-card"
            variants={reduce ? undefined : staggerContainer}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <motion.div variants={staggerItem}>
              <AuthBrand tagline="Seu ambiente de estudo pessoal" />
            </motion.div>
            <motion.h1 className="sc-auth-title" variants={staggerItem}>
              Bem-vindo de volta
            </motion.h1>
            <motion.p className="sc-auth-subtitle" variants={staggerItem}>
              Entre para continuar de onde parou.
            </motion.p>

            <motion.div className="sc-auth-fields" variants={staggerItem}>
              <Field
                label="Usuário ou e-mail"
                value={loginId}
                onChange={setLoginId}
                placeholder="seu_usuario ou voce@email.com"
                autoComplete="username"
                autoFocus={!rememberedLogin}
              />
              <Field
                label="Senha"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
                autoFocus={Boolean(rememberedLogin)}
                onEnter={() => void submit()}
              />
            </motion.div>

            <motion.div className="sc-auth-row" variants={staggerItem}>
              <label className="sc-auth-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Lembrar do acesso</span>
              </label>
              <Link className="sc-auth-link" to="/forgot-password">
                Esqueceu a senha?
              </Link>
            </motion.div>

            <motion.button
              type="button"
              className="sc-btn primary sc-auth-submit"
              disabled={saving || !loginId.trim() || !password}
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
