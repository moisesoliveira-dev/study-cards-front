import { motion, useReducedMotion } from 'framer-motion';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Link, Redirect, useHistory } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { Field } from '../../../shared/components/Field';
import {
  staggerContainer,
  staggerItem,
  tapScale,
} from '../../../shared/motion';
import { AuthShell } from '../components/AuthShell';
import { AuthBrand } from '../components/AuthBrand';

export default function LoginPage() {
  const { login, isAuthenticated, loading, rememberedLogin } = useAuth();
  const history = useHistory();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [loginId, setLoginId] = useState(rememberedLogin);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <IonContent fullscreen className="sc-auth-content">
        <AuthShell
          sceneHeadline="Estude com cards que fazem sentido"
          sceneLine="Organize matérias, revise e transforme PDFs em memória."
        >
          <motion.div
            className="sc-auth-form"
            variants={reduce ? undefined : staggerContainer}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <motion.div className="sc-auth-brand-mobile" variants={staggerItem}>
              <AuthBrand />
            </motion.div>

            <motion.p className="sc-auth-kicker" variants={staggerItem}>
              Acesso
            </motion.p>
            <motion.h2 className="sc-auth-title" variants={staggerItem}>
              Bem-vindo de volta
            </motion.h2>
            <motion.p className="sc-auth-subtitle" variants={staggerItem}>
              Continue de onde parou — seus cards estão te esperando.
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
              <div className="sc-auth-password-wrap">
                <Field
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus={Boolean(rememberedLogin)}
                  onEnter={() => void submit()}
                />
                <button
                  type="button"
                  className="sc-auth-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
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
            </motion.div>

            <motion.button
              type="button"
              className="sc-btn primary sc-auth-submit"
              disabled={saving || !loginId.trim() || !password}
              onClick={() => void submit()}
              variants={staggerItem}
              whileTap={reduce ? undefined : tapScale}
            >
              {saving ? <IonSpinner name="crescent" /> : 'Entrar no estudo'}
            </motion.button>

            <motion.p className="sc-auth-switch" variants={staggerItem}>
              Não tem conta? <Link to="/register">Criar conta</Link>
            </motion.p>
          </motion.div>
        </AuthShell>
      </IonContent>
    </IonPage>
  );
}
