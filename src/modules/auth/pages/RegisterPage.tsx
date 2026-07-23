import { useState } from 'react';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Link, Redirect, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { Field } from '../../../shared/components/Field';

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
      <IonContent fullscreen>
        <div className="sc-auth-shell">
          <div className="sc-auth-card">
            <div className="sc-auth-brand">Study Cards</div>
            <h1 className="sc-auth-title">Criar conta</h1>
            <p className="sc-auth-subtitle">
              Seu material de estudo fica só no seu ambiente.
            </p>

            <div className="sc-auth-fields">
              <Field
                label="Nome"
                value={name}
                onChange={setName}
                placeholder="Como prefere ser chamado"
                autoComplete="name"
                autoFocus
              />
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
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                onEnter={() => void submit()}
              />
            </div>

            <button
              type="button"
              className="sc-btn primary sc-auth-submit"
              disabled={saving || !email.trim() || password.length < 6}
              onClick={() => void submit()}
            >
              {saving ? <IonSpinner name="crescent" /> : 'Criar conta'}
            </button>

            <p className="sc-auth-switch">
              Já tem conta? <Link to="/login">Entrar</Link>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
