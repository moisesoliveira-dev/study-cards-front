import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Link, Redirect, useHistory, useLocation } from 'react-router-dom';
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
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { isPasswordValid } from '../utils/password-strength';

function useQueryToken() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search).get('token') ?? '', [search]);
}

export default function ResetPasswordPage() {
  const { resetPassword, isAuthenticated, loading } = useAuth();
  const history = useHistory();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const token = useQueryToken();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  if (!loading && isAuthenticated) {
    return <Redirect to="/home" />;
  }

  const canSubmit =
    Boolean(token) &&
    isPasswordValid(password) &&
    password === confirm;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await resetPassword({ token, password });
      toast.success('Senha redefinida. Faça login.');
      history.replace('/login');
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
              <AuthBrand />
            </motion.div>
            <motion.h1 className="sc-auth-title" variants={staggerItem}>
              Nova senha
            </motion.h1>
            <motion.p className="sc-auth-subtitle" variants={staggerItem}>
              {token
                ? 'Escolha uma senha forte para sua conta.'
                : 'Link inválido. Solicite uma nova recuperação.'}
            </motion.p>

            {token ? (
              <>
                <motion.div className="sc-auth-fields" variants={staggerItem}>
                  <Field
                    label="Nova senha"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Crie uma senha forte"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <PasswordStrengthMeter password={password} />
                  <Field
                    label="Confirmar senha"
                    type="password"
                    value={confirm}
                    onChange={setConfirm}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    onEnter={() => void submit()}
                  />
                  {confirm && password !== confirm ? (
                    <p className="sc-auth-hint warn">As senhas não conferem</p>
                  ) : null}
                </motion.div>
                <motion.button
                  type="button"
                  className="sc-btn primary sc-auth-submit"
                  disabled={saving || !canSubmit}
                  onClick={() => void submit()}
                  variants={staggerItem}
                  whileTap={reduce ? undefined : tapScale}
                >
                  {saving ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    'Salvar nova senha'
                  )}
                </motion.button>
              </>
            ) : null}

            <motion.p className="sc-auth-switch" variants={fadeUp}>
              <Link to="/forgot-password">Pedir novo link</Link>
              {' · '}
              <Link to="/login">Login</Link>
            </motion.p>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
}
