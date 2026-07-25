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
import { AuthBrand } from '../components/AuthBrand';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { isPasswordValid } from '../utils/password-strength';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

type Step = 'form' | 'code';

export default function RegisterPage() {
  const {
    startRegister,
    verifyEmail,
    resendCode,
    isAuthenticated,
    loading,
  } = useAuth();
  const history = useHistory();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>('form');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  if (!loading && isAuthenticated) {
    return <Redirect to="/home" />;
  }

  const usernameOk = USERNAME_RE.test(username.trim());
  const canSubmitForm =
    usernameOk && email.trim().includes('@') && isPasswordValid(password);

  const submitForm = async () => {
    if (!canSubmitForm) return;
    setSaving(true);
    try {
      const result = await startRegister({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      setEmail(result.email);
      setStep('code');
      toast.success('Enviamos um código para o seu e-mail');
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const submitCode = async () => {
    if (code.trim().length < 6) return;
    setSaving(true);
    try {
      await verifyEmail({
        email: email.trim(),
        code: code.trim(),
        rememberMe: true,
      });
      history.replace('/home');
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    try {
      await resendCode(email.trim());
      toast.success('Novo código enviado');
    } catch (error) {
      toast.error(error);
    } finally {
      setResending(false);
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
            key={step}
          >
            <motion.div variants={staggerItem}>
              <AuthBrand tagline="Organize cards, tópicos e PDFs num só lugar" />
            </motion.div>

            {step === 'form' ? (
              <>
                <motion.h1 className="sc-auth-title" variants={staggerItem}>
                  Criar conta
                </motion.h1>
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
                  <Field
                    label="Senha"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Crie uma senha forte"
                    autoComplete="new-password"
                    onEnter={() => void submitForm()}
                  />
                  <PasswordStrengthMeter password={password} />
                </motion.div>

                <motion.button
                  type="button"
                  className="sc-btn primary sc-auth-submit"
                  disabled={saving || !canSubmitForm}
                  onClick={() => void submitForm()}
                  variants={staggerItem}
                  whileTap={reduce ? undefined : tapScale}
                >
                  {saving ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    'Continuar'
                  )}
                </motion.button>
              </>
            ) : (
              <>
                <motion.h1 className="sc-auth-title" variants={staggerItem}>
                  Confirme o e-mail
                </motion.h1>
                <motion.p className="sc-auth-subtitle" variants={staggerItem}>
                  Digite o código de 6 dígitos enviado para{' '}
                  <strong>{email}</strong>.
                </motion.p>

                <motion.div className="sc-auth-fields" variants={staggerItem}>
                  <Field
                    label="Código"
                    value={code}
                    onChange={(v) =>
                      setCode(v.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="000000"
                    autoComplete="one-time-code"
                    autoFocus
                    onEnter={() => void submitCode()}
                  />
                </motion.div>

                <motion.button
                  type="button"
                  className="sc-btn primary sc-auth-submit"
                  disabled={saving || code.trim().length < 6}
                  onClick={() => void submitCode()}
                  variants={staggerItem}
                  whileTap={reduce ? undefined : tapScale}
                >
                  {saving ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    'Confirmar e entrar'
                  )}
                </motion.button>

                <motion.div className="sc-auth-resend" variants={fadeUp}>
                  <button
                    type="button"
                    className="sc-auth-link-btn"
                    disabled={resending}
                    onClick={() => void onResend()}
                  >
                    {resending ? 'Reenviando…' : 'Reenviar código'}
                  </button>
                  <button
                    type="button"
                    className="sc-auth-link-btn muted"
                    onClick={() => {
                      setStep('form');
                      setCode('');
                    }}
                  >
                    Voltar
                  </button>
                </motion.div>
              </>
            )}

            <motion.p className="sc-auth-switch" variants={fadeUp}>
              Já tem conta? <Link to="/login">Entrar</Link>
            </motion.p>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
}
