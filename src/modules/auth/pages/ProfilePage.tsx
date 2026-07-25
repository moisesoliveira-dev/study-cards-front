import { useEffect, useRef, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { Field } from '../../../shared/components/Field';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { UserAvatar } from '../components/UserAvatar';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { isPasswordValid } from '../utils/password-strength';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export default function ProfilePage() {
  const {
    user,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    changePassword,
  } = useAuth();
  const toast = useAppToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setUsername(user?.username ?? '');
    setEmail(user?.email ?? '');
    setName(user?.name ?? '');
  }, [user]);

  const displayName = user?.name?.trim() || `@${user?.username || 'usuario'}`;

  const save = async () => {
    if (!USERNAME_RE.test(username.trim())) {
      toast.error(
        new Error('O usuário deve ter 3–24 caracteres (letras, números ou _).'),
      );
      return;
    }
    if (!email.trim()) {
      toast.error(new Error('Informe um e-mail válido.'));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        username: username.trim(),
        email: email.trim(),
        name: name.trim(),
      });
      toast.success('Perfil atualizado');
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error(new Error('Preencha a senha atual e a nova senha.'));
      return;
    }
    if (!isPasswordValid(newPassword)) {
      toast.error(
        new Error(
          'A nova senha precisa ter 8+ caracteres, maiúscula, minúscula e número.',
        ),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(new Error('A confirmação da senha não confere.'));
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha alterada');
    } catch (error) {
      toast.error(error);
    } finally {
      setSavingPassword(false);
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(new Error('Selecione uma imagem JPG, PNG ou WebP.'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(new Error('A imagem deve ter no máximo 2 MB.'));
      return;
    }
    setUploading(true);
    try {
      await uploadAvatar(file);
      toast.success('Foto atualizada');
    } catch (error) {
      toast.error(error);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRemovePhoto = async () => {
    setUploading(true);
    try {
      await removeAvatar();
      toast.success('Foto removida');
    } catch (error) {
      toast.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sc-shell sc-gh">
          <header className="sc-gh-page-head">
            <div>
              <h1 className="sc-gh-title">Perfil</h1>
              <p className="sc-gh-subtitle">
                Identidade da conta, foto e senha de acesso.
              </p>
            </div>
          </header>

          <div className="sc-gh-layout">
            <aside className="sc-gh-side">
              <div className="sc-gh-avatar-block">
                <UserAvatar user={user} size="xl" />
                <div className="sc-gh-side-meta">
                  <strong>{displayName}</strong>
                  <span>@{user?.username}</span>
                </div>
              </div>
            </aside>

            <div className="sc-gh-main">
              <section className="sc-gh-box">
                <div className="sc-gh-box-head">
                  <h2>Foto do perfil</h2>
                  <p>JPG, PNG ou WebP · até 2 MB</p>
                </div>
                <div className="sc-gh-avatar-row">
                  <UserAvatar user={user} size="lg" />
                  <div className="sc-gh-avatar-actions">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(e) => void onPickFile(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      className="sc-btn primary"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? <IonSpinner name="crescent" /> : 'Alterar foto'}
                    </button>
                    {user?.hasAvatar ? (
                      <button
                        type="button"
                        className="sc-btn"
                        disabled={uploading}
                        onClick={() => void onRemovePhoto()}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="sc-gh-box">
                <div className="sc-gh-box-head">
                  <h2>Informações da conta</h2>
                  <p>Usuário, e-mail e nome de exibição</p>
                </div>
                <div className="sc-gh-fields">
                  <Field
                    label="Nome de usuário"
                    value={username}
                    onChange={setUsername}
                    placeholder="seu_usuario"
                    autoComplete="username"
                  />
                  <p className="sc-gh-field-hint">
                    3–24 caracteres · letras, números ou _
                  </p>
                  <Field
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="voce@email.com"
                    autoComplete="email"
                  />
                  <Field
                    label="Nome de exibição"
                    value={name}
                    onChange={setName}
                    placeholder="Opcional"
                    autoComplete="name"
                  />
                </div>
                <div className="sc-gh-box-foot">
                  <button
                    type="button"
                    className="sc-btn primary"
                    disabled={saving}
                    onClick={() => void save()}
                  >
                    {saving ? <IonSpinner name="crescent" /> : 'Salvar perfil'}
                  </button>
                </div>
              </section>

              <section className="sc-gh-box">
                <div className="sc-gh-box-head">
                  <h2>Senha</h2>
                  <p>
                    Use a senha atual e escolha uma nova forte (8+ caracteres,
                    maiúscula, minúscula e número).
                  </p>
                </div>
                <div className="sc-gh-fields">
                  <Field
                    label="Senha atual"
                    type="password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <Field
                    label="Nova senha"
                    type="password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <PasswordStrengthMeter password={newPassword} />
                  <Field
                    label="Confirmar nova senha"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    onEnter={() => void savePassword()}
                  />
                </div>
                <div className="sc-gh-box-foot">
                  <button
                    type="button"
                    className="sc-btn primary"
                    disabled={savingPassword}
                    onClick={() => void savePassword()}
                  >
                    {savingPassword ? (
                      <IonSpinner name="crescent" />
                    ) : (
                      'Atualizar senha'
                    )}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
