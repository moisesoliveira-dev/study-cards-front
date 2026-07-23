import { useState } from 'react';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Link, Redirect, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { Field } from '../../../shared/components/Field';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const history = useHistory();
  const toast = useAppToast();
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
          <div className="sc-auth-card">
            <div className="sc-auth-brand">Study Cards</div>
            <h1 className="sc-auth-title">Entrar</h1>
            <p className="sc-auth-subtitle">
              Acesse seu ambiente de estudo pessoal.
            </p>

            <div className="sc-auth-fields">
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
            </div>

            <button
              type="button"
              className="sc-btn primary sc-auth-submit"
              disabled={saving || !email.trim() || !password}
              onClick={() => void submit()}
            >
              {saving ? <IonSpinner name="crescent" /> : 'Entrar'}
            </button>

            <p className="sc-auth-switch">
              Não tem conta? <Link to="/register">Criar conta</Link>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
