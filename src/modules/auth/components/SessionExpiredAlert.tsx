import { IonAlert } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Global watcher UI: shown when the session expires mid-use. */
export function SessionExpiredAlert() {
  const { sessionExpired, acknowledgeExpired } = useAuth();
  const history = useHistory();

  return (
    <IonAlert
      isOpen={sessionExpired}
      backdropDismiss={false}
      header="Sessão expirada"
      message="Sua sessão expirou por inatividade. Entre novamente para continuar."
      buttons={[
        {
          text: 'Ir para o login',
          role: 'confirm',
          handler: () => {
            acknowledgeExpired();
            history.replace('/login');
          },
        },
      ]}
      onDidDismiss={() => {
        acknowledgeExpired();
        history.replace('/login');
      }}
    />
  );
}
