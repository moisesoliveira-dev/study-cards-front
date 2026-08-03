import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useState } from 'react';
import { EcosystemTree } from '../../topics/components/EcosystemTree';

export default function EcosystemTreePage() {
  const [showCards, setShowCards] = useState(true);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Árvore</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sc-shell sc-eco-page">
          <header className="sc-eco-page-head">
            <div>
              <h1 className="sc-eco-page-title">Árvore do ecossistema</h1>
              <p className="sc-eco-page-sub">
                Navegue grupos e pastas em qualquer profundidade sem percorrer o
                caminho pasta a pasta.
              </p>
            </div>
            <label className="sc-eco-page-toggle">
              <input
                type="checkbox"
                checked={showCards}
                onChange={(e) => setShowCards(e.target.checked)}
              />
              <span>Mostrar cartas</span>
            </label>
          </header>
          <EcosystemTree variant="page" showCards={showCards} />
        </div>
      </IonContent>
    </IonPage>
  );
}
