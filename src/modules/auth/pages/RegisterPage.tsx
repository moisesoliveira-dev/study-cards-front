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

export default function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const history = useHistory();
  const toast = useAppToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!loading && isAuthenticated) {
    return <Redirect to="/home" />;
  }

  const submit = async () => {
    if (!email.trim() || password.length < 6) return;
    setSaving(true);
    try {
      await register({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
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
      <IonContent>
        <div className="sc-auth-shell">
          <div className="sc-auth-card">
            <div className="sc-auth-brand">Study Cards</div>
            <h1 className="sc-auth-title">Criar conta</h1>
            <p className="sc-auth-subtitle">
              Seu material de estudo fica só no seu ambiente.
            </p>

            <IonItem className="sc-auth-item">
              <IonInput
                label="Nome"
                labelPlacement="stacked"
                value={name}
                onIonInput={(e) => setName(e.detail.value ?? '')}
                autocomplete="name"
              />
            </IonItem>
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
                label="Senha (mín. 6)"
                labelPlacement="stacked"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value ?? '')}
                autocomplete="new-password"
                onKeyUp={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
              />
            </IonItem>

            <button
              type="button"
              className="sc-btn primary sc-auth-submit"
              disabled={saving || !email.trim() || password.length < 6}
              onClick={() => void submit()}
            >
              {saving ? <IonSpinner name="crescent" /> : 'Criar conta'}
            </button>

            <p className="sc-auth-switch">
              Já tem conta?{' '}
              <IonButton
                fill="clear"
                size="small"
                routerLink="/login"
                routerDirection="back"
              >
                Entrar
              </IonButton>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
