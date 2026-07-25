import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Link, Redirect } from 'react-router-dom';
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

export default function ForgotPasswordPage() {
  const { forgotPassword, isAuthenticated, loading } = useAuth();
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  if (!loading && isAuthenticated) {
    return <Redirect to="/home" />;
  }

  const submit = async () => {
    if (!email.trim().includes('@')) return;
    setSaving(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
      toast.success('Se o e-mail existir, enviamos o link');
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
              Recuperar senha
            </motion.h1>
            <motion.p className="sc-auth-subtitle" variants={staggerItem}>
              {sent
                ? 'Confira sua caixa de entrada (e o spam). O link vale por 1 hora.'
                : 'Informe o e-mail da conta. Enviaremos um link para redefinir a senha.'}
            </motion.p>

            {!sent ? (
              <>
                <motion.div className="sc-auth-fields" variants={staggerItem}>
                  <Field
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="voce@email.com"
                    autoComplete="email"
                    autoFocus
                    onEnter={() => void submit()}
                  />
                </motion.div>
                <motion.button
                  type="button"
                  className="sc-btn primary sc-auth-submit"
                  disabled={saving || !email.trim().includes('@')}
                  onClick={() => void submit()}
                  variants={staggerItem}
                  whileTap={reduce ? undefined : tapScale}
                >
                  {saving ? <IonSpinner name="crescent" /> : 'Enviar link'}
                </motion.button>
              </>
            ) : (
              <motion.button
                type="button"
                className="sc-btn sc-auth-submit"
                onClick={() => setSent(false)}
                variants={staggerItem}
                whileTap={reduce ? undefined : tapScale}
              >
                Usar outro e-mail
              </motion.button>
            )}

            <motion.p className="sc-auth-switch" variants={fadeUp}>
              <Link to="/login">Voltar ao login</Link>
            </motion.p>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
}
