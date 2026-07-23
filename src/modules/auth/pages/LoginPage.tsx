import { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import { Redirect, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppToast } from '../../../shared/hooks/useAppToast';

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
      <IonContent>
        <div className="sc-auth-shell">
          <div className="sc-auth-card">
            <div className="sc-auth-brand">Study Cards</div>
            <h1 className="sc-auth-title">Entrar</h1>
            <p className="sc-auth-subtitle">
              Acesse seu ambiente de estudo pessoal.
            </p>

            <IonItem className="sc-auth-item">
              <IonInput
                type="email"
                label="E-mail"
                labelPlacement="stacked"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value ?? '')}
                autocomplete="email"
              />
            </IonItem>
            <IonItem className="sc-auth-item">
              <IonInput
                type="password"
                label="Senha"
                labelPlacement="stacked"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value ?? '')}
                autocomplete="current-password"
                onKeyUp={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
              />
            </IonItem>

            <button
              type="button"
              className="sc-btn primary sc-auth-submit"
              disabled={saving || !email.trim() || !password}
              onClick={() => void submit()}
            >
              {saving ? <IonSpinner name="crescent" /> : 'Entrar'}
            </button>

            <p className="sc-auth-switch">
              Não tem conta?{' '}
              <IonButton
                fill="clear"
                size="small"
                routerLink="/register"
                routerDirection="forward"
              >
                Criar conta
              </IonButton>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
