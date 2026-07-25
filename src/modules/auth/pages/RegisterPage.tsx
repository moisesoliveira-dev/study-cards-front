import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Link, Redirect, useHistory } from 'react-router-dom';
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
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { isPasswordValid } from '../utils/password-strength';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export default function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const history = useHistory();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!loading && isAuthenticated) {
    return <Redirect to="/home" />;
  }

  const usernameOk = USERNAME_RE.test(username.trim());
  const canSubmit =
    usernameOk && email.trim().includes('@') && isPasswordValid(password);

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
      <IonContent fullscreen className="sc-auth-content">
        <AuthShell
          sceneHeadline="Monte seu baralho de conhecimento"
          sceneLine="Usuário único, senha forte — e seus cards só seus."
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
              Nova conta
            </motion.p>
            <motion.h2 className="sc-auth-title" variants={staggerItem}>
              Criar conta
            </motion.h2>
            <motion.p className="sc-auth-subtitle" variants={staggerItem}>
              Escolha um usuário único — ele não pode se repetir.
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
              {username.trim() && !usernameOk ? (
                <p className="sc-auth-hint warn">
                  3–24 caracteres: letras, números ou _
                </p>
              ) : null}
              <Field
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="voce@email.com"
                autoComplete="email"
              />
              <div className="sc-auth-password-wrap">
                <Field
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="Crie uma senha forte"
                  autoComplete="new-password"
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
              <PasswordStrengthMeter password={password} />
            </motion.div>

            <motion.button
              type="button"
              className="sc-btn primary sc-auth-submit"
              disabled={saving || !canSubmit}
              onClick={() => void submit()}
              variants={staggerItem}
              whileTap={reduce ? undefined : tapScale}
            >
              {saving ? <IonSpinner name="crescent" /> : 'Começar a estudar'}
            </motion.button>

            <motion.p className="sc-auth-switch" variants={staggerItem}>
              Já tem conta? <Link to="/login">Entrar</Link>
            </motion.p>
          </motion.div>
        </AuthShell>
      </IonContent>
    </IonPage>
  );
}
